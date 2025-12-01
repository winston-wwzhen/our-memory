// miniprogram/pages/coupons/index.js
const app = getApp();
const TEMPLATES = require("../../utils/coupon_templates.js");

Page({
  data: {
    currentTab: 0,
    roseBalance: 0,
    templates: TEMPLATES,
    myCoupons: [],

    // 🆕 弹窗相关状态
    showModal: false,
    selectedItem: null,
  },

  onShow: function () {
    this.fetchData();
  },

  onPullDownRefresh: function () {
    this.fetchData(() => wx.stopPullDownRefresh());
  },

  fetchData: function (cb) {
    // 1. 获取玫瑰余额
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_garden" },
      success: (res) => {
        if (res.result.status === 200 && res.result.garden) {
          this.setData({ roseBalance: res.result.garden.rose_balance || 0 });
        }
      },
    });

    // 2. 获取我的卡包
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_my_coupons" },
      success: (res) => {
        if (res.result.status === 200) {
          const list = res.result.data.map((item) => {
            item.createTimeStr = new Date(item.createdAt).toLocaleDateString();
            return item;
          });
          this.setData({ myCoupons: list });
        }
        if (cb) cb();
      },
    });
  },

  switchTab: function (e) {
    this.setData({ currentTab: e.currentTarget.dataset.idx });
  },

  // 🟢 点击列表项：打开自定义弹窗
  onRedeem: function (e) {
    const item = e.currentTarget.dataset.item;
    if (this.data.roseBalance < item.cost) {
      wx.showToast({ title: "玫瑰不足哦~", icon: "none" });
      return;
    }

    // 记录当前选中的券，并显示弹窗
    this.setData({
      selectedItem: item,
      showModal: true,
    });
  },

  // 🟢 关闭弹窗
  closeModal: function () {
    this.setData({ showModal: false });
  },

  // 🟢 确认兑换 (点击弹窗确认按钮)
  confirmRedeem: function () {
    if (!this.data.selectedItem) return;
    this.doRedeem(this.data.selectedItem);
    this.closeModal(); // 关闭弹窗
  },

  doRedeem: function (item) {
    wx.showLoading({ title: "制作中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "redeem_coupon",
        templateId: item.id,
        title: item.title,
        desc: item.desc,
        cost: item.cost,
        type: item.type,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "制作成功", icon: "success" });
          this.fetchData(); // 刷新余额和列表
          this.setData({ currentTab: 1 }); // 自动跳到卡包
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "网络错误", icon: "none" });
      },
    });
  },

  // 使用卡券
  onUseCoupon: function (e) {
    const status = e.currentTarget.dataset.status;
    if (status > 0) return;

    wx.showModal({
      title: "使用卡券",
      content: "请向你的伴侣出示此界面，确认后点击使用。",
      confirmText: "立即使用",
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: "功能开发中...", icon: "none" });
        }
      },
    });
  },
});
