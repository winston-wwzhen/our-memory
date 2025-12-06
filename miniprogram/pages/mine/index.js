// miniprogram/pages/mine/index.js
const app = getApp();
const DEFAULT_AVATAR = "";

Page({
  data: {
    // === 原有业务数据 ===
    userData: {
      avatarUrl: DEFAULT_AVATAR,
      nickName: "微信用户",
    },
    partnerData: null,
    inputPartnerCode: "",
    needSave: false,
    partnerShortID: "",
    isShowingRequest: false, // 旧版请求绑定弹窗控制（保留以兼容旧逻辑）
    daysCount: 0,
    anniversary: "",
    
    // VIP 状态数据
    vipStatus: {
      isVip: false,
      expireDateStr: "",
      privilegeTip: "" 
    },

    // === 🆕 弹窗控制中心 ===
    showModal: false,
    modalType: '', // 'invite' | 'accept' | 'unbind'
    
    // 解绑冷静期倒计时
    unbindCount: 5,
    canUnbind: false,
    timer: null,
  },

  onLoad: function (options) {
    if (options && options.inviteCode) {
      this.setData({
        inputPartnerCode: options.inviteCode,
      });
      // 🟢 优化点：检测到邀请码，自动弹出“接受邀请”确认框
      this.showAcceptModal(); 
    }
  },

  onShow: function () {
    this.checkLogin();
  },

  onPullDownRefresh: function () {
    this.checkLogin(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ============================================================
  // 🟢 核心交互逻辑 (弹窗与分享)
  // ============================================================

  // 1. 打开“发出邀请”誓言弹窗
  showInviteModal: function() {
    wx.vibrateShort({ type: 'medium' });
    this.setData({ 
      showModal: true, 
      modalType: 'invite' 
    });
  },

  // 2. 打开“接受邀请”确认弹窗
  showAcceptModal: function() {
    wx.vibrateShort({ type: 'heavy' });
    this.setData({ 
      showModal: true, 
      modalType: 'accept' 
    });
  },

  // 3. 打开“申请解绑”冷静期弹窗
  onUnbind: function() {
    wx.vibrateShort({ type: 'heavy' });
    this.setData({ 
      showModal: true, 
      modalType: 'unbind',
      unbindCount: 5,  // 重置倒计时
      canUnbind: false
    });

    // 启动 5秒 倒计时
    this.startUnbindTimer();
  },

  // 倒计时逻辑
  startUnbindTimer: function() {
    if (this.data.timer) clearInterval(this.data.timer);
    
    const timer = setInterval(() => {
      let next = this.data.unbindCount - 1;
      if (next <= 0) {
        clearInterval(timer);
        this.setData({ unbindCount: 0, canUnbind: true });
      } else {
        this.setData({ unbindCount: next });
      }
    }, 1000);
    
    this.setData({ timer });
  },

  // 通用：关闭任意弹窗
  hideModal: function() {
    if (this.data.timer) clearInterval(this.data.timer);
    this.setData({ showModal: false });
  },

  // 动作 A：确认接受邀请 -> 执行绑定
  confirmAccept: function() {
    this.hideModal();
    this.bindPartner(); // 调用原有的绑定请求逻辑
  },

  // 动作 B：确认解绑 -> 执行解绑
  confirmUnbind: function() {
    if (!this.data.canUnbind) return;
    this.hideModal();
    this.executeUnbind(); // 调用原有的解绑请求逻辑
  },

  // 🟢 核心：分享逻辑重写
  onShareAppMessage: function (res) {
    // 只有点击了弹窗里的“确认寄出”按钮，才携带参数
    if (res.from === 'button' && this.data.modalType === 'invite') {
      // 分享后关闭弹窗
      this.hideModal();
      
      const myOpenId = this.data.userData._openid;
      const myName = this.data.userData.nickName || '你的另一半';

      return {
        title: `💌 ${myName} 邀请你开启：我们的纪念册`,
        // 携带 inviteCode 参数，接收方点开会触发 onLoad -> showAcceptModal
        path: `/pages/mine/index?inviteCode=${myOpenId}`, 
        imageUrl: '/images/share-cover.png', // 建议在 images 目录下放一张温馨的图
      };
    }

    // 默认右上角转发逻辑
    const myKey = this.data.userData._openid;
    return {
      title: "邀请你共同开启我们的纪念册",
      path: "/pages/mine/index?inviteCode=" + (myKey || ''),
      imageUrl: "/images/share-cover.png",
    };
  },

  // ============================================================
  // 🟢 原有业务逻辑 (保持不变)
  // ============================================================

  checkLogin: function (callback) {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "login" },
      success: (res) => {
        if (res.result.status === 200 || res.result.status === 201) {
          let { user, partner, isVip, loginBonus, vipExpireDate, registerDays } = res.result;

          if (loginBonus && loginBonus > 0) {
            wx.showToast({
              title: `每日登录 +${loginBonus}g 爱意`,
              icon: "none",
              duration: 3000,
            });
          }

          app.globalData.userInfo = user;

          // 1. 处理 VIP 过期时间
          let vipDateStr = "";
          if (vipExpireDate) {
            const date = new Date(vipExpireDate);
            vipDateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          }

          // 2. 根据注册天数生成特权提示文案
          let tipText = "💎 VIP特权：每日享有 3 次拍照机会"; 
          if (registerDays <= 1) {
            tipText = "✨ 首日特权：今日获赠 10 次拍照机会";
          }

          this.setData({
            vipStatus: {
              isVip: isVip,
              expireDateStr: vipDateStr,
              privilegeTip: tipText
            }
          });

          // === 头像链接转换 ===
          const fileList = [];
          if (user.avatarUrl && user.avatarUrl.startsWith("cloud://")) {
            fileList.push(user.avatarUrl);
          }
          if (partner && partner.avatarUrl && partner.avatarUrl.startsWith("cloud://")) {
            fileList.push(partner.avatarUrl);
          }

          if (fileList.length > 0) {
            wx.cloud.getTempFileURL({
              fileList: fileList,
              success: (tempRes) => {
                tempRes.fileList.forEach((item) => {
                  if (item.code === "SUCCESS") {
                    if (user.avatarUrl === item.fileID) user.avatarUrl = item.tempFileURL;
                    if (partner && partner.avatarUrl === item.fileID) partner.avatarUrl = item.tempFileURL;
                  }
                });
                this.updatePageData(user, partner);
              },
              fail: (err) => {
                console.error("头像转换失败", err);
                this.updatePageData(user, partner);
              },
            });
          } else {
            this.updatePageData(user, partner);
          }

          if (user.bind_request_from && !user.partner_id) {
            this.handleIncomingRequest(user.bind_request_from);
          }
        }
        if (callback) callback();
      },
      fail: (err) => {
        console.error(err);
        if (callback) callback();
      },
    });
  },

  updatePageData: function (user, partner) {
    this.setData({
      userData: user,
      partnerData: partner,
      anniversary: user.anniversaryDate || "",
      daysCount: this.calculateDays(user.anniversaryDate),
      partnerShortID: user.partner_id ? "..." + user.partner_id.slice(-6) : "",
    });
  },

  calculateDays: function (dateStr) {
    if (!dateStr) return 0;
    const start = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    if (diff < 0) return 0;
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  },

  onDateChange: function (e) {
    const date = e.detail.value;
    this.setData({
      anniversary: date,
      daysCount: this.calculateDays(date),
    });

    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "update_anniversary", date: date },
      success: (res) => {
        wx.showToast({ title: "纪念日已保存", icon: "none" });
        this.checkLogin();
      },
    });
  },

  // 处理被动收到的请求（旧版逻辑保留，作为兜底）
  handleIncomingRequest: function (requesterID) {
    if (this.data.isShowingRequest) return;
    this.setData({ isShowingRequest: true });
    const shortID = "..." + requesterID.slice(-6);

    wx.showModal({
      title: "收到关联请求",
      content: `用户 [${shortID}] 请求与你建立纪念册关联，是否同意？`,
      confirmText: "同意",
      confirmColor: "#ff6b81",
      cancelText: "拒绝",
      success: (res) => {
        this.setData({ isShowingRequest: false });
        if (res.confirm) {
          this.respondToRequest("accept", requesterID);
        } else {
          this.respondToRequest("reject", requesterID);
        }
      },
    });
  },

  respondToRequest: function (decision, requesterID) {
    wx.showLoading({ title: decision === "accept" ? "绑定中..." : "处理中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "respond_bind",
        decision: decision,
        partnerCode: requesterID,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: decision === "accept" ? "连接成功！" : "已拒绝", icon: "none" });
          this.checkLogin();
        } else {
          wx.showToast({ title: "操作失败", icon: "none" });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error(err);
      },
    });
  },

  // 真正的解绑请求逻辑
  executeUnbind: function () {
    wx.showLoading({ title: "处理中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "unbind" },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "已解除关联", icon: "success" });
          this.setData({ partnerShortID: "", partnerData: null });
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

  // 主动发起绑定请求（保留手动输入模式）
  bindPartner: function () {
    const code = this.data.inputPartnerCode;
    if (!code) return wx.showToast({ title: "请输入对方编号", icon: "none" });

    wx.showLoading({ title: "发送请求..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "request_bind", partnerCode: code },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "请求已发送", icon: "success" });
          this.setData({ inputPartnerCode: "" });
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
        data: {
          action: "update_profile",
          avatarUrl: finalAvatarUrl,
          nickName: nickName,
        },
      });

      if (res.result.status === 200) {
        wx.hideLoading();
        wx.showToast({ title: "保存成功", icon: "success" });
        this.setData({ needSave: false });
        this.checkLogin();
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: "保存失败", icon: "none" });
    }
  },

  showVipInfo: function () {
    if (this.data.vipStatus.isVip) {
      wx.showModal({
        title: '💎 内测 VIP 尊享权益',
        content: '感谢成为首批内测体验官！\n\n✨ 新人礼：注册首日获赠 10 次生图额度\n🚀 会员礼：VIP 期间每日享有 3 次免费生图机会\n\n(额度每日凌晨刷新，快去体验不同风格吧！)',
        showCancel: false,
        confirmText: '太棒了',
        confirmColor: '#ff6b81'
      });
    } else {
      wx.showModal({
        title: '🚀 VIP 筹备中',
        content: '为了带给你们更好的体验，VIP 会员计划正在紧锣密鼓地筹备中！\n\n后续将解锁更多专属风格、无限畅玩特权，敬请期待~',
        showCancel: false,
        confirmText: '期待',
        confirmColor: '#9e9e9e'
      });
    }
  },
});