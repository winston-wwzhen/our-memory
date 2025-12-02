// cloudfunctions/user_center/index.js
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 随机昵称库
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
  const idx = Math.floor(Math.random() * RANDOM_NAMES.length);
  return RANDOM_NAMES[idx];
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

// 通用日志记录
async function addLog(openid, type, content, extra = {}) {
  try {
    const todayStr = getTodayStr();
    await db.collection("logs").add({
      data: {
        _openid: openid,
        type: type,
        content: content,
        originalDate: todayStr,
        createdAt: db.serverDate(),
        ...extra,
      },
    });
  } catch (err) {
    console.error("Log Error:", err);
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenID = wxContext.OPENID;

  // 解构所有可能用到的参数
  const {
    action,
    partnerCode,
    decision,
    userInfo,
    imageFileID,
    style,
    // 留言板参数
    content,
    color,
    type,
    statusIcon,
    statusText,
    id,
    // 兑换券参数
    templateId,
    title,
    desc,
    cost,
    // 决定参数
    category,
    result,
    // 时光胶囊参数
    openDate,
    imagePath,
    // 其他参数
    date,
    avatarUrl,
    nickName,
    queryDate,
  } = event;

  const todayStr = getTodayStr();
  const SUDO_USERS = await getSudoUsers();

  // 🟢 配置中心
  const NORMAL_FREE_LIMIT = 1;
  const VIP_DAILY_LIMIT = 3;
  const REG_DAY_LIMIT = 10;
  const VIP_TRIAL_DAYS = 3;
  const DAILY_AD_LIMIT = 1;
  const DAILY_LOGIN_BONUS = 50;
  const DAILY_MSG_LIMIT = 20;

  // 🛠️ 内部工具：尝试触发彩蛋
  // 返回 triggerEgg 对象或 null
  const tryTriggerEgg = async (
    eggId,
    bonus,
    title,
    desc,
    isRepeatable = false,
    probability = 1.0
  ) => {
    // 概率检查
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
        // 重复触发：更新计数
        await db
          .collection("user_eggs")
          .doc(userEggId)
          .update({
            data: { count: _.inc(1), unlocked_at: db.serverDate() },
          });
      } else {
        // 首次触发：写入记录
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
      // 记录日志
      await addLog(myOpenID, "egg", `触发彩蛋：${title}`);

      return {
        title: title,
        icon: "🎁", // 默认图标，前端可覆盖
        desc: desc,
        bonus: bonus,
      };
    }
    return null;
  };

  // === 1. 登录与注册 ===
  if (action === "login") {
    let currentUser = null;
    let loginBonus = 0;
    let registerDays = 1;

    const res = await db.collection("users").where({ _openid: myOpenID }).get();

    if (res.data.length > 0) {
      currentUser = res.data[0];
      if (currentUser.last_login_date !== todayStr) {
        loginBonus = DAILY_LOGIN_BONUS;
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
        currentUser.last_login_date = todayStr;
        currentUser.daily_usage = resetUsage;
      }
      if (currentUser.createdAt) {
        const created = new Date(currentUser.createdAt);
        const now = new Date();
        registerDays =
          Math.ceil(Math.abs(now - created) / (1000 * 60 * 60 * 24)) || 1;
      }
    } else {
      const vipExpire = new Date();
      vipExpire.setDate(vipExpire.getDate() + VIP_TRIAL_DAYS);
      const newUser = {
        _openid: myOpenID,
        nickName: userInfo?.nickName || getRandomName(),
        avatarUrl: userInfo?.avatarUrl || "",
        partner_id: null,
        bind_request_from: null,
        water_count: DAILY_LOGIN_BONUS,
        rose_balance: 0,
        last_login_date: todayStr,
        createdAt: db.serverDate(),
        vip_expire_date: vipExpire,
        daily_usage: { date: todayStr, count: 0, ad_count: 0, msg_count: 0 },
      };
      const addRes = await db.collection("users").add({ data: newUser });
      currentUser = { ...newUser, _id: addRes._id };
      loginBonus = DAILY_LOGIN_BONUS;
      registerDays = 1;
      await addLog(myOpenID, "register", "开启了我们的纪念册");
    }

    const isPermanentVip = SUDO_USERS.includes(myOpenID);
    const isTrialVip =
      currentUser.vip_expire_date &&
      new Date(currentUser.vip_expire_date) > new Date();
    const isVip = isPermanentVip || isTrialVip;
    let currentLimit = isPermanentVip
      ? 9999
      : isVip
      ? registerDays <= 1
        ? REG_DAY_LIMIT
        : VIP_DAILY_LIMIT
      : NORMAL_FREE_LIMIT;
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
      dailyAdLimit: DAILY_AD_LIMIT,
    };
  }

  // ... (省略 watch_ad_reward, get_garden, water_flower, harvest_garden, check_in, redeem_coupon, get_my_coupons, make_decision, get_partner_decision, 绑定相关, update_profile, update_anniversary, unbind)
  // 请保留原有的 Action 代码
  // 为确保完整性，这里我只列出变动部分，实际使用请务必保留上方原有的业务逻辑！
  // ...
  if (action === "watch_ad_reward") {
    /*...*/ const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const user = userRes.data[0];
    const stats = user.daily_usage || { date: todayStr };
    if ((stats.date === todayStr ? stats.ad_count || 0 : 0) >= DAILY_AD_LIMIT)
      return { status: 403, msg: "今日次数上限" };
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
  if (action === "get_garden") {
    /*...*/ const userRes = await db
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
  if (action === "water_flower") {
    const COST = 10,
      GROWTH = 10;
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
      await addLog(myOpenID, "water", `给玫瑰注入了 ${COST}g 爱意`);
      return { status: 200, msg: "注入成功" };
    }
    return { status: 404 };
  }
  if (action === "harvest_garden") {
    const gardenRes = await db
      .collection("gardens")
      .where({ owners: myOpenID })
      .get();
    if (gardenRes.data.length > 0) {
      const garden = gardenRes.data[0];
      if (garden.growth_value < 300) return { status: 400, msg: "还没盛开" };
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
        `收获了第 ${garden.harvest_total + 1} 朵玫瑰`
      );
      return { status: 200, msg: "收获成功" };
    }
    return { status: 404 };
  }
  if (action === "check_in") {
    if (!imageFileID) return { status: 400 };
    const CHECKIN_REWARD = 50;
    const oldLogRes = await db
      .collection("logs")
      .where({
        _openid: myOpenID,
        originalDate: todayStr,
        type: "daily_check_in",
      })
      .get();
    if (oldLogRes.data.length > 0) {
      await db
        .collection("logs")
        .doc(oldLogRes.data[0]._id)
        .update({
          data: {
            imageFileID,
            updatedAt: db.serverDate(),
            style: style || "Sweet",
          },
        });
      return { status: 200, msg: "更新成功" };
    } else {
      await db
        .collection("logs")
        .add({
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
  if (action === "redeem_coupon") {
    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const me = userRes.data[0];
    if ((me.rose_balance || 0) < cost) return { status: 400, msg: "玫瑰不足" };
    await db
      .collection("users")
      .doc(me._id)
      .update({ data: { rose_balance: _.inc(-cost) } });
    await db
      .collection("coupons")
      .add({
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
    await addLog(myOpenID, "redeem", `兑换了${title}`);
    return { status: 200, msg: "兑换成功" };
  }
  if (action === "get_my_coupons") {
    const res = await db
      .collection("coupons")
      .where({ _openid: myOpenID })
      .orderBy("createdAt", "desc")
      .get();
    return { status: 200, data: res.data };
  }
  if (action === "make_decision") {
    await addLog(myOpenID, "decision", `决定${category}：${result}`);
    await db
      .collection("users")
      .where({ _openid: myOpenID })
      .update({
        data: { last_decision: { category, result, time: db.serverDate() } },
      });
    return { status: 200, msg: "已生效" };
  }
  if (action === "get_partner_decision") {
    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const me = userRes.data[0];
    let partnerDecision = null;
    if (me.partner_id) {
      const partnerRes = await db
        .collection("users")
        .where({ _openid: me.partner_id })
        .field({ last_decision: true, nickName: true })
        .get();
      if (partnerRes.data.length > 0) {
        partnerDecision = partnerRes.data[0].last_decision;
        if (partnerDecision)
          partnerDecision.nickName = partnerRes.data[0].nickName;
      }
    }
    return { status: 200, data: partnerDecision };
  }
  if (action === "request_bind") {
    if (!partnerCode) return { status: 400, msg: "请输入对方编号" };
    if (partnerCode === myOpenID) return { status: 400, msg: "不能关联自己" };
    const partnerRes = await db
      .collection("users")
      .where({ _openid: partnerCode })
      .get();
    if (partnerRes.data.length === 0) return { status: 404, msg: "编号不存在" };
    if (partnerRes.data[0].partner_id)
      return { status: 403, msg: "对方已有伴侣" };
    await db
      .collection("users")
      .where({ _openid: partnerCode })
      .update({ data: { bind_request_from: myOpenID } });
    return { status: 200, msg: "请求已发送" };
  }
  if (action === "respond_bind") {
    if (!partnerCode) return { status: 400, msg: "参数缺失" };
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
  if (action === "update_profile") {
    await db
      .collection("users")
      .where({ _openid: myOpenID })
      .update({ data: { avatarUrl, nickName } });
    return { status: 200, msg: "OK" };
  }
  if (action === "update_anniversary") {
    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const me = userRes.data[0];
    const updateData = {
      anniversaryDate: date,
      anniversaryModifier: me.nickName,
      anniversaryUpdatedAt: db.serverDate(),
    };
    await db.collection("users").doc(me._id).update({ data: updateData });
    if (me.partner_id)
      await db
        .collection("users")
        .where({ _openid: me.partner_id })
        .update({ data: updateData });
    await addLog(myOpenID, "update_anniversary", `修改纪念日为 ${date}`);
    return { status: 200, msg: "已更新" };
  }
  if (action === "unbind") {
    if (!SUDO_USERS.includes(myOpenID)) return { status: 403, msg: "暂未开放" };
    const myRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    if (myRes.data.length === 0) return { status: 404 };
    const me = myRes.data[0];
    const partnerID = me.partner_id;
    await db
      .collection("users")
      .where({ _openid: myOpenID })
      .update({ data: { partner_id: null } });
    if (partnerID)
      await db
        .collection("users")
        .where({ _openid: partnerID })
        .update({ data: { partner_id: null } });
    await addLog(myOpenID, "unbind", "解除关联");
    return { status: 200, msg: "已解除" };
  }

  // === 8. 爱的留言板 (保持 20字限制 & 彩蛋) ===
  if (action === "post_message") {
    if (!content) return { status: 400, msg: "内容不能为空" };
    if (content.length > 20) return { status: 400, msg: "内容太长啦(限20字)" };

    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    if (userRes.data.length === 0) return { status: 404, msg: "用户未找到" };
    const currentUser = userRes.data[0];

    // 检查每日限制
    let currentUsage = currentUser.daily_usage || {
      date: todayStr,
      msg_count: 0,
    };
    if (currentUsage.date !== todayStr)
      currentUsage = { date: todayStr, msg_count: 0 };
    if ((currentUsage.msg_count || 0) >= DAILY_MSG_LIMIT)
      return { status: 403, msg: "今日次数已用完" };

    const randomRotate = Math.floor(Math.random() * 10) - 5;
    await db.collection("messages").add({
      data: {
        _openid: myOpenID,
        content,
        color: color || "yellow",
        type: type || "text",
        rotate: randomRotate,
        createdAt: db.serverDate(),
        dateStr: todayStr,
        isLiked: false,
      },
    });

    let logContent =
      content.length > 10 ? content.substring(0, 10) + "..." : content;
    await addLog(myOpenID, "post_message", `贴了便签: ${logContent}`, {
      color,
    });

    // 触发彩蛋
    let rewardWater = 5;
    let tipMsg = "留言已贴上墙 📌";

    // 使用 tryTriggerEgg 工具
    const luckyEgg = await tryTriggerEgg(
      "lucky_goddess",
      20,
      "幸运女神",
      "偶遇了幸运女神，获得额外奖励！",
      true,
      0.1
    );

    if (luckyEgg) {
      rewardWater += luckyEgg.bonus;
      tipMsg = "✨ 幸运女神降临！";
    }

    // 结算
    const updateData = {
      water_count: _.inc(rewardWater),
      daily_usage: {
        date: todayStr,
        count: currentUsage.count || 0,
        ad_count: currentUsage.ad_count || 0,
        msg_count: (currentUsage.msg_count || 0) + 1,
      },
    };
    await db
      .collection("users")
      .doc(currentUser._id)
      .update({ data: updateData });

    return { status: 200, msg: tipMsg, triggerEgg: luckyEgg };
  }

  // 🗑️ 撕掉留言 (保持不变)
  if (action === "delete_message") {
    if (!id) return { status: 400 };
    try {
      const msgRes = await db.collection("messages").doc(id).get();
      let contentSnippet = msgRes.data ? msgRes.data.content || "" : "便签";
      await db.collection("messages").doc(id).remove();
      await addLog(myOpenID, "delete_message", `撕掉了便签: ${contentSnippet}`);
      return { status: 200, msg: "已撕掉" };
    } catch (err) {
      return { status: 500 };
    }
  }

  // ❤️ 盖章 (保持不变)
  if (action === "like_message") {
    const { id } = event;
    if (!id) return { status: 400 };
    try {
      const msgRes = await db.collection("messages").doc(id).get();
      if (msgRes.data._openid === myOpenID)
        return { status: 403, msg: "不能给自己盖章" };
      const isLiked = msgRes.data.isLiked || false;
      await db
        .collection("messages")
        .doc(id)
        .update({ data: { isLiked: !isLiked } });
      return { status: 200, msg: !isLiked ? "已盖章" : "取消" };
    } catch (err) {
      return { status: 500 };
    }
  }

  // 📖 获取留言墙 (保持不变)
  if (action === "get_messages") {
    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const me = userRes.data[0];
    const partnerId = me.partner_id;

    let currentUsage = me.daily_usage || { date: todayStr, msg_count: 0 };
    if (currentUsage.date !== todayStr)
      currentUsage = { date: todayStr, msg_count: 0 };
    const remainingMsgCount = Math.max(
      0,
      DAILY_MSG_LIMIT - (currentUsage.msg_count || 0)
    );

    const queryList = [myOpenID];
    if (partnerId) queryList.push(partnerId);

    const targetDate = queryDate || todayStr;
    const msgs = await db
      .collection("messages")
      .where({ _openid: _.in(queryList), dateStr: targetDate })
      .orderBy("createdAt", "asc")
      .get();

    const nameMap = { [myOpenID]: me.nickName || "我" };
    let partnerStatus = null;
    if (partnerId) {
      const partnerRes = await db
        .collection("users")
        .where({ _openid: partnerId })
        .field({ status: true, nickName: true })
        .get();
      if (partnerRes.data.length > 0) {
        const p = partnerRes.data[0];
        partnerStatus = p.status || { text: "发呆中...", icon: "😶" };
        nameMap[partnerId] = p.nickName || "TA";
      }
    }

    const enrichedMsgs = msgs.data.map((msg) => ({
      ...msg,
      nickName: nameMap[msg._openid] || "神秘人",
      isMine: msg._openid === myOpenID,
    }));

    return {
      status: 200,
      data: enrichedMsgs,
      myStatus: me.status || { text: "摸鱼中...", icon: "🐟" },
      partnerStatus: partnerStatus,
      remainingMsgCount: remainingMsgCount,
    };
  }

  // 🚦 更新状态 (保持不变)
  if (action === "update_status") {
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
    await addLog(
      myOpenID,
      "update_status",
      `状态: ${statusIcon} ${statusText}`
    );
    return { status: 200, msg: "状态已同步" };
  }

  // === 9. 时光胶囊 (Time Capsule) - 🆕 新增模块 ===

  // 💊 埋下胶囊
  if (action === "bury_capsule") {
    if (!content && !imageFileID) return { status: 400, msg: "写点什么吧" };
    if (!openDate) return { status: 400, msg: "请选择开启日期" };

    // 1. 校验日期
    const today = new Date(todayStr);
    const targetDate = new Date(openDate);
    if (targetDate <= today) {
      return { status: 400, msg: "开启日期必须是未来哦" };
    }

    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const me = userRes.data[0];
    const partnerId = me.partner_id;

    if (!partnerId) return { status: 403, msg: "请先绑定伴侣再使用胶囊" };

    // 2. 写入数据库
    await db.collection("capsules").add({
      data: {
        _openid: myOpenID,
        to_openid: partnerId,
        content: content || "",
        imageFileID: imageFileID || "",
        openDate: openDate,
        createDate: todayStr,
        createdAt: db.serverDate(),
        status: 0, // 0: Locked, 1: Opened
      },
    });

    // 3. 记录日志 & 奖励
    let logTxt = content
      ? `埋下文字胶囊: ${content.substring(0, 5)}...`
      : "埋下图片胶囊";
    await addLog(myOpenID, "bury_capsule", logTxt, { openDate });

    // 埋胶囊奖励 10g
    let rewardWater = 10;
    await db
      .collection("users")
      .doc(me._id)
      .update({ data: { water_count: _.inc(rewardWater) } });

    // 4. 触发彩蛋检测
    let triggerEgg = null;

    // 彩蛋A: 月光宝盒 (深夜 0-4点)
    const currentHour = new Date().getHours() + 8; // 简单修正时区 (UTC+8)
    const localHour = currentHour >= 24 ? currentHour - 24 : currentHour;
    if (localHour >= 0 && localHour < 4) {
      const moonEgg = await tryTriggerEgg(
        "moonlight_box",
        66,
        "月光宝盒",
        "深夜埋藏了时光胶囊，那是心底的秘密"
      );
      if (moonEgg) {
        triggerEgg = moonEgg;
        await db
          .collection("users")
          .doc(me._id)
          .update({ data: { water_count: _.inc(moonEgg.bonus) } });
      }
    }

    // 彩蛋B: 时间领主 (跨度超过365天)
    const diffTime = Math.abs(targetDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 365) {
      // 优先显示时间领主 (如果同时触发，覆盖月光宝盒)
      const timeEgg = await tryTriggerEgg(
        "time_traveler",
        365,
        "时间领主",
        "埋下了一个封印期超过1年的时光胶囊"
      );
      if (timeEgg) {
        triggerEgg = timeEgg;
        await db
          .collection("users")
          .doc(me._id)
          .update({ data: { water_count: _.inc(timeEgg.bonus) } });
      }
    }

    return { status: 200, msg: "胶囊已埋下，静待花开 🌱", triggerEgg };
  }

  // 📂 获取胶囊列表
  if (action === "get_capsules") {
    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    if (userRes.data.length === 0) return { status: 404 };
    const me = userRes.data[0];
    const partnerId = me.partner_id;

    // 查我收到的 (Inbox)
    const inboxRes = await db
      .collection("capsules")
      .where({ to_openid: myOpenID })
      .orderBy("openDate", "asc")
      .get();

    // 查我埋下的 (Sent)
    const sentRes = await db
      .collection("capsules")
      .where({ _openid: myOpenID })
      .orderBy("createDate", "desc")
      .get();

    // 处理数据 (脱敏 & 状态计算)
    const processCapsule = (item, isInbox) => {
      const isOpenDay = item.openDate <= todayStr;
      // 如果是收到的胶囊，且未开启，不返回内容，防止抓包偷看
      const isSecret = isInbox && item.status === 0;

      return {
        _id: item._id,
        openDate: item.openDate,
        createDate: item.createDate,
        status: item.status,
        // 只有 我埋的 或者 已开启的 才能看内容
        content: isSecret ? "???" : item.content,
        imageFileID: isSecret ? "" : item.imageFileID,
        isLocked: !isOpenDay && item.status === 0,
        canOpen: isOpenDay && item.status === 0,
        isOpened: item.status === 1,
      };
    };

    const inbox = inboxRes.data.map((item) => processCapsule(item, true));
    const sent = sentRes.data.map((item) => processCapsule(item, false));

    return { status: 200, inbox, sent };
  }

  // 🔓 开启胶囊
  if (action === "open_capsule") {
    const { capsuleId } = event;
    if (!capsuleId) return { status: 400 };

    const capRes = await db.collection("capsules").doc(capsuleId).get();
    const cap = capRes.data;

    // 鉴权
    if (cap.to_openid !== myOpenID)
      return { status: 403, msg: "这不是给你的胶囊" };
    if (cap.openDate > todayStr) return { status: 403, msg: "还没到时间哦" };
    if (cap.status === 1)
      return { status: 200, data: cap, msg: "已经开启过了" };

    // 更新状态
    await db
      .collection("capsules")
      .doc(capsuleId)
      .update({
        data: { status: 1 },
      });

    // 记录日志
    await addLog(myOpenID, "open_capsule", "开启了一颗时光胶囊 ✨");

    // 彩蛋触发：守得云开 (第一次开启)
    let triggerEgg = null;
    const countRes = await db
      .collection("capsules")
      .where({ to_openid: myOpenID, status: 1 })
      .count();
    // 刚刚更新了一个，所以如果总数为1，说明这是第一个
    if (countRes.total === 1) {
      const waitEgg = await tryTriggerEgg(
        "worth_the_wait",
        100,
        "守得云开",
        "成功开启了第一个时光胶囊",
        false
      );
      if (waitEgg) {
        triggerEgg = waitEgg;
        const userRes = await db
          .collection("users")
          .where({ _openid: myOpenID })
          .get();
        await db
          .collection("users")
          .doc(userRes.data[0]._id)
          .update({ data: { water_count: _.inc(waitEgg.bonus) } });
      }
    }

    // 返回完整内容
    return { status: 200, data: cap, msg: "开启成功", triggerEgg };
  }
};
