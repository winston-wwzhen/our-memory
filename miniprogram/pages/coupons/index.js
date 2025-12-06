// miniprogram/pages/coupons/index.js
const app = getApp();
const TEMPLATES = require("../../utils/coupon_templates.js");

Page({
  data: {
    currentTab: 0,
    roseBalance: 0,
    templates: TEMPLATES,
    myCoupons: [],

    // 弹窗相关状态 (兑换时用，与使用无关)
    showModal: false,
    selectedItem: null,
  },

  onLoad: function () {
    this.setData({
      templates: TEMPLATES,
    });
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
            // 注意：coupon.js 中的状态为 0: 未使用, 1: 核销中(暂未用), 2: 已使用
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
    this.setData({ currentTab: Number(e.currentTarget.dataset.idx) });
  },

  // 兑换：打开确认弹窗
  onRedeem: function (e) {
    const item = e.currentTarget.dataset.item;
    if (this.data.roseBalance < item.cost) {
      wx.showToast({ title: "玫瑰不足哦~", icon: "none" });
      return;
    }

    this.setData({
      selectedItem: item,
      showModal: true,
    });
  },

  // 关闭兑换弹窗
  closeModal: function () {
    this.setData({ showModal: false });
  },

  // 确认兑换 (点击弹窗确认按钮)
  confirmRedeem: function () {
    if (!this.data.selectedItem) return;
    this.doRedeem(this.data.selectedItem);
    this.closeModal(); 
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
    const id = e.currentTarget.dataset.id; // 获取卡券ID
    const status = e.currentTarget.dataset.status;
    
    // 状态 > 0 表示已使用或核销中，禁止再次操作
    if (status > 0) return;

    // 找到当前卡券的详细信息用于弹窗展示
    const couponToUse = this.data.myCoupons.find(c => c._id === id);
    if (!couponToUse) return;

    wx.showModal({
      title: "使用卡券确认",
      // 优化提示文案，告诉用户这是对伴侣的承诺
      content: `你正在使用卡券【${couponToUse.title}】，确认向你的伴侣兑现这项承诺吗？`,
      confirmText: "立即使用",
      confirmColor: "#ff6b81",
      success: (res) => {
        if (res.confirm) {
          this.doUseCoupon(id);
        }
      },
    });
  },

  // 🆕 新增：执行核销逻辑
  doUseCoupon: function(couponId) {
    wx.showLoading({ title: "核销中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "use_coupon",
        id: couponId,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "核销成功！", icon: "success" });
          this.fetchData(); // 刷新卡包列表
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "网络错误，核销失败", icon: "none" });
      },
    });
  },
});