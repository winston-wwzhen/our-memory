// 默认配置兜底
const DEFAULT_CONFIG = {
  NORMAL_FREE_LIMIT: 1,
  VIP_DAILY_LIMIT: 3,
  REG_DAY_LIMIT: 10,
  VIP_TRIAL_DAYS: 3,
  DAILY_AD_LIMIT: 1,
  DAILY_LOGIN_BONUS: 50,
  DAILY_MSG_LIMIT: 20,
  DEFAULT_CAPSULE_LIMIT: 10,
  QUESTIONS_PER_ROUND: 10,
  WATER_COST: 10,
  WATER_GROWTH: 10,
  HARVEST_MIN_GROWTH: 300,
  CHECKIN_REWARD: 50,
};

let cachedConfig = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000 * 5; // 5分钟缓存

async function getBizConfig(db) {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const res = await db.collection("app_config").doc("business_rules").get();
    cachedConfig = { ...DEFAULT_CONFIG, ...res.data };
    cacheTime = now;
    return cachedConfig;
  } catch (err) {
    console.warn("⚠️ 获取配置失败，使用默认配置");
    return DEFAULT_CONFIG;
  }
}

async function getSudoUsers(db) {
  try {
    const res = await db.collection("app_config").doc("global_settings").get();
    return res.data.sudo_users || [];
  } catch (err) {
    return [];
  }
}

// 增加风格配置获取
async function getStylesConfig(db) {
  try {
    const res = await db.collection("app_config").doc("style_config").get();
    return res.data.styles || [];
  } catch (err) {
    console.warn("⚠️ 获取风格配置失败:", err);
    return []; // 前端可以有本地兜底
  }
}

module.exports = { getBizConfig, getSudoUsers, getStylesConfig };
