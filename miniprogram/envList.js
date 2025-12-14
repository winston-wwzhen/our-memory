/**
 * 环境配置列表
 * 请在云开发控制台创建两个环境，分别填入对应的 Environment ID
 */
const envList = {
  // 🛠️ 开发/测试环境 (Development)
  // 用于开发调试，数据可以随便造
  dev: {
    envId: "test1-3gxkuc1c2093c1a8", // 目前你正在用的这个作为开发环境
    name: "开发环境",
  },

  // 🚀 生产/正式环境 (Production)
  // 用于线上发布，存放真实用户数据
  prod: {
    envId: "cloud1-0g4462vv9d9954a5", 
    name: "正式环境",
  },
};

// 场景：想在开发者工具里调试正式环境的数据时，可填 'prod'
const forceEnv = "";

module.exports = {
  envList,
  forceEnv,
};
