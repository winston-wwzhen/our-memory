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

// 获取全局白名单配置
async function getSudoUsers() {
  try {
    const res = await db.collection("app_config").doc("global_settings").get();
    return res.data.sudo_users || [];
  } catch (err) {
    return [];
  }
}

// 获取北京时间日期字符串 (YYYY-MM-DD)
function getTodayStr() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().split("T")[0];
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenID = wxContext.OPENID;
  const { action, partnerCode, decision, userInfo, imageFileID } = event;
  const todayStr = getTodayStr();

  const SUDO_USERS = await getSudoUsers();

  // 🟢 配置：每日登录奖励数量
  const DAILY_LOGIN_BONUS = 50;

  // ============================================================
  // 1. 登录 (Login) - 修复奖励发放逻辑
  // ============================================================
  if (action === "login") {
    let currentUser = null;
    let loginBonus = 0;

    const res = await db.collection("users").where({ _openid: myOpenID }).get();

    if (res.data.length > 0) {
      currentUser = res.data[0];

      // 检查是否是新的一天
      if (currentUser.last_login_date !== todayStr) {
        loginBonus = DAILY_LOGIN_BONUS;

        // 执行数据库更新
        await db
          .collection("users")
          .doc(currentUser._id)
          .update({
            data: {
              water_count: _.inc(loginBonus), // 原子自增，确保准确
              last_login_date: todayStr,
            },
          });

        // 重要：更新内存中的数据，以便返回给前端显示
        currentUser.water_count = (currentUser.water_count || 0) + loginBonus;
        currentUser.last_login_date = todayStr;
      }
    } else {
      // 新用户注册
      const newUser = {
        _openid: myOpenID,
        nickName:
          userInfo?.nickName && userInfo.nickName !== "微信用户"
            ? userInfo.nickName
            : getRandomName(),
        avatarUrl: userInfo?.avatarUrl || "",
        partner_id: null,
        bind_request_from: null,
        water_count: DAILY_LOGIN_BONUS, // 新用户直接送奖励
        last_login_date: todayStr,
        createdAt: db.serverDate(),
      };
      const addRes = await db.collection("users").add({ data: newUser });
      currentUser = { ...newUser, _id: addRes._id };
      loginBonus = DAILY_LOGIN_BONUS;
    }

    // 获取伴侣信息
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
      loginBonus: loginBonus, // 返回本次奖励金额
      isVip: SUDO_USERS.includes(myOpenID),
    };
  }

 // ============================================================
  // 2. 获取花园数据 (智能合并版) 🌻
  // ============================================================
  if (action === 'get_garden') {
    // 1. 获取我的信息和伴侣ID
    const userRes = await db.collection('users').where({ _openid: myOpenID }).get();
    const me = userRes.data[0];
    const currentWater = me.water_count || 0;
    const partnerId = me.partner_id;

    // 2. 构造查询条件：查找 拥有者包含“我” 或者 “我的伴侣” 的所有花园
    let conditions = [{ owners: myOpenID }];
    if (partnerId) {
      conditions.push({ owners: partnerId });
    }

    // 按成长值倒序排列（为了在冲突时保留最好的那一个）
    const gardenRes = await db.collection('gardens')
      .where(_.or(conditions))
      .orderBy('growth_value', 'desc') 
      .get();

    let myGarden = null;

    if (gardenRes.data.length > 0) {
      const allGardens = gardenRes.data;
      
      // === 情况 A: 找到了花园 (可能是1个，也可能是2个冲突的) ===
      
      // 默认取第一个（成长值最高的）作为主花园
      myGarden = allGardens[0];
      
      // 检查：如果我有伴侣，但这个花园的 owners 里没有伴侣，加上 TA！
      if (partnerId && !myGarden.owners.includes(partnerId)) {
         await db.collection('gardens').doc(myGarden._id).update({
           data: { owners: _.addToSet(partnerId) }
         });
      }
      // 检查：如果这个花园 owners 里没我（可能是伴侣的花园），加上我！
      if (!myGarden.owners.includes(myOpenID)) {
         await db.collection('gardens').doc(myGarden._id).update({
           data: { owners: _.addToSet(myOpenID) }
         });
      }

      // === 冲突处理：如果发现多于1个花园 (即两人之前各玩各的) ===
      if (allGardens.length > 1) {
        console.log('发现花园冲突，开始合并...');
        // 保留第一个(最好的)，删除其余的
        const gardensToDelete = allGardens.slice(1);
        for (let g of gardensToDelete) {
          await db.collection('gardens').doc(g._id).remove();
        }
      }

    } else {
      // === 情况 B: 咱们俩谁都没花园 ===
      // 创建一个新的，把两人都加进去
      let owners = [myOpenID];
      if (partnerId) owners.push(partnerId);
      
      const newGarden = {
        owners: owners,
        level: 1,
        growth_value: 0,
        harvest_count: 0,
        updatedAt: db.serverDate()
      };
      await db.collection('gardens').add({ data: newGarden });
      myGarden = newGarden;
    }
    
    return { status: 200, garden: myGarden, water: currentWater };
  }

  // ============================================================
  // 3. 注入爱意 (Watering)
  // ============================================================
  if (action === "water_flower") {
    const COST = 10;
    const GROWTH = 10;

    // 1. 检查水滴
    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    const currentWater = userRes.data[0].water_count || 0;

    if (currentWater < COST) {
      return { status: 400, msg: "爱意不足啦，快去首页打卡收集！" };
    }

    // 2. 扣除水滴
    await db
      .collection("users")
      .where({ _openid: myOpenID })
      .update({
        data: { water_count: _.inc(-COST) },
      });

    // 3. 增加成长值
    const gardenRes = await db
      .collection("gardens")
      .where({ owners: myOpenID })
      .get();
    if (gardenRes.data.length > 0) {
      const gardenId = gardenRes.data[0]._id;
      await db
        .collection("gardens")
        .doc(gardenId)
        .update({
          data: {
            growth_value: _.inc(GROWTH),
            updatedAt: db.serverDate(),
          },
        });

      return { status: 200, msg: "注入成功，爱意满满！❤️" };
    } else {
      return { status: 404, msg: "花园数据异常" };
    }
  }

  // === 🆕 4. 收获花园 (Harvest) ===
  if (action === "harvest_garden") {
    const gardenRes = await db
      .collection("gardens")
      .where({ owners: myOpenID })
      .get();
    if (gardenRes.data.length > 0) {
      const garden = gardenRes.data[0];
      const gardenId = garden._id;

      // 简单校验：成长值是否足够 (假设 300 分满级)
      if (garden.growth_value < 300) {
        return { status: 400, msg: "花朵还没完全盛开哦~" };
      }

      // 执行收获：重置成长值，增加收获计数
      await db
        .collection("gardens")
        .doc(gardenId)
        .update({
          data: {
            growth_value: 0, // 重置归零
            harvest_count: _.inc(1), // 收获数+1
            updatedAt: db.serverDate(),
          },
        });

      // 可选：在这里可以将本次种植记录存档到另一个集合，暂略

      return { status: 200, msg: "收获成功！已种下新的种子 🌱" };
    } else {
      return { status: 404, msg: "花园数据异常" };
    }
  }

  // ============================================================
  // 4. 每日打卡 (Check In)
  // ============================================================
  if (action === "check_in") {
    if (!imageFileID) return { status: 400, msg: "无图无真相" };

    const CHECKIN_REWARD = 50;

    const oldLogRes = await db
      .collection("logs")
      .where({
        _openid: myOpenID,
        originalDate: todayStr,
      })
      .get();

    let msg = "打卡成功！";

    if (oldLogRes.data.length > 0) {
      const oldLogId = oldLogRes.data[0]._id;
      await db
        .collection("logs")
        .doc(oldLogId)
        .update({
          data: { imageFileID, updatedAt: db.serverDate(), style: "success" },
        });
      msg = "照片已更新！(今日奖励已领取)";
    } else {
      await db.collection("logs").add({
        data: {
          _openid: myOpenID,
          createdAt: db.serverDate(),
          imageFileID,
          originalDate: todayStr,
          type: "daily_check_in",
          engine: "tencent",
          style: "success",
        },
      });

      // 发放打卡奖励
      await db
        .collection("users")
        .where({ _openid: myOpenID })
        .update({
          data: { water_count: _.inc(CHECKIN_REWARD) },
        });
      msg = `打卡成功！获得 ${CHECKIN_REWARD}g 爱意 💧`;
    }
    return { status: 200, msg };
  }

  // ============================================================
  // 5. 绑定与其他逻辑 (保持不变)
  // ============================================================
  if (action === "request_bind") {
    if (!partnerCode) return { status: 400, msg: "请输入对方编号" };
    if (partnerCode === myOpenID) return { status: 400, msg: "不能关联自己" };
    const partnerRes = await db
      .collection("users")
      .where({ _openid: partnerCode })
      .get();
    if (partnerRes.data.length === 0) return { status: 404, msg: "编号不存在" };
    const partner = partnerRes.data[0];
    if (partner.partner_id) return { status: 403, msg: "对方已有伴侣" };
    await db
      .collection("users")
      .where({ _openid: partnerCode })
      .update({
        data: { bind_request_from: myOpenID },
      });
    return { status: 200, msg: "请求已发送" };
  }

  if (action === "respond_bind") {
    if (!partnerCode) return { status: 400, msg: "参数缺失" };
    if (decision === "reject") {
      await db
        .collection("users")
        .where({ _openid: myOpenID })
        .update({
          data: { bind_request_from: null },
        });
      return { status: 200, msg: "已拒绝" };
    }
    if (decision === "accept") {
      await db
        .collection("users")
        .where({ _openid: myOpenID })
        .update({
          data: { partner_id: partnerCode, bind_request_from: null },
        });
      await db
        .collection("users")
        .where({ _openid: partnerCode })
        .update({
          data: { partner_id: myOpenID, bind_request_from: null },
        });
      return { status: 200, msg: "绑定成功" };
    }
  }

  if (action === "update_profile") {
    const { avatarUrl, nickName } = event;
    await db.collection("users").where({ _openid: myOpenID }).update({
      data: { avatarUrl, nickName },
    });
    return { status: 200, msg: "OK" };
  }

  if (action === 'update_anniversary') {
    const { date } = event;
    
    // 1. 获取我的当前信息，主要是为了拿 partner_id
    const userRes = await db.collection('users').where({ _openid: myOpenID }).get();
    const me = userRes.data[0];
    
    // 2. 准备更新的数据包
    // 增加 updatedBy 字段，记录是谁修改的
    const updateData = {
      anniversaryDate: date,
      anniversaryModifier: me.nickName || '伴侣', // 记录修改人的昵称
      anniversaryUpdatedAt: db.serverDate()
    };

    // 3. 更新我自己
    await db.collection('users').doc(me._id).update({
      data: updateData
    });

    // 4. 关键：如果有伴侣，同步更新伴侣的数据
    if (me.partner_id) {
      await db.collection('users').where({ _openid: me.partner_id }).update({
        data: updateData
      });
    }

    return { status: 200, msg: '纪念日已同步更新' };
  }

  if (action === "unbind") {
    if (!SUDO_USERS.includes(myOpenID)) {
      return { status: 403, msg: "分手服务暂未开放 (需要冷静期)" };
    }
    const myRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();
    if (myRes.data.length === 0) return { status: 404, msg: "用户不存在" };
    const me = myRes.data[0];
    const partnerID = me.partner_id;
    await db
      .collection("users")
      .where({ _openid: myOpenID })
      .update({ data: { partner_id: null } });
    if (partnerID) {
      await db
        .collection("users")
        .where({ _openid: partnerID })
        .update({ data: { partner_id: null } });
    }
    return { status: 200, msg: "已解除关联" };
  }
};
