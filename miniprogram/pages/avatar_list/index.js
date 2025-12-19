const app = getApp();

Page({
  data: {
    list: [],
    loading: false,
    hasMore: true,
    page: 0,
    pageSize: 10,
    isRefreshed: false,
  },

  onLoad() {
    this.fetchData();
  },

  onPullDownRefresh() {
    wx.vibrateShort({ type: "light" });
    this.setData({
      isRefreshed: true,
      page: 0,
      hasMore: true,
    });
    this.fetchData(() => {
      wx.stopPullDownRefresh();
      this.setData({ isRefreshed: false });
      wx.showToast({ title: "已刷新", icon: "none" });
    });
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.fetchData();
    }
  },

  fetchData(cb) {
    if (this.data.loading && !this.data.isRefreshed) return;
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "get_avatar_list",
        page: this.data.page,
        pageSize: this.data.pageSize,
      },
      success: (res) => {
        const result = res.result;
        if (result.status === 200) {
          const newItems = result.data;
          this.setData({
            list: this.data.page === 0 ? newItems : this.data.list.concat(newItems),
            page: this.data.page + 1,
            hasMore: result.hasMore,
            loading: false,
          });
        } else {
          this.setData({ loading: false });
        }
      },
      fail: (err) => {
        console.error(err);
        this.setData({ loading: false });
      },
      complete: () => {
        if (cb && typeof cb === "function") cb();
      },
    });
  },

  navToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/avatar_detail/index?id=${id}`,
    });
  },

  onShareAppMessage() {
    return {
      title: "这里有好多超甜的情侣头像，快来换上！💕",
      path: "/pages/avatar_list/index",
    };
  },

  onShareTimeline() {
    return {
      title: "换个头像，换种心情。这里有好多好看的情侣头像 👇",
      query: "",
    };
  },

  // ✨ 修复后的弹窗逻辑
  onMakeAvatar() {
    wx.showModal({
      title: "🎨 专属定制即将上线",
      content: "AI 专属情侣头像制作功能正在紧急开发中...\n上传你和TA的照片，即可生成独一无二的漫画情头，敬请期待！",
      showCancel: false,
      confirmText: "我知道了", // 保持4个字以内，无 Emoji
      confirmColor: "#ff6b81",
      success: (res) => {
        if (res.confirm) {
          console.log("用户点击知晓");
        }
      },
    });
  },
});