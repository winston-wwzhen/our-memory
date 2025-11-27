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

        // 🛑 删除原来的 wx.getFileSystemManager().readFile 代码

        // ✅ 新增：先上传到云存储临时区，获取 fileID
        const cloudPath = `temp_uploads/${Date.now()}-${Math.floor(
          Math.random() * 1000
        )}.jpg`;

        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: (res) => {
            // 上传成功，拿到 fileID，传给云函数
            console.log("上传临时文件成功", res.fileID);
            that.callCloudBrain(res.fileID);
          },
          fail: (err) => {
            console.error("上传失败", err);
            that.setData({ loading: false });
            wx.showToast({ title: "上传失败", icon: "none" });
          },
        });
      },
    });
  },

  // 修改参数名为 fileID
  callCloudBrain: function (fileID) {
    const that = this;

    wx.cloud.callFunction({
      name: "process_anime",
      data: { imageFileID: fileID }, // 👈 传 fileID 而不是 Base64
      success: (res) => {
        // ... (保持原有 success 逻辑不变)
        if (res.result && res.result.status === 200) {
          const cloudPath = res.result.result;
          that.setData({
            displayImage: cloudPath,
            loading: false,
          });
          wx.vibrateShort();
        } else {
          that.setData({ loading: false });
          wx.showToast({ title: res.result?.msg || "AI 走神了", icon: "none" });
        }
      },
      fail: (err) => {
        console.error(err);
        that.setData({ loading: false });
        wx.showToast({ title: "连接中断", icon: "none" });
      },
    });
  },
});
