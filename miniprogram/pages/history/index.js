// miniprogram/pages/history/index.js
Page({
  data: {
    memories: [],
    page: 0,
    isLoading: false,
    isEnd: false,
    totalDays: 0,
    hasPartner: false,
    showRulesModal: false, // 🟢 [新增] 控制自定义规则弹窗显示
  },

  onPullDownRefresh: function () {
    this.setData({
      page: 0,
      isEnd: false,
      memories: [],
    });
    this.fetchMemories(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShow: function () {
    this.setData({
      page: 0,
      isEnd: false,
      memories: [],
    });
    this.fetchMemories();
  },

  onReachBottom: function () {
    if (!this.data.isEnd && !this.data.isLoading) {
      this.fetchMemories();
    }
  },

  // Banner 点击分发
  onBannerTap: function () {
    if (!this.data.hasPartner) {
      this.navToMine();
    } else {
      this.showRules();
    }
  },

  navToMine: function () {
    wx.switchTab({ url: "/pages/mine/index" });
  },

  // 🟢 [修改] 打开自定义弹窗
  showRules: function () {
    this.setData({ showRulesModal: true });
  },

  // 🟢 [新增] 关闭自定义弹窗
  closeRulesModal: function () {
    this.setData({ showRulesModal: false });
  },

  fetchMemories: function (callback) {
    if (this.data.isLoading) return;

    this.setData({ isLoading: true });
    if (this.data.page === 0) {
      wx.showLoading({ title: "Loading..." });
    }

    wx.cloud.callFunction({
      name: "get_memory_lane",
      data: {
        page: this.data.page,
        pageSize: 20,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          const newMemories = res.result.data;
          const hasMore = res.result.hasMore;

          this.setData({
            memories:
              this.data.page === 0
                ? newMemories
                : this.data.memories.concat(newMemories),
            totalDays: res.result.totalDays || 0,
            hasPartner: res.result.hasPartner,
            page: this.data.page + 1,
            isEnd: !hasMore,
            isLoading: false,
          });
        }
        if (callback) callback();
      },
      fail: (err) => {
        wx.hideLoading();
        console.error(err);
        this.setData({ isLoading: false });
        if (callback) callback();
      },
    });
  },

  previewImage: function (e) {
    const src = e.currentTarget.dataset.src;
    wx.previewImage({
      urls: [src],
      current: src,
    });
  },

  onShareAppMessage: function () {
    return {
      title: "我们的回忆足迹 👣",
      path: "/pages/history/index"
    };
  },

  onShareTimeline: function () {
    return {
      title: "我们的回忆足迹 👣"
    };
  },
});