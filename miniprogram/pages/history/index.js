// miniprogram/pages/history/index.js
Page({
  data: {
    memories: [],
    page: 0,
    isLoading: false,
    isEnd: false,
    totalDays: 0,
    hasPartner: false, // 🟢 新增：伴侣状态
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

  // 🟢 新增：跳转去绑定
  navToMine: function () {
    wx.switchTab({ url: "/pages/mine/index" });
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
            hasPartner: res.result.hasPartner, // 🟢 接收状态
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
});
