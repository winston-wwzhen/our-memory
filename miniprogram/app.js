// miniprogram/app.js
App({
  globalData: {
    hasLogin: false,
    appName: "我们的纪念册",
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      // 🔗 Link Start!
      wx.cloud.init({
        env: "cloud1-0g4462vv9d9954a5",
        traceUser: true,
      });

      console.log("✨ 我们的纪念册 (Our Memory) 已启动 ✨");
    }
  },
});
