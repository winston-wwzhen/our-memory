// miniprogram/pages/index/index.js
const app = getApp();

const DAILY_LIMIT = 3; 

Page({
  data: {
    displayImage: "",
    loading: false,
    todayDateStr: "",
    currentTask: null,
    
    pendingSave: false,
    tempFileID: "",
    remainingCount: 3, 
    
    hasCheckedInToday: false, // 核心状态：今日是否已打卡
    
    randomSampleImg: "", 
    sampleImages: [
      '../../images/default-photo1.png', 
      '../../images/default-photo2.png', 
    ],

    dailyQuote: {},
    quotes: [
      { text: "斯人若彩虹，遇上方知有。", author: "Flipped" },
      { text: "月色与雪色之间，你是第三种绝色。", author: "余光中" },
      { text: "To love and to be loved is everything.", author: "Bill Russell" },
      { text: "晓看天色暮看云，行也思君，坐也思君。", author: "唐寅" },
      { text: "你是我所有的少女情怀和心之所向。", author: "佚名" },
      { text: "世间所有的相遇，都是久别重逢。", author: "白落梅" },
      { text: "我想和你一起，虚度短的沉默，长的无意义。", author: "李元胜" },
      { text: "这世界很烦，但你要很可爱。", author: "佚名" }
    ]
  },

  onShow: function() {
    this.checkUserStatus();
  },

  onLoad: function () {
    this.fetchDailyMission();
    this.pickRandomSample();
    this.pickDailyQuote();
  },

  checkUserStatus: function() {
    // 1. 获取用户信息 (水滴、VIP等)
    wx.cloud.callFunction({
      name: 'user_center',
      data: { action: 'login' },
      success: res => {
        if (res.result.status === 200 || res.result.status === 201) {
          const { user, isVip, loginBonus } = res.result; 
          
          if (loginBonus && loginBonus > 0) {
            wx.showToast({
              title: `每日登录 +${loginBonus}g 爱意`,
              icon: 'none',
              duration: 3000
            });
          }

          const stats = user.daily_usage || { date: '', count: 0 };
          
          let remaining;
          if (isVip) {
             remaining = 999; 
          } else {
             const now = new Date();
             const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
             let currentUsed = (stats.date === todayStr) ? stats.count : 0;
             remaining = Math.max(0, DAILY_LIMIT - currentUsed);
          }
          
          this.setData({ remainingCount: remaining });
        }
      }
    });

    // 2. 获取最新回忆 (查今日是否已打卡)
    // 🔴 修复核心：确保日期格式与数据库一致 (YYYY-MM-DD)
    wx.cloud.callFunction({
      name: 'get_memory_lane',
      data: { page: 0, pageSize: 1 }, 
      success: res => {
        if (res.result.status === 200 && res.result.data.length > 0) {
          const latestLog = res.result.data[0];
          
          // 手动构造标准日期字符串 YYYY-MM-DD
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, '0');
          const d = String(now.getDate()).padStart(2, '0');
          const todayStandard = `${y}-${m}-${d}`;

          // 对比数据库中的 originalDate
          if (latestLog.originalDate === todayStandard) {
            this.setData({ hasCheckedInToday: true });
          } else {
            this.setData({ hasCheckedInToday: false });
          }
        }
      }
    });
  },

  pickRandomSample: function() {
    const imgs = this.data.sampleImages;
    if (imgs.length > 0) {
      const idx = Math.floor(Math.random() * imgs.length);
      this.setData({ randomSampleImg: imgs[idx] });
    }
  },

  pickDailyQuote: function() {
    const q = this.data.quotes;
    const idx = Math.floor(Math.random() * q.length);
    this.setData({ dailyQuote: q[idx] });
  },

  fetchDailyMission: function () {
    wx.showLoading({ title: "加载中..." });
    wx.cloud.callFunction({
      name: "get_daily_mission",
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          this.setData({
            currentTask: res.result.task,
            todayDateStr: res.result.dateStr,
          });
          // 拿到任务后再次检查状态，确保万无一失
          this.checkUserStatus();
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error(err);
      },
    });
  },

  onCapture: function () {
    if (this.data.remainingCount <= 0) {
      wx.showModal({
        title: '今日额度已尽',
        content: '明天再来记录美好吧~',
        showCancel: false,
        confirmText: '好的'
      });
      return;
    }

    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["camera", "album"],
      camera: "front",
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        that.setData({
          displayImage: tempFilePath,
          loading: true, 
        });

        const cloudPath = `temp_uploads/${Date.now()}-${Math.floor(Math.random()*1000)}.jpg`;
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: res => {
            that.callCloudBrain(res.fileID);
          },
          fail: err => {
            that.setData({ loading: false });
            wx.showToast({ title: "上传失败", icon: "none" });
          }
        });
      },
    });
  },

  callCloudBrain: function (fileID) {
    const that = this;
    const taskTitle = this.data.currentTask ? this.data.currentTask.title : "自由发挥";

    wx.cloud.callFunction({
      name: "process_anime",
      data: { imageFileID: fileID, taskTitle: taskTitle },
      success: (res) => {
        const { status, msg, result, remaining, evaluation } = res.result;

        if (status === 200) {
           that.setData({
             displayImage: result, 
             loading: false,
             pendingSave: true,    
             tempFileID: result,   
             remainingCount: remaining,
             aiEvaluation: evaluation 
           });
           wx.vibrateShort();
        } else if (status === 403) {
           that.setData({ loading: false });
           wx.showModal({ title: '能量耗尽', content: msg, confirmText: '好的', showCancel: false });
        } else {
           that.setData({ loading: false });
           wx.showToast({ title: msg || "AI 走神了", icon: "none" });
        }
      },
      fail: (err) => {
        that.setData({ loading: false });
        wx.showToast({ title: "连接中断", icon: "none" });
      },
    });
  },

  // 🔴 核心修复：保存前的二次确认逻辑
  onConfirmSave: function() {
    if (!this.data.tempFileID) return;
    
    // 检查 hasCheckedInToday 状态
    if (this.data.hasCheckedInToday) {
      wx.showModal({
        title: '确认覆盖？',
        content: '今天已经打过卡啦，保存新照片将覆盖旧照片哦。\n(注：今日的打卡奖励已领取)',
        confirmText: '覆盖',
        cancelText: '取消',
        confirmColor: '#ff6b81',
        success: (res) => {
          if (res.confirm) {
            this.doSave();
          }
        }
      });
    } else {
      // 没打过卡，直接保存
      this.doSave();
    }
  },

  doSave: function() {
    wx.showLoading({ title: '正在珍藏...' });
    wx.cloud.callFunction({
      name: 'user_center',
      data: {
        action: 'check_in',
        imageFileID: this.data.tempFileID
      },
      success: res => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: res.result.msg, icon: 'none', duration: 2500 });
          
          this.setData({ 
            pendingSave: false,
            hasCheckedInToday: true // 更新状态为已打卡
          }); 
          this.pickDailyQuote(); 
          this.pickRandomSample(); 
          this.checkUserStatus(); 
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({ title: '保存出错', icon: 'none' });
      }
    });
  },

  onRetry: function() {
    this.setData({
      displayImage: "", 
      pendingSave: false, 
      tempFileID: "",
      aiEvaluation: null
    });
  },

  onSaveToPhone: function() {
    if (!this.data.tempFileID) return;
    wx.showLoading({ title: '下载中...' });
    wx.cloud.downloadFile({
      fileID: this.data.tempFileID,
      success: res => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({ title: '已保存', icon: 'success' });
          },
          fail: (err) => {
            wx.hideLoading();
            if (err.errMsg.includes("auth deny") || err.errMsg.includes("authorize:fail")) {
              wx.showModal({
                title: '需要权限',
                content: '请在设置中开启相册权限',
                confirmText: '去设置',
                success: res => { if (res.confirm) wx.openSetting(); }
              })
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          }
        })
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    })
  },

  previewImage: function() {
      if (this.data.displayImage) {
          wx.previewImage({
              urls: [this.data.displayImage],
              current: this.data.displayImage
          })
      }
  }
});