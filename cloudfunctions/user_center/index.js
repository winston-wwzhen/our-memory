// cloudfunctions/user_center/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 🆕 文艺昵称库
const RANDOM_NAMES = [
  "予你星河", "满眼星辰", "温柔本身", "限定温柔", 
  "捕获月亮", "追光者", "心动嘉宾", "贩卖快乐", 
  "揉碎星光", "山河入梦", "清风徐来", "一纸情书", 
  "半夏微凉", "时光笔录", "岁岁平安", "三餐四季",
  "可乐加冰", "全糖去冰", "偷得浮生", "朝朝暮暮",
  "白茶清欢", "云朵偷喝我酒", "星河滚烫", "人间理想"
]

// 🆕 辅助函数：随机获取名字
function getRandomName() {
  const idx = Math.floor(Math.random() * RANDOM_NAMES.length);
  return RANDOM_NAMES[idx];
}

// 辅助函数：读取全局配置
async function getSudoUsers() {
  try {
    const res = await db.collection('app_config').doc('global_settings').get();
    return res.data.sudo_users || [];
  } catch (err) {
    return []; 
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenID = wxContext.OPENID;
  const { action, partnerCode, decision, userInfo, imageFileID } = event;

  const SUDO_USERS = await getSudoUsers();

  // 1. 登录 (Login)
  if (action === 'login') {
    let currentUser = null;
    const res = await db.collection('users').where({ _openid: myOpenID }).get();
    
    if (res.data.length > 0) {
      currentUser = res.data[0];
      // 🆕 如果老用户还是“微信用户”，趁机给他改个名 (可选优化)
      if (currentUser.nickName === '微信用户') {
         const newName = getRandomName();
         await db.collection('users').doc(currentUser._id).update({ data: { nickName: newName }});
         currentUser.nickName = newName;
      }
    } else {
      // 🆕 新用户注册：随机取名
      const randomNick = getRandomName();
      
      const newUser = {
        _openid: myOpenID,
        // 如果前端没传名字，或者传的是默认值，就用随机名
        nickName: (userInfo?.nickName && userInfo.nickName !== '微信用户') ? userInfo.nickName : randomNick,
        avatarUrl: userInfo?.avatarUrl || '',
        partner_id: null,
        bind_request_from: null,
        createdAt: db.serverDate()
      };
      await db.collection('users').add({ data: newUser });
      currentUser = newUser;
    }

    let partnerInfo = null;
    if (currentUser.partner_id) {
      const partnerRes = await db.collection('users')
        .where({ _openid: currentUser.partner_id })
        .field({ nickName: true, avatarUrl: true, _openid: true })
        .get();
      if (partnerRes.data.length > 0) partnerInfo = partnerRes.data[0];
    }

    return { 
      status: 200, 
      user: currentUser, 
      partner: partnerInfo,
      isVip: SUDO_USERS.includes(myOpenID)
    };
  }

  // 2. 发起绑定请求
  if (action === 'request_bind') {
    if (!partnerCode) return { status: 400, msg: '请输入对方编号' };
    if (partnerCode === myOpenID) return { status: 400, msg: '不能关联自己' };

    const partnerRes = await db.collection('users').where({ _openid: partnerCode }).get();
    if (partnerRes.data.length === 0) return { status: 404, msg: '编号不存在' };
    
    const partner = partnerRes.data[0];
    if (partner.partner_id) return { status: 403, msg: '对方已有伴侣' };
    if (partner.bind_request_from === myOpenID) return { status: 200, msg: '请求已发送' };

    await db.collection('users').where({ _openid: partnerCode }).update({
      data: { bind_request_from: myOpenID }
    });
    return { status: 200, msg: '请求已发送' };
  }

  // 3. 响应绑定
  if (action === 'respond_bind') {
    if (!partnerCode) return { status: 400, msg: '参数缺失' };

    if (decision === 'reject') {
      await db.collection('users').where({ _openid: myOpenID }).update({
        data: { bind_request_from: null }
      });
      return { status: 200, msg: '已拒绝' };
    }

    if (decision === 'accept') {
      const requesterRes = await db.collection('users').where({ _openid: partnerCode }).get();
      if (requesterRes.data.length === 0 || requesterRes.data[0].partner_id) {
        return { status: 400, msg: '对方状态已失效' };
      }

      await db.collection('users').where({ _openid: myOpenID }).update({
        data: { partner_id: partnerCode, bind_request_from: null }
      });
      await db.collection('users').where({ _openid: partnerCode }).update({
        data: { partner_id: myOpenID, bind_request_from: null }
      });
      return { status: 200, msg: '绑定成功' };
    }
  }

  // 4. 更新资料
  if (action === 'update_profile') {
    const { avatarUrl, nickName } = event;
    await db.collection('users').where({ _openid: myOpenID }).update({
      data: { avatarUrl, nickName }
    });
    return { status: 200, msg: 'OK' };
  }

  // 🆕 新增：更新纪念日
  if (action === 'update_anniversary') {
    const { date } = event;
    await db.collection('users').where({ _openid: myOpenID }).update({
      data: { anniversaryDate: date }
    });
    return { status: 200, msg: '纪念日已更新' };
  }

  // 5. 解除绑定
  if (action === 'unbind') {
    // 恢复限制：只有白名单用户可以解绑
    if (!SUDO_USERS.includes(myOpenID)) {
      return { status: 403, msg: '分手服务暂未开放 (需要冷静期)' };
    }
    
    const myRes = await db.collection('users').where({ _openid: myOpenID }).get();
    if (myRes.data.length === 0) return { status: 404, msg: '用户不存在' };
    
    const me = myRes.data[0];
    const partnerID = me.partner_id;

    await db.collection('users').where({ _openid: myOpenID }).update({ data: { partner_id: null } });
    if (partnerID) {
      await db.collection('users').where({ _openid: partnerID }).update({ data: { partner_id: null } });
    }
    return { status: 200, msg: '已解除关联' };
  }

  // 6. 确认打卡
  if (action === 'check_in') {
    if (!imageFileID) return { status: 400, msg: '无图无真相' };
    
    // 获取北京时间
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayStr = beijingTime.toISOString().split('T')[0];

    // 查重逻辑
    const oldLogRes = await db.collection('logs').where({
      _openid: myOpenID,
      originalDate: todayStr
    }).get();

    if (oldLogRes.data.length > 0) {
      const oldLogId = oldLogRes.data[0]._id;
      await db.collection('logs').doc(oldLogId).update({
        data: {
          imageFileID: imageFileID,
          updatedAt: db.serverDate(),
          style: 'success'
        }
      });
      return { status: 200, msg: '今日打卡已更新！' };
    } else {
      await db.collection('logs').add({
        data: {
          _openid: myOpenID,
          createdAt: db.serverDate(),
          imageFileID: imageFileID,
          originalDate: todayStr,
          type: 'daily_check_in',
          engine: 'tencent',
          style: 'success'
        }
      });
      return { status: 200, msg: '打卡成功！' };
    }
  }
};