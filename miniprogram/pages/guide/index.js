// miniprogram/pages/guide/index.js
const guideData = require("../../utils/guide_data.js");

Page({
  data: {
    currentTab: 0, // 0:清单, 1:送礼, 2:急救

    // 数据源
    loveList: guideData.LOVE_LIST,
    giftGuide: guideData.GIFT_GUIDE,
    sosQuotes: guideData.SOS_QUOTES,

    // 状态
    finishedIds: [], // 已完成的清单ID
    progress: 0, // 进度百分比

    // 送礼 Tab 的子分类索引
    giftTabIndex: 0,
  },

  onLoad: function () {
    this.fetchLoveListStatus();
  },

  // 切换顶部 Tab
  switchTab: function (e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.idx) });
  },

  // 1. 恋爱清单相关
  fetchLoveListStatus: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_love_list_status" },
      success: (res) => {
        if (res.result.status === 200) {
          const ids = res.result.finishedList;
          this.setData({
            finishedIds: ids,
            progress: Math.floor(
              (ids.length / this.data.loveList.length) * 100
            ),
          });
        }
      },
    });
  },

  toggleItem: function (e) {
    const id = e.currentTarget.dataset.id;
    const idx = e.currentTarget.dataset.index;

    // 震动反馈
    wx.vibrateShort({ type: "light" });

    // 乐观更新 UI
    let newIds = [...this.data.finishedIds];
    const isExist = newIds.includes(id);

    if (isExist) {
      newIds = newIds.filter((i) => i !== id);
    } else {
      newIds.push(id);
    }

    this.setData({
      finishedIds: newIds,
      progress: Math.floor((newIds.length / this.data.loveList.length) * 100),
    });

    // 发送请求
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "toggle_love_list_item", itemId: id },
      success: (res) => {
        if (res.result.status === 200) {
          if (res.result.isFinished) {
            wx.showToast({ title: "打卡成功", icon: "none" });
          }
        }
      },
    });
  },

  // 2. 送礼指南相关
  switchGiftTab: function (e) {
    this.setData({ giftTabIndex: Number(e.currentTarget.dataset.idx) });
  },

  copyGift: function (e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: "已复制关键词", icon: "none" }),
    });
  },

  // 3. 急救包相关
  copyQuote: function (e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: "已复制文案", icon: "none" }),
    });
  },

  onShareAppMessage: function () {
    return {
      title: "恋爱生存指南 📖",
      path: "/pages/guide/index"
    };
  },

  onShareTimeline: function () {
    return {
      title: "恋爱生存指南 📖"
    };
  },
  
  navToCoupon: function () {
    wx.navigateTo({ url: "/pages/coupons/index" });
  },
});
