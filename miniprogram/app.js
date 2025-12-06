// miniprogram/app.js
const { envList, forceEnv } = require("./envList");

App({
  globalData: {
    hasLogin: false,
    appName: "我们的纪念册",
    currentEnv: null, // 新增：记录当前环境信息
    appConfig: null, // 存放动态配置
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      let targetEnv;

      // 1. 优先读取强制配置 (方便本地调试)
      if (forceEnv && envList[forceEnv]) {
        targetEnv = envList[forceEnv];
        console.warn(`⚠️ [强制切换] 当前强制使用：${targetEnv.name}`);
      } else {
        // 2. 根据运行版本自动判断
        // 'develop': 开发版, 'trial': 体验版, 'release': 正式版
        const accountInfo = wx.getAccountInfoSync();
        const envVersion = accountInfo.miniProgram.envVersion;

        if (envVersion === "release") {
          targetEnv = envList.prod;
          console.log("🚀 [正式启动] 连接生产环境");
        } else {
          // 开发版和体验版都默认走测试环境，更安全
          targetEnv = envList.dev;
          console.log(
            `🛠️ [${
              envVersion === "develop" ? "开发" : "体验"
            }启动] 连接测试环境`
          );
        }
      }

      // 3. 初始化云开发环境
      wx.cloud.init({
        env: targetEnv.envId,
        traceUser: true,
      });

      // 4. 保存环境信息到全局，方便页面展示调试信息
      this.globalData.currentEnv = targetEnv;

      console.log(
        `✨ 我们的纪念册 (Our Memory) 已启动 | 环境: ${targetEnv.envId} ✨`
      );
    }
  },
});
