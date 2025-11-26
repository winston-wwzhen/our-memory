// miniprogram/app.js
App({
  globalData: {
    hasLogin: false,
    protocolVersion: "CP-IP v1.0 [JS-Core]",
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error("❌ Critical: Cloud kernel missing.");
    } else {
      // 🔗 Link Start!
      wx.cloud.init({
        env: "cloud1-0g4462vv9d9954a5",
        traceUser: true,
      });

      console.log(`
      ██████╗ ██████╗       ██╗██████╗ 
     ██╔════╝ ██╔══██╗      ██║██╔══██╗
     ██║      ██████╔╝█████╗██║██████╔╝
     ██║      ██╔═══╝ ╚════╝██║██╔═══╝ 
     ╚██████╗ ██║           ██║██║     
      ╚═════╝ ╚═╝           ╚═╝╚═╝     
      >> System Online. Version: ${this.globalData.protocolVersion}
      `);
    }
  },
});
