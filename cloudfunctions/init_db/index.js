const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();
const _ = db.command;

// 定义所有需要创建的集合名称
const COLLECTIONS = [
  // 1. 用户与权限
  "users",
  "app_config",
  "vip_codes",

  // 2. 核心互动
  "gardens",
  "pets", // Pet Paradise - 宠物系统
  "destinations", // Pet Paradise - 旅行目的地
  "capsules",
  "messages",
  "coupons",
  "quiz_rounds",
  "daily_picks",

  // 3. 内容与配置库
  "task_pool",
  "quiz_pool",
  "egg_configs",

  // 4. 日志
  "logs",
];

exports.main = async (event, context) => {
  const result = {
    created: [],
    existed: [],
    errors: [],
  };

  // 1. 批量创建集合
  for (const name of COLLECTIONS) {
    try {
      // 先检查集合是否已存在
      const collectionInfo = await db
        .collection(name)
        .count()
        .catch(() => null);
      if (collectionInfo === null) {
        // 集合不存在，创建它
        await db.createCollection(name);
        result.created.push(name);
      } else {
        // 集合已存在
        result.existed.push(name);
      }
    } catch (err) {
      // 处理其他可能的错误
      result.errors.push({ name, msg: err.errMsg || err.message });
    }
  }

  // 2. 初始化 app_config 基础数据 (如果为空)
  // 这是为了防止代码中读取 sudo_users 时报错
  try {
    const configCount = await db.collection("app_config").count();
    if (configCount.total === 0) {
      await db
        .collection("app_config")
        .doc("global_settings")
        .set({
          data: {
            sudo_users: [], // 初始化为空管理员列表
            createdAt: db.serverDate(),
          },
        });
      result.init_data = "Initialized global_settings";
    }
  } catch (e) {
    console.error("Config init error", e);
  }

  // 3. 初始化 destinations 基础数据 (如果为空)
  try {
    const destCount = await db.collection("destinations").count();
    if (destCount.total === 0) {
      const defaultDestinations = [
        // Level 1: 家门口 - 社区花园 (新手福利)
        {
          id: "community_garden",
          name: "社区花园",
          description: "下楼就能到的秘密基地，晒晒太阳就很舒服",
          min_travel_time: 15,          // 15分钟
          max_travel_time: 30,
          rose_chance_base: 0.1,        // 掉率低
          specialty_chance: 0.5,        // 明信片掉率高
          mood_bonus_required: 50,      // 门槛低
          image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight1.png?sign=5357ba1bf9918bcf639a62d4178fb636&t=1765960150",
          food_required: "rice_ball",   // 需求：饭团
          food_consumption: 1,          // 🟢 消耗：1个
          base_love_reward: 20,         // 🟢 奖励：20g 爱意
          possible_rewards: ["猫咪合影明信片", "1朵玫瑰"],
        },

        // Level 2: 街区 - 深夜便利店 (都市氛围)
        {
          id: "convenience_store",
          name: "24h便利店",
          description: "城市里永远亮着的一盏灯，有关东煮的香气",
          min_travel_time: 45,
          max_travel_time: 60,
          rose_chance_base: 0.15,
          specialty_chance: 0.3,
          mood_bonus_required: 60,
          image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight2.png?sign=74c48f27c597e9adb7cbbdb1e807a682&t=1765960163",
          food_required: "rice_ball",
          food_consumption: 2,          // 🟢 消耗：2个饭团
          base_love_reward: 40,         // 🟢 奖励：40g 爱意
          possible_rewards: ["关东煮明信片", "玫瑰"],
        },

        // Level 3: 城市 - 滨江步道 (浪漫散步)
        {
          id: "riverside_walk",
          name: "滨江步道",
          description: "晚风吹过江面，对岸的灯火像坠落的星河",
          min_travel_time: 90,
          max_travel_time: 120,
          rose_chance_base: 0.25,
          specialty_chance: 0.25,
          mood_bonus_required: 70,
          image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight3.png?sign=c5dcf36e4947a0a3e05eb9edd1fe68c7&t=1765960206",
          food_required: "rice_ball",
          food_consumption: 2,          // 🟢 消耗：2个 (如果是御膳就是2个御膳)
          base_love_reward: 80,         // 🟢 奖励：80g 爱意
          possible_rewards: ["夜景烟花明信片", "玫瑰"],
        },

        // Level 4: 郊区 - 森林露营地 (周末短途)
        {
          id: "forest_camp",
          name: "森林露营",
          description: "逃离城市喧嚣，在帐篷里数星星",
          min_travel_time: 180,         // 3小时
          max_travel_time: 240,
          rose_chance_base: 0.35,
          specialty_chance: 0.2,
          mood_bonus_required: 80,
          image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight4.png?sign=09dca0bd4bd43b45668f62a2bfb1f0bd&t=1765960216",
          food_required: "luxury_bento",// 必须豪华御膳
          food_consumption: 1,          // 🟢 消耗：1个御膳
          base_love_reward: 150,        // 🟢 奖励：150g 爱意 (高回报)
          possible_rewards: ["星空营地明信片", "大量玫瑰"],
        },

        // Level 5: 远方 - 海边灯塔 (诗与远方)
        {
          id: "lighthouse",
          name: "孤独灯塔",
          description: "陆地的尽头，海浪拍打礁石的声音",
          min_travel_time: 300,         // 5小时
          max_travel_time: 480,
          rose_chance_base: 0.5,        // 极高玫瑰掉率
          specialty_chance: 0.15,
          mood_bonus_required: 90,
          image: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/Sight/sight5.png?sign=fcc85cfc206a9472589e3ee69dfa7766&t=1765960226",
          food_required: "luxury_bento",
          food_consumption: 2,          // 🟢 消耗：2个豪华御膳 (重氪)
          base_love_reward: 300,        // 🟢 奖励：300g 爱意 (超高回报)
          possible_rewards: ["日出灯塔明信片", "海量玫瑰"],
        },
      ];

      // 批量插入，避免重复
      for (const dest of defaultDestinations) {
        // 检查是否已存在相同 id 的目的地
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
        }
      }
      result.init_destinations = `Initialized ${defaultDestinations.length} destinations`;
    }
  } catch (e) {
    console.error("Destinations init error", e);
  }

  // 4. 迁移 garden 数据到 pets (如果需要)
  if (event.migrate_gardens) {
    try {
      const migrationResult = await migrateGardensToPets(db);
      result.migration = migrationResult;
    } catch (e) {
      console.error("Migration error", e);
      result.migration = { error: e.message };
    }
  }

  return {
    success: true,
    msg: `创建成功: ${result.created.length}, 已存在: ${result.existed.length}`,
    details: result,
  };
};

