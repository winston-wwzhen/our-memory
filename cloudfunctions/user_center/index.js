// cloudfunctions/user_center/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 🛡️ 管理员白名单 (填入你自己的 OpenID)
// 你可以在“我的”页面复制你的 Key 填在这里
const SUDO_USERS = [
  'oLvaA10cMDUGkrFaNAXTVbTBa19s', 
];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenID = wxContext.OPENID;
  const { action, partnerCode, userInfo } = event;

  // ... (保留之前的 login 逻辑) ...
  if (action === 'login') {
    // 查一下我注册过没
    const res = await db.collection('users').where({ _openid: myOpenID }).get();
    if (res.data.length > 0) {
      return { status: 200, user: res.data[0] }; 
    } else {
      const newUser = {
        _openid: myOpenID,
        nickName: userInfo?.nickName || 'Anonymous',
        avatarUrl: userInfo?.avatarUrl || '',
        partner_id: null,
        createdAt: db.serverDate()
      };
      await db.collection('users').add({ data: newUser });
      return { status: 201, user: newUser };
    }
  }

  // ... (保留之前的 bind 逻辑) ...
  if (action === 'bind') {
    // ... (之前的绑定代码保持不变) ...
    if (!partnerCode) return { status: 400, msg: '请输入对方的密钥' };
    if (partnerCode === myOpenID) return { status: 400, msg: '不能和自己谈恋爱哦' };

    try {
      const partnerRes = await db.collection('users').where({ _openid: partnerCode }).get();
      if (partnerRes.data.length === 0) return { status: 404, msg: '找不到这个 ID' };
      
      const partner = partnerRes.data[0];
      if (partner.partner_id) return { status: 403, msg: '对方已经有对象了！' };

      await db.collection('users').where({ _openid: myOpenID }).update({
        data: { partner_id: partnerCode }
      });

      await db.collection('users').where({ _openid: partnerCode }).update({
        data: { partner_id: myOpenID }
      });

      return { status: 200, msg: '连接成功！' };

    } catch (err) {
      return { status: 500, error: err };
    }
  }

  // 🆕 新增：解绑逻辑 (Destruction Mode)
  if (action === 'unbind') {
    // 1. 权限检查 (Sudo Check)
    if (!SUDO_USERS.includes(myOpenID)) {
      return { status: 403, msg: 'Permission Denied: 需要付费解锁该功能 (VIP only)' };
    }

    try {
      // 2. 获取当前用户信息，找到伴侣 ID
      const userRes = await db.collection('users').where({ _openid: myOpenID }).get();
      const userData = userRes.data[0];

      if (!userData || !userData.partner_id) {
        return { status: 400, msg: '你本来就是单身啊...' };
      }
      
      const partnerID = userData.partner_id;

      // 3. 执行双向清除 (Atomic Reset)
      // 清除我的
      await db.collection('users').where({ _openid: myOpenID }).update({
        data: { partner_id: null }
      });

      // 清除 TA 的
      await db.collection('users').where({ _openid: partnerID }).update({
        data: { partner_id: null }
      });

      return { status: 200, msg: '已断开连接，恢复出厂设置。' };

    } catch (err) {
      console.error(err);
      return { status: 500, error: err };
    }
  }
  // 更新用户资料
  if (action === 'update_profile') {
    const { avatarUrl, nickName } = event;
    
    try {
      await db.collection('users').where({ _openid: myOpenID }).update({
        data: {
          avatarUrl: avatarUrl,
          nickName: nickName,
          updatedAt: db.serverDate()
        }
      });
      return { status: 200, msg: '资料更新完毕' };
    } catch (err) {
      return { status: 500, error: err };
    }
  }
};