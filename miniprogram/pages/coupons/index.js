// miniprogram/pages/coupons/index.js
const app = getApp();
const TEMPLATES = require("../../utils/coupon_templates.js");

Page({
  data: {
    currentTab: 0,
    roseBalance: 0,
    templates: TEMPLATES,
    myCoupons: [],

    // 分页状态
    page: 0,
    isEnd: false,

    // 弹窗相关
    showModal: false,
    selectedItem: null,
  },

  onLoad: function () {
    this.setData({ templates: TEMPLATES });
  },

  onShow: function () {
    // 每次显示重置第一页
    this.setData({ page: 0, isEnd: false, myCoupons: [] });
    this.fetchData();
  },

  onPullDownRefresh: function () {
    this.setData({ page: 0, isEnd: false, myCoupons: [] });
    this.fetchData(() => wx.stopPullDownRefresh());
  },

  onReachBottom: function () {
    if (!this.data.isEnd) {
      this.fetchData();
    }
  },

  fetchData: function (cb) {
    // 1. 获取玫瑰余额 (保持不变)
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_pet_status" },
      success: (res) => {
        if (res.result.status === 200) {
          this.setData({ 
            roseBalance: res.result.rose_balance || 0 
          });
        }
      },
    });

    // 2. 获取我的卡包 (🟢 增加分页逻辑)
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "get_my_coupons",
        page: this.data.page,
        pageSize: 20,
      },
      success: (res) => {
        if (res.result.status === 200) {
          const list = res.result.data.map((item) => {
            item.createTimeStr = new Date(item.createdAt).toLocaleDateString();
            return item;
          });

          this.setData({
            myCoupons: this.data.myCoupons.concat(list),
            page: this.data.page + 1,
            isEnd: list.length < 20, // 如果返回少于20条，说明到底了
          });
        }
        if (cb) cb();
      },
    });
  },

  switchTab: function (e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.idx) });
  },

  onRedeem: function (e) {
    const item = e.currentTarget.dataset.item;
    if (this.data.roseBalance < item.cost) {
      wx.showToast({ title: "玫瑰不足哦~", icon: "none" });
      return;
    }
    this.setData({ selectedItem: item, showModal: true });
  },

  closeModal: function () {
    this.setData({ showModal: false });
  },

  confirmRedeem: function () {
    if (!this.data.selectedItem) return;
    this.doRedeem(this.data.selectedItem);
    this.closeModal();
  },

  // 🟢 修复：调用兑换接口
  doRedeem: function (item) {
    wx.showLoading({ title: "制作中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "redeem_coupon",
        templateId: item.id, // 核心：只传 ID
        // 移除 cost, title 等前端数据，防止篡改
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "制作成功", icon: "success" });
          // 刷新列表
          this.setData({ page: 0, isEnd: false, myCoupons: [] });
          this.fetchData();
          this.setData({ currentTab: 1 });

          // 🥚 触发彩蛋：挥金如土 / 和平鸽
          if (res.result.triggerEgg) {
            this.setData({
              showEggModal: true,
              eggData: res.result.triggerEgg,
            });
            wx.vibrateLong();
          }
        } else {
          wx.showModal({
            title: "提示",
            content: res.result.msg,
            showCancel: false,
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "网络错误", icon: "none" });
      },
    });
  },

  // 🟢 修复：使用卡券接口
  onUseCoupon: function (e) {
    const id = e.currentTarget.dataset.id;
    const status = e.currentTarget.dataset.status;

    if (status > 0) return; // 0:未使用

    const couponToUse = this.data.myCoupons.find((c) => c._id === id);
    if (!couponToUse) return;

    wx.showModal({
      title: "使用卡券确认",
      content: `确认使用【${couponToUse.title}】？使用后将消耗一张库存。`,
      confirmText: "立即使用",
      confirmColor: "#ff6b81",
      success: (res) => {
        if (res.confirm) {
          this.doUseCoupon(id);
        }
      },
    });
  },

  doUseCoupon: function (couponId) {
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
          // 局部更新本地数据，避免全量刷新闪烁
          const newCoupons = this.data.myCoupons.map((c) => {
            if (c._id === couponId) c.status = 2; // 更新为已使用
            return c;
          });
          this.setData({ myCoupons: newCoupons });
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

  closeEggModal: function () {
    this.setData({ showEggModal: false });
  },

  onShareAppMessage: function () {
    return {
      title: "爱的兑换券 🎫",
      path: "/pages/coupons/index"
    };
  },

  onShareTimeline: function () {
    return {
      title: "爱的兑换券 🎫"
    };
  },

  onVerifyCoupon: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认核销',
      content: '确认履行此承诺，并完成核销吗？',
      success: (res) => {
        if(res.confirm) {
          wx.cloud.callFunction({
            name: 'user_center',
            data: { action: 'confirm_coupon', couponId: id }, // 调用新接口
            success: (res) => {
               if(res.result.status === 200) {
                 wx.showToast({ title: '核销成功' });
                 this.onPullDownRefresh(); // 刷新列表
               }
            }
          })
        }
      }
    })
  }
});
