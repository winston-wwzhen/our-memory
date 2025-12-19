const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

// 定义所有需要创建的集合名称
// 当你有新功能需要加表时，只需要在这里添加字符串即可
const COLLECTIONS = [
  // 1. 用户与权限
  "users",
  "app_config",
  "vip_codes",
  "avatar_sets", 

  // 2. 核心互动
  "pets", 
  "destinations",
  "travel_records",
  "postcards",
  "capsules",
  "messages",
  "coupons",
  "quiz_rounds",
  "daily_picks",

  // 3. 内容与配置库
  "task_pool",
  "quiz_pool",
  "egg_configs",
  "user_eggs",

  // 4. 日志
  "logs",
];

exports.main = async (event, context) => {
  const result = {
    created: [],
    existed: [],
    errors: [],
  };

  // 遍历集合列表，不存在则创建
  for (const name of COLLECTIONS) {
    try {
      // 尝试获取集合信息（count代价最小）
      await db.collection(name).count();
      // 如果没有报错，说明集合存在
      result.existed.push(name);
    } catch (err) {
      // 如果报错包含 'Collection not found' 或类似错误码，说明不存在
      // 注意：云开发 SDK 在集合不存在时通常会抛错
      try {
        await db.createCollection(name);
        result.created.push(name);
      } catch (createErr) {
        // 创建失败（可能是并发创建或其他原因）
        result.errors.push({ name, msg: createErr.errMsg || createErr.message });
      }
    }
  }

  return {
    success: true,
    msg: `表结构检查完成: 新建 ${result.created.length}, 已存在 ${result.existed.length}`,
    details: result,
  };
};