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

        // 🟢 [修复 1] 自动结算逻辑修正
        if (myPet.state === "traveling" && myPet.return_time) {
          const now = new Date();
          const returnTime = new Date(myPet.return_time);

          if (now >= returnTime) {
            // 1. 计算奖励
            const rewards = await processTravelRewards(db, myPet, me, CONFIG);

            // 2. 更新用户资产
            await db
              .collection("users")
              .doc(me._id)
              .update({
                data: {
                  rose_balance: _.inc(rewards.roses),
                  water_count: _.inc(rewards.love_energy),
                },
              });

            // 3. [关键修复] 必须更新宠物状态回 idle，并保存进度
            let petUpdateData = {
              state: "idle",
              current_destination: "",
              return_time: null,
              guaranteed_progress: rewards.guaranteed_progress, // 保存进度
              updatedAt: db.serverDate(),
            };

            // 只有获得了特产才更新收藏字段
            if (rewards.specialty) {
              petUpdateData.specialty_collection = _.push(rewards.specialty);
            }

            await db.collection("pets").doc(myPet._id).update({
              data: petUpdateData,
            });

            // 4. [修复] 更新本地 myPet 对象，以便正确返回给前端
            myPet = {
              ...myPet,
              ...petUpdateData,
              // 注意：serverDate在本地无法直接展示，这里简单处理，实际前端下次刷新会获取最新
              state: "idle",
              return_time: null,
            };

            // 5. 记录日志
            await addLog(
              ctx,
              "pet_interaction",
              `宠物旅行归来，带回了${rewards.roses}朵玫瑰`
            );
          }
        }
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

      // Logs logic (保持不变)
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
      // ... (保持原有逻辑不变)
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
      const pet = petRes.data[0];
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
          const foodCost = food_type === "luxury_bento" ? 50 : 10;
          const moodBonus = food_type === "luxury_bento" ? 20 : 10;
          const energyBonus = food_type === "luxury_bento" ? 40 : 20;
          if ((me.water_count || 0) < foodCost)
            return { status: 400, msg: "爱意不足" };
          if ((pet.food_inventory[food_type] || 0) < 1)
            return { status: 400, msg: "食物不足" };

          await db
            .collection("users")
            .doc(me._id)
            .update({ data: { water_count: _.inc(-foodCost) } });

          updateData.food_inventory = pet.food_inventory || {};
          updateData.food_inventory[food_type] = Math.max(
            0,
            (pet.food_inventory[food_type] || 0) - 1
          );
          updateData.mood_value = Math.min(
            100,
            (pet.mood_value || 0) + moodBonus
          );
          updateData.energy_level = Math.min(
            100,
            (pet.energy_level || 0) + energyBonus
          );
          updateData.state = "eating";

          setTimeout(async () => {
            await db
              .collection("pets")
              .doc(pet._id)
              .update({ data: { state: "idle", updatedAt: db.serverDate() } });
          }, 3000);
          await addLog(
            ctx,
            "pet_interaction",
            `喂食了${food_type === "luxury_bento" ? "豪华御膳" : "饭团便当"}`
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

      // 这里可以加一个校验：如果 unlocked_locations 不存在，默认为 ['park']
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

    // ... (其他 check_in, watch_ad_reward 保持不变)
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
    // 确保 specialty_chance 存在
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

module.exports = { handle };
