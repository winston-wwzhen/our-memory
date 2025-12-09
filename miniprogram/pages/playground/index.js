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

    // 检查红点状态
    if (app.globalData.userInfo && app.globalData.userInfo.partner_id) {
      this.checkCapsuleRedDot();
      this.checkMessageHint();
      this.checkQuizHint();
    }
  },

  // 🟢 修复：添加下拉刷新监听函数
  onPullDownRefresh: function () {
    // 1. 刷新用户状态（积分等）
    this.updateUserStatus();

    // 2. 刷新提示红点
    if (app.globalData.userInfo && app.globalData.userInfo.partner_id) {
      this.checkCapsuleRedDot();
      this.checkMessageHint();
      this.checkQuizHint();
    }

    // 3. 刷新花园数据（核心数据），并在回调中停止下拉动画
    this.fetchGardenData(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: "刷新成功", icon: "none" });
    });
  },

  // 🟢 核心修改：基于“盖章状态”判断提示
  checkMessageHint: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_messages" },
      success: (res) => {
        if (res.result.status === 200) {
          const msgs = res.result.data || [];

          // 1. 筛选出“对方”发的留言 (过滤掉我自己的)
          const partnerMsgs = msgs.filter((m) => !m.isMine);

          // 2. 找到最新一条
          if (partnerMsgs.length > 0) {
            const latest = partnerMsgs[0];

            // 3. 只有当“未盖章(isLiked false)”时，才显示提示
            if (!latest.isLiked) {
              this.setData({ messageHint: true });
            } else {
              this.setData({ messageHint: false });
            }
          } else {
            this.setData({ messageHint: false });
          }
        }
      },
    });
  },

  navToBoard: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({ url: "/pages/message_board/index" });
  },

  // 💊 时光胶囊
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
          if (round) {
            if (round.my_progress < round.total) {
              this.setData({ quizHint: true });
            } else {
              this.setData({ quizHint: false });
            }
          } else {
            this.setData({ quizHint: false });
          }
        }
      },
    });
  },

  navToCapsule: function () {
    if (!this.checkPartner()) return;
    this.setData({ capsuleRedDot: false });
    wx.navigateTo({ url: "/pages/capsule/index" });
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

  checkPartner: function () {
    const user = app.globalData.userInfo;
    if (!user || !user.partner_id) {
      wx.showModal({
        title: "情侣专属功能",
        content:
          "“恋爱游乐园”是情侣专属的互动空间哦 🌱\n\n请先去【Mine】页面邀请另一半绑定，开启你们的甜蜜之旅吧！",
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

  onWater: function () {
    if (!this.checkPartner()) return;
    if (this.data.waterCount < 10) {
      wx.showToast({ title: "爱意不足，去首页拍照打卡吧~", icon: "none" });
      return;
    }
    this.setData({ loading: true });
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "water_flower" },
      success: (res) => {
        this.setData({ loading: false });
        if (res.result.status === 200) {
          wx.showToast({ title: "注入成功 +10", icon: "success" });
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

  toggleLogModal: function () {
    if (!this.checkPartner()) return;
    this.setData({ showLogModal: !this.data.showLogModal });
  },

  onHarvest: function () {
    if (!this.checkPartner()) return;
    wx.showModal({
      title: "收获玫瑰",
      content: "恭喜你们培育出了真爱玫瑰！确认收获并开启下一轮种植吗？",
      confirmText: "收获",
      confirmColor: "#ff6b81",
      success: (res) => {
        if (res.confirm) this.doHarvest();
      },
    });
  },

  doHarvest: function () {
    this.setData({ loading: true });
    wx.showLoading({ title: "收获中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "harvest_garden" },
      success: (res) => {
        wx.hideLoading();
        this.setData({ loading: false });
        if (res.result.status === 200) {
          wx.showToast({
            title: "收获成功 🌹",
            icon: "success",
            duration: 2000,
          });
          this.fetchGardenData();

          // 🥚 触发彩蛋：辛勤园丁
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

  navToDecision: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({ url: "/pages/decision/index" });
  },
  navToCoupons: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({ url: "/pages/coupons/index" });
  },
  navToQuiz: function () {
    if (!this.checkPartner()) return;
    this.setData({ quizHint: false });
    wx.navigateTo({ url: "/pages/quiz/index" });
  },
  navToGuide: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({ url: "/pages/guide/index" });
  },
  onTodo: function () {
    if (!this.checkPartner()) return;
    wx.showToast({ title: "功能开发中...", icon: "none" });
  },

  closeEggModal: function () {
    this.setData({ showEggModal: false });
  },

  onShareAppMessage: function () {
    return {
      title: "欢迎来到恋爱游乐园 🎡",
      path: "/pages/playground/index"
    };
  },

  onShareTimeline: function () {
    return {
      title: "欢迎来到恋爱游乐园 🎡"
    };
  },
});
