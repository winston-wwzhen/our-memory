// miniprogram/pages/playground/index.js
Page({
  data: {
    loading: false,
    waterCount: 0,
    growth: 0,
    level: 1,
    maxGrowth: 100, 
    progress: 0,
    harvestCount: 0,
    logs: [], // 🆕 新增日志数组
    showLogModal: false // 🆕 控制日志弹窗显示
  },

  onShow: function () {
    this.fetchGardenData();
  },

  onPullDownRefresh: function() {
    this.fetchGardenData(() => wx.stopPullDownRefresh());
  },

  fetchGardenData: function (callback) {
    wx.cloud.callFunction({
      name: 'user_center',
      data: { action: 'get_garden' },
      success: res => {
        if (res.result.status === 200) {
          const { garden, water, logs } = res.result; // 🆕 获取 logs
          
          const g = garden.growth_value || 0;
          let lv = Math.floor(g / 100) + 1;
          if (lv > 4) lv = 4; 

          const currentG = g % 100;
          const harvests = garden.harvest_total || 0; 
          
          let finalProgress = (lv >= 4) ? 100 : (currentG / 100) * 100;

          // 🆕 格式化日志时间
          const formattedLogs = (logs || []).map(item => {
            item.timeAgo = this.formatTimeAgo(item.date);
            return item;
          });

          this.setData({
            waterCount: water,
            growth: currentG,
            level: lv,
            progress: finalProgress + '%', 
            harvestCount: harvests,
            logs: formattedLogs // 🆕 设置日志数据
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

  // 🆕 简易时间格式化
  formatTimeAgo: function(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000; // 秒

    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    return Math.floor(diff / 86400) + '天前';
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
  
  // 🆕 切换日志弹窗
  toggleLogModal: function() {
    this.setData({ showLogModal: !this.data.showLogModal });
  },

  onHarvest: function () {
    wx.showModal({
      title: '收获玫瑰',
      content: '恭喜你们培育出了真爱玫瑰！确认收获并开启下一轮种植吗？',
      confirmText: '收获',
      confirmColor: '#ff6b81',
      success: (res) => { if (res.confirm) this.doHarvest(); }
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
          wx.showToast({ title: '收获成功 🌹', icon: 'success', duration: 2000 });
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
  navToCoupons: function() { wx.navigateTo({ url: '/pages/coupons/index' }); },
  navToDecision: function() {wx.navigateTo({
    url: '/pages/decision/index',
  })},
  onTodo: function () { wx.showToast({ title: '功能开发中...', icon: 'none' }); }
});