// miniprogram/pages/index/index.js
const app = getApp();

const DAILY_LIMIT = 3; // 与云端保持一致

Page({
  data: {
    displayImage: "",
    loading: false,
    todayDateStr: "",
    currentTask: null,
    
    pendingSave: false,
    tempFileID: "",
    remainingCount: 3, // 默认为 3
    
    hasCheckedInToday: false, // 🆕 新增：今日是否已打卡
    
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
    // 每次显示页面都刷新一下状态
    this.checkUserStatus();
  },

  onLoad: function () {
    this.fetchDailyMission();
    this.pickRandomSample();
    this.pickDailyQuote();
    // this.checkUserStatus(); // onShow 里已经调了
  },

  checkUserStatus: function() {
    // 1. 获取用户信息
    wx.cloud.callFunction({
      name: 'user_center',
      data: { action: 'login' },
      success: res => {
        if (res.result.status === 200 || res.result.status === 201) {
          const { user, isVip } = res.result; // 👈 解构出 isVip
          const stats = user.daily_usage || { date: '', count: 0 };
          
          // 计算剩余次数
          let remaining;
          if (isVip) {
             remaining = 999; // 👑 VIP 显示无限 (或999)
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
    wx.cloud.callFunction({
      name: 'get_memory_lane',
      data: { page: 0, pageSize: 1 }, // 只查最新的一条
      success: res => {
        if (res.result.status === 200 && res.result.data.length > 0) {
          const latestLog = res.result.data[0];
          // 这里的 dateStr 是云函数返回的 'YYYY-MM-DD'
          // this.data.todayDateStr 在 fetchDailyMission 里获取，可能有时差，建议统一用返回的日期对比
          // 简单做法：直接看 latestLog.originalDate 是否等于今天的日期
          
          // 重新获取一下今天的标准字符串
          const now = new Date();
          const todayStr = now.toLocaleDateString(); // 小程序的 toLocaleDateString 格式可能不统一，建议用下面的标准格式
          const todayStandard = `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()}`; // 数据库存的是 YYYY/M/D 或 YYYY-MM-DD，视之前实现而定
          
          // 更加稳妥的对比：
          // 假设 get_daily_mission 返回的 todayDateStr 是标准格式
          // 我们这里简单判断一下
          if (latestLog.originalDate === this.data.todayDateStr) {
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
          // 拿到日期后，再检查一下状态比较稳妥
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
    // 检查剩余次数
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

  onConfirmSave: function() {
    if (!this.data.tempFileID) return;
    
    // 🆕 二次确认逻辑：如果今天已打卡，弹出提示
    if (this.data.hasCheckedInToday) {
      wx.showModal({
        title: '确认覆盖？',
        content: '今天已经打过卡啦，确认要用这张新照片替换掉原来的吗？',
        confirmText: '替换',
        confirmColor: '#ff6b81',
        success: (res) => {
          if (res.confirm) {
            this.doSave();
          }
        }
      });
    } else {
      this.doSave();
    }
  },

  // 抽离保存逻辑
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
          wx.showToast({ title: '已存入纪念册', icon: 'success' });
          this.setData({ 
            pendingSave: false,
            hasCheckedInToday: true // 更新状态为已打卡
          }); 
          this.pickDailyQuote(); 
          this.pickRandomSample(); 
          this.checkUserStatus(); // 刷新一下次数
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