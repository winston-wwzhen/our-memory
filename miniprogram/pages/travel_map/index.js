// miniprogram/pages/travel_map/index.js
const app = getApp();

Page({
  data: {
    TRAVEL_ENERGY_COST: 30,

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
    this.loadPetStatus();
  },

  // Load destinations
  loadDestinations: function() {
    this.setData({ loading: true });
    
    wx.cloud.callFunction({
      name: 'user_center',
      data: { action: 'get_destinations' },
      success: (res) => {
        if (res.result.status === 200) {
          let destinations = res.result.destinations || [];
          
          destinations = destinations.map(d => {
            const rewardsStr = (d.possible_rewards && Array.isArray(d.possible_rewards)) 
                          ? d.possible_rewards.join(', ') 
                          : '未知奖励';
            
            let durationDisplay = '30'; 
            if (d.min_travel_time && d.max_travel_time) {
               durationDisplay = `${d.min_travel_time}~${d.max_travel_time}`;
            } else if (d.duration) {
               durationDisplay = d.duration;
            }

            return {
              ...d,
              rewardsStr: rewardsStr,
              duration: durationDisplay
            };
          });

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
        }
      },
      fail: (err) => {
        console.error('Failed to load destinations:', err);
        this.setData({ loading: false });
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
          const petData = res.result.pet || {}; 

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

    if (this.data.petEnergy < this.data.TRAVEL_ENERGY_COST) {
      wx.showToast({
        title: '宠物精力不足，请先喂食',
        icon: 'none'
      });
      return;
    }

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

  getAvailableFoods: function(destination) {
    const foods = [];
    const { rice_ball, luxury_bento } = this.data.foodCount;
    const createFood = (type, name, count, bonus) => ({ type, name, count, bonus });

    if (destination.food_required === 'rice_ball' && rice_ball > 0) {
        foods.push(createFood('rice_ball', '饭团便当', rice_ball, 10));
    } else if (destination.food_required === 'luxury_bento' && luxury_bento > 0) {
        foods.push(createFood('luxury_bento', '豪华御膳', luxury_bento, 20));
    } else if (destination.food_required === 'any') {
      if (rice_ball > 0) foods.push(createFood('rice_ball', '饭团便当', rice_ball, 10));
      if (luxury_bento > 0) foods.push(createFood('luxury_bento', '豪华御膳', luxury_bento, 20));
    }
    return foods;
  },

  onFoodChange: function(e) {
    this.setData({ selectedFood: e.detail.value });
  },

  confirmTravel: function() {
    if (!this.data.canTravel || !this.data.selectedDestination) return;

    wx.showLoading({ title: '准备出发中...' });

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

          this.setData({
            showTravelModal: false,
            selectedDestination: null
          });

          // 🟢 还原：直接返回上一页（Playground），在那里看倒计时
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
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },

  closeTravelModal: function() {
    this.setData({
      showTravelModal: false,
      selectedDestination: null,
      availableFoods: [],
      canTravel: false
    });
  },

  stopPropagation: function() {}
});