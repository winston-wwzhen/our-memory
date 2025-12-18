const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

// 旅行目的地基础数据配置
const DEFAULT_DESTINATIONS = [
  // Level 1: 社区花园
  {
    id: "community_garden",
    name: "社区花园",
    description: "下楼就能到的秘密基地，晒晒太阳就很舒服",
    min_travel_time: 15,
    max_travel_time: 30,
    rose_chance_base: 0.1,
    specialty_chance: 0.5,
    mood_bonus_required: 50,
    image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight1.png?sign=3785d2d547d5c64a0818b882dbf4e7b8&t=1765964312",
    
    // === 明信片配置 ===
    postcard_image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/postcards/postcard1.png?sign=327a684c006fc581e0c46d57cf3aa7ad&t=1765964405",
    postcard_bg: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight1.png?sign=3785d2d547d5c64a0818b882dbf4e7b8&t=1765964312",
    postcard_layout: { x: 0.5, y: 0.65, scale: 0.8, rotation: 0, z_index: 10 },
    
    food_required: "rice_ball",
    food_consumption: 1,
    base_love_reward: 20,
    possible_rewards: ["公园明信片", "1朵玫瑰"],
  },

  // Level 2: 24h便利店
  {
    id: "convenience_store",
    name: "24h便利店",
    description: "城市里永远亮着的一盏灯，有关东煮的香气",
    min_travel_time: 45,
    max_travel_time: 60,
    rose_chance_base: 0.15,
    specialty_chance: 0.3,
    mood_bonus_required: 60,
    image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight2.png?sign=256ffff40c412cb336673a3874dac69a&t=1765964327",
    
    // === 明信片配置 ===
    postcard_image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/postcards/postcard2.png?sign=87ec1ddd758004981b532b1a7681d541&t=1765964419",
    postcard_bg: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight2.png?sign=256ffff40c412cb336673a3874dac69a&t=1765964327",
    postcard_layout: { x: 0.5, y: 0.7, scale: 0.75, rotation: 0, z_index: 10 },
    
    food_required: "rice_ball",
    food_consumption: 2,
    base_love_reward: 40,
    possible_rewards: ["街边小店明信片", "玫瑰"],
  },

  // Level 3: 滨江步道
  {
    id: "riverside_walk",
    name: "滨江步道",
    description: "晚风吹过江面，对岸的灯火像坠落的星河",
    min_travel_time: 90,
    max_travel_time: 120,
    rose_chance_base: 0.25,
    specialty_chance: 0.25,
    mood_bonus_required: 70,
    image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight3.png?sign=748962f44182a3bc9d778686ee4041cd&t=1765964341",
    
    // === 明信片配置 ===
    postcard_image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/postcards/postcard3.png?sign=8688ec0172f3d96e0fb167cc15ce7f41&t=1765964447",
    postcard_bg: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight3.png?sign=748962f44182a3bc9d778686ee4041cd&t=1765964341",
    postcard_layout: { x: 0.6, y: 0.6, scale: 0.7, rotation: 5, z_index: 10 },
    
    food_required: "any",
    food_consumption: 2,
    base_love_reward: 80,
    possible_rewards: ["夜景烟花明信片", "玫瑰"],
  },

  // Level 4: 森林露营
  {
    id: "forest_camp",
    name: "森林露营",
    description: "逃离城市喧嚣，在帐篷里数星星",
    min_travel_time: 180,
    max_travel_time: 240,
    rose_chance_base: 0.35,
    specialty_chance: 0.2,
    mood_bonus_required: 80,
    image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight4.png?sign=44e2bd76c86a89aecb400c7ccc9f3ffb&t=1765964352",
    
    // === 明信片配置 ===
    postcard_image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/postcards/postcard4.png?sign=bc4032432e24182b46a206f6733dc051&t=1765964459",
    postcard_bg: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight4.png?sign=44e2bd76c86a89aecb400c7ccc9f3ffb&t=1765964352",
    postcard_layout: { x: 0.4, y: 0.65, scale: 0.8, rotation: -5, z_index: 10 },
    
    food_required: "luxury_bento",
    food_consumption: 1,
    base_love_reward: 150,
    possible_rewards: ["星空营地明信片", "大量玫瑰"],
  },

  // Level 5: 孤独灯塔
  {
    id: "lighthouse",
    name: "孤独灯塔",
    description: "陆地的尽头，海浪拍打礁石的声音",
    min_travel_time: 300,
    max_travel_time: 480,
    rose_chance_base: 0.5,
    specialty_chance: 0.15,
    mood_bonus_required: 90,
    image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight5.png?sign=2b14d8189ca29a3a48796b569aa29260&t=1765964365",
    
    // === 明信片配置 ===
    postcard_image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/postcards/postcard5.png?sign=a1cb503c188669b060cae4369f422f83&t=1765964470",
    postcard_bg: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight5.png?sign=2b14d8189ca29a3a48796b569aa29260&t=1765964365",
    postcard_layout: { x: 0.5, y: 0.6, scale: 0.6, rotation: 0, z_index: 10 },
    
    food_required: "luxury_bento",
    food_consumption: 2,
    base_love_reward: 300,
    possible_rewards: ["日出灯塔明信片", "海量玫瑰"],
  },
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
       await db.createCollection('destinations');
    } catch(e) {
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
      error: e.message
    };
  }
};