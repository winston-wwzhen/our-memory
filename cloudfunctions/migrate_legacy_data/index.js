const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

exports.main = async (event, context) => {
  // 开关：防止误触，调用时必须传 type 参数
  const { type } = event;

  if (type === 'gardens_to_pets') {
    return await migrateGardensToPets();
  }

  return {
    success: false,
    msg: "请指定迁移类型 (type: 'gardens_to_pets')"
  };
};

// 迁移 garden 数据到 pets 的核心逻辑
async function migrateGardensToPets() {
  const migration = { migrated: 0, skipped: 0, errors: [] };

  try {
    const gardensRes = await db.collection("gardens").get();
    const gardens = gardensRes.data;

    for (const garden of gardens) {
      try {
        if (!garden.owners || garden.owners.length === 0) {
          migration.skipped++;
          continue;
        }

        // 查重：避免重复迁移
        const existingPetRes = await db.collection("pets").where({
            original_garden_id: garden._id,
        }).count();

        if (existingPetRes.total > 0) {
          migration.skipped++;
          continue;
        }

        // 数据映射逻辑
        const growthValue = garden.growth_value || 0;
        const moodValue = Math.max(60, Math.min(100, 60 + (growthValue / 400) * 40));

        await db.collection("pets").add({
          data: {
            original_garden_id: garden._id,
            owners: garden.owners,
            name: "小可爱",
            mood_value: Math.round(moodValue),
            energy_level: 80,
            state: "idle",
            last_interaction: garden.updatedAt || new Date(),
            travel_count: garden.harvest_total || 0,
            current_destination: "",
            return_time: null,
            unlocked_locations: ["community_garden"], 
            specialty_collection: [],
            food_inventory: { rice_ball: 0, luxury_bento: 0 },
            guaranteed_progress: growthValue % 350,
            createdAt: garden.createdAt || new Date(),
            updatedAt: new Date(),
          }
        });
        migration.migrated++;
      } catch (e) {
        migration.errors.push({ gardenId: garden._id, error: e.message });
      }
    }
    return { success: true, details: migration };
  } catch (e) {
    return { success: false, error: e.message };
  }
}