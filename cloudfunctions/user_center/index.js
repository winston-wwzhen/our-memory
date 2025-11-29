// cloudfunctions/user_center/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 📅 辅助函数：获取北京时间日期字符串 (YYYY-MM-DD)
function getBeijingDateStr() {
  const now = new Date();
  // UTC+8
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().split('T')[0]; 
}

// 🆕 辅助函数：读取全局配置
async function getSudoUsers() {
  try {
    const res = await db.collection('app_config').doc('global_settings').get();
    return res.data.sudo_users || [];
  } catch (err) {
    console.error('读取全局配置失败:', err);
    return []; 
  }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenID = wxContext.OPENID;
  const { action, partnerCode, decision, userInfo, imageFileID } = event;
  
  // 获取今日日期 (用于打卡查重)
  const todayStr = getBeijingDateStr();

  // 获取动态白名单
  const SUDO_USERS = await getSudoUsers();

  // 1. 登录 (Login)
  if (action === 'login') {
    let currentUser = null;
    
    // ... (这一段获取/创建用户的逻辑保持不变) ...
    const res = await db.collection('users').where({ _openid: myOpenID }).get();
    if (res.data.length > 0) {
      currentUser = res.data[0];
    } else {
      const newUser = {
        _openid: myOpenID,
        nickName: userInfo?.nickName || '微信用户',
        avatarUrl: userInfo?.avatarUrl || '',
        partner_id: null,
        bind_request_from: null,
        createdAt: db.serverDate()
      };
      await db.collection('users').add({ data: newUser });
      currentUser = newUser;
    }

    // ... (这一段获取伴侣的逻辑保持不变) ...
    let partnerInfo = null;
    if (currentUser.partner_id) {
      const partnerRes = await db.collection('users')
        .where({ _openid: currentUser.partner_id })
        .field({ nickName: true, avatarUrl: true, _openid: true })
        .get();
      if (partnerRes.data.length > 0) partnerInfo = partnerRes.data[0];
    }

    // 🆕 新增：判断是否是 VIP
    const isVip = SUDO_USERS.includes(myOpenID);

    return { 
      status: 200, 
      user: currentUser, 
      partner: partnerInfo,
      isVip: isVip // 👈 把身份告诉前端
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

  // 3. 响应绑定请求
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

  // 5. 解除绑定
  if (action === 'unbind') {
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

  // 6. 🆕 确认打卡 (支持覆盖旧记录)
  if (action === 'check_in') {
    if (!imageFileID) return { status: 400, msg: '无图无真相' };

    try {
      // 6.1 先查今天有没有打过卡
      // 注意：这里用 originalDate 来判断是否是“同一天”的任务
      const oldLogRes = await db.collection('logs').where({
        _openid: myOpenID,
        originalDate: todayStr // 今天的日期
      }).get();

      if (oldLogRes.data.length > 0) {
        // ➤ 情况 A: 今天已打卡 -> 执行替换 (Update)
        const oldLogId = oldLogRes.data[0]._id;
        await db.collection('logs').doc(oldLogId).update({
          data: {
            imageFileID: imageFileID, // 替换图片
            updatedAt: db.serverDate(), // 记录更新时间
            style: 'success'
          }
        });
        return { status: 200, msg: '今日打卡已更新！' };
        
      } else {
        // ➤ 情况 B: 今天没打卡 -> 执行新增 (Add)
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
    } catch (err) {
      console.error(err);
      return { status: 500, msg: '打卡失败，请重试' };
    }
  }
};