// miniprogram/pages/playground/index.js
Page({
  data: {
    loading: false,
    waterCount: 0,
    growth: 0,
    level: 1,
    maxGrowth: 100, // 每级 100
    progress: 0,
    harvestCount: 0 // 🆕 收获数量
  },

  onShow: function () {
    this.fetchGardenData();
  },

  onPullDownRefresh: function() {
    this.fetchGardenData(() => {
      wx.stopPullDownRefresh();
    });
  },

  fetchGardenData: function (callback) {
    wx.cloud.callFunction({
      name: 'user_center',
      data: { action: 'get_garden' },
      success: res => {
        if (res.result.status === 200) {
          const { garden, water } = res.result;
          
          const g = garden.growth_value || 0;
          // 计算等级：成长值 0-99 Lv1, 100-199 Lv2, 200-299 Lv3, 300+ Lv4(满级)
          let lv = Math.floor(g / 100) + 1;
          if (lv > 4) lv = 4; // 锁定最高等级

          const currentG = g % 100;
          const harvests = garden.harvest_count || 0;
          
          this.setData({
            waterCount: water,
            growth: currentG,
            level: lv,
            progress: (currentG / 100) * 100,
            harvestCount: harvests
          });
        }
        if (callback) callback();
      },
      fail: err => {
        console.error("加载花园数据失败", err);
        if (callback) callback();
      }
    });
  },

  onWater: function () {
    if (this.data.waterCount < 10) {
      wx.showToast({ title: '爱意不足，去首页拍照打卡吧~', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    wx.cloud.callFunction({
      name: 'user_center',
      data: { action: 'water_flower' },
      success: res => {
        this.setData({ loading: false });
        if (res.result.status === 200) {
          wx.showToast({ title: '注入成功 +10', icon: 'success' });
          this.fetchGardenData(); 
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' });
        }
      },
      fail: () => {
        this.setData({ loading: false });
        wx.showToast({ title: '网络开小差了', icon: 'none' });
      }
    });
  },

  // 🆕 收获逻辑
  onHarvest: function () {
    wx.showModal({
      title: '收获玫瑰',
      content: '恭喜你们培育出了真爱玫瑰！确认收获并开启下一轮种植吗？',
      confirmText: '收获',
      confirmColor: '#ff6b81',
      success: (res) => {
        if (res.confirm) {
          this.doHarvest();
        }
      }
    });
  },

  doHarvest: function() {
    this.setData({ loading: true });
    wx.showLoading({ title: '收获中...' });
    
    wx.cloud.callFunction({
      name: 'user_center',
      data: { action: 'harvest_garden' },
      success: res => {
        wx.hideLoading();
        this.setData({ loading: false });
        
        if (res.result.status === 200) {
          // 播放成功动画或提示
          wx.showToast({ title: '收获成功 🌹', icon: 'success', duration: 2000 });
          // 刷新数据（会重置为 Lv.1）
          this.fetchGardenData();
        } else {
          wx.showToast({ title: res.result.msg, icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        this.setData({ loading: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      }
    })
  },

  onTodo: function () {
    wx.showToast({ title: '功能开发中...', icon: 'none' });
  }
});