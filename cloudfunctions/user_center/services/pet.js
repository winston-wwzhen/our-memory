const { getTodayStr } = require("../utils/common");
const { addLog } = require("../utils/logger");
// const { checkImageSafety } = require("../utils/safety"); // 暂时没用到
const { tryTriggerEgg } = require("../utils/eggs");

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG } = ctx;
  // const todayStr = getTodayStr(); // 暂时没用到

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
      const petRes = await db.collection("pets").where(_.or(conditions)).get();
      let myPet = null;

      if (petRes.data.length > 0) {
        myPet = petRes.data[0];
        myPet = await applyMoodDecay(ctx, myPet);
        // Update owners logic (保持不变)
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
      } else {
        // Create new pet (保持不变)
        let owners = [OPENID];
        if (partnerId) owners.push(partnerId);
        const newPet = {
          owners,
          name: "小可爱",
          mood_value: 60,
          energy_level: 80,
          state: "idle",
          last_interaction: db.serverDate(),
          travel_count: 0,
          current_destination: "",
          return_time: null,
          unlocked_locations: ["park"],
          specialty_collection: [],
          food_inventory: { rice_ball: 0, luxury_bento: 0 },
          guaranteed_progress: 0,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        };
        await db.collection("pets").add({ data: newPet });
        myPet = newPet;
      }

      // Logs logic
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
      if (petRes.data.length === 0) return { status: 404, msg: "宠物不存在" };
      let pet = await applyMoodDecay(ctx, petRes.data[0]);
      let updateData = {
        last_interaction: db.serverDate(),
        updatedAt: db.serverDate(),
      };

      switch (type) {
        case "pat":
          updateData.mood_value = Math.min(100, (pet.mood_value || 0) + 2);
          updateData.energy_level = Math.max(0, (pet.energy_level || 0) - 1);
          await addLog(ctx, "pet_interaction", "抚摸了宠物");
          break;

        case "feed":
          // 🟢 修改点 1: 精力满时阻止喂食
          if ((pet.energy_level || 0) >= 100) {
            return { status: 400, msg: "宠物精力充沛，吃不下了~" };
          }

          const moodBonus = food_type === "luxury_bento" ? 20 : 10;
          const energyBonus = food_type === "luxury_bento" ? 40 : 20;

          // 🟢 修改点 2: 移除爱意值校验（之前制作时已经扣过了）
          // const foodCost = food_type === "luxury_bento" ? 50 : 10;
          // if ((me.water_count || 0) < foodCost) return { status: 400, msg: "爱意不足" };

          // 校验库存
          if ((pet.food_inventory[food_type] || 0) < 1)
            return { status: 400, msg: "背包里没有这个食物了" };

          // 🟢 修改点 3: 移除扣除爱意值的逻辑
          // await db.collection("users").doc(me._id).update({ data: { water_count: _.inc(-foodCost) } });

          // 扣除库存
          updateData.food_inventory = pet.food_inventory || {};
          updateData.food_inventory[food_type] = Math.max(
            0,
            (pet.food_inventory[food_type] || 0) - 1
          );

          // 增加心情和精力
          updateData.mood_value = Math.min(
            100,
            (pet.mood_value || 0) + moodBonus
          );
          updateData.energy_level = Math.min(
            100,
            (pet.energy_level || 0) + energyBonus
          );

          // 状态变为进食中
          updateData.state = "eating";

          // 3秒后恢复空闲
          setTimeout(async () => {
            await db
              .collection("pets")
              .doc(pet._id)
              .update({ data: { state: "idle", updatedAt: db.serverDate() } });
          }, 3000);

          const foodName =
            food_type === "luxury_bento" ? "豪华御膳" : "饭团便当";
          await addLog(
            ctx,
            "pet_interaction",
            `喂食了${foodName}，心情+${moodBonus}，精力+${energyBonus}`
          );
          break;

        default:
          return { status: 400, msg: "无效的互动类型" };
      }
      await db.collection("pets").doc(pet._id).update({ data: updateData });
      return { status: 200, msg: "互动成功" };
    }

    case "prepare_food": {
      const { food_type, quantity = 1 } = event;
      const foodCost = food_type === "luxury_bento" ? 50 : 10;
      const totalCost = foodCost * quantity;
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];
      if ((me.water_count || 0) < totalCost)
        return { status: 400, msg: "爱意不足" };

      const petRes = await db
        .collection("pets")
        .where({ owners: OPENID })
        .get();
      if (petRes.data.length === 0) return { status: 404, msg: "宠物不存在" };

      await db
        .collection("users")
        .doc(me._id)
        .update({ data: { water_count: _.inc(-totalCost) } });
      const foodName = food_type === "luxury_bento" ? "豪华御膳" : "饭团便当";
      await db
        .collection("pets")
        .doc(petRes.data[0]._id)
        .update({
          data: {
            [`food_inventory.${food_type}`]: _.inc(quantity),
            updatedAt: db.serverDate(),
          },
        });
      await addLog(ctx, "pet_interaction", `准备了${quantity}份${foodName}`);
      return { status: 200, msg: `成功准备${quantity}份${foodName}` };
    }

    case "send_pet_travel": {
      const { destination_id, food_type } = event;
      const petRes = await db
        .collection("pets")
        .where({ owners: OPENID })
        .get();
      if (petRes.data.length === 0) return { status: 404, msg: "宠物不存在" };
      const pet = petRes.data[0];

      if (pet.state !== "idle") return { status: 400, msg: "宠物正在忙碌中" };
      if ((pet.energy_level || 0) < 30)
        return { status: 400, msg: "宠物精力不足，请先喂食" };

      const destRes = await db
        .collection("destinations")
        .where({ id: destination_id })
        .get();
      if (destRes.data.length === 0)
        return { status: 404, msg: "目的地不存在" };
      const destination = destRes.data[0];

      const unlocked = pet.unlocked_locations || ["park"];
      if (!unlocked.includes(destination_id))
        return { status: 400, msg: "该地点尚未解锁" };

      if ((pet.food_inventory[food_type] || 0) < 1)
        return { status: 400, msg: "食物不足，请先准备" };

      const travelTime =
        Math.floor(
          Math.random() *
            (destination.max_travel_time - destination.min_travel_time + 1)
        ) + destination.min_travel_time;
      const returnTime = new Date(Date.now() + travelTime * 60 * 1000);

      await db
        .collection("pets")
        .doc(pet._id)
        .update({
          data: {
            state: "traveling",
            current_destination: destination_id,
            return_time: returnTime,
            energy_level: _.inc(-30),
            [`food_inventory.${food_type}`]: _.inc(-1),
            updatedAt: db.serverDate(),
          },
        });
      await addLog(ctx, "pet_interaction", `宠物去${destination.name}旅行了`);
      return {
        status: 200,
        msg: `宠物出发前往${destination.name}`,
        return_time: returnTime,
        travel_duration_minutes: travelTime,
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

      if (petRes.data.length === 0) return { status: 404, msg: "宠物不存在" };
      const pet = petRes.data[0];

      if (pet.state !== "traveling")
        return { status: 400, msg: "宠物不在旅行中" };

      const now = new Date();
      const returnTime = new Date(pet.return_time);
      if (now < returnTime) return { status: 400, msg: "宠物尚未返回" };

      // 1. 计算奖励
      const rewards = await processTravelRewards(db, pet, me, CONFIG);

      // 2. 更新用户
      await db
        .collection("users")
        .doc(me._id)
        .update({
          data: {
            rose_balance: _.inc(rewards.roses),
            water_count: _.inc(rewards.love_energy),
          },
        });

      let petUpdateData = {
        state: "idle",
        current_destination: "",
        return_time: null,
        travel_count: _.inc(1),
        guaranteed_progress: rewards.guaranteed_progress, // 保存进度
        updatedAt: db.serverDate(),
      };

      if (rewards.specialty) {
        petUpdateData.specialty_collection = _.push(rewards.specialty);
      }

      await db.collection("pets").doc(pet._id).update({
        data: petUpdateData,
      });

      await addLog(
        ctx,
        "pet_interaction",
        `宠物从旅行返回，带回了${rewards.roses}朵玫瑰` +
          (rewards.specialty ? `和${rewards.specialty.name}` : "")
      );

      return {
        status: 200,
        msg: "成功收取旅行奖励",
        rewards: rewards,
      };
    }

    case "get_destinations": {
      const petRes = await db
        .collection("pets")
        .where({ owners: OPENID })
        .get();
      const unlocked_locations =
        petRes.data.length > 0
          ? petRes.data[0].unlocked_locations || ["park"]
          : ["park"];
      const destinationsRes = await db.collection("destinations").get();
      const destinations = destinationsRes.data.map((dest) => ({
        ...dest,
        unlocked: unlocked_locations.includes(dest.id),
      }));
      return { status: 200, destinations: destinations };
    }

    case "check_in": {
      const { imageFileID, style, evaluation } = event;
      if (!imageFileID) return { status: 400 };

      const todayLogsCount = await db
        .collection("logs")
        .where({
          _openid: OPENID,
          originalDate: getTodayStr(),
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
          originalDate: getTodayStr(),
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
      const todayStr = getTodayStr();
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

async function processTravelRewards(db, pet, user, CONFIG) {
  const rewards = {
    roses: 0,
    love_energy: 30,
    specialty: null,
    guaranteed_progress: pet.guaranteed_progress || 0, // 默认值
  };

  const destRes = await db
    .collection("destinations")
    .where({ id: pet.current_destination })
    .get();

  if (destRes.data.length > 0) {
    const destination = destRes.data[0];

    // 1. 计算保底进度
    const newProgress = (pet.guaranteed_progress || 0) + 30;
    if (newProgress >= 350) {
      rewards.roses += 1;
      rewards.guaranteed_progress = newProgress - 350;
    } else {
      rewards.guaranteed_progress = newProgress;
    }

    // 2. 随机玫瑰掉落
    const roseChance = destination.rose_chance_base || 0.2;
    // 安全获取 mood_bonus_required
    const reqMood = destination.mood_bonus_required || 60;
    const moodBonus = (pet.mood_value || 0) >= reqMood ? 0.2 : 0;

    if (Math.random() < roseChance + moodBonus) {
      rewards.roses += 1;
    }

    // 3. 特产掉落
    const specialtyChance = destination.specialty_chance || 0;
    if (Math.random() < specialtyChance) {
      rewards.specialty = {
        id: `${destination.id}_${Date.now()}`,
        name: `${destination.name}纪念品`,
        description: destination.description,
        image_url: destination.image_url || destination.image, // 兼容字段名
        collected_at: new Date(),
      };
    }
  }

  return rewards;
}

async function applyMoodDecay(ctx, pet) {
  const { db, _, CONFIG } = ctx;
  const now = new Date();
  const lastUpdate = new Date(pet.updatedAt || pet.createdAt);

  // 计算时间差（分钟）
  const diffMinutes = (now - lastUpdate) / (1000 * 60);
  const decayInterval = CONFIG.MOOD_DECAY_INTERVAL_MINUTES || 60;

  // 如果时间差小于衰减间隔，不处理
  if (diffMinutes < decayInterval) {
    return pet;
  }

  // 计算需要衰减的次数
  const decayCount = Math.floor(diffMinutes / decayInterval);
  const decayAmount = decayCount * (CONFIG.MOOD_DECAY_AMOUNT || 2);

  if (decayAmount <= 0) return pet;

  // 计算新的心情值（最低为0）
  const currentMood = pet.mood_value || 0;
  let newMood = Math.max(0, currentMood - decayAmount);

  // 如果心情值没有变化（已经是0了），直接返回
  if (newMood === currentMood) return pet;

  // 更新数据库
  await db
    .collection("pets")
    .doc(pet._id)
    .update({
      data: {
        mood_value: newMood,
        updatedAt: db.serverDate(), // 更新时间，作为下一次衰减的基准
      },
    });

  // 返回更新后的 pet 对象
  return {
    ...pet,
    mood_value: newMood,
    updatedAt: now,
  };
}

module.exports = { handle };
