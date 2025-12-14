const { getTodayStr } = require("../utils/common");
const { addLog } = require("../utils/logger");
const { checkImageSafety } = require("../utils/safety");
const { tryTriggerEgg } = require("../utils/eggs");

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG } = ctx;
  const todayStr = getTodayStr();

  switch (action) {
    case "get_pet_status": {
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];
      const partnerId = me.partner_id;

      let conditions = [{ owners: OPENID }];
      if (partnerId) conditions.push({ owners: partnerId });

      // Check if pet exists
      const petRes = await db
        .collection("pets")
        .where(_.or(conditions))
        .get();
      let myPet = null;

      if (petRes.data.length > 0) {
        myPet = petRes.data[0];
        // Update owners if needed
        if (partnerId && !myPet.owners.includes(partnerId))
          await db
            .collection("pets")
            .doc(myPet._id)
            .update({ data: { owners: _.addToSet(partnerId) } });
        if (!myPet.owners.includes(OPENID))
          await db
            .collection("pets")
            .doc(myPet._id)
            .update({ data: { owners: _.addToSet(OPENID) } });

        // Check if pet has returned from travel
        if (myPet.state === 'traveling' && myPet.return_time) {
          const now = new Date();
          const returnTime = new Date(myPet.return_time);
          if (now >= returnTime) {
            // Pet has returned, collect rewards automatically
            const rewards = await processTravelRewards(db, myPet, me, CONFIG);
            myPet = rewards.pet;
            await db.collection("users").doc(me._id).update({
              data: {
                rose_balance: _.inc(rewards.roses),
                water_count: _.inc(rewards.love_energy)
              }
            });
          }
        }
      } else {
        // Create new pet if doesn't exist
        let owners = [OPENID];
        if (partnerId) owners.push(partnerId);
        const newPet = {
          owners,
          name: '小可爱',
          mood_value: 60,
          energy_level: 80,
          state: 'idle',
          last_interaction: db.serverDate(),
          travel_count: 0,
          current_destination: '',
          return_time: null,
          unlocked_locations: ['park'],
          specialty_collection: [],
          food_inventory: {
            rice_ball: 0,
            luxury_bento: 0
          },
          guaranteed_progress: 0,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        };
        await db.collection("pets").add({ data: newPet });
        myPet = newPet;
      }

      // Get recent interaction logs
      let recentLogs = [];
      try {
        const owners = myPet.owners || [OPENID];
        const logsRes = await db
          .collection("logs")
          .where({ type: "pet_interaction", _openid: _.in(owners) })
          .orderBy("createdAt", "desc")
          .limit(10)
          .get();
        recentLogs = logsRes.data.map((log) => ({
          content: log.content,
          date: log.createdAt,
          isMine: log._openid === OPENID,
        }));
      } catch (e) {}

      return {
        status: 200,
        pet: myPet,
        love_energy: me.water_count || 0,
        rose_balance: me.rose_balance || 0,
        logs: recentLogs,
      };
    }

    case "interact_with_pet": {
      const { type, food_type } = event;
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];

      const petRes = await db
        .collection("pets")
        .where({ owners: OPENID })
        .get();

      if (petRes.data.length === 0) {
        return { status: 404, msg: "宠物不存在" };
      }

      const pet = petRes.data[0];
      let updateData = {
        last_interaction: db.serverDate(),
        updatedAt: db.serverDate()
      };

      switch (type) {
        case "pat":
          // Pat interaction: mood +2, energy -1
          // Calculate new values to ensure they stay within bounds
          const newMood = Math.min(100, (pet.mood_value || 0) + 2);
          const newEnergy = Math.max(0, (pet.energy_level || 0) - 1);

          updateData.mood_value = newMood;
          updateData.energy_level = newEnergy;
          await addLog(ctx, "pet_interaction", "抚摸了宠物");
          break;

        case "feed":
          // Feeding with food
          const foodCost = food_type === 'luxury_bento' ? 50 : 10;
          const moodBonus = food_type === 'luxury_bento' ? 20 : 10;
          const energyBonus = food_type === 'luxury_bento' ? 40 : 20;

          if ((me.water_count || 0) < foodCost) {
            return { status: 400, msg: "爱意不足" };
          }

          if ((pet.food_inventory[food_type] || 0) < 1) {
            return { status: 400, msg: "食物不足" };
          }

          // Deduct love energy and food
          await db.collection("users").doc(me._id).update({
            data: { water_count: _.inc(-foodCost) }
          });

          // Calculate new values
          const newFoodCount = Math.max(0, (pet.food_inventory[food_type] || 0) - 1);
          const newFeedMood = Math.min(100, (pet.mood_value || 0) + moodBonus);
          const newFeedEnergy = Math.min(100, (pet.energy_level || 0) + energyBonus);

          updateData.food_inventory = pet.food_inventory || {};
          updateData.food_inventory[food_type] = newFoodCount;
          updateData.mood_value = newFeedMood;
          updateData.energy_level = newFeedEnergy;
          updateData.state = 'eating';

          // Reset state to idle after 3 seconds
          setTimeout(async () => {
            await db.collection("pets").doc(pet._id).update({
              data: { state: 'idle', updatedAt: db.serverDate() }
            });
          }, 3000);

          await addLog(ctx, "pet_interaction", `喂食了${food_type === 'luxury_bento' ? '豪华御膳' : '饭团便当'}`);
          break;

        default:
          return { status: 400, msg: "无效的互动类型" };
      }

      await db.collection("pets").doc(pet._id).update({ data: updateData });
      return { status: 200, msg: "互动成功" };
    }

    case "prepare_food": {
      const { food_type, quantity = 1 } = event;
      const foodCost = food_type === 'luxury_bento' ? 50 : 10;
      const totalCost = foodCost * quantity;

      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];

      if ((me.water_count || 0) < totalCost) {
        return { status: 400, msg: "爱意不足" };
      }

      const petRes = await db
        .collection("pets")
        .where({ owners: OPENID })
        .get();

      if (petRes.data.length === 0) {
        return { status: 404, msg: "宠物不存在" };
      }

      // Deduct love energy
      await db.collection("users").doc(me._id).update({
        data: { water_count: _.inc(-totalCost) }
      });

      // Add food to inventory
      const foodName = food_type === 'luxury_bento' ? '豪华御膳' : '饭团便当';
      await db.collection("pets").doc(petRes.data[0]._id).update({
        data: {
          [`food_inventory.${food_type}`]: _.inc(quantity),
          updatedAt: db.serverDate()
        }
      });

      await addLog(ctx, "pet_interaction", `准备了${quantity}份${foodName}`);
      return { status: 200, msg: `成功准备${quantity}份${foodName}` };
    }

    case "send_pet_travel": {
      const { destination_id, food_type } = event;
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];

      const petRes = await db
        .collection("pets")
        .where({ owners: OPENID })
        .get();

      if (petRes.data.length === 0) {
        return { status: 404, msg: "宠物不存在" };
      }

      const pet = petRes.data[0];

      // Check pet state
      if (pet.state !== 'idle') {
        return { status: 400, msg: "宠物正在忙碌中" };
      }

      // Check energy
      if ((pet.energy_level || 0) < 30) {
        return { status: 400, msg: "宠物精力不足，请先喂食" };
      }

      // Get destination info
      const destRes = await db
        .collection("destinations")
        .where({ id: destination_id })
        .get();

      if (destRes.data.length === 0) {
        return { status: 404, msg: "目的地不存在" };
      }

      const destination = destRes.data[0];

      // Check if location is unlocked
      if (!pet.unlocked_locations.includes(destination_id)) {
        return { status: 400, msg: "该地点尚未解锁" };
      }

      // Check food inventory
      if ((pet.food_inventory[food_type] || 0) < 1) {
        return { status: 400, msg: "食物不足，请先准备" };
      }

      // Calculate travel time
      const travelTime = Math.floor(
        Math.random() * (destination.max_travel_time - destination.min_travel_time + 1)
      ) + destination.min_travel_time;

      const returnTime = new Date(Date.now() + travelTime * 60 * 1000);

      // Update pet state
      await db.collection("pets").doc(pet._id).update({
        data: {
          state: 'traveling',
          current_destination: destination_id,
          return_time: returnTime,
          energy_level: _.inc(-30),
          [`food_inventory.${food_type}`]: _.inc(-1),
          updatedAt: db.serverDate()
        }
      });

      await addLog(ctx, "pet_interaction", `宠物去${destination.name}旅行了`);

      return {
        status: 200,
        msg: `宠物出发前往${destination.name}`,
        return_time: returnTime,
        travel_duration_minutes: travelTime
      };
    }

    case "collect_travel_rewards": {
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];

      const petRes = await db
        .collection("pets")
        .where({ owners: OPENID })
        .get();

      if (petRes.data.length === 0) {
        return { status: 404, msg: "宠物不存在" };
      }

      const pet = petRes.data[0];

      if (pet.state !== 'traveling') {
        return { status: 400, msg: "宠物不在旅行中" };
      }

      const now = new Date();
      const returnTime = new Date(pet.return_time);

      if (now < returnTime) {
        return { status: 400, msg: "宠物尚未返回" };
      }

      // Process rewards
      const rewards = await processTravelRewards(db, pet, me, CONFIG);

      // Update user resources
      await db.collection("users").doc(me._id).update({
        data: {
          rose_balance: _.inc(rewards.roses),
          water_count: _.inc(rewards.love_energy)
        }
      });

      // Update pet state
      await db.collection("pets").doc(pet._id).update({
        data: {
          state: 'idle',
          current_destination: '',
          return_time: null,
          travel_count: _.inc(1),
          specialty_collection: _.push(rewards.specialty),
          updatedAt: db.serverDate()
        }
      });

      await addLog(ctx, "pet_interaction", `宠物从旅行返回，带回了${rewards.roses}朵玫瑰和${rewards.specialty.name || '纪念品'}`);

      return {
        status: 200,
        msg: "成功收取旅行奖励",
        rewards: rewards
      };
    }

    case "get_destinations": {
      const petRes = await db
        .collection("pets")
        .where({ owners: OPENID })
        .get();

      const unlocked_locations = petRes.data.length > 0 ? petRes.data[0].unlocked_locations : ['park'];

      const destinationsRes = await db
        .collection("destinations")
        .get();

      const destinations = destinationsRes.data.map(dest => ({
        ...dest,
        unlocked: unlocked_locations.includes(dest.id)
      }));

      return {
        status: 200,
        destinations: destinations
      };
    }

    // Keep existing non-garden actions
    case "check_in": {
      const { imageFileID, style, evaluation } = event;
      if (!imageFileID) return { status: 400 };

      const todayLogsCount = await db
        .collection("logs")
        .where({
          _openid: OPENID,
          originalDate: todayStr,
          type: "daily_check_in",
        })
        .count();

      const isFirstCheckIn = todayLogsCount.total === 0;

      await db.collection("logs").add({
        data: {
          _openid: OPENID,
          type: "daily_check_in",
          content: "打卡",
          imageFileID,
          originalDate: todayStr,
          createdAt: db.serverDate(),
          style: style || "Sweet",
          evaluation: evaluation || null,
        },
      });

      let msg = "已存入时光轴";
      let egg = null;

      if (isFirstCheckIn) {
        await db
          .collection("users")
          .where({ _openid: OPENID })
          .update({ data: { water_count: _.inc(CONFIG.CHECKIN_REWARD) } });

        msg = `打卡成功 +${CONFIG.CHECKIN_REWARD}g爱意`;

        const currentHour = new Date().getUTCHours() + 8;
        const hour = currentHour % 24;

        if (hour >= 5 && hour < 8) {
          egg = await tryTriggerEgg(
            ctx,
            "early_bird",
            50,
            "早安吻",
            "一日之计在于晨"
          );
          if (egg) {
            await db
              .collection("users")
              .where({ _openid: OPENID })
              .update({ data: { water_count: _.inc(egg.bonus) } });
          }
        }
      }

      return { status: 200, msg: msg, triggerEgg: egg };
    }

    case "watch_ad_reward": {
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const user = userRes.data[0];
      const stats = user.daily_usage || { date: todayStr };
      if (
        (stats.date === todayStr ? stats.ad_count || 0 : 0) >=
        CONFIG.DAILY_AD_LIMIT
      )
        return { status: 403, msg: "今日次数已达上限" };

      const updateData =
        stats.date === todayStr
          ? { "daily_usage.ad_count": _.inc(1) }
          : {
              daily_usage: {
                date: todayStr,
                count: 0,
                ad_count: 1,
                msg_count: 0,
              },
            };
      await db.collection("users").doc(user._id).update({ data: updateData });
      return { status: 200, msg: "奖励到账" };
    }
  }
}

