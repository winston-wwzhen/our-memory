const app = getApp();

Page({
  data: {
    list: [],
    loading: false,
    hasMore: true,
    page: 0,
    pageSize: 10,
    isRefreshed: false // 标记当前是否处于下拉刷新状态
  },

  onLoad() {
    this.fetchData();
  },

  // 🔄 1. 下拉刷新监听
  onPullDownRefresh() {
    // 震动反馈，提升手感
    wx.vibrateShort({ type: 'light' });

    this.setData({ 
      isRefreshed: true,
      page: 0, 
      hasMore: true 
    });
    
    // 重新请求数据
    this.fetchData(() => {
      // 请求完成后，停止下拉动画
      wx.stopPullDownRefresh();
      this.setData({ isRefreshed: false });
      
      // 提示刷新成功
      wx.showToast({ title: '已刷新', icon: 'none' });
    });
  },

  // 📜 触底加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.fetchData();
    }
  },

  // 数据获取逻辑 (保持不变，确保处理了回调 cb)
  fetchData(cb) {
    if (this.data.loading && !this.data.isRefreshed) return;

    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "get_avatar_list",
        page: this.data.page,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        const result = res.result;
        if (result.status === 200) {
          const newItems = result.data;
          
          this.setData({
            // 如果是第一页(下拉刷新)，直接覆盖；否则追加
            list: this.data.page === 0 ? newItems : this.data.list.concat(newItems),
            page: this.data.page + 1,
            hasMore: result.hasMore,
            loading: false
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
        // 🔥 关键：执行回调，用于停止下拉刷新动画
        if (cb && typeof cb === 'function') cb();
      }
    });
  },

  navToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/avatar_detail/index?id=${id}`,
    });
  },

  // 📤 2. 分享给朋友
  onShareAppMessage() {
    return {
      title: '这里有好多超甜的情侣头像，快来换上！💕',
      path: '/pages/avatar_list/index',
      // imageUrl: '/images/share_cover.jpg' // 可选：自定义分享图，不填则默认截取当前页面
    };
  },

  // 🌍 3. 分享到朋友圈
  onShareTimeline() {
    return {
      title: '换个头像，换种心情。这里有好多好看的情侣头像 👇',
      query: '' // 朋友圈分享不需要带参数
      // imageUrl: ... // 朋友圈默认使用小程序 Logo 或当前页截图
    };
  }
});