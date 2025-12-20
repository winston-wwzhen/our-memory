const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

// 旅行目的地基础数据配置
const DEFAULT_DESTINATIONS = [
  // ==========================================
  // 🟢 第一阶梯：新手福利区 (容易出货)
  // ==========================================
  {
    id: "community_garden",
    name: "楼下花园",
    description: "早晨的阳光刚好洒在长椅上，有邻居家的小可爱路过。",
    min_travel_time: 15,
    max_travel_time: 30,
    mood_bonus_required: 0,
    image:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight1.png",

    // === 明信片配置 ===
    postcard_image:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/postcards/postcard1.png?sign=327a684c006fc581e0c46d57cf3aa7ad&t=1765964405",
    postcard_bg:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight1.png?sign=3785d2d547d5c64a0818b882dbf4e7b8&t=1765964312",
    postcard_layout: { x: 0.5, y: 0.65, scale: 0.8, rotation: 0, z_index: 10 },

    food_required: "rice_ball",
    food_consumption: 1,
    base_love_reward: 15,

    rose_config: {
      chance: 0.4,
      min: 1,
      max: 2,
    },
    possible_rewards: ["花园明信片", "有概率获得玫瑰"],
  },

  {
    id: "convenience_store",
    name: "深夜便利店",
    description: "城市里永远亮着的一盏灯，关东煮的热气最治愈。",
    min_travel_time: 45,
    max_travel_time: 60,
    mood_bonus_required: 20,
    image:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight2.png",

    // === 明信片配置 ===
    postcard_image:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/postcards/postcard2.png?sign=87ec1ddd758004981b532b1a7681d541&t=1765964419",
    postcard_bg:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight2.png?sign=256ffff40c412cb336673a3874dac69a&t=1765964327",
    postcard_layout: { x: 0.5, y: 0.7, scale: 0.75, rotation: 0, z_index: 10 },

    food_required: "rice_ball",
    food_consumption: 2,
    base_love_reward: 30,

    // 💥 修改点：提至 50% (抛硬币概率)
    rose_config: {
      chance: 0.6,
      min: 1,
      max: 2,
    },
    possible_rewards: ["街角明信片", "有概率获得玫瑰"],
  },

  {
    id: "riverside_walk",
    name: "滨江步道",
    description: "晚风吹过江面，对岸的灯火像坠落的星河。",
    min_travel_time: 90,
    max_travel_time: 120,
    mood_bonus_required: 40,
    image:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight3.png",

    // === 明信片配置 ===
    postcard_image:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/postcards/postcard3.png?sign=8688ec0172f3d96e0fb167cc15ce7f41&t=1765964447",
    postcard_bg:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight3.png?sign=748962f44182a3bc9d778686ee4041cd&t=1765964341",
    postcard_layout: { x: 0.6, y: 0.6, scale: 0.7, rotation: 5, z_index: 10 },

    food_required: "rice_ball",
    food_consumption: 3,
    base_love_reward: 50,

    rose_config: {
      chance: 0.8,
      min: 1,
      max: 3,
    },
    possible_rewards: ["夜景烟花明信片", "大概率获得玫瑰"],
  },

  // ==========================================
  // 🟡 第二阶梯：进阶消费区 (高概率)
  // ==========================================
  {
    id: "forest_camp",
    name: "城郊露营地",
    description: "逃离城市喧嚣，在帐篷里数星星，听篝火噼啪作响。",
    min_travel_time: 180, // 3小时
    max_travel_time: 240,
    mood_bonus_required: 60,
    image:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight4.png",

    // === 明信片配置 ===
    postcard_image:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/postcards/postcard4.png?sign=bc4032432e24182b46a206f6733dc051&t=1765964459",
    postcard_bg:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight4.png?sign=44e2bd76c86a89aecb400c7ccc9f3ffb&t=1765964352",
    postcard_layout: { x: 0.4, y: 0.65, scale: 0.8, rotation: -5, z_index: 10 },

    food_required: "deluxe_meal",
    food_consumption: 2,
    base_love_reward: 60,

    rose_config: {
      chance: 0.8,
      min: 2,
      max: 3,
    },
    possible_rewards: ["星空营地明信片", "大概率获得玫瑰"],
  },

  {
    id: "lighthouse",
    name: "孤独灯塔",
    description: "海浪拍打礁石的声音，是这世界上最古老的白噪音。",
    min_travel_time: 300, // 5小时
    max_travel_time: 420,
    mood_bonus_required: 80,
    image:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight5.png",

    // === 明信片配置 ===
    postcard_image:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/postcards/postcard5.png?sign=a1cb503c188669b060cae4369f422f83&t=1765964470",
    postcard_bg:
      "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight5.png?sign=2b14d8189ca29a3a48796b569aa29260&t=1765964365",
    postcard_layout: { x: 0.5, y: 0.6, scale: 0.6, rotation: 0, z_index: 10 },

    food_required: "deluxe_meal",
    food_consumption: 3,
    base_love_reward: 100,

    rose_config: {
      chance: 0.8,
      min: 2,
      max: 5,
    },
    possible_rewards: ["日出灯塔明信片", "获得大量玫瑰"],
  }
];

exports.main = async (event, context) => {
  const result = {
    added: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // 检查集合是否存在，如果不存在则创建（虽然 init_db 会创建，但这里作为独立脚本加个保险）
    try {
      await db.createCollection("destinations");
    } catch (e) {
      // 集合已存在，忽略
    }

    // 批量插入逻辑
    for (const dest of DEFAULT_DESTINATIONS) {
      try {
        // 查重：检查是否已存在相同 id 的目的地
        const existing = await db
          .collection("destinations")
          .where({ id: dest.id })
          .get();

        if (existing.data.length === 0) {
          await db.collection("destinations").add({
            data: {
              ...dest,
              createdAt: db.serverDate(),
            },
          });
          result.added++;
        } else {
          result.skipped++;
        }
      } catch (err) {
        console.error(`Error adding destination ${dest.id}:`, err);
        result.errors.push({ id: dest.id, msg: err.errMsg });
      }
    }

    return {
      success: true,
      msg: `初始化完成。新增: ${result.added}, 跳过: ${result.skipped}`,
      details: result,
    };
  } catch (e) {
    console.error("Init destinations error", e);
    return {
      success: false,
      msg: "初始化失败",
      error: e.message,
    };
  }
};
