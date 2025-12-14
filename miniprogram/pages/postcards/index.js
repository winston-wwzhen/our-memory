// miniprogram/pages/postcards/index.js
const app = getApp();

Page({
  data: {
    // Postcards data
    postcards: [],
    loading: true,

    // Statistics
    totalPostcards: 0,
    totalDestinations: 0,
    specialItems: 0,

    // Modal
    showDetailModal: false,
    selectedPostcard: null,
    showShareActions: false
  },

  onLoad: function(options) {
    this.loadPostcards();
  },

  onShow: function() {
    // Refresh data when page shows
    this.loadPostcards();
  },

  // Load postcards from backend
  loadPostcards: function() {
    wx.cloud.callFunction({
      name: 'user_center',
      data: { action: 'get_postcards' },
      success: (res) => {
        if (res.result.status === 200) {
          const postcards = res.result.postcards || [];

          // Process postcards data
          const processedPostcards = postcards.map(postcard => {
            return {
              ...postcard,
              travel_date_formatted: this.formatDate(postcard.travel_date),
              liked: false, // TODO: Get like status from backend
              likes: postcard.likes || 0
            };
          });

          // Calculate statistics
          const destinations = new Set(postcards.map(p => p.destination_id));
          const specialItemsCount = postcards.filter(p => p.specialty_item).length;

          this.setData({
            postcards: processedPostcards,
            totalPostcards: postcards.length,
            totalDestinations: destinations.size,
            specialItems: specialItemsCount,
            loading: false
          });
        } else {
          this.setData({ loading: false });
          wx.showToast({
            title: '加载明信片失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Failed to load postcards:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // Format date
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  },

  // View postcard detail
  onPostcardTap: function(e) {
    const postcard = e.currentTarget.dataset.postcard;
    this.setData({
      selectedPostcard: postcard,
      showDetailModal: true
    });
  },

  // Like postcard
  onLikePostcard: function(e) {
    const id = e.currentTarget.dataset.id;
    const postcards = this.data.postcards;

    // Find and update postcard
    const index = postcards.findIndex(p => p.id === id);
    if (index !== -1) {
      postcards[index].liked = !postcards[index].liked;
      postcards[index].likes = postcards[index].liked ?
        (postcards[index].likes + 1) :
        (postcards[index].likes - 1);

      this.setData({ postcards: postcards });

      // TODO: Call backend to update like status
    }
  },

  // Close detail modal
  closeDetailModal: function() {
    this.setData({
      showDetailModal: false,
      selectedPostcard: null
    });
  },

  // Share button
  onShare: function() {
    this.setData({ showShareActions: true });
  },

  // Share postcard
  onSharePostcard: function() {
    if (!this.data.selectedPostcard) return;

    // Trigger WeChat share
    wx.showShareMenu({
      withShareTicket: true
    });

    this.setData({ showShareActions: false });
  },

  // Save postcard image
  onSavePostcard: function() {
    if (!this.data.selectedPostcard) return;

    wx.showLoading({
      title: '保存中...'
    });

    // TODO: Implement save image functionality
    // This would require canvas drawing to create a composite image

    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      });
    }, 1000);
  },

  // Share to WeChat
  onShareToWechat: function() {
    this.setData({ showShareActions: false });
    // Trigger WeChat share
    wx.showShareMenu({
      withShareTicket: true
    });
  },

  // Share to Moments
  onShareToMoments: function() {
    this.setData({ showShareActions: false });
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  },

  // Share action change
  onShareActionChange: function() {
    this.setData({ showShareActions: false });
  },

  // Go to travel map
  goToTravelMap: function() {
    wx.navigateTo({
      url: '/pages/travel_map/index'
    });
  },

  // Go back
  goBack: function() {
    wx.navigateBack();
  },

  // Stop event propagation
  stopPropagation: function() {
    // Do nothing
  },

  // Share message
  onShareAppMessage: function(res) {
    const postcard = this.data.selectedPostcard;

    if (postcard) {
      return {
        title: `我的宠物从${postcard.destination.name}寄来了明信片！`,
        path: `/pages/postcards/index`,
        imageUrl: postcard.destination.image
      };
    }

    return {
      title: '我们的旅行回忆',
      path: `/pages/postcards/index`
    };
  }
});