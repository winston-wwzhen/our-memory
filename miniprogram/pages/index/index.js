// index.js
const app = getApp();

Page({
  data: {
    displayImage: "",
    loading: false,
    todayDateStr: "", // 新的日期字符串
    currentTask: null, // 🆕 新增：用于存放今日任务数据
  },

  onLoad: function () {
    this.fetchDailyMission();
  },

  fetchDailyMission: function () {
    wx.showLoading({ title: "接收指令中..." });

    wx.cloud.callFunction({
      name: "get_daily_mission", // 调用新的云函数
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          this.setData({
            currentTask: res.result.task,
            todayDateStr: res.result.dateStr,
          });
        } else {
          // 数据库可能是空的，或者出错了
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

        // 读取并上传 (逻辑不变)
        wx.getFileSystemManager().readFile({
          filePath: tempFilePath,
          encoding: "base64",
          success: (res) => {
            that.callCloudBrain(res.data);
          },
        });
      },
    });
  },

  callCloudBrain: function (base64Str) {
    const that = this;

    wx.cloud.callFunction({
      name: "process_anime",
      data: { imageBase64: base64Str },
      success: (res) => {
        if (res.result && res.result.status === 200) {
          // 🆕 适配新逻辑：后端返回的是 fileID
          const cloudPath = res.result.result;

          that.setData({
            displayImage: cloudPath, // 小程序 <image> 标签原生支持 cloud:// 路径
            loading: false,
          });

          // 可以在这里加个震动反馈，增加爽感
          wx.vibrateShort();
        } else {
          // ... 错误处理保持不变 ...
          that.setData({ loading: false });
          wx.showToast({ title: "AI 走神了", icon: "none" });
        }
      },
      fail: (err) => {
        // ... 错误处理保持不变 ...
        console.error(err);
        that.setData({ loading: false });
        wx.showToast({ title: "连接中断", icon: "none" });
      },
    });
  },
});
