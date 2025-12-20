// miniprogram/pages/coupons/index.js
const app = getApp();
const TEMPLATES = require("../../utils/coupon_templates.js");

Page({
  data: {
    currentTab: 0,
    roseBalance: 0,
    templates: TEMPLATES,
    
    // Tab 1: 我的卡包
    myCoupons: [],
    page: 0,
    isEnd: false,

    // Tab 2: 待我执行
    todoCoupons: [],
    todoPage: 0,
    todoIsEnd: false,

    // 弹窗相关
    showModal: false,
    showUseModal: false,
    selectedItem: null,
    currentCoupon: null, 
  },

  onLoad: function () {
    this.setData({ templates: TEMPLATES });
  },

  onShow: function () {
    this.refreshCurrentTab();
  },

  onPullDownRefresh: function () {
    this.refreshCurrentTab(() => wx.stopPullDownRefresh());
  },
  
  onReachBottom: function () {
    if (this.data.currentTab === 1 && !this.data.isEnd) {
      this.fetchMyCoupons();
    } else if (this.data.currentTab === 2 && !this.data.todoIsEnd) {
      this.fetchTodoCoupons();
    }
  },

  switchTab: function (e) {
    const idx = Number(e.currentTarget.dataset.idx);
    this.setData({ currentTab: idx });
    
    // 懒加载：切换过去且没数据时才加载
    if (idx === 1 && this.data.myCoupons.length === 0) {
      this.fetchMyCoupons();
    } else if (idx === 2 && this.data.todoCoupons.length === 0) {
      this.fetchTodoCoupons();
    }
  },

  refreshCurrentTab: function(cb) {
    if (this.data.currentTab === 1) {
      this.setData({ page: 0, isEnd: false, myCoupons: [] });
      this.fetchMyCoupons(cb);
    } else if (this.data.currentTab === 2) {
      this.setData({ todoPage: 0, todoIsEnd: false, todoCoupons: [] });
      this.fetchTodoCoupons(cb);
    } else {
      this.fetchRoseBalance();
      if(cb) cb();
    }
  },

  fetchRoseBalance: function() {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_pet_status" },
      success: (res) => {
        if (res.result.status === 200) {
          this.setData({ roseBalance: res.result.rose_balance || 0 });
        }
      },
    });
  },

  // 📥 Tab 1: 获取我的卡包 (type: 'mine')
  fetchMyCoupons: function (cb) {
    this.fetchRoseBalance();
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "get_my_coupons", 
        type: 'mine', // ✅ 明确告诉后端我要"我的"
        page: this.data.page,
        pageSize: 20,
      },
      success: (res) => {
        if (res.result.status === 200) {
          const list = this.formatList(res.result.data);
          this.setData({
            myCoupons: this.data.myCoupons.concat(list),
            page: this.data.page + 1,
            isEnd: list.length < 20, 
          });
        }
        if (cb) cb();
      },
      fail: () => { if(cb) cb(); }
    });
  },

  // 📥 Tab 2: 获取待我执行 (type: 'todo')
  fetchTodoCoupons: function(cb) {
    wx.showLoading({ title: '加载任务...' });
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "get_my_coupons", 
        type: 'todo', // ✅ 明确告诉后端我要"待办"
        page: this.data.todoPage,
        pageSize: 20, 
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          const list = this.formatList(res.result.data);
          this.setData({
            todoCoupons: this.data.todoCoupons.concat(list),
            todoPage: this.data.todoPage + 1,
            todoIsEnd: list.length < 20,
          });
        }
        if (cb) cb();
      },
      fail: () => {
        wx.hideLoading();
        if(cb) cb();
      }
    });
  },

  formatList: function(list) {
    return list.map((item) => {
      item.createTimeStr = new Date(item.createdAt).toLocaleDateString();
      item.displayTitle = item.title || (item.template ? item.template.title : '权益券');
      return item;
    });
  },

  // === 兑换、使用、核销逻辑 (保持不变，因为只涉及 ID 操作) ===
  
  onRedeem: function (e) {
    const item = e.currentTarget.dataset.item;
    if (this.data.roseBalance < item.cost) {
      wx.showToast({ title: "玫瑰不足哦~", icon: "none" });
      return;
    }
    this.setData({ selectedItem: item, showModal: true });
  },
  closeModal: function () { this.setData({ showModal: false }); },
  confirmRedeem: function () {
    if (!this.data.selectedItem) return;
    this.doRedeem(this.data.selectedItem);
    this.closeModal();
  },
  doRedeem: function (item) {
    wx.showLoading({ title: "制作中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "redeem_coupon", templateId: item.id },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "制作成功", icon: "success" });
          this.setData({ currentTab: 1 });
          this.refreshCurrentTab();
        } else {
          wx.showModal({ title: "提示", content: res.result.msg, showCancel: false });
        }
      }
    });
  },

  onUseCoupon: function (e) {
    const id = e.currentTarget.dataset.id;
    const coupon = this.data.myCoupons.find((c) => c._id === id);
    if (!coupon) return;
    wx.showModal({
      title: "申请使用",
      content: `确定要使用这张【${coupon.displayTitle}】吗？\n需对象线下执行后，你再来确认核销哦~`,
      confirmText: "我要使用",
      confirmColor: "#ff6b81",
      success: (res) => {
        if (res.confirm) {
          this.doUseCoupon(id);
        }
      },
    });
  },
  doUseCoupon: function (couponId) {
    wx.showLoading({ title: "申请中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "use_coupon", id: couponId },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "已申请", icon: "success" });
          const newCoupons = this.data.myCoupons.map((c) => {
            if (c._id === couponId) c.status = 1; 
            return c;
          });
          this.setData({ myCoupons: newCoupons });
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      }
    });
  },

  onVerifyCoupon: function(e) {
    const id = e.currentTarget.dataset.id;
    const title = e.currentTarget.dataset.title;
    wx.showModal({
      title: "确认核销",
      content: `对象已经完成【${title}】的内容了吗？\n确认后该券将标记为已完成。`,
      confirmText: "确认收到",
      confirmColor: "#4caf50",
      success: (res) => {
        if (res.confirm) {
          this.doVerifyCoupon(id);
        }
      }
    });
  },
  doVerifyCoupon: function(id) {
    wx.showLoading({ title: "核销中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "confirm_coupon", couponId: id },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "已完成", icon: "success" });
          const newCoupons = this.data.myCoupons.map((c) => {
            if (c._id === id) c.status = 2; 
            return c;
          });
          this.setData({ myCoupons: newCoupons });
        } else {
          wx.showToast({ title: "操作失败", icon: "none" });
        }
      }
    });
  },

  onRemindPartner: function(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({ currentCoupon: item, showUseModal: true });
  },
  closeUseModal: function() { this.setData({ showUseModal: false }); },
  onNotifyPartner: function() { },

  onShareAppMessage: function (res) {
    if (res.from === 'button') {
      const title = this.data.currentCoupon?.displayTitle || '权益券';
      return {
        title: `👋 宝，我申请了【${title}】，快去"待我执行"里看看！`,
        path: '/pages/coupons/index',
        imageUrl: 'https://636c-cloud1-0g4462vv9d9954a5-1387968548.tcb.qcloud.la/images/share-coupon.png'
      };
    }
    return { title: "爱的兑换券 🎫", path: "/pages/coupons/index" };
  }
});