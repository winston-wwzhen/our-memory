// miniprogram/pages/index/index.js
const app = getApp();

Page({
  data: {
    displayImage: "",
    loading: false,
    todayDateStr: "",
    currentTask: null,
    
    // 🆕 新增状态
    pendingSave: false, // 是否处于"待确认"状态
    tempFileID: "",     // 暂存 AI 生成的图片 ID
    remainingCount: 0   // 今日剩余重拍次数
  },

  onLoad: function () {
    this.fetchDailyMission();
  },

  // 1. 获取每日任务
  fetchDailyMission: function () {
    wx.showLoading({ title: "接收指令中..." });

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
          wx.showToast({
            title: res.result.msg || "任务获取失败",
            icon: "none",
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error(err);
        wx.showToast({ title: "网络错误", icon: "none" });
      },
    });
  },

  // 2. 拍照/选图 -> 上传到云存储 (解决 Base64 崩溃问题)
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

        // 📤 上传到临时目录，获取 fileID
        const cloudPath = `temp_uploads/${Date.now()}-${Math.floor(Math.random()*1000)}.jpg`;
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: res => {
            console.log("上传临时文件成功", res.fileID);
            // 拿到 fileID 后再呼叫 AI
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

  // 3. 调用 AI 云函数
  callCloudBrain: function (fileID) {
    const that = this;

    wx.cloud.callFunction({
      name: "process_anime",
      data: { imageFileID: fileID }, // 👈 传 fileID
      success: (res) => {
        // 解构返回结果
        const { status, msg, result, remaining } = res.result;

        // ✅ 成功 (200)
        if (status === 200) {
           that.setData({
             displayImage: result, // 显示 AI 生成图
             loading: false,
             pendingSave: true,    // 进入待确认模式
             tempFileID: result,   // 暂存结果
             remainingCount: remaining // 更新剩余次数
           });
           wx.vibrateShort();
        
        // ⛔ 次数用完 (403)
        } else if (status === 403) {
           that.setData({ loading: false });
           
           wx.showModal({
             title: '能量耗尽',
             content: msg, // "今日免费次数已用完..."
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

  // 4. 用户点击“确认打卡” (写入数据库)
  onConfirmSave: function() {
    if (!this.data.tempFileID) return;
    
    wx.showLoading({ title: '保存回忆...' });
    
    wx.cloud.callFunction({
      name: 'user_center',
      data: {
        action: 'check_in',
        imageFileID: this.data.tempFileID
      },
      success: res => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: '打卡成功！', icon: 'success' });
          // 成功后退出待确认状态
          this.setData({ pendingSave: false });
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      },
      fail: err => {
        wx.hideLoading();
        console.error(err);
        wx.showToast({ title: '保存出错', icon: 'none' });
      }
    });
  },

  // 5. 用户点击“重拍” (重置状态)
  onRetry: function() {
    this.setData({
      displayImage: "", 
      pendingSave: false, 
      tempFileID: ""
    });
  },

  // 6. 用户点击“保存” (下载到相册)
  onSaveToPhone: function() {
    if (!this.data.tempFileID) return;
    
    wx.showLoading({ title: '下载中...' });
    
    // 先把云文件下载到本地
    wx.cloud.downloadFile({
      fileID: this.data.tempFileID,
      success: res => {
        // 保存到系统相册
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({ title: '已保存到相册', icon: 'success' });
          },
          fail: (err) => {
            wx.hideLoading();
            // 处理权限拒绝
            if (err.errMsg.includes("auth deny") || err.errMsg.includes("authorize:fail")) {
              wx.showModal({
                title: '需要权限',
                content: '请在设置中开启相册权限以保存图片',
                confirmText: '去设置',
                success: res => {
                  if (res.confirm) wx.openSetting();
                }
              })
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' });
            }
          }
        })
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '文件下载失败', icon: 'none' });
      }
    })
  }
});