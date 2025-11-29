// miniprogram/pages/index/index.js
const app = getApp();

Page({
  data: {
    displayImage: "",
    loading: false,
    todayDateStr: "",
    currentTask: null,
    
    // 状态控制
    pendingSave: false, // 是否处于"待确认"状态
    tempFileID: "",     // 暂存 AI 生成的图片 ID
    remainingCount: 0,  // 今日剩余重拍次数
    
    // 随机插画数据
    randomSampleImg: "", 
    sampleImages: [
      '../../images/default-photo.png', 
      '../../images/default-photo2.png', 
      '../../images/default-photo3.png'
    ],

    // 每日一句数据
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

  onLoad: function () {
    this.fetchDailyMission();
    this.pickRandomSample();
    this.pickDailyQuote();
  },

  // 随机选择一张背景插画
  pickRandomSample: function() {
    const imgs = this.data.sampleImages;
    if (imgs.length > 0) {
      const idx = Math.floor(Math.random() * imgs.length);
      this.setData({
        randomSampleImg: imgs[idx]
      });
    }
  },

  // 随机挑选文案
  pickDailyQuote: function() {
    const q = this.data.quotes;
    const idx = Math.floor(Math.random() * q.length);
    this.setData({ dailyQuote: q[idx] });
  },

  // 获取每日任务
  fetchDailyMission: function () {
    wx.showLoading({ title: "接收今日灵感..." });

    wx.cloud.callFunction({
      name: "get_daily_mission",
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          this.setData({
            currentTask: res.result.task,
            todayDateStr: res.result.dateStr,
          });
        } else {
          wx.showToast({ title: "任务加载失败", icon: "none" });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error(err);
      },
    });
  },

  // 拍照/选图 -> 上传
  onCapture: function () {
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
          loading: true, // 开启“显影中”动画
        });

        // 上传到临时目录，获取 fileID
        const cloudPath = `temp_uploads/${Date.now()}-${Math.floor(Math.random()*1000)}.jpg`;
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: res => {
            console.log("上传成功", res.fileID);
            that.callCloudBrain(res.fileID);
          },
          fail: err => {
            console.error("上传失败", err);
            that.setData({ loading: false });
            wx.showToast({ title: "上传失败", icon: "none" });
          }
        });
      },
    });
  },

  // 调用 AI 云函数
  callCloudBrain: function (fileID) {
    const that = this;

    wx.cloud.callFunction({
      name: "process_anime",
      data: { imageFileID: fileID },
      success: (res) => {
        const { status, msg, result, remaining } = res.result;

        // ✅ 成功
        if (status === 200) {
           that.setData({
             displayImage: result, // 显示 AI 生成图
             loading: false,
             pendingSave: true,    // 进入待确认模式
             tempFileID: result,   // 暂存结果
             remainingCount: remaining // 更新剩余次数
           });
           wx.vibrateShort();
        
        // ⛔ 次数用完
        } else if (status === 403) {
           that.setData({ loading: false });
           wx.showModal({
             title: '能量耗尽',
             content: msg, 
             confirmText: '好的',
             showCancel: false
           });

        // ❌ 其他错误
        } else {
           that.setData({ loading: false });
           wx.showToast({ title: msg || "AI 走神了", icon: "none" });
        }
      },
      fail: (err) => {
        console.error(err);
        that.setData({ loading: false });
        wx.showToast({ title: "连接中断", icon: "none" });
      },
    });
  },

  // 确认打卡 (写入数据库)
  onConfirmSave: function() {
    if (!this.data.tempFileID) return;
    
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
          this.setData({ pendingSave: false }); // 恢复初始状态
          this.pickDailyQuote(); // 刷新语录
          this.pickRandomSample(); // 刷新样图
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

  // 重拍 (重置状态)
  onRetry: function() {
    this.setData({
      displayImage: "", 
      pendingSave: false, 
      tempFileID: ""
    });
  },

  // 保存到相册
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
            wx.showToast({ title: '已保存到相册', icon: 'success' });
          },
          fail: (err) => {
            wx.hideLoading();
            if (err.errMsg.includes("auth deny") || err.errMsg.includes("authorize:fail")) {
              wx.showModal({
                title: '需要权限',
                content: '请在设置中开启相册权限以保存图片',
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
  }
});