const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();

// 定义所有需要创建的集合名称
const COLLECTIONS = [
  // 1. 用户与权限
  'users', 
  'app_config', 
  'vip_codes',
  
  // 2. 核心互动
  'gardens', 
  'capsules', 
  'messages', 
  'coupons', 
  'quiz_rounds', 
  'daily_picks',
  
  // 3. 内容与配置库
  'task_pool', 
  'quiz_pool', 
  'egg_configs',
  
  // 4. 日志
  'logs'
];

exports.main = async (event, context) => {
  const result = {
    created: [],
    existed: [],
    errors: []
  };

  // 1. 批量创建集合
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name);
      result.created.push(name);
    } catch (err) {
      // 错误码 -502001 或包含 "collection already exists" 表示集合已存在
      if (err.errCode === -502001 || (err.errMsg && err.errMsg.includes('already exists'))) {
        result.existed.push(name);
      } else {
        result.errors.push({ name, msg: err.errMsg || err.message });
      }
    }
  }

  // 2. 初始化 app_config 基础数据 (如果为空)
  // 这是为了防止代码中读取 sudo_users 时报错
  try {
    const configCount = await db.collection('app_config').count();
    if (configCount.total === 0) {
      await db.collection('app_config').doc('global_settings').set({
        data: {
          sudo_users: [], // 初始化为空管理员列表
          createdAt: db.serverDate()
        }
      });
      result.init_data = "Initialized global_settings";
    }
  } catch (e) {
    console.error("Config init error", e);
  }

  return {
    success: true,
    msg: `创建成功: ${result.created.length}, 已存在: ${result.existed.length}`,
    details: result
  };
};