// Process travel rewards helper function
async function processTravelRewards(db, pet, user, CONFIG) {
  const rewards = {
    roses: 0,
    love_energy: 30,
    specialty: null
  };

  // Get destination info
  const destRes = await db
    .collection("destinations")
    .where({ id: pet.current_destination })
    .get();

  if (destRes.data.length > 0) {
    const destination = destRes.data[0];

    // Guaranteed progress
    const newProgress = (pet.guaranteed_progress || 0) + 30;
    if (newProgress >= 350) {
      rewards.roses += 1;
      rewards.guaranteed_progress = newProgress - 350;
    } else {
      rewards.guaranteed_progress = newProgress;
    }

    // Base rose chance
    const roseChance = destination.rose_chance_base;
    const moodBonus = pet.mood_value >= destination.mood_bonus_required ? 0.2 : 0;

    if (Math.random() < (roseChance + moodBonus)) {
      rewards.roses += 1;
    }

    // Specialty chance
    if (Math.random() < destination.specialty_chance) {
      rewards.specialty = {
        id: `${destination.id}_${Date.now()}`,
        name: `${destination.name}纪念品`,
        description: destination.description,
        image_url: destination.image_url,
        collected_at: new Date()
      };
    }
  }

  return rewards;
}

module.exports = { handle };