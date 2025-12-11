// miniprogram/pages/playground/index.js
const app = getApp();

Page({
  data: {
    loading: false,
    waterCount: 0, 
    growth: 0,     
    level: 1,      
    maxGrowth: 100,
    progress: 0,   
    harvestCount: 0, 
    logs: [],
    showLogModal: false,
    navHeight: app.globalData.navBarHeight,
    statusBarHeight: app.globalData.statusBarHeight,

    // 提示状态
    capsuleRedDot: false,
    messageHint: false,
    quizHint: false,

    // 🥚 彩蛋
    showEggModal: false,
    eggData: null,
  },

  onShow: function () {
    if (!this.data.navHeight) {
      this.setData({
        navHeight: app.globalData.navBarHeight,
        statusBarHeight: app.globalData.statusBarHeight,
      });
    }
    this.updateUserStatus();
    this.fetchGardenData();

    // 仅当有伴侣时，才检查双人互动的红点
    if (app.globalData.userInfo && app.globalData.userInfo.partner_id) {
      this.checkCapsuleRedDot();
      this.checkMessageHint();
      this.checkQuizHint();
    }
  },

  onPullDownRefresh: function () {
    this.updateUserStatus();
    if (app.globalData.userInfo && app.globalData.userInfo.partner_id) {
      this.checkCapsuleRedDot();
      this.checkMessageHint();
      this.checkQuizHint();
    }
    this.fetchGardenData(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: "状态已更新", icon: "none" });
    });
  },

  // === 核心逻辑修改：新增登录检查，用于单人功能 ===
  checkLogin: function() {
    if (!app.globalData.userInfo) {
      wx.showToast({ title: "数据加载中...", icon: "none" });
      return false;
    }
    return true;
  },

  // === 保持原有：双人强关联功能检查 ===
  checkPartner: function () {
    const user = app.globalData.userInfo;
    if (!user || !user.partner_id) {
      wx.showModal({
        title: "情侣专属功能",
        content: "此功能需要两个人一起玩哦 💕\n\n快去【Mine】页面邀请另一半绑定吧！",
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

  fetchGardenData: function (callback) {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_garden" },
      success: (res) => {
        if (res.result.status === 200) {
          const { garden, water, logs } = res.result;
          const g = garden.growth_value || 0;
          
          let lv = Math.floor(g / 100) + 1;
          if (lv > 4) lv = 4;
          
          const currentG = g % 100;
          const harvests = garden.harvest_total || 0;
          let finalProgress = lv >= 4 ? 100 : (currentG / 100) * 100;

          const formattedLogs = (logs || []).map((item) => {
            item.timeAgo = this.formatTimeAgo(item.date);
            item.content = item.content.replace('注入', '投喂').replace('爱意', '能量');
            // 单人模式下修正显示
            if (!item.nickName && item.isMine && app.globalData.userInfo) {
                item.nickName = app.globalData.userInfo.nickName;
            }
            return item;
          });

          this.setData({
            waterCount: water,
            growth: currentG,
            level: lv,
            progress: finalProgress + "%",
            harvestCount: harvests,
            logs: formattedLogs,
          });
        }
        if (callback) callback();
      },
      fail: (err) => {
        console.error(err);
        if (callback) callback();
      },
    });
  },

  formatTimeAgo: function (dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return "刚刚";
    if (diff < 3600) return Math.floor(diff / 60) + "分钟前";
    if (diff < 86400) return Math.floor(diff / 3600) + "小时前";
    return Math.floor(diff / 86400) + "天前";
  },

  // 🟢 修改：仅检查登录，单人可喂食
  onFeed: function () {
    if (!this.checkLogin()) return; 
    
    if (this.data.waterCount < 10) {
      wx.showToast({ title: "粮仓空了，快去打卡赚狗粮！", icon: "none" });
      return;
    }
    this.setData({ loading: true });
    
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "water_flower" },
      success: (res) => {
        this.setData({ loading: false });
        if (res.result.status === 200) {
          wx.showToast({ title: "投喂成功 +10", icon: "success" });
          this.fetchGardenData();
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      },
      fail: () => {
        this.setData({ loading: false });
        wx.showToast({ title: "网络开小差了", icon: "none" });
      },
    });
  },

  // 🟢 修改：仅检查登录，单人可查看日志
  toggleLogModal: function () {
    if (!this.checkLogin()) return;
    this.setData({ showLogModal: !this.data.showLogModal });
  },

  // 🟢 修改：仅检查登录，单人可接回宠物
  onWelcomeHome: function () {
    if (!this.checkLogin()) return;
    wx.showModal({
      title: "宝贝回家啦！",
      content: "您的萌宠结束了旅行，并为您带回了 1 朵玫瑰花！🌹\n\n(明信片功能将在下个版本上线)",
      confirmText: "收下礼物",
      confirmColor: "#ff6b81",
      showCancel: false, 
      success: (res) => {
        if (res.confirm) this.doFinishTravel();
      },
    });
  },

  doFinishTravel: function () {
    this.setData({ loading: true });
    wx.showLoading({ title: "领取中..." });
    
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "harvest_garden" },
      success: (res) => {
        wx.hideLoading();
        this.setData({ loading: false });
        if (res.result.status === 200) {
          wx.showToast({
            title: "领取成功 🌹",
            icon: "success",
            duration: 2000,
          });
          this.fetchGardenData();

          if (res.result.triggerEgg) {
            this.setData({
              showEggModal: true,
              eggData: res.result.triggerEgg,
            });
            wx.vibrateLong();
          }
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        this.setData({ loading: false });
        wx.showToast({ title: "网络错误", icon: "none" });
      },
    });
  },

  // === 页面跳转区 ===

  // 🟡 保持限制：留言板是双人互动
  navToBoard: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({ url: "/pages/message_board/index" });
  },

  // 🟡 保持限制：默契问答是双人互动
  navToQuiz: function () {
    if (!this.checkPartner()) return;
    this.setData({ quizHint: false });
    wx.navigateTo({ url: "/pages/quiz/index" });
  },

  // 🟡 保持限制：时光胶囊通常寄给对方（也可改为单人，暂时保留限制）
  navToCapsule: function () {
    if (!this.checkPartner()) return;
    this.setData({ capsuleRedDot: false });
    wx.navigateTo({ url: "/pages/capsule/index" });
  },

  // 🟢 开放：决定助手是工具
  navToDecision: function () {
    if (!this.checkLogin()) return;
    wx.navigateTo({ url: "/pages/decision/index" });
  },

  // 🟢 开放：权益券（单人模式下部分锁定，页面内处理）
  navToCoupons: function () {
    if (!this.checkLogin()) return;
    wx.navigateTo({ url: "/pages/coupons/index" });
  },

  // 🟢 开放：恋爱宝典是攻略
  navToGuide: function () {
    wx.navigateTo({ url: "/pages/guide/index" });
  },

  // 辅助函数
  checkMessageHint: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_messages" },
      success: (res) => {
        if (res.result.status === 200) {
          const msgs = res.result.data || [];
          const partnerMsgs = msgs.filter((m) => !m.isMine);
          if (partnerMsgs.length > 0) {
            const latest = partnerMsgs[0];
            this.setData({ messageHint: !latest.isLiked });
          } else {
            this.setData({ messageHint: false });
          }
        }
      },
    });
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
        }
      },
    });
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

  closeEggModal: function () {
    this.setData({ showEggModal: false });
  },

  onShareAppMessage: function () {
    return {
      title: "快来喂养我们的专属萌宠 🐶",
      path: "/pages/playground/index"
    };
  },

  onShareTimeline: function () {
    return {
      title: "我们的纪念册 - 恋爱萌宠上线啦 🎡"
    };
  },
});