// 迁移 garden 数据到 pets 的函数
async function migrateGardensToPets(db) {
  const migration = {
    migrated: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // 首先检查是否已经初始化了 destinations 数据
    const destCount = await db.collection("destinations").count();
    if (destCount.total === 0) {
      migration.errors.push({
        error:
          "Destinations collection is empty. Please run init_db without migrate_gardens first.",
      });
      return migration;
    }

    // 获取所有 garden 数据
    const gardensRes = await db.collection("gardens").get();
    const gardens = gardensRes.data;

    for (const garden of gardens) {
      try {
        // 如果 garden 没有 owners，跳过
        if (!garden.owners || garden.owners.length === 0) {
          migration.skipped++;
          migration.errors.push({
            gardenId: garden._id,
            error: "Garden has no owners",
          });
          continue;
        }

        // 检查是否已经迁移过 - 通过 garden._id 查找是否有对应的迁移记录
        const existingPetRes = await db
          .collection("pets")
          .where({
            original_garden_id: garden._id,
          })
          .get();

        if (existingPetRes.data.length > 0) {
          migration.skipped++;
          continue;
        }

        // 转换数据
        const growthValue = garden.growth_value || 0;
        const moodValue = Math.max(
          60,
          Math.min(100, 60 + (growthValue / 400) * 40)
        );

        const petData = {
          original_garden_id: garden._id, // 保留原始 garden ID 以便追踪
          owners: garden.owners || [],
          name: "小可爱", // 默认名称
          mood_value: Math.round(moodValue),
          energy_level: 80,
          state: "idle",
          last_interaction: garden.updatedAt || new Date(),
          travel_count: garden.harvest_total || 0,
          current_destination: "",
          return_time: null,
          unlocked_locations: ["park"], // 默认解锁公园
          specialty_collection: [],
          food_inventory: {
            rice_ball: 0,
            luxury_bento: 0,
          },
          guaranteed_progress: growthValue % 350, // 保留进度
          createdAt: garden.createdAt || new Date(),
          updatedAt: new Date(),
        };

        // 创建新的 pet 文档
        await db.collection("pets").add({ data: petData });
        migration.migrated++;
      } catch (e) {
        migration.errors.push({
          gardenId: garden._id,
          error: e.message,
        });
      }
    }
  } catch (e) {
    throw new Error(`Migration failed: ${e.message}`);
  }

  return migration;
}
