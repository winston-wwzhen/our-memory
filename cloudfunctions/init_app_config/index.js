const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const configCollection = db.collection("app_config");
    
    // 检查 global_settings 是否存在
    const countRes = await configCollection.where({
      _id: "global_settings" // 强制使用固定 ID，方便读取
    }).count();

    if (countRes.total === 0) {
      await configCollection.add({
        data: {
          _id: "global_settings",
          sudo_users: [], // 初始管理员列表
          feature_flags: {
             enable_ads: true, // 示例：全局广告开关
             maintenance_mode: false 
          },
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        },
      });
      return { success: true, msg: "全局配置 global_settings 已初始化" };
    } else {
      return { success: true, msg: "全局配置已存在，跳过初始化" };
    }
  } catch (e) {
    console.error("Config init error", e);
    return { success: false, error: e.message };
  }
};