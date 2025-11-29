// miniprogram/pages/mine/index.js
const app = getApp();
const DEFAULT_AVATAR = ''; 

Page({
  data: {
    userData: { avatarUrl: DEFAULT_AVATAR, nickName: "微信用户" },
    partnerData: null,
    inputPartnerCode: "", 
    needSave: false, 
    partnerShortID: "",
    isShowingRequest: false,
    
    // 🆕 纪念日数据
    daysCount: 0,
    anniversary: '', 
  },

  onLoad: function(options) {
    if (options && options.inviteCode) {
      this.setData({ inputPartnerCode: options.inviteCode });
      wx.showToast({ title: '已自动填入', icon: 'success' });
    }
  },

  onShow: function () {
    this.checkLogin();
  },

  onShareAppMessage: function() {
    const myKey = this.data.userData._openid;
    if (!myKey) return;
    return {
      title: '送你一张AI漫画照，点击立即生成 ✨',
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
          const { user, partner } = res.result;
          
          this.setData({
            userData: user,
            partnerData: partner,
            // 🆕 回显纪念日并计算天数
            anniversary: user.anniversaryDate || '',
            daysCount: this.calculateDays(user.anniversaryDate),
            partnerShortID: user.partner_id ? "..." + user.partner_id.slice(-6) : "",
          });
          
          app.globalData.userInfo = user;

          if (user.bind_request_from && !user.partner_id) {
            this.handleIncomingRequest(user.bind_request_from);
          }
        }
      },
      fail: (err) => { console.error(err); }
    });
  },

  // 🆕 计算天数
  calculateDays: function(dateStr) {
    if (!dateStr) return 0;
    const start = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    if (diff < 0) return 0; 
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  },

  // 🆕 修改纪念日
  onDateChange: function(e) {
    const date = e.detail.value;
    this.setData({ 
      anniversary: date,
      daysCount: this.calculateDays(date)
    });
    
    // 调用刚加好的后端接口
    wx.cloud.callFunction({
      name: 'user_center',
      data: { action: 'update_anniversary', date: date },
      success: res => {
        wx.showToast({ title: '纪念日已保存', icon: 'none' });
      }
    });
  },

  // ... (以下函数保持不变：handleIncomingRequest, respondToRequest, onUnbind, executeUnbind, copyMyKey, onInputKey, bindPartner, onChooseAvatar, onInputNickname, saveProfile) ...
  // 为了方便直接复制，这里把它们简写了，你直接保留原有的即可。如果需要完整代码请告诉我。
  handleIncomingRequest: function(requesterID) {
    if (this.data.isShowingRequest) return;
    this.setData({ isShowingRequest: true });
    const shortID = "..." + requesterID.slice(-6);
    wx.showModal({
      title: '收到关联请求', content: `用户 [${shortID}] 请求与你建立纪念册关联，是否同意？`,
      confirmText: '同意', confirmColor: '#ff6b81', cancelText: '拒绝',
      success: (res) => {
        this.setData({ isShowingRequest: false });
        if (res.confirm) { this.respondToRequest('accept', requesterID); } else { this.respondToRequest('reject', requesterID); }
      }
    });
  },
  respondToRequest: function(decision, requesterID) {
    wx.showLoading({ title: '处理中...' });
    wx.cloud.callFunction({
      name: 'user_center', data: { action: 'respond_bind', decision: decision, partnerCode: requesterID },
      success: res => { wx.hideLoading(); if (res.result.status === 200) { wx.showToast({ title: decision === 'accept' ? '连接成功！' : '已拒绝', icon: 'none' }); this.checkLogin(); } else { wx.showToast({ title: '操作失败', icon: 'none' }); } },
      fail: err => { wx.hideLoading(); console.error(err); }
    });
  },
  onUnbind: function () {
    wx.showModal({ title: "解除关联", content: "确定要解除与 TA 的关联吗？\n解除后将无法再共同记录回忆。", confirmText: "解除", confirmColor: "#ccc", cancelText: "再想想", cancelColor: "#5d4037",
      success: (res) => { if (res.confirm) { this.executeUnbind(); } },
    });
  },
  executeUnbind: function () {
    wx.showLoading({ title: "处理中..." });
    wx.cloud.callFunction({
      name: "user_center", data: { action: "unbind" },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "已解除关联", icon: "success" });
          this.setData({ partnerShortID: "", partnerData: null, anniversary: '', daysCount: 0 });
          this.checkLogin(); 
        } else if (res.result.status === 403) { wx.showModal({ title: "提示", content: res.result.msg, showCancel: false }); } else { wx.showToast({ title: "操作失败", icon: "none" }); }
      },
      fail: (err) => { wx.hideLoading(); wx.showToast({ title: "网络开小差了", icon: "none" }); },
    });
  },
  copyMyKey: function () {
    if (!this.data.userData._openid) return;
    wx.setClipboardData({ data: this.data.userData._openid, success: () => wx.showToast({ title: "暗号已复制", icon: "none" }), });
  },
  onInputKey: function (e) { this.setData({ inputPartnerCode: e.detail.value }); },
  bindPartner: function () {
    const code = this.data.inputPartnerCode;
    if (!code) return wx.showToast({ title: "请输入对方暗号", icon: "none" });
    wx.showLoading({ title: "发送请求..." });
    wx.cloud.callFunction({
      name: "user_center", data: { action: "request_bind", partnerCode: code },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) { wx.showToast({ title: "请求已发送", icon: "success" }); this.setData({ inputPartnerCode: '' }); } else { wx.showModal({ title: "发送失败", content: res.result.msg, showCancel: false }); }
      },
      fail: (err) => { wx.hideLoading(); wx.showToast({ title: "请求超时", icon: "none" }); },
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
        const uploadRes = await wx.cloud.uploadFile({ cloudPath: `avatars/${this.data.userData._openid}_${Date.now()}.jpg`, filePath: avatarUrl, });
        finalAvatarUrl = uploadRes.fileID; 
      }
      const res = await wx.cloud.callFunction({ name: "user_center", data: { action: "update_profile", avatarUrl: finalAvatarUrl, nickName: nickName }, });
      if (res.result.status === 200) {
        wx.hideLoading(); wx.showToast({ title: "保存成功", icon: "success" });
        this.setData({ needSave: false });
        app.globalData.userInfo = { ...this.data.userData, avatarUrl: finalAvatarUrl, nickName: nickName };
      }
    } catch (err) { wx.hideLoading(); wx.showToast({ title: "保存失败", icon: "none" }); }
  },
});