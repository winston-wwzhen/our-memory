// miniprogram/pages/travel_map/index.js
const app = getApp();

Page({
  data: {
    TRAVEL_ENERGY_COST: 30, // From backend config

    // Pet status
    petEnergy: 0,
    moodValue: 0,
    foodCount: {
      rice_ball: 0,
      luxury_bento: 0
    },

    // Destinations
    destinations: [],
    availableDestinations: [],
    lockedDestinations: [],
    loading: true,

    // Modal
    showTravelModal: false,
    selectedDestination: null,
    selectedFood: 'rice_ball',
    availableFoods: [],
    canTravel: false
  },

  onLoad: function() {
    this.loadDestinations();
    this.loadPetStatus();
  },

  onShow: function() {
    // Refresh pet status when page shows
    this.loadPetStatus();
  },

  // Load destinations from backend
  loadDestinations: function() {
    wx.cloud.callFunction({
      name: 'user_center',
      data: { action: 'get_destinations' },
      success: (res) => {
        if (res.result.status === 200) {
          const destinations = res.result.destinations || [];

          // Group destinations by unlock status
          const available = destinations.filter(d => d.unlocked);
          const locked = destinations.filter(d => !d.unlocked);

          this.setData({
            destinations: destinations,
            availableDestinations: available,
            lockedDestinations: locked,
            loading: false
          });
        } else {
          this.setData({ loading: false });
          wx.showToast({
            title: '加载目的地失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('Failed to load destinations:', err);
        this.setData({ loading: false });
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // Load pet status
  loadPetStatus: function() {
    wx.cloud.callFunction({
      name: 'user_center',
      data: { action: 'get_pet_status' },
      success: (res) => {
        if (res.result.status === 200) {
          const petData = res.result.pet;

          this.setData({
            petEnergy: petData.energy_level || 0,
            moodValue: petData.mood_value || 0,
            foodCount: petData.food_inventory || {
              rice_ball: 0,
              luxury_bento: 0
            }
          });
        }
      },
      fail: (err) => {
        console.error('Failed to load pet status:', err);
      }
    });
  },

  // Select destination
  onSelectDestination: function(e) {
    const destination = e.currentTarget.dataset.destination;

    // Check if pet has enough energy
    if (this.data.petEnergy < this.data.TRAVEL_ENERGY_COST) {
      wx.showToast({
        title: '宠物精力不足，请先喂食',
        icon: 'none'
      });
      return;
    }

    // Check available foods
    const availableFoods = this.getAvailableFoods(destination);

    if (availableFoods.length === 0) {
      wx.showToast({
        title: '没有足够的便当，快去准备吧',
        icon: 'none'
      });
      return;
    }

    this.setData({
      showTravelModal: true,
      selectedDestination: destination,
      availableFoods: availableFoods,
      selectedFood: availableFoods[0].type,
      canTravel: true
    });
  },

  // Get available foods for destination
  getAvailableFoods: function(destination) {
    const foods = [];

    if (destination.food_required === 'rice_ball' && this.data.foodCount.rice_ball > 0) {
      foods.push({
        type: 'rice_ball',
        name: '饭团便当',
        count: this.data.foodCount.rice_ball,
        bonus: 10
      });
    }

    if (destination.food_required === 'luxury_bento' && this.data.foodCount.luxury_bento > 0) {
      foods.push({
        type: 'luxury_bento',
        name: '豪华御膳',
        count: this.data.foodCount.luxury_bento,
        bonus: 20
      });
    }

    // If destination accepts any food type
    if (destination.food_required === 'any') {
      if (this.data.foodCount.rice_ball > 0) {
        foods.push({
          type: 'rice_ball',
          name: '饭团便当',
          count: this.data.foodCount.rice_ball,
          bonus: 10
        });
      }
      if (this.data.foodCount.luxury_bento > 0) {
        foods.push({
          type: 'luxury_bento',
          name: '豪华御膳',
          count: this.data.foodCount.luxury_bento,
          bonus: 20
        });
      }
    }

    return foods;
  },

  // Food selection change
  onFoodChange: function(e) {
    this.setData({
      selectedFood: e.detail.value
    });
  },

  // Confirm travel
  confirmTravel: function() {
    if (!this.data.canTravel || !this.data.selectedDestination) return;

    wx.showLoading({
      title: '准备出发中...'
    });

    wx.cloud.callFunction({
      name: 'user_center',
      data: {
        action: 'send_pet_travel',
        destination_id: this.data.selectedDestination.id,
        food_type: this.data.selectedFood
      },
      success: (res) => {
        wx.hideLoading();

        if (res.result.status === 200) {
          wx.showToast({
            title: '出发成功！',
            icon: 'success'
          });

          // Close modal and navigate back
          this.setData({
            showTravelModal: false,
            selectedDestination: null
          });

          // Navigate back to playground after delay
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);

        } else {
          wx.showToast({
            title: res.result.msg || '出发失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('Failed to send travel:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  // Close travel modal
  closeTravelModal: function() {
    this.setData({
      showTravelModal: false,
      selectedDestination: null,
      availableFoods: [],
      canTravel: false
    });
  },

  // Go back
  goBack: function() {
    wx.navigateBack();
  },

  // Stop event propagation
  stopPropagation: function() {
    // Do nothing
  }
});