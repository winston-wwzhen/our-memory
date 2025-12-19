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

    // 💥 修改点：从 10% 提至 40%
    // 逻辑：平均去 2-3 次就能拿到 1 朵。一天能拿 3-4 朵。
    rose_config: {
      chance: 0.4,
      min: 1,
      max: 1,
    },
    possible_rewards: ["花园明信片", "大概率玫瑰"],
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
      chance: 0.5,
      min: 1,
      max: 1,
    },
    possible_rewards: ["街角明信片", "一半概率玫瑰"],
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

    // 💥 修改点：提至 60%
    rose_config: {
      chance: 0.6,
      min: 1,
      max: 1,
    },
    possible_rewards: ["夜景烟花明信片", "玫瑰"],
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
    food_consumption: 1,
    base_love_reward: 60,

    // 💥 修改点：提至 80% (只要去了基本都有)
    rose_config: {
      chance: 0.8,
      min: 1,
      max: 1,
    },
    possible_rewards: ["星空营地明信片", "高概率玫瑰"],
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
    food_consumption: 2,
    base_love_reward: 100,

    // 💥 修改点：提至 90%，且有机会爆 2 朵
    rose_config: {
      chance: 0.9,
      min: 1,
      max: 2,
    },
    possible_rewards: ["日出灯塔明信片", "1-2朵玫瑰"],
  },

  // ==========================================
  // 🔴 第三阶梯：必出区 (付费玩家的尊严)
  // 逻辑：既然花了那么多爱意值(甚至看了广告)，必须 100% 给玫瑰
  // ==========================================
  // {
  //   id: "ancient_teahouse",
  //   name: "烟雨古镇",
  //   description: "青石板路，油纸伞，还有那杯没喝完的碧螺春。",
  //   min_travel_time: 480, // 8小时
  //   max_travel_time: 600,
  //   mood_bonus_required: 100,
  //   image:
  //     "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight_town.png",

  //   postcard_image:
  //     "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/postcards/postcard1.png?sign=327a684c006fc581e0c46d57cf3aa7ad&t=1765964405",
  //   postcard_bg:
  //     "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight1.png?sign=3785d2d547d5c64a0818b882dbf4e7b8&t=1765964312",
  //   postcard_layout: { x: 0.5, y: 0.65, scale: 0.8, rotation: 0, z_index: 10 },

  //   food_required: "deluxe_meal",
  //   food_consumption: 2,
  //   base_love_reward: 80,

  //   // 💥 修改点：100% 必出 1 朵，大概率 2 朵
  //   rose_config: {
  //     chance: 1.0,
  //     min: 1,
  //     max: 2,
  //   },
  //   possible_rewards: ["水乡古镇明信片", "必得玫瑰"],
  // },

  // {
  //   id: "mountain_tea",
  //   name: "高山茶园",
  //   description: "满眼都是治愈的绿色，空气里有淡淡的茶香。",
  //   min_travel_time: 600, // 10小时
  //   max_travel_time: 720,
  //   mood_bonus_required: 120,
  //   image:
  //     "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight_tea.png",

  //   food_required: "deluxe_meal",
  //   food_consumption: 3,
  //   base_love_reward: 100,

  //   // 💥 必出 2 朵起步
  //   rose_config: {
  //     chance: 1.0,
  //     min: 2,
  //     max: 3,
  //   },
  //   possible_rewards: ["采茶纪实明信片", "2-3朵玫瑰"],
  // },

  // {
  //   id: "desert_star",
  //   name: "大漠观星",
  //   description: "在这里，银河低得仿佛触手可及，世界只剩下风声。",
  //   min_travel_time: 720, // 12小时
  //   max_travel_time: 900,
  //   mood_bonus_required: 150,
  //   image:
  //     "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight_desert.png",

  //   food_required: "deluxe_meal",
  //   food_consumption: 3,
  //   base_love_reward: 120,

  //   // 💥 必出 2-3 朵
  //   rose_config: {
  //     chance: 1.0,
  //     min: 2,
  //     max: 3,
  //   },
  //   possible_rewards: ["大漠星河明信片", "2-3朵玫瑰"],
  // },

  // {
  //   id: "snow_mountain",
  //   name: "雪山脚下",
  //   description: "日照金山的瞬间，所有的等待都有了意义。",
  //   min_travel_time: 960, // 16小时
  //   max_travel_time: 1200,
  //   mood_bonus_required: 180,
  //   image:
  //     "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight_snow.png",

  //   food_required: "deluxe_meal",
  //   food_consumption: 4,
  //   base_love_reward: 150,

  //   // 💥 必出 3 朵起步
  //   rose_config: {
  //     chance: 1.0,
  //     min: 3,
  //     max: 4,
  //   },
  //   possible_rewards: ["日照金山明信片", "3-4朵玫瑰"],
  // },

  // {
  //   id: "island_road",
  //   name: "落日环岛路",
  //   description: "车窗外是橘子海，音响里放着最爱的歌，没有终点。",
  //   min_travel_time: 1440, // 24小时
  //   max_travel_time: 1600,
  //   mood_bonus_required: 200,
  //   image:
  //     "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight_island.png",

  //   food_required: "deluxe_meal",
  //   food_consumption: 5,
  //   base_love_reward: 200,

  //   // 💥 必出 4-5 朵！去一次顶一周！
  //   rose_config: {
  //     chance: 1.0,
  //     min: 4,
  //     max: 5,
  //   },
  //   possible_rewards: ["环岛公路明信片", "海量玫瑰"],
  // },
];

module.exports = DEFAULT_DESTINATIONS;
module.exports = DEFAULT_DESTINATIONS;
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
