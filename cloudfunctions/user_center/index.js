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
  const { action, partnerCode, decision, userInfo, imageFileID } = event;

  // 1. 登录 (Login) - 修改版：支持返回伴侣信息
  if (action === 'login') {
    let currentUser = null;
    
    // A. 获取或创建我的信息
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

    // B. (新增) 如果有伴侣，获取伴侣的信息
    let partnerInfo = null;
    if (currentUser.partner_id) {
      const partnerRes = await db.collection('users')
        .where({ _openid: currentUser.partner_id })
        .field({ // 隐私保护：只取昵称和头像，不取其他敏感字段
          nickName: true,
          avatarUrl: true,
          _openid: true
        })
        .get();
        
      if (partnerRes.data.length > 0) {
        partnerInfo = partnerRes.data[0];
      }
    }

    return { 
      status: 200, 
      user: currentUser, 
      partner: partnerInfo // 👈 将伴侣信息一起返回
    };
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

  // 🆕 新增：确认打卡 (Check In)
  if (action === 'check_in') {
    if (!imageFileID) return { status: 400, msg: '无图无真相' };

    await db.collection('logs').add({
      data: {
        _openid: myOpenID,
        createdAt: db.serverDate(),
        imageFileID: imageFileID,
        originalDate: new Date().toLocaleDateString(),
        type: 'daily_check_in',
        engine: 'tencent', // 或者你可以让前端把引擎名也传过来，这里简化处理
        style: 'success'
      }
    });
    return { status: 200, msg: '打卡成功！' };
  }
};