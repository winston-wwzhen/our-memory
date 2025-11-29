// miniprogram/pages/mine/index.js
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
      title: '邀请你共同开启我们的纪念册', // 这里的文案也可以改得更温馨
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
      title: '收到关联请求',
      content: `用户 [${shortID}] 请求与你建立纪念册关联，是否同意？`,
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
      title: "解除关联",
      content: "确定要解除与 TA 的关联吗？\n解除后将无法再共同记录回忆。",
      confirmText: "解除",
      confirmColor: "#ccc",
      cancelText: "再想想",
      cancelColor: "#5d4037",
      success: (res) => {
        if (res.confirm) { this.executeUnbind(); }
      },
    });
  },

  // 执行解除逻辑
  executeUnbind: function () {
    wx.showLoading({ title: "处理中..." });
    
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "unbind" },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "已解除关联", icon: "success" });
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
      success: () => wx.showToast({ title: "编号已复制", icon: "none" }),
    });
  },

  onInputKey: function (e) {
    this.setData({ inputPartnerCode: e.detail.value });
  },

  // 发送关联请求
  bindPartner: function () {
    const code = this.data.inputPartnerCode;
    if (!code) return wx.showToast({ title: "请输入对方编号", icon: "none" });

    wx.showLoading({ title: "发送请求..." });
    
    wx.cloud.callFunction({
      name: "user_center",
      data: { 
        action: "request_bind",
        partnerCode: code 
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "请求已发送", icon: "success" });
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