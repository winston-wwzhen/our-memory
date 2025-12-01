// miniprogram/pages/mine/index.js
const app = getApp();
const DEFAULT_AVATAR = "";

Page({
  data: {
    userData: {
      avatarUrl: DEFAULT_AVATAR,
      nickName: "微信用户",
    },
    partnerData: null,
    inputPartnerCode: "",
    needSave: false,
    partnerShortID: "",
    isShowingRequest: false,
    daysCount: 0,
    anniversary: "",
  },

  onLoad: function (options) {
    if (options && options.inviteCode) {
      this.setData({
        inputPartnerCode: options.inviteCode,
      });
      wx.showToast({ title: "已自动填入密钥", icon: "success" });
    }
  },

  onShow: function () {
    this.checkLogin();
  },

  // 添加下拉刷新支持
  onPullDownRefresh: function () {
    this.checkLogin(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage: function () {
    const myKey = this.data.userData._openid;
    if (!myKey) return;
    return {
      title: "邀请你共同开启我们的纪念册",
      path: "/pages/mine/index?inviteCode=" + myKey,
      imageUrl: "/images/share-cover.png",
    };
  },

  // 🔴 核心修改：增加图片链接转换逻辑
  checkLogin: function (callback) {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "login" },
      success: (res) => {
        if (res.result.status === 200 || res.result.status === 201) {
          let { user, partner, isVip, loginBonus } = res.result;

          // 处理登录奖励提示
          if (loginBonus && loginBonus > 0) {
            wx.showToast({
              title: `每日登录 +${loginBonus}g 爱意`,
              icon: "none",
              duration: 3000,
            });
          }

          app.globalData.userInfo = user;

          // === ⚡ 修复头像加载失败的核心逻辑 START ===
          const fileList = [];

          // 收集需要转换的 cloud:// 链接
          if (user.avatarUrl && user.avatarUrl.startsWith("cloud://")) {
            fileList.push(user.avatarUrl);
          }
          if (
            partner &&
            partner.avatarUrl &&
            partner.avatarUrl.startsWith("cloud://")
          ) {
            fileList.push(partner.avatarUrl);
          }

          if (fileList.length > 0) {
            // 批量换取临时 HTTP 链接
            wx.cloud.getTempFileURL({
              fileList: fileList,
              success: (tempRes) => {
                // 将换取到的 https 链接回填给 user 和 partner 对象
                tempRes.fileList.forEach((item) => {
                  if (item.code === "SUCCESS") {
                    if (user.avatarUrl === item.fileID)
                      user.avatarUrl = item.tempFileURL;
                    if (partner && partner.avatarUrl === item.fileID)
                      partner.avatarUrl = item.tempFileURL;
                  }
                });
                // 更新页面数据
                this.updatePageData(user, partner);
              },
              fail: (err) => {
                console.error("头像链接转换失败", err);
                // 如果失败，还是尝试用原链接显示
                this.updatePageData(user, partner);
              },
            });
          } else {
            // 没有需要转换的链接，直接更新
            this.updatePageData(user, partner);
          }
          // === ⚡ 修复逻辑 END ===

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

  // 辅助函数：统一设置页面数据
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
        // 刷新一下以获取更新人和时间
        this.checkLogin();
      },
    });
  },

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
    wx.showLoading({
      title: decision === "accept" ? "绑定中..." : "处理中...",
    });

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
          wx.showToast({
            title: decision === "accept" ? "连接成功！" : "已拒绝",
            icon: "none",
          });
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

  onUnbind: function () {
    wx.showModal({
      title: "解除关联",
      content: "确定要解除与 TA 的关联吗？\n解除后将无法再共同记录回忆。",
      confirmText: "解除",
      confirmColor: "#ccc",
      cancelText: "再想想",
      cancelColor: "#5d4037",
      success: (res) => {
        if (res.confirm) {
          this.executeUnbind();
        }
      },
    });
  },

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
          wx.showModal({
            title: "提示",
            content: res.result.msg,
            showCancel: false,
          });
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
          wx.showModal({
            title: "发送失败",
            content: res.result.msg,
            showCancel: false,
          });
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
      // 如果是本地临时文件，先上传
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
        // 保存成功后刷新一下，确保拿到的是最新数据（虽然这里优化一下可以直接set，但刷新最稳）
        this.checkLogin();
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: "保存失败", icon: "none" });
    }
  },
});
