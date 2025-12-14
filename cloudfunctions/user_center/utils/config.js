const DEFAULT_CONFIG = {
  NORMAL_FREE_LIMIT: 1, // 日常免费拍照次数
  VIP_DAILY_LIMIT: 3, // vip 每日拍照次数
  REG_DAY_LIMIT: 10, // 首日免费次数
  DAILY_AD_LIMIT: 1, // 每日可看广告次数获取次数
  DAILY_LOGIN_BONUS: 50, // 每日登录获得的爱意数量
  DAILY_MSG_LIMIT: 10, // 每日留言数量限制
  DEFAULT_CAPSULE_LIMIT: 10, // 默认的时光胶囊数量
  QUESTIONS_PER_ROUND: 10, // 默契问答每轮游戏题目数量

  // Pet Paradise Configuration
  RICE_BALL_COST: 10, // 饭团便当消耗爱意
  LUXURY_BENTO_COST: 50, // 豪华御膳消耗爱意
  MAX_MOOD: 100, // 最大心情值
  INITIAL_MOOD: 60, // 初始心情值
  PAT_MOOD_BONUS: 2, // 抚摸心情加成
  RICE_BALL_MOOD_BONUS: 10, // 饭团心情加成
  BENTO_MOOD_BONUS: 20, // 御膳心情加成
  GUARANTEE_THRESHOLD: 350, // 保证获得玫瑰所需累计爱意
  BASE_ROSE_CHANCE: 0.3, // 基础获得玫瑰概率
  MOOD_BONUS_THRESHOLD: 80, // 心情加成阈值
  TRAVEL_ENERGY_COST: 30, // 旅行消耗精力
  // [新增] 心情衰减配置
  MOOD_DECAY_INTERVAL_MINUTES: 60, // 衰减间隔（分钟），例如每60分钟
  MOOD_DECAY_AMOUNT: 2, // 每次衰减数值，例如每次扣2点

  // Legacy Garden Configuration (for backward compatibility)
  WATER_COST: 10, // 每次浇花消费爱意数量
  WATER_GROWTH: 10, // 每次浇花成长数值
  HARVEST_MIN_GROWTH: 300, // 每次收获所需爱意值

  CHECKIN_REWARD: 50,
  SHOW_VIP_EXCHANGE: true,
};

async function getBizConfig(db) {
  return DEFAULT_CONFIG;
}

module.exports = { getBizConfig };
