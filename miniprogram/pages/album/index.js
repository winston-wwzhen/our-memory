// miniprogram/pages/album/index.js
const app = getApp();

Page({
  data: {
    memories: [],
    totalMemories: 0,
    totalPostcards: 0,
    showPreview: false,
    currentMemory: null,
    currentIndex: 0,
    loading: true // 加载状态
  },

  onLoad: function () {
    this.loadMemories();
  },

  onShow: function () {
    this.loadMemories();
  },

  // 加载相册数据
  loadMemories: async function () {
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'user_center',
        data: { action: 'get_albums' }
      });

      if (res.result.status === 200) {
        const memories = res.result.data || [];
        console.log('获取到的相册数据:', memories);

        // 获取云存储图片的临时URL
        const processedMemories = await this.processImageUrls(memories);

        // 格式化数据
        const formattedMemories = processedMemories.map(item => {
          const date = new Date(item.createdAt);
          return {
            ...item,
            dateStr: this.formatDate(date),
            fullDate: this.formatFullDate(date)
          };
        });

        console.log('处理后的相册数据:', formattedMemories);

        this.setData({
          memories: formattedMemories,
          totalMemories: memories.length,
          totalPostcards: memories.length,
          loading: false
        });
      }
    } catch (err) {
      console.error('加载相册失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  },

  // 处理图片URL，获取云存储临时链接
  processImageUrls: async function (memories) {
    const cloudPaths = memories.filter(item => item.isCloudPath && item.url);

    if (cloudPaths.length === 0) return memories;

    try {
      // 批量获取临时文件URL
      const urlMap = {};
      const promises = cloudPaths.map(async (item) => {
        const result = await wx.cloud.getTempFileURL({
          fileList: [item.url]
        });
        if (result.fileList && result.fileList[0] && result.fileList[0].tempFileURL) {
          urlMap[item.url] = result.fileList[0].tempFileURL;
        }
      });

      await Promise.all(promises);

      // 替换URL
      return memories.map(item => {
        if (item.isCloudPath && item.url && urlMap[item.url]) {
          return {
            ...item,
            url: urlMap[item.url],
            isCloudPath: false
          };
        }
        return item;
      });
    } catch (err) {
      console.error('获取临时URL失败:', err);
      return memories;
    }
  },

  // 查看单个回忆
  viewMemory: function (e) {
    console.log('viewMemory clicked', e);
    const index = e.currentTarget.dataset.index;
    const memory = this.data.memories[index];

    console.log('memory data:', memory);

    this.setData({
      currentMemory: memory,
      currentIndex: index,
      showPreview: true
    });

    // 触发震动反馈
    wx.vibrateShort();
  },

  // 关闭预览
  closePreview: function () {
    this.setData({ showPreview: false });
  },

  // 阻止事件冒泡
  stopPropagation: function () {
    // 空函数，仅用于阻止事件冒泡
  },

  // 分享回忆
  shareMemory: function () {
    const memory = this.data.currentMemory;
    if (!memory) return;

    // 显示分享选项
    wx.showActionSheet({
      itemList: ['分享给微信好友', '保存到相册'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 分享给微信好友
          this.shareToFriend(memory);
        } else if (res.tapIndex === 1) {
          // 保存到相册
          this.saveToAlbum(memory);
        }
      }
    });

    return {
      title: `我们的回忆录 - ${memory.name}`,
      path: `/pages/album/index?shareId=${memory._id}`,
      imageUrl: memory.url
    };
  },

  // 分享给微信好友
  shareToFriend: function (memory) {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    });
  },

  // 保存到相册
  saveToAlbum: function (memory) {
    wx.showLoading({ title: '保存中...' });

    // 下载图片
    wx.downloadFile({
      url: memory.url,
      success: (res) => {
        // 保存到系统相册
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
          },
          fail: (err) => {
            wx.hideLoading();
            if (err.errMsg.indexOf('auth deny') > -1) {
              wx.showModal({
                title: '授权提示',
                content: '需要您授权保存图片到相册',
                showCancel: false,
                confirmText: '去授权',
                success: () => {
                  wx.openSetting();
                }
              });
            } else {
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              });
            }
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '图片加载失败',
          icon: 'none'
        });
      }
    });
  },

  // 格式化日期
  formatDate: function (date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  },

  // 格式化完整日期
  formatFullDate: function (date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${year}年${month}月${day}日 ${hour}:${minute}`;
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '我们的旅行相册 - 记录美好时光',
      imageUrl: '/images/album-share.png'
    };
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.loadMemories().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 图片加载成功
  onImageLoad: function(e) {
    // 图片加载成功，可以在这里做一些统计或处理
    const index = e.currentTarget.dataset.index;
    if (index !== undefined) {
      const memories = this.data.memories;
      if (memories[index]) {
        memories[index].loaded = true;
        this.setData({ memories });
      }
    }
  },

  // 图片加载失败
  onImageError: function(e) {
    const index = e.currentTarget.dataset.index;
    console.error('图片加载失败:', e.detail, 'index:', index);
    if (index !== undefined) {
      const memories = this.data.memories;
      if (memories[index]) {
        // 设置加载失败标志
        memories[index].loadError = true;
        // 使用占位图
        memories[index].url = '/images/empty-box.png';
        this.setData({ memories });

        wx.showToast({
          title: '图片加载失败',
          icon: 'none',
          duration: 1000
        });
      }
    }
  },

  // 分享到微信好友
  onShareAppMessage: function (e) {
    if (e.from === 'button') {
      // 来自页面内分享按钮
      const memory = this.data.currentMemory;
      return {
        title: `我们的小萌宠带回了珍贵的回忆 - ${memory.name}`,
        path: `/pages/album/index`,
        imageUrl: memory.url
      };
    } else {
      // 来自右上角菜单
      return {
        title: '我们的旅行相册 📸',
        path: `/pages/album/index`,
        imageUrl: '/images/share-album.png'
      };
    }
  },

  // 分享到朋友圈
  onShareTimeline: function () {
    return {
      title: '我们的旅行相册 📸 - 萌宠带回来的美好回忆',
      imageUrl: '/images/share-album.png'
    };
  }
});