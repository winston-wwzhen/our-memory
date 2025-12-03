// miniprogram/pages/capsule/index.js
const app = getApp();

Page({
  data: {
    currentTab: 0, // 0:我收到的, 1:我埋下的
    inboxList: [],
    sentList: [],
    isLoading: true,

    // 容量管理
    limit: 10,
    usage: 0,

    // 弹窗相关
    showModal: false,
    modalType: "", // 'locked', 'content', 'open_confirm'
    selectedCapsule: null,
    countdownStr: "",

    // SSR彩蛋
    showEggModal: false,
    eggData: null,
  },

  onShow: function () {
    this.fetchCapsules();
  },

  onPullDownRefresh: function () {
    this.fetchCapsules(() => wx.stopPullDownRefresh());
  },

  switchTab: function (e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.idx) });
  },

  // 跳转创建页 (带限额检查)
  navToCreate: function () {
    if (this.data.usage >= this.data.limit) {
      wx.showModal({
        title: "容量已满",
        content:
          "时光胶囊是一个珍贵的容器，目前的存储空间已满 (10/10)。\n\n后续版本将开放扩容，敬请期待。",
        showCancel: false,
        confirmText: "知道了",
        confirmColor: "#ff6b81",
      });
      return;
    }
    wx.navigateTo({ url: "/pages/capsule_create/index" });
  },

  fetchCapsules: function (cb) {
    // 避免加载闪烁，不强制设置 isLoading
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_capsules" },
      success: (res) => {
        if (res.result.status === 200) {
          this.setData({
            inboxList: res.result.inbox,
            sentList: res.result.sent,
            limit: res.result.limit,
            usage: res.result.usage,
            isLoading: false,
          });
        }
        if (cb) cb();
      },
      fail: () => {
        this.setData({ isLoading: false });
        if (cb) cb();
      },
    });
  },

  onCapsuleTap: function (e) {
    const item = e.currentTarget.dataset.item;

    // 情况1: 我埋下的
    if (this.data.currentTab === 1) {
      // 如果对方已经开启，我也能看
      if (item.isOpened) {
        this.setData({
          selectedCapsule: item,
          showModal: true,
          modalType: "content",
        });
      } else {
        // 未开启，只能提示
        wx.showToast({ title: "这是埋给TA的惊喜，静待开启⏳", icon: "none" });
      }
      return;
    }

    // 情况2: 我收到的
    this.setData({ selectedCapsule: item });

    if (item.isLocked) {
      this.calcCountdown(item.openDate);
      this.setData({ showModal: true, modalType: "locked" });
    } else if (item.canOpen) {
      this.setData({ showModal: true, modalType: "open_confirm" });
    } else if (item.isOpened) {
      this.setData({ showModal: true, modalType: "content" });
    }
  },

  calcCountdown: function (dateStr) {
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = target - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    this.setData({ countdownStr: `${days} 天` });
  },

  doOpenCapsule: function () {
    const item = this.data.selectedCapsule;
    wx.showLoading({ title: "解封中..." });

    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "open_capsule", capsuleId: item._id },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          const updatedItem = {
            ...item,
            ...res.result.data,
            isOpened: true,
            canOpen: false,
          };

          // 更新本地列表数据
          const newList = this.data.inboxList.map((i) =>
            i._id === item._id ? updatedItem : i
          );

          this.setData({
            inboxList: newList,
            selectedCapsule: updatedItem,
            modalType: "content",
          });

          // 触发彩蛋 (守得云开)
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
        wx.showToast({ title: "网络错误", icon: "none" });
      },
    });
  },

  closeModal: function () {
    this.setData({ showModal: false });
  },

  closeEggModal: function () {
    this.setData({ showEggModal: false });
  },

  previewImg: function () {
    const url = this.data.selectedCapsule.imageFileID;
    if (url) wx.previewImage({ urls: [url] });
  },
});
