// cloudfunctions/user_center/index.js
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 随机昵称库
const RANDOM_NAMES = [
  "予你星河", "满眼星辰", "温柔本身", "限定温柔", "捕获月亮", "追光者",
  "心动嘉宾", "贩卖快乐", "三餐四季", "白茶清欢", "星河滚烫", "人间理想",
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
  const { action, partnerCode, decision, userInfo, imageFileID, style} = event;
  const todayStr = getTodayStr();

  const SUDO_USERS = await getSudoUsers();
  
  // 🟢 配置中心
  const DAILY_FREE_LIMIT = 1; // 每日免费基础次数
  const DAILY_AD_LIMIT = 1;   // 每日看广告奖励上限次数
  const DAILY_LOGIN_BONUS = 50;

  // === 1. 登录与注册 ===
  if (action === "login") {
    let currentUser = null;
    let loginBonus = 0;
    let registerDays = 1;

    const res = await db.collection("users").where({ _openid: myOpenID }).get();

    if (res.data.length > 0) {
      currentUser = res.data[0];
      
      // 跨天重置逻辑
      if (currentUser.last_login_date !== todayStr) {
        loginBonus = DAILY_LOGIN_BONUS;
        const resetUsage = { date: todayStr, count: 0, ad_count: 0 };
        
        await db.collection("users").doc(currentUser._id).update({
          data: { 
            water_count: _.inc(loginBonus), 
            last_login_date: todayStr,
            daily_usage: resetUsage 
          },
        });
        currentUser.water_count = (currentUser.water_count || 0) + loginBonus;
        currentUser.last_login_date = todayStr;
        currentUser.daily_usage = resetUsage;
      }

      // 计算注册天数
      if (currentUser.createdAt) {
        const created = new Date(currentUser.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now - created);
        registerDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      }
    } else {
      // 新用户注册
      const newUser = {
        _openid: myOpenID,
        nickName: userInfo?.nickName && userInfo.nickName !== "微信用户" ? userInfo.nickName : getRandomName(),
        avatarUrl: userInfo?.avatarUrl || "",
        partner_id: null,
        bind_request_from: null,
        water_count: DAILY_LOGIN_BONUS,
        rose_balance: 0,
        last_login_date: todayStr,
        createdAt: db.serverDate(),
        daily_usage: { date: todayStr, count: 0, ad_count: 0 }
      };
      const addRes = await db.collection("users").add({ data: newUser });
      currentUser = { ...newUser, _id: addRes._id };
      loginBonus = DAILY_LOGIN_BONUS;
      registerDays = 1; 
      await addLog(myOpenID, "register", "开启了我们的纪念册");
    }

    // 计算剩余次数：基础(1) + 广告奖励 - 已用
    const stats = currentUser.daily_usage || { count: 0, ad_count: 0 };
    const adRewards = stats.ad_count || 0;
    const maxLimit = DAILY_FREE_LIMIT + adRewards;
    const remaining = Math.max(0, maxLimit - (stats.count || 0));

    let partnerInfo = null;
    if (currentUser.partner_id) {
      const partnerRes = await db.collection("users").where({ _openid: currentUser.partner_id })
        .field({ nickName: true, avatarUrl: true, _openid: true }).get();
      if (partnerRes.data.length > 0) partnerInfo = partnerRes.data[0];
    }

    return {
      status: 200,
      user: currentUser,
      partner: partnerInfo,
      loginBonus: loginBonus,
      isVip: SUDO_USERS.includes(myOpenID),
      registerDays: registerDays,
      remaining: remaining,
      dailyFreeLimit: DAILY_FREE_LIMIT,
      adCount: adRewards, // 🟢 返回今日已看广告次数
      dailyAdLimit: DAILY_AD_LIMIT // 🟢 返回广告上限
    };
  }

  // === 🆕 新增：看广告获得奖励 ===
  if (action === "watch_ad_reward") {
    const userRes = await db.collection("users").where({ _openid: myOpenID }).get();
    if (userRes.data.length === 0) return { status: 404 };
    
    const user = userRes.data[0];
    const stats = user.daily_usage || { date: todayStr, count: 0, ad_count: 0 };
    
    // 如果日期不对（跨天未登录），先重置
    const isToday = stats.date === todayStr;
    const currentAdCount = isToday ? (stats.ad_count || 0) : 0;

    // 🟢 校验广告上限
    if (currentAdCount >= DAILY_AD_LIMIT) {
      return { status: 403, msg: "今日广告奖励次数已达上限" };
    }

    const updateData = isToday 
      ? { "daily_usage.ad_count": _.inc(1) }
      : { daily_usage: { date: todayStr, count: 0, ad_count: 1 } };

    await db.collection("users").doc(user._id).update({ data: updateData });
    return { status: 200, msg: "奖励到账，次数+1" };
  }

  // === 2. 获取花园 ===
  if (action === "get_garden") {
    const userRes = await db.collection("users").where({ _openid: myOpenID }).get();
    const me = userRes.data[0];
    const currentWater = me.water_count || 0;
    const myRoseBalance = me.rose_balance || 0;
    const partnerId = me.partner_id;

    let conditions = [{ owners: myOpenID }];
    if (partnerId) conditions.push({ owners: partnerId });

    const gardenRes = await db.collection("gardens").where(_.or(conditions)).orderBy("growth_value", "desc").get();
    let myGarden = null;

    if (gardenRes.data.length > 0) {
      const allGardens = gardenRes.data;
      myGarden = allGardens[0];
      if (partnerId && !myGarden.owners.includes(partnerId)) {
        await db.collection("gardens").doc(myGarden._id).update({ data: { owners: _.addToSet(partnerId) } });
      }
      if (!myGarden.owners.includes(myOpenID)) {
        await db.collection("gardens").doc(myGarden._id).update({ data: { owners: _.addToSet(myOpenID) } });
      }
      if (myGarden.rose_balance && myGarden.rose_balance > 0) {
        const oldBalance = myGarden.rose_balance;
        await db.collection("users").doc(me._id).update({ data: { rose_balance: _.inc(oldBalance) } });
        await db.collection("gardens").doc(myGarden._id).update({ data: { rose_balance: 0 } });
        myGarden.rose_balance = 0;
      }
    } else {
      let owners = [myOpenID];
      if (partnerId) owners.push(partnerId);
      const newGarden = {
        owners: owners,
        level: 1,
        growth_value: 0,
        harvest_count: 0,
        harvest_total: 0,
        updatedAt: db.serverDate(),
      };
      await db.collection("gardens").add({ data: newGarden });
      myGarden = newGarden;
    }
    myGarden.rose_balance = myRoseBalance;

    let recentLogs = [];
    try {
      const owners = myGarden.owners || [myOpenID];
      const usersRes = await db.collection("users").where({ _openid: _.in(owners) })
        .field({ _openid: true, nickName: true, avatarUrl: true }).get();
      const userMap = {};
      usersRes.data.forEach((u) => (userMap[u._openid] = u));

      const logsRes = await db.collection("logs")
        .where({ type: "water", _openid: _.in(owners) })
        .orderBy("createdAt", "desc").limit(10).get();

      recentLogs = logsRes.data.map((log) => {
        const u = userMap[log._openid] || { nickName: "Ta", avatarUrl: "" };
        return {
          nickName: u.nickName,
          avatarUrl: u.avatarUrl,
          content: log.content,
          date: log.createdAt,
          isMine: log._openid === myOpenID,
        };
      });
    } catch (e) { console.error(e); }

    return { status: 200, garden: myGarden, water: currentWater, logs: recentLogs };
  }

  // === 3. 浇水 ===
  if (action === "water_flower") {
    const COST = 10;
    const GROWTH = 10;
    const userRes = await db.collection("users").where({ _openid: myOpenID }).get();
    const me = userRes.data[0];
    if ((me.water_count || 0) < COST) return { status: 400, msg: "爱意不足啦，快去首页打卡收集！" };

    await db.collection("users").doc(me._id).update({ data: { water_count: _.inc(-COST) } });
    const gardenRes = await db.collection("gardens").where({ owners: myOpenID }).get();
    if (gardenRes.data.length > 0) {
      await db.collection("gardens").doc(gardenRes.data[0]._id).update({
        data: { growth_value: _.inc(GROWTH), updatedAt: db.serverDate() },
      });
      await addLog(myOpenID, "water", `给玫瑰注入了 ${COST}g 爱意`, { growth_added: GROWTH });
      return { status: 200, msg: "注入成功，爱意满满！❤️" };
    }
    return { status: 404, msg: "花园数据异常" };
  }

  // === 4. 收获 ===
  if (action === "harvest_garden") {
    const gardenRes = await db.collection("gardens").where({ owners: myOpenID }).get();
    if (gardenRes.data.length > 0) {
      const garden = gardenRes.data[0];
      if (garden.growth_value < 300) return { status: 400, msg: "花朵还没完全盛开哦~" };

      await db.collection("gardens").doc(garden._id).update({
        data: { growth_value: 0, harvest_total: _.inc(1), updatedAt: db.serverDate() },
      });
      const owners = garden.owners || [];
      if (owners.length > 0) {
        await db.collection("users").where({ _openid: _.in(owners) }).update({ data: { rose_balance: _.inc(1) } });
      }
      const newTotal = (garden.harvest_total || 0) + 1;
      await addLog(myOpenID, "harvest", `收获了第 ${newTotal} 朵真爱玫瑰 🌹`);
      return { status: 200, msg: "收获成功！你和 TA 各获得 1 朵玫瑰 🌹" };
    }
    return { status: 404, msg: "花园数据异常" };
  }

  // === 5. 打卡 (保存照片) ===
  if (action === "check_in") {
    if (!imageFileID) return { status: 400, msg: "无图无真相" };
    const CHECKIN_REWARD = 50;
    
    // 查找今天已有的 "daily_check_in" 记录
    const oldLogRes = await db.collection("logs").where({ 
      _openid: myOpenID, 
      originalDate: todayStr,
      type: 'daily_check_in' 
    }).get();

    let msg = "打卡成功！";

    if (oldLogRes.data.length > 0) {
      await db.collection("logs").doc(oldLogRes.data[0]._id).update({
        data: { imageFileID: imageFileID, updatedAt: db.serverDate(), style: style || "Sweet Moment"},
      });
      msg = "照片已更新！(今日奖励已领取)";
    } else {
      await db.collection("logs").add({
        data: {
          _openid: myOpenID,
          type: "daily_check_in",
          content: "完成了今日打卡",
          imageFileID: imageFileID,
          originalDate: todayStr,
          createdAt: db.serverDate(),
          engine: "tencent",
          style: style || "Sweet Moment",
        },
      });
      await db.collection("users").where({ _openid: myOpenID }).update({
        data: { water_count: _.inc(CHECKIN_REWARD) },
      });
      msg = `打卡成功！获得 ${CHECKIN_REWARD}g 爱意 💧`;
    }
    return { status: 200, msg };
  }

  // === 6. 兑换 ===
  if (action === "redeem_coupon") {
    const { templateId, title, desc, cost, type } = event;
    const userRes = await db.collection("users").where({ _openid: myOpenID }).get();
    const me = userRes.data[0];
    const balance = me.rose_balance || 0;
    if (balance < cost) return { status: 400, msg: `玫瑰不足，还差 ${cost - balance} 朵哦~` };

    await db.collection("users").doc(me._id).update({ data: { rose_balance: _.inc(-cost) } });
    await db.collection("coupons").add({
      data: {
        _openid: myOpenID,
        templateId, title, desc, type, cost, status: 0, createdAt: db.serverDate(),
      },
    });
    await addLog(myOpenID, "redeem", `消耗 ${cost} 朵玫瑰兑换了【${title}】`);
    return { status: 200, msg: "兑换成功，已放入卡包！" };
  }

  // === 7. 辅助功能 ===
  if (action === "get_my_coupons") {
    const res = await db.collection("coupons").where({ _openid: myOpenID }).orderBy("createdAt", "desc").get();
    return { status: 200, data: res.data };
  }
  if (action === "make_decision") {
    const { category, result } = event;
    await addLog(myOpenID, "decision", `决定${category}：${result}`);
    const updateData = { last_decision: { category, result, time: db.serverDate() } };
    await db.collection("users").where({ _openid: myOpenID }).update({ data: updateData });
    return { status: 200, msg: "决定已生效！" };
  }
  if (action === "get_partner_decision") {
    const userRes = await db.collection("users").where({ _openid: myOpenID }).get();
    const me = userRes.data[0];
    let partnerDecision = null;
    if (me.partner_id) {
      const partnerRes = await db.collection("users").where({ _openid: me.partner_id })
        .field({ last_decision: true, nickName: true }).get();
      if (partnerRes.data.length > 0) {
        partnerDecision = partnerRes.data[0].last_decision;
        if (partnerDecision) partnerDecision.nickName = partnerRes.data[0].nickName;
      }
    }
    return { status: 200, data: partnerDecision };
  }
  if (action === "request_bind") {
    if (!partnerCode) return { status: 400, msg: "请输入对方编号" };
    if (partnerCode === myOpenID) return { status: 400, msg: "不能关联自己" };
    const partnerRes = await db.collection("users").where({ _openid: partnerCode }).get();
    if (partnerRes.data.length === 0) return { status: 404, msg: "编号不存在" };
    const partner = partnerRes.data[0];
    if (partner.partner_id) return { status: 403, msg: "对方已有伴侣" };
    await db.collection("users").where({ _openid: partnerCode }).update({ data: { bind_request_from: myOpenID } });
    return { status: 200, msg: "请求已发送" };
  }
  if (action === "respond_bind") {
    if (!partnerCode) return { status: 400, msg: "参数缺失" };
    if (decision === "reject") {
      await db.collection("users").where({ _openid: myOpenID }).update({ data: { bind_request_from: null } });
      return { status: 200, msg: "已拒绝" };
    }
    if (decision === "accept") {
      await db.collection("users").where({ _openid: myOpenID }).update({ data: { partner_id: partnerCode, bind_request_from: null } });
      await db.collection("users").where({ _openid: partnerCode }).update({ data: { partner_id: myOpenID, bind_request_from: null } });
      await addLog(myOpenID, "bind", "与另一半建立了关联 ❤️");
      await addLog(partnerCode, "bind", "与另一半建立了关联 ❤️");
      return { status: 200, msg: "绑定成功" };
    }
  }
  if (action === "update_profile") {
    const { avatarUrl, nickName } = event;
    await db.collection("users").where({ _openid: myOpenID }).update({ data: { avatarUrl, nickName } });
    return { status: 200, msg: "OK" };
  }
  if (action === "update_anniversary") {
    const { date } = event;
    const userRes = await db.collection("users").where({ _openid: myOpenID }).get();
    const me = userRes.data[0];
    const updateData = {
      anniversaryDate: date,
      anniversaryModifier: me.nickName || "伴侣",
      anniversaryUpdatedAt: db.serverDate(),
    };
    await db.collection("users").doc(me._id).update({ data: updateData });
    if (me.partner_id) {
      await db.collection("users").where({ _openid: me.partner_id }).update({ data: updateData });
    }
    await addLog(myOpenID, "update_anniversary", `将纪念日修改为 ${date}`);
    return { status: 200, msg: "纪念日已同步更新" };
  }
  if (action === "unbind") {
    if (!SUDO_USERS.includes(myOpenID)) return { status: 403, msg: "分手服务暂未开放" };
    const myRes = await db.collection("users").where({ _openid: myOpenID }).get();
    if (myRes.data.length === 0) return { status: 404, msg: "用户不存在" };
    const me = myRes.data[0];
    const partnerID = me.partner_id;
    await db.collection("users").where({ _openid: myOpenID }).update({ data: { partner_id: null } });
    if (partnerID) await db.collection("users").where({ _openid: partnerID }).update({ data: { partner_id: null } });
    await addLog(myOpenID, "unbind", "解除了关联 💔");
    return { status: 200, msg: "已解除关联" };
  }
};