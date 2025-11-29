// cloudfunctions/user_center/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 👑 管理员白名单 (只有这些人能强制解绑，或者未来用于测试付费功能)
const SUDO_USERS = [
  'oLvaA10cMDUGkrFaNAXTVbTBa19s', // 你的 OpenID
]; 

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenID = wxContext.OPENID;
  const { action, partnerCode, decision, userInfo, imageFileID } = event;

  // 1. 登录 (Login)
  if (action === 'login') {
    let currentUser = null;
    
    // 获取或创建我的信息
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

    // 获取伴侣信息
    let partnerInfo = null;
    if (currentUser.partner_id) {
      const partnerRes = await db.collection('users')
        .where({ _openid: currentUser.partner_id })
        .field({ nickName: true, avatarUrl: true, _openid: true })
        .get();
      if (partnerRes.data.length > 0) partnerInfo = partnerRes.data[0];
    }

    return { status: 200, user: currentUser, partner: partnerInfo };
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

      // 双向绑定
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

  // 5. 解除绑定 (已加锁 🔒)
  if (action === 'unbind') {
    // 🛑 安全检查：只有白名单用户可以解绑
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

  // 6. 确认打卡 (Check In)
  if (action === 'check_in') {
    if (!imageFileID) return { status: 400, msg: '无图无真相' };

    await db.collection('logs').add({
      data: {
        _openid: myOpenID,
        createdAt: db.serverDate(),
        imageFileID: imageFileID,
        originalDate: new Date().toLocaleDateString(),
        type: 'daily_check_in',
        engine: 'tencent',
        style: 'success'
      }
    });
    return { status: 200, msg: '打卡成功！' };
  }
};