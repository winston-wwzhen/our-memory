// miniprogram/pages/fun-hub/index.js
const app = getApp();

Page({
  data: {
    quizHint: false,
    messageHint: false,
    capsuleRedDot: false,
    showRedDotModal: false,
    redDotMessage: '',
    navHeight: app.globalData.navBarHeight,
    statusBarHeight: app.globalData.statusBarHeight,
  },

  onShow: function () {
    if (!this.data.navHeight) {
      this.setData({
        navHeight: app.globalData.navBarHeight,
        statusBarHeight: app.globalData.statusBarHeight,
      });
    }

    this.updateUserStatus();

    // 检查是否有伴侣
    if (app.globalData.userInfo && app.globalData.userInfo.partner_id) {
      this.checkRedDots();
    }
  },

  onPullDownRefresh: function () {
    this.updateUserStatus();
    if (app.globalData.userInfo && app.globalData.userInfo.partner_id) {
      this.checkRedDots();
    }
    wx.stopPullDownRefresh();
    wx.showToast({ title: "状态已更新", icon: "none" });
  },

  updateUserStatus: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "login" },
      success: (res) => {
        if (res.result.status === 200) {
          app.globalData.userInfo = res.result.user;
        }
      },
    });
  },

  checkRedDots: function () {
    // 检查各种红点状态
    this.checkQuizHint();
    this.checkMessageHint();
    this.checkCapsuleRedDot();
  },

  checkQuizHint: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_quiz_home" },
      success: (res) => {
        if (res.result.status === 200) {
          const round = res.result.currentRound;
          if (round && round.my_progress < round.total) {
            this.setData({ quizHint: true });
          } else {
            this.setData({ quizHint: false });
          }
        }
      },
    });
  },

  checkMessageHint: function () {
    // 这里可以检查是否有新留言
    // 暂时设置为false
    this.setData({ messageHint: false });
  },

  checkCapsuleRedDot: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_capsules" },
      success: (res) => {
        if (res.result.status === 200) {
          const inbox = res.result.inbox || [];
          const hasNewSurprise = inbox.some((item) => item.canOpen);
          this.setData({ capsuleRedDot: hasNewSurprise });

          // 如果有新的胶囊可开启，显示提示
          if (hasNewSurprise) {
            this.showRedDotNotification('有时光胶囊可以开启啦！');
          }
        }
      },
    });
  },

  showRedDotNotification: function (message) {
    this.setData({
      showRedDotModal: true,
      redDotMessage: message
    });

    // 3秒后自动关闭
    setTimeout(() => {
      this.closeRedDotModal();
    }, 3000);
  },

  closeRedDotModal: function () {
    this.setData({ showRedDotModal: false });
  },

  // 页面跳转方法
  navToQuiz: function () {
    // 检查是否有伴侣
    if (!this.checkPartner()) return;

    wx.navigateTo({
      url: "/pages/quiz/index",
      success: () => {
        this.setData({ quizHint: false });
      }
    });
  },

  navToBoard: function () {
    // 检查是否有伴侣
    if (!this.checkPartner()) return;

    wx.navigateTo({
      url: "/pages/message_board/index",
      success: () => {
        this.setData({ messageHint: false });
      }
    });
  },

  navToCapsule: function () {
    // 检查是否有伴侣
    if (!this.checkPartner()) return;

    wx.navigateTo({
      url: "/pages/capsule/index",
      success: () => {
        this.setData({ capsuleRedDot: false });
      }
    });
  },

  navToDecision: function () {
    wx.navigateTo({ url: "/pages/decision/index" });
  },

  navToCoupons: function () {
    wx.navigateTo({ url: "/pages/coupons/index" });
  },

  navToGuide: function () {
    wx.navigateTo({ url: "/pages/guide/index" });
  },

  // 检查伴侣绑定状态
  checkPartner: function () {
    const user = app.globalData.userInfo;
    if (!user || !user.partner_id) {
      wx.showModal({
        title: "情侣专属功能",
        content:
          "此功能需要两个人一起玩哦 💕\n\n快去【Mine】页面邀请另一半绑定吧！",
        confirmText: "去绑定",
        confirmColor: "#ff6b81",
        cancelText: "再逛逛",
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: "/pages/mine/index" });
          }
        },
      });
      return false;
    }
    return true;
  },

  onShareAppMessage: function () {
    return {
      title: "我们的纪念册 - 恋爱乐园",
      path: "/pages/fun-hub/index",
      imageUrl: "/images/share-fun-hub.jpg"
    };
  },

  onShareTimeline: function () {
    return {
      title: "我们的纪念册 - 恋爱乐园",
      imageUrl: "/images/share-fun-hub.jpg"
    };
  },
});