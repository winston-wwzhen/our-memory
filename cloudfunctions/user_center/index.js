// cloudfunctions/user_center/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 随机昵称库
const RANDOM_NAMES = [
  "予你星河", "满眼星辰", "温柔本身", "限定温柔", 
  "捕获月亮", "追光者", "心动嘉宾", "贩卖快乐",
  "三餐四季", "白茶清欢", "星河滚烫", "人间理想"
];

function getRandomName() {
  const idx = Math.floor(Math.random() * RANDOM_NAMES.length);
  return RANDOM_NAMES[idx];
}

async function getSudoUsers() {
  try {
    const res = await db.collection('app_config').doc('global_settings').get();
    return res.data.sudo_users || [];
  } catch (err) { return []; }
}

function getTodayStr() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().split('T')[0];
}

// 🆕 通用日志记录函数
async function addLog(openid, type, content, extra = {}) {
  try {
    const todayStr = getTodayStr();
    await db.collection('logs').add({
      data: {
        _openid: openid,
        type: type,           // 类型: daily_check_in, water, harvest, bind
        content: content,     // 描述文本
        originalDate: todayStr,
        createdAt: db.serverDate(),
        ...extra              // 额外数据 (如 imageFileID, water_amount)
      }
    });
  } catch (err) {
    console.error("Log Error:", err);
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenID = wxContext.OPENID;
  const { action, partnerCode, decision, userInfo, imageFileID } = event;
  const todayStr = getTodayStr();

  const SUDO_USERS = await getSudoUsers();
  const DAILY_LOGIN_BONUS = 50; 

  // === 1. 登录 ===
  if (action === 'login') {
    let currentUser = null;
    let loginBonus = 0; 
    const res = await db.collection('users').where({ _openid: myOpenID }).get();
    
    if (res.data.length > 0) {
      currentUser = res.data[0];
      if (currentUser.last_login_date !== todayStr) {
        loginBonus = DAILY_LOGIN_BONUS; 
        await db.collection('users').doc(currentUser._id).update({
          data: { water_count: _.inc(loginBonus), last_login_date: todayStr }
        });
        currentUser.water_count = (currentUser.water_count || 0) + loginBonus;
        currentUser.last_login_date = todayStr;
        
        // 🆕 可选：记录每天第一次登录 (暂不开启，避免日志太多，这里仅做示例)
        // await addLog(myOpenID, 'login', '登录了纪念册');
      }
    } else {
      const newUser = {
        _openid: myOpenID, nickName: (userInfo?.nickName && userInfo.nickName !== '微信用户') ? userInfo.nickName : getRandomName(),
        avatarUrl: userInfo?.avatarUrl || '', partner_id: null, bind_request_from: null,
        water_count: DAILY_LOGIN_BONUS, last_login_date: todayStr, createdAt: db.serverDate()
      };
      const addRes = await db.collection('users').add({ data: newUser });
      currentUser = { ...newUser, _id: addRes._id };
      loginBonus = DAILY_LOGIN_BONUS;
      
      // 🆕 记录注册日志
      await addLog(myOpenID, 'register', '开启了我们的纪念册');
    }
    
    let partnerInfo = null;
    if (currentUser.partner_id) {
      const partnerRes = await db.collection('users').where({ _openid: currentUser.partner_id }).field({ nickName: true, avatarUrl: true, _openid: true }).get();
      if (partnerRes.data.length > 0) partnerInfo = partnerRes.data[0];
    }
    return { status: 200, user: currentUser, partner: partnerInfo, loginBonus: loginBonus, isVip: SUDO_USERS.includes(myOpenID) };
  }

  // === 2. 获取花园 ===
  if (action === 'get_garden') {
    const userRes = await db.collection('users').where({ _openid: myOpenID }).get();
    const me = userRes.data[0];
    const currentWater = me.water_count || 0;
    const partnerId = me.partner_id;

    let conditions = [{ owners: myOpenID }];
    if (partnerId) conditions.push({ owners: partnerId });

    const gardenRes = await db.collection('gardens').where(_.or(conditions)).orderBy('growth_value', 'desc').get();
    let myGarden = null;

    if (gardenRes.data.length > 0) {
      const allGardens = gardenRes.data;
      myGarden = allGardens[0];
      
      if (partnerId && !myGarden.owners.includes(partnerId)) {
         await db.collection('gardens').doc(myGarden._id).update({ data: { owners: _.addToSet(partnerId) } });
      }
      if (!myGarden.owners.includes(myOpenID)) {
         await db.collection('gardens').doc(myGarden._id).update({ data: { owners: _.addToSet(myOpenID) } });
      }
      if (allGardens.length > 1) {
        const gardensToDelete = allGardens.slice(1);
        for (let g of gardensToDelete) { await db.collection('gardens').doc(g._id).remove(); }
      }
    } else {
      let owners = [myOpenID];
      if (partnerId) owners.push(partnerId);
      const newGarden = { owners: owners, level: 1, growth_value: 0, harvest_count: 0, updatedAt: db.serverDate() };
      await db.collection('gardens').add({ data: newGarden });
      myGarden = newGarden;
    }
    return { status: 200, garden: myGarden, water: currentWater };
  }

  // === 3. 浇水 (记录日志) 💧 ===
  if (action === 'water_flower') {
    const COST = 10; const GROWTH = 10; 
    const userRes = await db.collection('users').where({ _openid: myOpenID }).get();
    const me = userRes.data[0];
    if ((me.water_count || 0) < COST) return { status: 400, msg: '爱意不足啦，快去首页打卡收集！' };

    await db.collection('users').where({ _openid: myOpenID }).update({ data: { water_count: _.inc(-COST) } });
    const gardenRes = await db.collection('gardens').where({ owners: myOpenID }).get();
    if (gardenRes.data.length > 0) {
      await db.collection('gardens').doc(gardenRes.data[0]._id).update({ data: { growth_value: _.inc(GROWTH), updatedAt: db.serverDate() } });
      
      // 🆕 记录浇水日志
      await addLog(myOpenID, 'water', `给玫瑰注入了 ${COST}g 爱意`, { growth_added: GROWTH });
      
      return { status: 200, msg: '注入成功，爱意满满！❤️' };
    } else { return { status: 404, msg: '花园数据异常' }; }
  }

  // === 4. 收获 (记录日志) 🏆 ===
  if (action === 'harvest_garden') {
    const gardenRes = await db.collection('gardens').where({ owners: myOpenID }).get();
    if (gardenRes.data.length > 0) {
      const garden = gardenRes.data[0];
      if (garden.growth_value < 300) return { status: 400, msg: '花朵还没完全盛开哦~' };

      await db.collection('gardens').doc(garden._id).update({
        data: { growth_value: 0, harvest_count: _.inc(1), updatedAt: db.serverDate() }
      });
      
      // 🆕 记录收获日志
      const newCount = (garden.harvest_count || 0) + 1;
      await addLog(myOpenID, 'harvest', `收获了第 ${newCount} 朵真爱玫瑰 🌹`);
      
      return { status: 200, msg: '收获成功！已种下新的种子 🌱' };
    } else { return { status: 404, msg: '花园数据异常' }; }
  }

  // === 5. 打卡 (继续使用 logs 表) ===
  if (action === 'check_in') {
    if (!imageFileID) return { status: 400, msg: '无图无真相' };
    const CHECKIN_REWARD = 50; 
    const oldLogRes = await db.collection('logs').where({ _openid: myOpenID, originalDate: todayStr }).get();
    let msg = '打卡成功！';
    
    if (oldLogRes.data.length > 0) {
      await db.collection('logs').doc(oldLogRes.data[0]._id).update({ data: { imageFileID, updatedAt: db.serverDate(), style: 'success' } });
      msg = '照片已更新！(今日奖励已领取)';
      // 更新日志不需要调 addLog，因为这本身就是 log 表操作
    } else {
      // 🆕 这里我们复用 addLog 函数，保持格式统一 (type: daily_check_in)
      await addLog(myOpenID, 'daily_check_in', '完成了今日打卡', { 
        imageFileID: imageFileID, 
        engine: 'tencent', 
        style: 'success' 
      });
      
      await db.collection('users').where({ _openid: myOpenID }).update({ data: { water_count: _.inc(CHECKIN_REWARD) } });
      msg = `打卡成功！获得 ${CHECKIN_REWARD}g 爱意 💧`;
    }
    return { status: 200, msg };
  }

  // === 6. 绑定 (记录日志) ===
  if (action === 'request_bind') {
    if (!partnerCode) return { status: 400, msg: '请输入对方编号' };
    if (partnerCode === myOpenID) return { status: 400, msg: '不能关联自己' };
    const partnerRes = await db.collection('users').where({ _openid: partnerCode }).get();
    if (partnerRes.data.length === 0) return { status: 404, msg: '编号不存在' };
    const partner = partnerRes.data[0];
    if (partner.partner_id) return { status: 403, msg: '对方已有伴侣' };
    await db.collection('users').where({ _openid: partnerCode }).update({ data: { bind_request_from: myOpenID } });
    return { status: 200, msg: '请求已发送' };
  }

  if (action === 'respond_bind') {
    if (!partnerCode) return { status: 400, msg: '参数缺失' };
    if (decision === 'reject') {
      await db.collection('users').where({ _openid: myOpenID }).update({ data: { bind_request_from: null } });
      return { status: 200, msg: '已拒绝' };
    }
    if (decision === 'accept') {
      await db.collection('users').where({ _openid: myOpenID }).update({ data: { partner_id: partnerCode, bind_request_from: null } });
      await db.collection('users').where({ _openid: partnerCode }).update({ data: { partner_id: myOpenID, bind_request_from: null } });
      
      // 🆕 记录绑定日志 (双方各记一条)
      await addLog(myOpenID, 'bind', '与另一半建立了关联 ❤️');
      await addLog(partnerCode, 'bind', '与另一半建立了关联 ❤️');
      
      return { status: 200, msg: '绑定成功' };
    }
  }

  if (action === 'update_profile') {
    const { avatarUrl, nickName } = event;
    await db.collection('users').where({ _openid: myOpenID }).update({ data: { avatarUrl, nickName } });
    return { status: 200, msg: 'OK' };
  }

  if (action === 'update_anniversary') {
    const { date } = event;
    const userRes = await db.collection('users').where({ _openid: myOpenID }).get();
    const me = userRes.data[0];
    const updateData = { anniversaryDate: date, anniversaryModifier: me.nickName || '伴侣', anniversaryUpdatedAt: db.serverDate() };
    await db.collection('users').doc(me._id).update({ data: updateData });
    if (me.partner_id) { await db.collection('users').where({ _openid: me.partner_id }).update({ data: updateData }); }
    
    // 🆕 记录纪念日修改日志
    await addLog(myOpenID, 'update_anniversary', `将纪念日修改为 ${date}`);
    
    return { status: 200, msg: '纪念日已同步更新' };
  }

  if (action === 'unbind') {
    if (!SUDO_USERS.includes(myOpenID)) return { status: 403, msg: '分手服务暂未开放 (需要冷静期)' };
    const myRes = await db.collection('users').where({ _openid: myOpenID }).get();
    if (myRes.data.length === 0) return { status: 404, msg: '用户不存在' };
    const me = myRes.data[0];
    const partnerID = me.partner_id;
    await db.collection('users').where({ _openid: myOpenID }).update({ data: { partner_id: null } });
    if (partnerID) await db.collection('users').where({ _openid: partnerID }).update({ data: { partner_id: null } });
    
    // 🆕 记录解绑日志
    await addLog(myOpenID, 'unbind', '解除了关联 💔');
    
    return { status: 200, msg: '已解除关联' };
  }
};