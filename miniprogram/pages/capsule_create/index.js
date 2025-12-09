// miniprogram/pages/capsule_create/index.js
const app = getApp();

Page({
  data: {
    content: "",
    imageFileID: "",
    date: "",
    startDate: "",
    shortcuts: [
      { label: "下个月", days: 30 },
      { label: "100天纪念", days: 100 },
      { label: "明年今日", days: 365 },
      { label: "10年后", days: 3650 },
    ],
    // SSR彩蛋
    showEggModal: false,
    eggData: null,

    // 🟢 容量提示
    limit: 10,
    usage: 0,
  },

  onLoad: function () {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const d = String(tomorrow.getDate()).padStart(2, "0");
    this.setData({ startDate: `${y}-${m}-${d}` });

    // 🟢 获取当前用量
    this.fetchUsage();
  },

  fetchUsage: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_capsules" }, // 复用接口获取 limit/usage
      success: (res) => {
        if (res.result.status === 200) {
          this.setData({
            limit: res.result.limit,
            usage: res.result.usage,
          });
        }
      },
    });
  },

  onInput: function (e) {
    this.setData({ content: e.detail.value });
  },
  onDateChange: function (e) {
    this.setData({ date: e.detail.value });
  },

  selectShortcut: function (e) {
    const days = e.currentTarget.dataset.days;
    const target = new Date();
    target.setDate(target.getDate() + days);
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, "0");
    const d = String(target.getDate()).padStart(2, "0");
    this.setData({ date: `${y}-${m}-${d}` });
  },

  chooseImage: function () {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      success: (res) => {
        this.uploadImage(res.tempFiles[0].tempFilePath);
      },
    });
  },

  uploadImage: function (filePath) {
    wx.showLoading({ title: "上传中..." });
    const cloudPath = `capsules/${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}.jpg`;
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: (res) => {
        wx.hideLoading();
        this.setData({ imageFileID: res.fileID });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "上传失败", icon: "none" });
      },
    });
  },

  deleteImage: function () {
    this.setData({ imageFileID: "" });
  },

  // 提交：无悔确认
  submit: function () {
    if (!this.data.content && !this.data.imageFileID)
      return wx.showToast({ title: "写点什么吧", icon: "none" });
    if (!this.data.date)
      return wx.showToast({ title: "请选择开启日期", icon: "none" });

    // 🟢 前端再次校验限额
    if (this.data.usage >= this.data.limit) {
      return wx.showModal({
        title: "容量已满",
        content: "您的时光胶囊存储空间已满 (10/10)，无法继续埋藏。",
        showCancel: false,
        confirmText: "知道了",
      });
    }

    wx.showModal({
      title: "郑重确认",
      content:
        "时光胶囊一旦埋下，在开启日期前无法销毁和修改。确认要封印这份回忆吗？",
      confirmText: "确认封印",
      confirmColor: "#5d4037",
      success: (res) => {
        if (res.confirm) {
          this.doSubmit();
        }
      },
    });
  },

  doSubmit: function () {
    wx.showLoading({ title: "埋藏中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "bury_capsule",
        content: this.data.content,
        imageFileID: this.data.imageFileID,
        openDate: this.data.date,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          // 🟢 埋藏成功后，更新本地用量，并将上一页 Tab 切换到 "我埋下的"
          this.setBackToSent();

          if (res.result.triggerEgg) {
            this.setData({
              showEggModal: true,
              eggData: res.result.triggerEgg,
            });
            wx.vibrateLong();
          } else {
            wx.showToast({ title: "埋藏成功", icon: "success" });
            setTimeout(() => wx.navigateBack(), 1500);
          }
        } else {
          wx.showModal({
            title: "提示",
            content: res.result.msg,
            showCancel: false,
          });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "网络错误", icon: "none" });
      },
    });
  },

  // 辅助函数：设置上一页 Tab 为 1
  setBackToSent: function () {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      const prevPage = pages[pages.length - 2];
      if (prevPage.route.includes("pages/capsule/index")) {
        prevPage.setData({ currentTab: 1 });
      }
    }
  },

  closeEggModal: function () {
    this.setData({ showEggModal: false });
    wx.navigateBack();
  },

  onShareAppMessage: function () {
    return {
      title: "封印一段时光...",
      path: "/pages/capsule_create/index"
    };
  },

  onShareTimeline: function () {
    return {
      title: "封印一段时光..."
    };
  },
});
