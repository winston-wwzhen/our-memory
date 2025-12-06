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


async function getBizConfig(db) {
  return DEFAULT_CONFIG;
}

async function getSudoUsers(db) {
  try {
    const res = await db.collection("app_config").doc("global_settings").get();
    return res.data.sudo_users || [];
  } catch (err) {
    return [];
  }
}

module.exports = { getBizConfig, getSudoUsers };
