// cloudfunctions/user_center/index.js
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// ==========================================
// 1. 默认配置兜底 (Fallback Config)
// ==========================================
const DEFAULT_CONFIG = {
  NORMAL_FREE_LIMIT: 1, // 普通用户每日额度
  VIP_DAILY_LIMIT: 3, // VIP每日额度
  REG_DAY_LIMIT: 10, // 注册首日奖励额度
  VIP_TRIAL_DAYS: 3, // 新人VIP试用天数
  DAILY_AD_LIMIT: 1, // 每日广告解锁次数
  DAILY_LOGIN_BONUS: 50, // 每日登录奖励爱意值
  DAILY_MSG_LIMIT: 20, // 每日留言上限
  DEFAULT_CAPSULE_LIMIT: 10, // 胶囊容量上限
  QUESTIONS_PER_ROUND: 10, // 每轮问答题数

  // 花园相关配置
  WATER_COST: 10, // 每次浇水消耗
  WATER_GROWTH: 10, // 每次浇水增加的成长值
  HARVEST_MIN_GROWTH: 300, // 最小收获成长值
  CHECKIN_REWARD: 50, // 每日拍照打卡奖励
};

// 🚫 本地敏感词黑名单 (正则表达式) - 第一道防线
// 这里的词一旦出现，直接拦截，不调用微信接口
const LOCAL_BLACKLIST_REGEX = /杀人|放火|炸弹|死|自杀|习|共党|法轮|色情|裸聊|招嫖/i; 

// ==========================================
// 2. 配置缓存控制 (Memory Cache)
// ==========================================
let cachedConfig = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000 * 5; // 缓存有效期 5 分钟

async function getBizConfig() {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const res = await db.collection("app_config").doc("business_rules").get();
    // 合并配置，防止数据库缺少字段导致报错
    cachedConfig = { ...DEFAULT_CONFIG, ...res.data };
    cacheTime = now;
    return cachedConfig;
  } catch (err) {
    console.warn("⚠️ 获取配置失败，使用默认配置:", err);
    return DEFAULT_CONFIG;
  }
}

// ==========================================
// 🛡️ 安全校验工具函数
// ==========================================

/**
 * 文本安全校验 (本地黑名单 + 微信V2接口)
 * @param {string} content 需校验的文本
 * @param {string} openid 用户的 openid (V2必填)
 * @returns {Promise<boolean>} true=通过, false=违规或出错
 */
async function checkTextSafety(content, openid) {
  if (!content) return true;

  // =========== 第一道防线：本地黑名单 (Regex) ===========
  if (LOCAL_BLACKLIST_REGEX.test(content)) {
      console.warn(`🛡️ [本地拦截] 发现敏感词，直接阻断: ${content}`);
      return false; 
  }

  // =========== 第二道防线：微信安全接口 V2 ===========
  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: content,
      version: 2, 
      scene: 2, // 场景值：2 代表评论/留言
      openid: openid
    });
    
    // 只有明确建议 'pass' 才放行
    if (res.errCode === 0 && res.result && res.result.suggest === 'pass') {
        return true;
    }
    
    // suggest 为 'risky' (风险) 或 'review' (需人工审核) 都视为不通过
    console.warn(`🛡️ [微信AI拦截] 判定结果: ${res.result.suggest}, label: ${res.result.label}`);
    return false;

  } catch (err) {
    console.error("🛡️ [微信接口异常]:", err);
    // 接口报错（如超时、限流），为了安全起见，Fail-closed
    return false; 
  }
}

/**
 * 图片安全校验
 * @param {string} fileID 云存储文件的 fileID
 * @returns {Promise<boolean>} 是否通过校验
 */
async function checkImageSafety(fileID) {
  if (!fileID) return true;
  try {
    // 1. 获取图片临时链接或 buffer
    const res = await cloud.downloadFile({
      fileID: fileID,
    });
    const buffer = res.fileContent;

    // 2. 调用校验接口
    const checkRes = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: 'image/png', // 简单处理，微信后台会自动识别
        value: buffer
      }
    });
    return checkRes.errCode === 0;
  } catch (err) {
    console.error("图片校验失败:", err);
    return false;
  }
}

// ==========================================
// 3. 通用工具函数
// ==========================================
const RANDOM_NAMES = [
  "予你星河",
  "满眼星辰",
  "温柔本身",
  "限定温柔",
  "捕获月亮",
  "追光者",
  "心动嘉宾",
  "贩卖快乐",
  "三餐四季",
  "白茶清欢",
  "星河滚烫",
  "人间理想",
];

function getRandomName() {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

async function getSudoUsers() {
  try {
    const res = await db.collection("app_config").doc("global_settings").get();
    return res.data.sudo_users || [];
  } catch (err) {
    return [];
  }
}

function getTodayStr() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().split("T")[0];
}

async function addLog(openid, type, content, extra = {}) {
  try {
    await db.collection("logs").add({
      data: {
        _openid: openid,
        type,
        content,
        originalDate: getTodayStr(),
        createdAt: db.serverDate(),
        ...extra,
      },
    });
  } catch (err) {
    console.error("Log Error:", err);
  }
}

