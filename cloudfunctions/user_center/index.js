// cloudfunctions/user_center/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 管理员白名单
const SUDO_USERS = ['oLvaA10cMDUGkrFaNAXTVbTBa19s']; 

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenID = wxContext.OPENID;
  const { action, partnerCode, decision, userInfo } = event;

  // 1. 登录 (Login)
  if (action === 'login') {
    const res = await db.collection('users').where({ _openid: myOpenID }).get();
    if (res.data.length > 0) {
      return { status: 200, user: res.data[0] };
    } else {
      const newUser = {
        _openid: myOpenID,
        nickName: userInfo?.nickName || '微信用户',
        avatarUrl: userInfo?.avatarUrl || '',
        partner_id: null,
        bind_request_from: null, // 新增：记录谁请求绑定我
        createdAt: db.serverDate()
      };
      await db.collection('users').add({ data: newUser });
      return { status: 201, user: newUser };
    }
  }

  // 2. 发起绑定请求 (Request Bind)
  if (action === 'request_bind') {
    if (!partnerCode) return { status: 400, msg: '请输入对方的密钥' };
    if (partnerCode === myOpenID) return { status: 400, msg: '不能自己连自己' };

    // 检查对方
    const partnerRes = await db.collection('users').where({ _openid: partnerCode }).get();
    if (partnerRes.data.length === 0) return { status: 404, msg: '找不到这个 ID' };
    
    const partner = partnerRes.data[0];
    if (partner.partner_id) return { status: 403, msg: '对方已经有 CP 了' };
    if (partner.bind_request_from === myOpenID) return { status: 200, msg: '请求已发送，请等待' };

    // 给对方写入“请求来源”
    await db.collection('users').where({ _openid: partnerCode }).update({
      data: { bind_request_from: myOpenID }
    });

    return { status: 200, msg: '请求已发送' };
  }

  // 3. 响应绑定请求 (Respond Bind)
  if (action === 'respond_bind') {
    // partnerCode 这里指请求发起人（对方）的 ID
    if (!partnerCode) return { status: 400, msg: '参数缺失' };

    // 拒绝
    if (decision === 'reject') {
      await db.collection('users').where({ _openid: myOpenID }).update({
        data: { bind_request_from: null } // 清空请求
      });
      return { status: 200, msg: '已拒绝' };
    }

    // 同意
    if (decision === 'accept') {
      // 再次检查对方是否单身 (防止并发问题)
      const requesterRes = await db.collection('users').where({ _openid: partnerCode }).get();
      if (requesterRes.data.length === 0 || requesterRes.data[0].partner_id) {
        return { status: 400, msg: '对方状态已失效' };
      }

      // 执行双向绑定
      await db.collection('users').where({ _openid: myOpenID }).update({
        data: { partner_id: partnerCode, bind_request_from: null }
      });
      await db.collection('users').where({ _openid: partnerCode }).update({
        data: { partner_id: myOpenID, bind_request_from: null }
      });

      return { status: 200, msg: '绑定成功' };
    }
  }

  // 4. 更新资料 (Update Profile)
  if (action === 'update_profile') {
    const { avatarUrl, nickName } = event;
    await db.collection('users').where({ _openid: myOpenID }).update({
      data: { avatarUrl, nickName }
    });
    return { status: 200, msg: 'OK' };
  }

  // 5. 强制解绑 (Unbind) - 管理员功能
  if (action === 'unbind') {
    if (!SUDO_USERS.includes(myOpenID)) return { status: 403, msg: '权限不足' };
    
    // 获取我的伴侣
    const myRes = await db.collection('users').where({ _openid: myOpenID }).get();
    const partnerID = myRes.data[0].partner_id;

    await db.collection('users').where({ _openid: myOpenID }).update({ data: { partner_id: null } });
    if (partnerID) {
      await db.collection('users').where({ _openid: partnerID }).update({ data: { partner_id: null } });
    }
    return { status: 200, msg: '已解绑' };
  }
};