const app = getApp();
const DEFAULT_AVATAR = ''; 

Page({
  data: {
    userData: {
      avatarUrl: DEFAULT_AVATAR,
      nickName: "微信用户",
    },
    partnerData: null, // 🆕 新增：用于存伴侣的信息
    inputPartnerCode: "", // 对方的密钥
    needSave: false, 
    partnerShortID: "",
    isShowingRequest: false // 防止重复弹窗
  },

  // 1. 页面加载：处理 Deep Linking (自动填入)
  onLoad: function(options) {
    if (options && options.inviteCode) {
      console.log('🔗 检测到邀请码:', options.inviteCode);
      this.setData({
        inputPartnerCode: options.inviteCode
      });
      wx.showToast({
        title: '已自动填入密钥',
        icon: 'success',
        duration: 2000
      });
    }
  },

  onShow: function () {
    this.checkLogin();
  },

  // 2. 核心：定义分享内容
  onShareAppMessage: function() {
    const myKey = this.data.userData._openid;
    if (!myKey) return;

    return {
      title: 'CP-IP 协议握手请求: 请与我连接',
      path: '/pages/mine/index?inviteCode=' + myKey,
      imageUrl: '/images/share-cover.png' 
    }
  },

  checkLogin: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "login" },
      success: (res) => {
        if (res.result.status === 200 || res.result.status === 201) {
          const { user, partner } = res.result; // 👈 解构出 partner
          this.setData({
            userData: user,
            partnerData: partner,
            partnerShortID: user.partner_id
              ? "..." + user.partner_id.slice(-6)
              : "",
          });
          app.globalData.userInfo = user;

          // 🆕 检查是否有待处理的连接请求
          if (user.bind_request_from && !user.partner_id) {
            this.handleIncomingRequest(user.bind_request_from);
          }
        }
      },
      fail: (err) => { console.error(err); }
    });
  },

  // 🆕 处理收到的连接请求
  handleIncomingRequest: function(requesterID) {
    if (this.data.isShowingRequest) return;
    
    this.setData({ isShowingRequest: true });
    const shortID = "..." + requesterID.slice(-6);

    wx.showModal({
      title: '收到连接请求',
      content: `用户 [${shortID}] 请求与你建立 CP 关系，是否同意？`,
      confirmText: '同意',
      confirmColor: '#ff6b81',
      cancelText: '拒绝',
      success: (res) => {
        this.setData({ isShowingRequest: false });
        if (res.confirm) {
          this.respondToRequest('accept', requesterID);
        } else {
          this.respondToRequest('reject', requesterID);
        }
      }
    });
  },

  // 🆕 响应请求 (同意/拒绝)
  respondToRequest: function(decision, requesterID) {
    wx.showLoading({ title: decision === 'accept' ? '绑定中...' : '处理中...' });
    
    wx.cloud.callFunction({
      name: 'user_center',
      data: {
        action: 'respond_bind',
        decision: decision,
        partnerCode: requesterID
      },
      success: res => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: decision === 'accept' ? '连接成功！' : '已拒绝', icon: 'none' });
          this.checkLogin(); // 刷新状态
        } else {
          wx.showToast({ title: '操作失败', icon: 'none' });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error(err);
      }
    });
  },

// 用户点击解除关联
onUnbind: function () {
  wx.showModal({
    title: "解除关联", // 去掉 ⚠️ 警告
    content: "确定要解除与 TA 的关联吗？\n解除后将无法再共同记录回忆。", // 更感性的描述
    confirmText: "解除", // 去掉“断开”
    confirmColor: "#ccc", // 确认按钮改淡一点，降低攻击性
    cancelText: "再想想", // 挽留文案保留
    cancelColor: "#5d4037", // 取消按钮设为深色（主色调），引导用户留下来
    success: (res) => {
      if (res.confirm) { this.executeUnbind(); }
    },
  });
},

  // 执行解除逻辑
  executeUnbind: function () {
    wx.showLoading({ title: "处理中..." }); // 去掉“正在断开”
    
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "unbind" },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "已解除关联", icon: "success" }); // 去掉“恢复单身”
          this.setData({ partnerShortID: "", partnerData: null }); // 清空伴侣数据
          this.checkLogin(); 
        } else if (res.result.status === 403) {
          wx.showModal({ title: "提示", content: res.result.msg, showCancel: false });
        } else {
          wx.showToast({ title: "操作失败", icon: "none" });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: "网络开小差了", icon: "none" });
      },
    });
  },

  copyMyKey: function () {
    if (!this.data.userData._openid) return;
    wx.setClipboardData({
      data: this.data.userData._openid,
      success: () => wx.showToast({ title: "密钥已复制", icon: "none" }),
    });
  },

  onInputKey: function (e) {
    this.setData({ inputPartnerCode: e.detail.value });
  },

  // ✏️ 修改：现在是发送“请求”，而不是直接绑定
  bindPartner: function () {
    const code = this.data.inputPartnerCode;
    if (!code) return wx.showToast({ title: "请输入密钥", icon: "none" });

    wx.showLoading({ title: "发送请求..." });
    
    wx.cloud.callFunction({
      name: "user_center",
      data: { 
        action: "request_bind", // 修改动作：请求绑定
        partnerCode: code 
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "请求已发送", icon: "success" });
          // 清空输入框
          this.setData({ inputPartnerCode: '' });
        } else {
          wx.showModal({ title: "发送失败", content: res.result.msg, showCancel: false });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: "请求超时", icon: "none" });
      },
    });
  },

  onChooseAvatar: function (e) {
    const { avatarUrl } = e.detail;
    this.setData({ "userData.avatarUrl": avatarUrl, needSave: true });
  },

  onInputNickname: function (e) {
    const nickName = e.detail.value;
    this.setData({ "userData.nickName": nickName, needSave: true });
  },

  saveProfile: async function () {
    const { avatarUrl, nickName } = this.data.userData;
    if (!avatarUrl || !nickName) return;

    wx.showLoading({ title: "同步云端..." });
    try {
      let finalAvatarUrl = avatarUrl;
      if (avatarUrl.includes("tmp") || avatarUrl.includes("wxfile")) {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${this.data.userData._openid}_${Date.now()}.jpg`,
          filePath: avatarUrl,
        });
        finalAvatarUrl = uploadRes.fileID; 
      }
      const res = await wx.cloud.callFunction({
        name: "user_center",
        data: { action: "update_profile", avatarUrl: finalAvatarUrl, nickName: nickName },
      });

      if (res.result.status === 200) {
        wx.hideLoading();
        wx.showToast({ title: "保存成功", icon: "success" });
        this.setData({ needSave: false });
        app.globalData.userInfo = { ...this.data.userData, avatarUrl: finalAvatarUrl, nickName: nickName };
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: "保存失败", icon: "none" });
    }
  },
});