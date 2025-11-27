// pages/history/index.js
Page({
  data: {
    memories: [],
  },

  onShow: function () {
    // 每次进入页面都刷新数据，保证刚打完卡能看到
    this.fetchMemories();
  },

  fetchMemories: function () {
    wx.showLoading({ title: "Loading..." });

    wx.cloud.callFunction({
      name: "get_memory_lane",
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          this.setData({
            memories: res.result.data,
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error(err);
      },
    });
  },

  // 点击图片预览大图
  previewImage: function (e) {
    const src = e.currentTarget.dataset.src;
    wx.previewImage({
      urls: [src], // 需要数组形式
      current: src,
    });
  },
});