// ==========================================
// 4. 主入口函数
// ==========================================
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenID = wxContext.OPENID;

  // 🟢 优先获取配置
  const CONFIG = await getBizConfig();

  const {
    action,
    partnerCode,
    decision,
    userInfo,
    imageFileID,
    style,
    content,
    color,
    type,
    statusIcon,
    statusText,
    id,
    templateId,
    title,
    desc,
    cost,
    category,
    result,
    openDate,
    capsuleId,
    answer,
    quizId,
    roundId,
    questionIdx,
    date,
    avatarUrl,
    nickName,
    queryDate,
  } = event;

  const todayStr = getTodayStr();
  const SUDO_USERS = await getSudoUsers();

  // 彩蛋触发逻辑
  const tryTriggerEgg = async (
    eggId,
    bonus,
    title,
    desc,
    isRepeatable = false,
    probability = 1.0
  ) => {
    if (probability < 1.0 && Math.random() > probability) return null;

    let shouldTrigger = false;
    let userEggId = null;

    const eggRes = await db
      .collection("user_eggs")
      .where({ _openid: myOpenID, egg_id: eggId })
      .get();

    if (eggRes.data.length > 0) {
      if (isRepeatable) {
        shouldTrigger = true;
        userEggId = eggRes.data[0]._id;
      }
    } else {
      shouldTrigger = true;
    }

    if (shouldTrigger) {
      if (userEggId) {
        await db
          .collection("user_eggs")
          .doc(userEggId)
          .update({
            data: { count: _.inc(1), unlocked_at: db.serverDate() },
          });
      } else {
        await db.collection("user_eggs").add({
          data: {
            _openid: myOpenID,
            egg_id: eggId,
            count: 1,
            unlocked_at: db.serverDate(),
            is_read: false,
          },
        });
      }
      await addLog(myOpenID, "egg", `触发彩蛋：${title}`);
      return { title, icon: "🎁", desc, bonus };
    }
    return null;
  };

  // === Action 1: 用户登录与状态检查 ===
  if (action === "login") {
    let currentUser = null,
      loginBonus = 0,
      registerDays = 1;

    const res = await db.collection("users").where({ _openid: myOpenID }).get();

    if (res.data.length > 0) {
      currentUser = res.data[0];
      if (currentUser.last_login_date !== todayStr) {
        loginBonus = CONFIG.DAILY_LOGIN_BONUS; // 使用配置
        const resetUsage = {
          date: todayStr,
          count: 0,
          ad_count: 0,
          msg_count: 0,
        };
        await db
          .collection("users")
          .doc(currentUser._id)
          .update({
            data: {
              water_count: _.inc(loginBonus),
              last_login_date: todayStr,
              daily_usage: resetUsage,
            },
          });
        currentUser.water_count = (currentUser.water_count || 0) + loginBonus;
        currentUser.daily_usage = resetUsage;
      }
      if (currentUser.createdAt) {
        registerDays =
          Math.ceil(
            Math.abs(new Date() - new Date(currentUser.createdAt)) /
              (1000 * 60 * 60 * 24)
          ) || 1;
      }
    } else {
      const vipExpire = new Date();
      vipExpire.setDate(vipExpire.getDate() + CONFIG.VIP_TRIAL_DAYS); // 使用配置

      const newUser = {
        _openid: myOpenID,
        nickName: userInfo?.nickName || getRandomName(),
        avatarUrl: userInfo?.avatarUrl || "",
        partner_id: null,
        bind_request_from: null,
        water_count: CONFIG.DAILY_LOGIN_BONUS, // 使用配置
        rose_balance: 0,
        last_login_date: todayStr,
        createdAt: db.serverDate(),
        vip_expire_date: vipExpire,
        daily_usage: { date: todayStr, count: 0, ad_count: 0, msg_count: 0 },
        capsule_limit: CONFIG.DEFAULT_CAPSULE_LIMIT, // 使用配置
      };

      const addRes = await db.collection("users").add({ data: newUser });
      currentUser = { ...newUser, _id: addRes._id };
      loginBonus = CONFIG.DAILY_LOGIN_BONUS;
      registerDays = 1;
      await addLog(myOpenID, "register", "开启了我们的纪念册");
    }

    const isPermanentVip = SUDO_USERS.includes(myOpenID);
    const isTrialVip =
      currentUser.vip_expire_date &&
      new Date(currentUser.vip_expire_date) > new Date();
    const isVip = isPermanentVip || isTrialVip;

    // 使用配置计算额度
    let currentLimit = isPermanentVip
      ? 9999
      : isVip
      ? registerDays <= 1
        ? CONFIG.REG_DAY_LIMIT
        : CONFIG.VIP_DAILY_LIMIT
      : CONFIG.NORMAL_FREE_LIMIT;

    const stats = currentUser.daily_usage || {};
    const remaining = Math.max(
      0,
      currentLimit + (stats.ad_count || 0) - (stats.count || 0)
    );

    let partnerInfo = null;
    if (currentUser.partner_id) {
      const partnerRes = await db
        .collection("users")
        .where({ _openid: currentUser.partner_id })
        .field({ nickName: true, avatarUrl: true, _openid: true })
        .get();
      if (partnerRes.data.length > 0) partnerInfo = partnerRes.data[0];
    }

    return {
      status: 200,
      user: currentUser,
      partner: partnerInfo,
      loginBonus,
      isVip,
      vipExpireDate: isTrialVip ? currentUser.vip_expire_date : null,
      registerDays,
      remaining,
      dailyFreeLimit: currentLimit,
      adCount: stats.ad_count || 0,
      dailyAdLimit: CONFIG.DAILY_AD_LIMIT, // 使用配置
    };
  }

  // === Action 2: 广告奖励 ===
  if (action === "watch_ad_reward") {
    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const user = userRes.data[0];
    const stats = user.daily_usage || { date: todayStr };

    // 使用配置
    if (
      (stats.date === todayStr ? stats.ad_count || 0 : 0) >=
      CONFIG.DAILY_AD_LIMIT
    ) {
      return { status: 403, msg: "今日广告解锁次数已达上限" };
    }

    const updateData =
      stats.date === todayStr
        ? { "daily_usage.ad_count": _.inc(1) }
        : {
            daily_usage: {
              date: todayStr,
              count: 0,
              ad_count: 1,
              msg_count: 0,
            },
          };

    await db.collection("users").doc(user._id).update({ data: updateData });
    return { status: 200, msg: "奖励到账" };
  }

  // === Action 3: 获取花园状态 ===
  if (action === "get_garden") {
    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const me = userRes.data[0];
    const partnerId = me.partner_id;

    let conditions = [{ owners: myOpenID }];
    if (partnerId) conditions.push({ owners: partnerId });

    const gardenRes = await db
      .collection("gardens")
      .where(_.or(conditions))
      .orderBy("growth_value", "desc")
      .get();

    let myGarden = null;
    if (gardenRes.data.length > 0) {
      myGarden = gardenRes.data[0];
      // 自动修复 owners
      if (partnerId && !myGarden.owners.includes(partnerId))
        await db
          .collection("gardens")
          .doc(myGarden._id)
          .update({ data: { owners: _.addToSet(partnerId) } });
      if (!myGarden.owners.includes(myOpenID))
        await db
          .collection("gardens")
          .doc(myGarden._id)
          .update({ data: { owners: _.addToSet(myOpenID) } });

      // 结算玫瑰
      if (myGarden.rose_balance > 0) {
        await db
          .collection("users")
          .doc(me._id)
          .update({ data: { rose_balance: _.inc(myGarden.rose_balance) } });
        await db
          .collection("gardens")
          .doc(myGarden._id)
          .update({ data: { rose_balance: 0 } });
      }
    } else {
      let owners = [myOpenID];
      if (partnerId) owners.push(partnerId);
      const newGarden = {
        owners,
        level: 1,
        growth_value: 0,
        harvest_count: 0,
        harvest_total: 0,
        updatedAt: db.serverDate(),
      };
      await db.collection("gardens").add({ data: newGarden });
      myGarden = newGarden;
    }

    myGarden.rose_balance = me.rose_balance || 0;

    let recentLogs = [];
    try {
      const owners = myGarden.owners || [myOpenID];
      const logsRes = await db
        .collection("logs")
        .where({ type: "water", _openid: _.in(owners) })
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
      recentLogs = logsRes.data.map((log) => ({
        content: log.content,
        date: log.createdAt,
        isMine: log._openid === myOpenID,
      }));
    } catch (e) {}

    return {
      status: 200,
      garden: myGarden,
      water: me.water_count || 0,
      logs: recentLogs,
    };
  }

  // === Action 4: 浇水 ===
  if (action === "water_flower") {
    const COST = CONFIG.WATER_COST; // 使用配置
    const GROWTH = CONFIG.WATER_GROWTH; // 使用配置

    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const me = userRes.data[0];

    if ((me.water_count || 0) < COST) return { status: 400, msg: "爱意不足" };

    await db
      .collection("users")
      .doc(me._id)
      .update({ data: { water_count: _.inc(-COST) } });

    const gardenRes = await db
      .collection("gardens")
      .where({ owners: myOpenID })
      .get();
    if (gardenRes.data.length > 0) {
      await db
        .collection("gardens")
        .doc(gardenRes.data[0]._id)
        .update({
          data: { growth_value: _.inc(GROWTH), updatedAt: db.serverDate() },
        });
      await addLog(myOpenID, "water", `注入${COST}g爱意`);
      return { status: 200, msg: "注入成功" };
    }
    return { status: 404 };
  }

  // === Action 5: 收获 ===
  if (action === "harvest_garden") {
    const gardenRes = await db
      .collection("gardens")
      .where({ owners: myOpenID })
      .get();
    if (gardenRes.data.length > 0) {
      const garden = gardenRes.data[0];
      // 使用配置
      if (garden.growth_value < CONFIG.HARVEST_MIN_GROWTH)
        return { status: 400, msg: "未盛开" };

      await db
        .collection("gardens")
        .doc(garden._id)
        .update({
          data: {
            growth_value: 0,
            harvest_total: _.inc(1),
            updatedAt: db.serverDate(),
          },
        });

      const owners = garden.owners || [];
      if (owners.length > 0)
        await db
          .collection("users")
          .where({ _openid: _.in(owners) })
          .update({ data: { rose_balance: _.inc(1) } });

      await addLog(
        myOpenID,
        "harvest",
        `收获第${garden.harvest_total + 1}朵玫瑰`
      );
      return { status: 200, msg: "收获成功" };
    }
    return { status: 404 };
  }

  // === Action 6: 每日打卡 (含图片安全校验) ===
  if (action === "check_in") {
    if (!imageFileID) return { status: 400 };
    
    // 🛡️ 新增校验：图片安全检查
    const isImgSafe = await checkImageSafety(imageFileID);
    if (!isImgSafe) return { status: 403, msg: "图片包含不当内容，无法珍藏" };
    // 🛡️ 校验结束

    const CHECKIN_REWARD = CONFIG.CHECKIN_REWARD; // 使用配置

    const oldLog = await db
      .collection("logs")
      .where({
        _openid: myOpenID,
        originalDate: todayStr,
        type: "daily_check_in",
      })
      .get();

    if (oldLog.data.length > 0) {
      await db
        .collection("logs")
        .doc(oldLog.data[0]._id)
        .update({
          data: {
            imageFileID,
            updatedAt: db.serverDate(),
            style: style || "Sweet",
          },
        });
      return { status: 200, msg: "更新成功" };
    } else {
      await db.collection("logs").add({
        data: {
          _openid: myOpenID,
          type: "daily_check_in",
          content: "打卡",
          imageFileID,
          originalDate: todayStr,
          createdAt: db.serverDate(),
          style,
        },
      });
      await db
        .collection("users")
        .where({ _openid: myOpenID })
        .update({ data: { water_count: _.inc(CHECKIN_REWARD) } });
      return { status: 200, msg: "打卡成功" };
    }
  }

  // === Action 7: 兑换优惠券 (含文本安全校验 V2) ===
  if (action === "redeem_coupon") {
    // 🛡️ 文本校验 (传入 myOpenID)
    if (title || desc) {
      const isSafe = await checkTextSafety(`${title} ${desc}`, myOpenID);
      if (!isSafe) {
          return { status: 403, msg: "卡券信息包含敏感词" };
      }
    }

    const me = (await db.collection("users").where({ _openid: myOpenID }).get())
      .data[0];
    if ((me.rose_balance || 0) < cost) return { status: 400, msg: "玫瑰不足" };

    await db
      .collection("users")
      .doc(me._id)
      .update({ data: { rose_balance: _.inc(-cost) } });

    await db.collection("coupons").add({
      data: {
        _openid: myOpenID,
        templateId,
        title,
        desc,
        type,
        cost,
        status: 0,
        createdAt: db.serverDate(),
      },
    });
    await addLog(myOpenID, "redeem", `兑换${title}`);
    return { status: 200, msg: "兑换成功" };
  }

  // === Action 8: 获取我的优惠券 ===
  if (action === "get_my_coupons") {
    const res = await db
      .collection("coupons")
      .where({ _openid: myOpenID })
      .orderBy("createdAt", "desc")
      .get();
    return { status: 200, data: res.data };
  }

  // === Action 9: 做决定 (含文本安全校验 V2) ===
  if (action === "make_decision") {
    // 🛡️ 文本校验 (传入 myOpenID)
    if (category || result) {
      const isSafe = await checkTextSafety(`${category} ${result}`, myOpenID);
      if (!isSafe) {
          return { status: 403, msg: "决定内容包含敏感词" };
      }
    }

    await addLog(myOpenID, "decision", `决定${category}：${result}`);
    await db
      .collection("users")
      .where({ _openid: myOpenID })
      .update({
        data: { last_decision: { category, result, time: db.serverDate() } },
      });
    return { status: 200, msg: "已生效" };
  }

  // === Action 10: 获取对方决定 ===
  if (action === "get_partner_decision") {
    const me = (await db.collection("users").where({ _openid: myOpenID }).get())
      .data[0];
    let pd = null;
    if (me.partner_id) {
      const pr = await db
        .collection("users")
        .where({ _openid: me.partner_id })
        .field({ last_decision: true, nickName: true })
        .get();
      if (pr.data.length > 0) {
        pd = pr.data[0].last_decision;
        if (pd) pd.nickName = pr.data[0].nickName;
      }
    }
    return { status: 200, data: pd };
  }

  // === Action 11: 请求绑定 ===
  if (action === "request_bind") {
    if (!partnerCode || partnerCode === myOpenID)
      return { status: 400, msg: "编号无效" };

    const pr = await db
      .collection("users")
      .where({ _openid: partnerCode })
      .get();
    if (pr.data.length === 0) return { status: 404 };
    if (pr.data[0].partner_id) return { status: 403 };

    await db
      .collection("users")
      .where({ _openid: partnerCode })
      .update({ data: { bind_request_from: myOpenID } });
    return { status: 200, msg: "请求已发送" };
  }

  // === Action 12: 响应绑定 ===
  if (action === "respond_bind") {
    if (!partnerCode) return { status: 400 };
    if (decision === "reject") {
      await db
        .collection("users")
        .where({ _openid: myOpenID })
        .update({ data: { bind_request_from: null } });
      return { status: 200, msg: "已拒绝" };
    }
    if (decision === "accept") {
      await db
        .collection("users")
        .where({ _openid: myOpenID })
        .update({ data: { partner_id: partnerCode, bind_request_from: null } });
      await db
        .collection("users")
        .where({ _openid: partnerCode })
        .update({ data: { partner_id: myOpenID, bind_request_from: null } });

      await addLog(myOpenID, "bind", "绑定成功");
      await addLog(partnerCode, "bind", "绑定成功");
      return { status: 200, msg: "绑定成功" };
    }
  }

  // === Action 13: 更新资料 (含文本/图片安全校验) ===
  if (action === "update_profile") {
    // 🛡️ 文本校验 (V2)
    if (nickName) {
        const isNickSafe = await checkTextSafety(nickName, myOpenID);
        if (!isNickSafe) {
            return { status: 403, msg: "昵称包含敏感内容，请修改" };
        }
    }
    // 🛡️ 图片校验
    if (avatarUrl && avatarUrl.startsWith("cloud://")) {
       const isAvatarSafe = await checkImageSafety(avatarUrl);
       if (!isAvatarSafe) {
           return { status: 403, msg: "头像图片包含敏感内容" };
       }
    }

    await db
      .collection("users")
      .where({ _openid: myOpenID })
      .update({ data: { avatarUrl, nickName } });
    return { status: 200, msg: "OK" };
  }

  // === Action 14: 更新纪念日 ===
  if (action === "update_anniversary") {
    const me = (await db.collection("users").where({ _openid: myOpenID }).get())
      .data[0];
    const data = {
      anniversaryDate: date,
      anniversaryModifier: me.nickName,
      anniversaryUpdatedAt: db.serverDate(),
    };
    await db.collection("users").doc(me._id).update({ data });
    if (me.partner_id)
      await db
        .collection("users")
        .where({ _openid: me.partner_id })
        .update({ data });

    await addLog(myOpenID, "update_anniversary", `修改纪念日${date}`);
    return { status: 200, msg: "已更新" };
  }

  // === Action 15: 解除绑定 ===
  if (action === "unbind") {
    if (!SUDO_USERS.includes(myOpenID)) return { status: 403, msg: "暂未开放" };
    const myRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    if (myRes.data.length === 0) return { status: 404 };

    const me = myRes.data[0];
    const pid = me.partner_id;

    await db
      .collection("users")
      .where({ _openid: myOpenID })
      .update({ data: { partner_id: null } });
    if (pid)
      await db
        .collection("users")
        .where({ _openid: pid })
        .update({ data: { partner_id: null } });

    await addLog(myOpenID, "unbind", "解除关联");
    return { status: 200, msg: "已解除" };
  }

  // === Action 16: 发布便签 (含文本安全校验 V2) ===
  if (action === "post_message") {
    console.log("📝 [post_message] 开始处理:", content);
    if (!content) return { status: 400 };
    if (content.length > 20) return { status: 400, msg: "限20字" };

    // 🛡️ 文本校验 (传入 myOpenID)
    const isSafe = await checkTextSafety(content, myOpenID);
    if (!isSafe) {
        return { status: 403, msg: "内容包含敏感词，请文明发言" };
    }

    const me = (await db.collection("users").where({ _openid: myOpenID }).get())
      .data[0];
    let usage = me.daily_usage || { date: todayStr, msg_count: 0 };
    if (usage.date !== todayStr) usage = { date: todayStr, msg_count: 0 };

    // 使用配置
    if ((usage.msg_count || 0) >= CONFIG.DAILY_MSG_LIMIT)
      return { status: 403, msg: "次数用尽" };

    const rot = Math.floor(Math.random() * 10) - 5;
    await db.collection("messages").add({
      data: {
        _openid: myOpenID,
        content,
        color: color || "yellow",
        type: type || "text",
        rotate: rot,
        createdAt: db.serverDate(),
        dateStr: todayStr,
        isLiked: false,
      },
    });

    await addLog(myOpenID, "post_message", `便签:${content}`, { color });

    let rw = 5,
      msg = "已贴上墙",
      egg = null;
    const lucky = await tryTriggerEgg(
      "lucky_goddess",
      20,
      "幸运女神",
      "偶遇幸运女神",
      true,
      0.1
    );
    if (lucky) {
      rw += lucky.bonus;
      msg = "✨ 幸运女神降临！";
      egg = lucky;
    }

    await db
      .collection("users")
      .doc(me._id)
      .update({
        data: {
          water_count: _.inc(rw),
          daily_usage: {
            date: todayStr,
            count: usage.count || 0,
            ad_count: usage.ad_count || 0,
            msg_count: (usage.msg_count || 0) + 1,
          },
        },
      });
    return { status: 200, msg, triggerEgg: egg };
  }

  // === Action 17: 删除便签 ===
  if (action === "delete_message") {
    try {
      const m = await db.collection("messages").doc(id).get();
      let c = m.data ? m.data.content || "" : "";
      await db.collection("messages").doc(id).remove();
      await addLog(myOpenID, "delete_message", `撕掉:${c}`);
      return { status: 200, msg: "已撕掉" };
    } catch (e) {
      return { status: 500 };
    }
  }

  // === Action 18: 点赞/盖章便签 ===
  if (action === "like_message") {
    try {
      const m = await db.collection("messages").doc(id).get();
      if (m.data._openid === myOpenID) return { status: 403 };
      const s = !m.data.isLiked;
      await db
        .collection("messages")
        .doc(id)
        .update({ data: { isLiked: s } });
      return { status: 200, msg: s ? "已盖章" : "取消" };
    } catch (e) {
      return { status: 500 };
    }
  }

  // === Action 19: 获取便签列表 ===
  if (action === "get_messages") {
    const me = (await db.collection("users").where({ _openid: myOpenID }).get())
      .data[0];
    const pid = me.partner_id;
    let usage = me.daily_usage || { date: todayStr };
    if (usage.date !== todayStr) usage = { date: todayStr };

    // 使用配置
    const remain = Math.max(0, CONFIG.DAILY_MSG_LIMIT - (usage.msg_count || 0));

    const q = [myOpenID];
    if (pid) q.push(pid);
    const targetDate = queryDate || todayStr;
    const msgs = await db
      .collection("messages")
      .where({ _openid: _.in(q), dateStr: targetDate })
      .orderBy("createdAt", "asc")
      .get();

    const nameMap = { [myOpenID]: me.nickName || "我" };
    let pStatus = null;
    if (pid) {
      const pr = await db
        .collection("users")
        .where({ _openid: pid })
        .field({ status: true, nickName: true })
        .get();
      if (pr.data.length > 0) {
        pStatus = pr.data[0].status || { text: "发呆", icon: "😶" };
        nameMap[pid] = pr.data[0].nickName || "TA";
      }
    }
    const enriched = msgs.data.map((m) => ({
      ...m,
      nickName: nameMap[m._openid] || "神秘人",
      isMine: m._openid === myOpenID,
    }));
    return {
      status: 200,
      data: enriched,
      myStatus: me.status || { text: "摸鱼", icon: "🐟" },
      partnerStatus: pStatus,
      remainingMsgCount: remain,
    };
  }

  // === Action 20: 更新状态 (含文本安全校验 V2) ===
  if (action === "update_status") {
    // 🛡️ 文本校验 (传入 myOpenID)
    if (statusText) {
        const isSafe = await checkTextSafety(statusText, myOpenID);
        if (!isSafe) {
            return { status: 403, msg: "状态包含敏感词" };
        }
    }

    await db
      .collection("users")
      .where({ _openid: myOpenID })
      .update({
        data: {
          status: {
            icon: statusIcon,
            text: statusText,
            updatedAt: db.serverDate(),
          },
        },
      });
    await addLog(myOpenID, "update_status", `状态:${statusIcon}`);
    return { status: 200, msg: "已同步" };
  }

  // === Action 21: 埋下胶囊 (含文本/图片安全校验 V2) ===
  if (action === "bury_capsule") {
    if (!content && !imageFileID) return { status: 400 };
    if (!openDate) return { status: 400 };
    if (new Date(openDate) <= new Date(todayStr)) return { status: 400 };

    // 🛡️ 文本校验 (传入 myOpenID)
    if (content) {
      const isTextSafe = await checkTextSafety(content, myOpenID);
      if (!isTextSafe) {
          return { status: 403, msg: "信件内容包含敏感词" };
      }
    }
    // 🛡️ 图片校验
    if (imageFileID) {
      const isImgSafe = await checkImageSafety(imageFileID);
      if (!isImgSafe) {
          return { status: 403, msg: "图片包含敏感内容" };
      }
    }

    const me = (await db.collection("users").where({ _openid: myOpenID }).get())
      .data[0];
    if (!me.partner_id) return { status: 403 };

    // 使用配置
    const limit = me.capsule_limit || CONFIG.DEFAULT_CAPSULE_LIMIT;

    const cnt = (
      await db.collection("capsules").where({ _openid: myOpenID }).count()
    ).total;
    if (cnt >= limit) return { status: 403, code: "LIMIT_EXCEEDED" };

    await db.collection("capsules").add({
      data: {
        _openid: myOpenID,
        to_openid: me.partner_id,
        content: content || "",
        imageFileID: imageFileID || "",
        openDate,
        createDate: todayStr,
        createdAt: db.serverDate(),
        status: 0,
      },
    });

    await addLog(myOpenID, "bury_capsule", content ? "埋下文字" : "埋下图片", {
      openDate,
    });
    await db
      .collection("users")
      .doc(me._id)
      .update({ data: { water_count: _.inc(10) } });

    let egg = null;
    const h = (new Date().getHours() + 8) % 24;
    if (h >= 0 && h < 4) {
      const e = await tryTriggerEgg(
        "moonlight_box",
        66,
        "月光宝盒",
        "深夜埋藏秘密"
      );
      if (e) {
        egg = e;
        await db
          .collection("users")
          .doc(me._id)
          .update({ data: { water_count: _.inc(e.bonus) } });
      }
    }
    const days = Math.ceil(
      Math.abs(new Date(openDate) - new Date(todayStr)) / (1000 * 60 * 60 * 24)
    );
    if (days >= 365) {
      const e = await tryTriggerEgg(
        "time_traveler",
        365,
        "时间领主",
        "埋下1年契约"
      );
      if (e) {
        egg = e;
        await db
          .collection("users")
          .doc(me._id)
          .update({ data: { water_count: _.inc(e.bonus) } });
      }
    }
    return { status: 200, msg: "已埋下", triggerEgg: egg };
  }

  // === Action 22: 获取胶囊列表 ===
  if (action === "get_capsules") {
    const me = (await db.collection("users").where({ _openid: myOpenID }).get())
      .data[0];
    const inbox = (
      await db
        .collection("capsules")
        .where({ to_openid: myOpenID })
        .orderBy("openDate", "asc")
        .get()
    ).data;
    const sent = (
      await db
        .collection("capsules")
        .where({ _openid: myOpenID })
        .orderBy("createDate", "desc")
        .get()
    ).data;

    const proc = (i, isInbox) => {
      const ok = i.openDate <= todayStr;
      const sec = isInbox && i.status === 0;
      return {
        _id: i._id,
        openDate: i.openDate,
        createDate: i.createDate,
        status: i.status,
        content: sec ? "???" : i.content,
        imageFileID: sec ? "" : i.imageFileID,
        isLocked: !ok && i.status === 0,
        canOpen: ok && i.status === 0,
        isOpened: i.status === 1,
      };
    };

    return {
      status: 200,
      inbox: inbox.map((i) => proc(i, true)),
      sent: sent.map((i) => proc(i, false)),
      // 使用配置
      limit: me.capsule_limit || CONFIG.DEFAULT_CAPSULE_LIMIT,
      usage: sent.length,
    };
  }

  // === Action 23: 开启胶囊 ===
  if (action === "open_capsule") {
    const cap = (await db.collection("capsules").doc(capsuleId).get()).data;
    if (cap.to_openid !== myOpenID || cap.openDate > todayStr)
      return { status: 403 };
    if (cap.status === 1) return { status: 200, data: cap };

    await db
      .collection("capsules")
      .doc(capsuleId)
      .update({ data: { status: 1 } });
    await addLog(myOpenID, "open_capsule", "开启胶囊");

    let egg = null;
    if (
      (
        await db
          .collection("capsules")
          .where({ to_openid: myOpenID, status: 1 })
          .count()
      ).total === 1
    ) {
      const e = await tryTriggerEgg(
        "worth_the_wait",
        100,
        "守得云开",
        "开启第一个胶囊"
      );
      if (e) {
        egg = e;
        await db
          .collection("users")
          .where({ _openid: myOpenID })
          .update({ data: { water_count: _.inc(e.bonus) } });
      }
    }
    return { status: 200, data: cap, msg: "开启成功", triggerEgg: egg };
  }

  // === Action 24: 获取问答首页 (Couple Quiz) ===
  if (action === "get_quiz_home") {
    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const me = userRes.data[0];
    const partnerId = me.partner_id;

    if (!partnerId) return { status: 403, msg: "请先绑定伴侣" };

    const historyRes = await db
      .collection("quiz_rounds")
      .where({ owners: _.all([myOpenID, partnerId]), is_finished: true })
      .orderBy("round_seq", "desc")
      .get();

    const activeRes = await db
      .collection("quiz_rounds")
      .where({ owners: _.all([myOpenID, partnerId]), is_finished: false })
      .limit(1)
      .get();

    let currentRound = null;
    if (activeRes.data.length > 0) {
      const r = activeRes.data[0];
      const isUserA = myOpenID < partnerId;
      const myProgress = isUserA ? r.answers_a.length : r.answers_b.length;
      const partnerProgress = isUserA ? r.answers_b.length : r.answers_a.length;

      currentRound = {
        _id: r._id,
        round_seq: r.round_seq,
        my_progress: myProgress,
        partner_progress: partnerProgress,
        total: CONFIG.QUESTIONS_PER_ROUND, // 使用配置
        status: "playing",
      };

      if (myProgress === CONFIG.QUESTIONS_PER_ROUND)
        // 使用配置
        currentRound.status = "waiting_partner";
    }

    return { status: 200, history: historyRes.data, currentRound };
  }

  // === Action 25: 开启新一轮问答 ===
  if (action === "start_new_round") {
    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const me = userRes.data[0];
    const partnerId = me.partner_id;
    if (!partnerId) return { status: 403 };

    const activeCount = await db
      .collection("quiz_rounds")
      .where({ owners: _.all([myOpenID, partnerId]), is_finished: false })
      .count();
    if (activeCount.total > 0) return { status: 400, msg: "还有未完成的" };

    const maxRoundRes = await db
      .collection("quiz_rounds")
      .where({ owners: _.all([myOpenID, partnerId]) })
      .orderBy("round_seq", "desc")
      .limit(1)
      .get();
    const nextSeq =
      (maxRoundRes.data.length > 0 ? maxRoundRes.data[0].round_seq : 0) + 1;

    const allQuizRes = await db
      .collection("quiz_pool")
      .where({ type: "choice" })
      .limit(100)
      .get();
    const pool = allQuizRes.data;
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // 使用配置 QUESTIONS_PER_ROUND
    const selectedQuestions = pool
      .slice(0, CONFIG.QUESTIONS_PER_ROUND)
      .map((q) => ({
        _id: q._id,
        title: q.title,
        options: q.options,
        is_person: q.is_person || false,
      }));

    const isUserA = myOpenID < partnerId;
    const owners = isUserA ? [myOpenID, partnerId] : [partnerId, myOpenID];

    await db.collection("quiz_rounds").add({
      data: {
        owners,
        round_seq: nextSeq,
        questions: selectedQuestions,
        answers_a: [],
        answers_b: [],
        is_finished: false,
        score: 0,
        createdAt: db.serverDate(),
      },
    });

    return { status: 200, msg: "已开启" };
  }

  // === Action 26: 获取答题详情 ===
  if (action === "get_round_detail") {
    const { roundId } = event;
    const roundRes = await db.collection("quiz_rounds").doc(roundId).get();
    const round = roundRes.data;

    const isUserA = myOpenID < round.owners.find((id) => id !== myOpenID);
    const myAnswers = isUserA ? round.answers_a : round.answers_b;

    if (round.is_finished)
      return { status: 200, mode: "result", round, isUserA };

    // 使用配置
    if (myAnswers.length >= CONFIG.QUESTIONS_PER_ROUND)
      return { status: 200, mode: "waiting", progress: myAnswers.length };

    const question = round.questions[myAnswers.length];
    return {
      status: 200,
      mode: "answering",
      question,
      index: myAnswers.length + 1,
      total: CONFIG.QUESTIONS_PER_ROUND, // 使用配置
    };
  }

  // === Action 27: 提交问答 ===
  if (action === "submit_round_answer") {
    const { roundId, answer } = event;
    if (!roundId || answer === undefined) return { status: 400 };

    const roundRes = await db.collection("quiz_rounds").doc(roundId).get();
    const round = roundRes.data;

    const partnerId = round.owners.find((id) => id !== myOpenID);
    const isUserA = myOpenID < partnerId;
    const field = isUserA ? "answers_a" : "answers_b";

    // 使用配置
    const currentAnswers = round[field] || [];
    if (currentAnswers.length < CONFIG.QUESTIONS_PER_ROUND) {
      await db
        .collection("quiz_rounds")
        .doc(roundId)
        .update({
          data: { [field]: _.push(answer) },
        });
    }

    const newRoundRes = await db.collection("quiz_rounds").doc(roundId).get();
    const newRound = newRoundRes.data;

    const lenA = newRound.answers_a.length;
    const lenB = newRound.answers_b.length;

    let isRoundFinished = false;
    let triggerEgg = null;

    // 使用配置
    if (
      lenA >= CONFIG.QUESTIONS_PER_ROUND &&
      lenB >= CONFIG.QUESTIONS_PER_ROUND
    ) {
      if (!newRound.is_finished) {
        let score = 0;
        // 使用配置
        for (let i = 0; i < CONFIG.QUESTIONS_PER_ROUND; i++) {
          const valA = newRound.answers_a[i];
          const valB = newRound.answers_b[i];
          const q = newRound.questions[i];

          if (q && q.is_person) {
            if (
              (valA === 0 && valB === 1) ||
              (valA === 1 && valB === 0) ||
              (valA > 1 && valA === valB)
            ) {
              score += 10;
            }
          } else {
            if (valA === valB) score += 10;
          }
        }

        await db
          .collection("quiz_rounds")
          .doc(roundId)
          .update({
            data: {
              is_finished: true,
              score: score,
              finishedAt: db.serverDate(),
            },
          });

        await addLog(myOpenID, "quiz_round", `问答得分:${score}`);

        if (score === 100) {
          const mateEgg = await tryTriggerEgg(
            "soul_mate",
            100,
            "灵魂伴侣",
            "默契问答满分！",
            true
          );
          if (mateEgg) triggerEgg = mateEgg;
        }
      }
      isRoundFinished = true;
    }

    return { status: 200, msg: "ok", isRoundFinished, triggerEgg };
  }

  // === Action 28: 获取恋爱清单状态 ===
  if (action === "get_love_list_status") {
    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    if (userRes.data.length === 0) return { status: 404 };

    const me = userRes.data[0];
    return { status: 200, finishedList: me.finished_love_list || [] };
  }

  // === Action 29: 切换恋爱清单状态 ===
  if (action === "toggle_love_list_item") {
    const { itemId } = event;
    if (!itemId) return { status: 400 };

    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const me = userRes.data[0];
    const list = me.finished_love_list || [];

    let newList = [];
    let isFinished = false;

    if (list.includes(itemId)) {
      newList = list.filter((id) => id !== itemId);
    } else {
      newList = [...list, itemId];
      isFinished = true;

      await db
        .collection("users")
        .doc(me._id)
        .update({ data: { water_count: _.inc(5) } });
      await addLog(myOpenID, "love_list", `打卡了恋爱清单 No.${itemId}`);
    }

    await db
      .collection("users")
      .doc(me._id)
      .update({ data: { finished_love_list: newList } });

    return {
      status: 200,
      isFinished,
      msg: isFinished ? "打卡成功 +5g爱意" : "已取消打卡",
    };
  }
};