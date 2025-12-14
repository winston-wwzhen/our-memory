const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});
const db = cloud.database();
const _ = db.command;

// 定义所有需要创建的集合名称
const COLLECTIONS = [
  // 1. 用户与权限
  'users', 
  'app_config', 
  'vip_codes',
  
  // 2. 核心互动
  'gardens',
  'pets',  // Pet Paradise - 宠物系统
  'destinations',  // Pet Paradise - 旅行目的地
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
      // 先检查集合是否已存在
      const collectionInfo = await db.collection(name).count().catch(() => null);
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

  // 3. 初始化 destinations 基础数据 (如果为空)
  try {
    const destCount = await db.collection('destinations').count();
    if (destCount.total === 0) {
      const defaultDestinations = [
        {
          id: 'park',
          name: '中央公园',
          description: '城市中的绿色天堂，适合悠闲散步',
          min_travel_time: 30,
          max_travel_time: 60,
          rose_chance_base: 0.2,
          specialty_chance: 0.1,
          mood_bonus_required: 60,
          image_url: '/images/destinations/park.jpg'
        },
        {
          id: 'beach',
          name: '阳光海滩',
          description: '金色的沙滩和蔚蓝的海水',
          min_travel_time: 60,
          max_travel_time: 120,
          rose_chance_base: 0.3,
          specialty_chance: 0.15,
          mood_bonus_required: 70,
          image_url: '/images/destinations/beach.jpg'
        },
        {
          id: 'mountain',
          name: '山顶风景区',
          description: '俯瞰世界的壮丽景色',
          min_travel_time: 120,
          max_travel_time: 240,
          rose_chance_base: 0.4,
          specialty_chance: 0.2,
          mood_bonus_required: 80,
          image_url: '/images/destinations/mountain.jpg'
        },
        {
          id: 'city',
          name: '繁华都市',
          description: '感受现代都市的脉搏',
          min_travel_time: 180,
          max_travel_time: 300,
          rose_chance_base: 0.35,
          specialty_chance: 0.25,
          mood_bonus_required: 75,
          image_url: '/images/destinations/city.jpg'
        },
        {
          id: 'countryside',
          name: '田园风光',
          description: '回归自然的宁静与美好',
          min_travel_time: 90,
          max_travel_time: 150,
          rose_chance_base: 0.3,
          specialty_chance: 0.3,
          mood_bonus_required: 65,
          image_url: '/images/destinations/countryside.jpg'
        }
      ];

      // 批量插入，避免重复
      for (const dest of defaultDestinations) {
        // 检查是否已存在相同 id 的目的地
        const existing = await db.collection('destinations')
          .where({ id: dest.id })
          .get();

        if (existing.data.length === 0) {
          await db.collection('destinations').add({
            data: {
              ...dest,
              createdAt: db.serverDate()
            }
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
    details: result
  };
};

// 迁移 garden 数据到 pets 的函数
async function migrateGardensToPets(db) {
  const migration = {
    migrated: 0,
    skipped: 0,
    errors: []
  };

  try {
    // 首先检查是否已经初始化了 destinations 数据
    const destCount = await db.collection('destinations').count();
    if (destCount.total === 0) {
      migration.errors.push({
        error: "Destinations collection is empty. Please run init_db without migrate_gardens first."
      });
      return migration;
    }

    // 获取所有 garden 数据
    const gardensRes = await db.collection('gardens').get();
    const gardens = gardensRes.data;

    for (const garden of gardens) {
      try {
        // 如果 garden 没有 owners，跳过
        if (!garden.owners || garden.owners.length === 0) {
          migration.skipped++;
          migration.errors.push({
            gardenId: garden._id,
            error: "Garden has no owners"
          });
          continue;
        }

        // 检查是否已经迁移过 - 通过 garden._id 查找是否有对应的迁移记录
        const existingPetRes = await db.collection('pets')
          .where({
            original_garden_id: garden._id
          })
          .get();

        if (existingPetRes.data.length > 0) {
          migration.skipped++;
          continue;
        }

        // 转换数据
        const growthValue = garden.growth_value || 0;
        const moodValue = Math.max(60, Math.min(100, 60 + (growthValue / 400) * 40));

        const petData = {
          original_garden_id: garden._id,  // 保留原始 garden ID 以便追踪
          owners: garden.owners || [],
          name: '小可爱',  // 默认名称
          mood_value: Math.round(moodValue),
          energy_level: 80,
          state: 'idle',
          last_interaction: garden.updatedAt || new Date(),
          travel_count: garden.harvest_total || 0,
          current_destination: '',
          return_time: null,
          unlocked_locations: ['park'],  // 默认解锁公园
          specialty_collection: [],
          food_inventory: {
            rice_ball: 0,
            luxury_bento: 0
          },
          guaranteed_progress: (growthValue % 350),  // 保留进度
          createdAt: garden.createdAt || new Date(),
          updatedAt: new Date()
        };

        // 创建新的 pet 文档
        await db.collection('pets').add({ data: petData });
        migration.migrated++;

      } catch (e) {
        migration.errors.push({
          gardenId: garden._id,
          error: e.message
        });
      }
    }
  } catch (e) {
    throw new Error(`Migration failed: ${e.message}`);
  }

  return migration;
}