const DEFAULT_CONFIG = {
  NORMAL_FREE_LIMIT: 1, // 日常免费拍照次数
  VIP_DAILY_LIMIT: 3, // vip 每日拍照次数
  DAILY_AD_LIMIT: 2, // 每日可看广告次数获取次数
  DAILY_LOGIN_BONUS: 50, // 每日登录获得的爱意数量
  DAILY_MSG_LIMIT: 10, // 每日留言数量限制
  DEFAULT_CAPSULE_LIMIT: 10, // 默认的时光胶囊数量
  QUESTIONS_PER_ROUND: 10, // 默契问答每轮游戏题目数量
  WATER_COST: 10, // 每次浇花消费爱意数量
  WATER_GROWTH: 10, // 每次浇花成长数值
  HARVEST_MIN_GROWTH: 300, // 每次收获所需爱意值
  CHECKIN_REWARD: 50,   //打卡成功获得爱意奖励
  SHOW_VIP_EXCHANGE: true, // 展示vip兑换入口
  TRAVEL_DURATION_MINUTES: 1, // 旅行时长（分钟）
  // 宠物等级系统配置
  PET_LEVEL_EXP: [0, 30, 80, 150, 250, 380, 550, 750, 1000, 1300], // 各等级所需经验
  PET_LEVEL_NAMES: ['幼崽期', '成长期', '活泼期', '顽皮期', '成熟期', '稳重期', '智慧期', '守护期', '传说期'], // 等级名称
  // 宠物心情系统配置
  PET_MOOD_DECAY_HOURS: 12, // 心情自然衰减时间（小时）
  PET_FEED_MOOD_BOOST: 10, // 喂食提升心情值
  PET_MOOD_LEVELS: [
    { min: 80, name: '超开心', emoji: '😄' },
    { min: 60, name: '开心', emoji: '😊' },
    { min: 40, name: '普通', emoji: '😐' },
    { min: 20, name: '沮丧', emoji: '😔' },
    { min: 0, name: '难过', emoji: '😢' }
  ]
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
