// cloudfunctions/user_center/services/pet.js
const { getTodayStr } = require("../utils/common");
const { addLog } = require("../utils/logger");
const { tryTriggerEgg } = require("../utils/eggs");
const { checkTextSafety } = require("../utils/safety");

const STARTER_LOCATION_ID = "community_garden";

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG } = ctx;

  switch (action) {
    // 1. 获取宠物状态
    case "get_pet_status": {
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];
      const partnerId = me.partner_id;

      let conditions = [{ owners: OPENID }];
      if (partnerId) conditions.push({ owners: partnerId });

      // 查找宠物
      const petRes = await db.collection("pets").where(_.or(conditions)).get();
      let myPet = null;

      if (petRes.data.length > 0) {
        myPet = petRes.data[0];
        // 应用心情衰减
        myPet = await applyMoodDecay(ctx, myPet);

        // 同步所有权 (如果绑定了伴侣但伴侣不在 owners 里)
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
        // 创建新宠物
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
          current_travel_id: null,
          return_time: null,
          unlocked_locations: [], // 默认为空数组，代表全解锁
          food_inventory: { rice_ball: 0, luxury_bento: 0 },
          guaranteed_progress: 0,
          current_skin: "default", // 默认皮肤
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        };
        await db.collection("pets").add({ data: newPet });
        myPet = newPet;
      }

      // 获取最近互动日志
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

    // 2. 与宠物互动 (抚摸/喂食)
    case "interact_with_pet": {
      const { type, food_type } = event;
      const petRes = await db
        .collection("pets")
        .where({ owners: OPENID })
        .get();

      if (petRes.data.length === 0) return { status: 404, msg: "宠物不存在" };
      let pet = await applyMoodDecay(ctx, petRes.data[0]);

      if (pet.state === "traveling") {
        return { status: 400, msg: "宠物正在远方旅行，暂时无法互动哦~" };
      }

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
          if (pet.state !== "idle") {
            return { status: 400, msg: "宠物不在家，无法喂食哦~" };
          }
          if ((pet.energy_level || 0) >= 100) {
            return { status: 400, msg: "宠物精力充沛，吃不下了~" };
          }

          const moodBonus = food_type === "luxury_bento" ? 20 : 10;
          const energyBonus = food_type === "luxury_bento" ? 40 : 20;

          if ((pet.food_inventory[food_type] || 0) < 1)
            return { status: 400, msg: "背包里没有这个食物了" };

          updateData[`food_inventory.${food_type}`] = _.inc(-1);
          updateData.mood_value = Math.min(
            100,
            (pet.mood_value || 0) + moodBonus
          );
          updateData.energy_level = Math.min(
            100,
            (pet.energy_level || 0) + energyBonus
          );
          updateData.state = "eating";

          // 3秒后自动恢复空闲状态
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

    // 3. 制作食物
    case "prepare_food": {
      const { food_type, quantity = 1 } = event;
      const foodCost = food_type === "luxury_bento" ? 100 : 20;
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

      // 扣除爱意值
      await db
        .collection("users")
        .doc(me._id)
        .update({ data: { water_count: _.inc(-totalCost) } });

      // 增加食物库存
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

    // 4. 派遣宠物旅行
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

      // 校验解锁状态：空数组代表全解锁
      const unlocked = pet.unlocked_locations || [];
      if (unlocked.length > 0 && !unlocked.includes(destination_id)) {
        return { status: 400, msg: "该地点尚未解锁" };
      }

      // 校验并扣除食物
      const foodCost = destination.food_consumption || 1;
      const currentStock = pet.food_inventory[food_type] || 0;

      if (currentStock < foodCost) {
        return {
          status: 400,
          msg: `食物不足，去${destination.name}需要消耗 ${foodCost} 份便当`,
        };
      }

      const travelTime =
        Math.floor(
          Math.random() *
            (destination.max_travel_time - destination.min_travel_time + 1)
        ) + destination.min_travel_time;
      const returnTime = new Date(Date.now() + travelTime * 60 * 1000);

      // 🌟 [新增] 创建旅行记录 (Travel Record)
      const travelRecord = {
        pet_id: pet._id,
        owners: pet.owners,
        destination_id: destination_id,
        destination_name: destination.name,
        start_time: db.serverDate(),
        expected_return_time: returnTime,
        status: "traveling", // traveling -> completed
        food_consumed: {
          type: food_type,
          count: foodCost,
        },
        created_at: db.serverDate(),
      };

      const travelRes = await db
        .collection("travel_records")
        .add({ data: travelRecord });
      const travelId = travelRes._id;

      await db
        .collection("pets")
        .doc(pet._id)
        .update({
          data: {
            state: "traveling",
            current_destination: destination_id,
            current_travel_id: travelId,
            return_time: returnTime,
            energy_level: _.inc(-30),
            [`food_inventory.${food_type}`]: _.inc(-foodCost),
            updatedAt: db.serverDate(),
          },
        });

      await addLog(
        ctx,
        "pet_interaction",
        `宠物带上${foodCost}份便当去${destination.name}旅行了`
      );

      return {
        status: 200,
        msg: `宠物出发前往${destination.name}`,
        return_time: returnTime,
        travel_duration_minutes: travelTime,
      };
    }

    // 5. 领取旅行奖励
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

      // 计算奖励
      const rewards = await processTravelRewards(db, pet, me, CONFIG);

      // 更新用户资产
      const owners = pet.owners || [OPENID];
      await db
        .collection("users")
        .where({ _openid: _.in(owners) }) // 找出所有主人
        .update({
          data: {
            rose_balance: _.inc(rewards.roses),
            water_count: _.inc(rewards.love_energy),
          },
        });
      // 🌟 [新增] 处理明信片存储到独立表 (Postcards Table)

      if (rewards.specialty) {
        await db.collection("postcards").add({
          data: {
            ...rewards.specialty,
            pet_id: pet._id,
            owners: pet.owners,
            travel_id: pet.current_travel_id, // 关联本次旅行
            obtained_by: OPENID,
            created_at: db.serverDate(),
          },
        });
      }

      // 🌟 [新增] 更新旅行记录表状态
      if (pet.current_travel_id) {
        await db
          .collection("travel_records")
          .doc(pet.current_travel_id)
          .update({
            data: {
              status: "completed",
              actual_return_time: db.serverDate(),
              rewards_summary: {
                roses: rewards.roses,
                love_energy: rewards.love_energy,
                has_specialty: !!rewards.specialty,
              },
            },
          });
      }

      // 更新宠物状态
      let petUpdateData = {
        state: "idle",
        current_destination: "",
        return_time: null,
        travel_count: _.inc(1),
        updatedAt: db.serverDate(),
      };

      await db.collection("pets").doc(pet._id).update({
        data: petUpdateData,
      });

      await addLog(
        ctx,
        "pet_interaction",
        `宠物从旅行返回，带回了${rewards.roses}朵玫瑰，${rewards.love_energy}g爱意` +
          (rewards.specialty ? `和${rewards.specialty.name}` : "")
      );

      return {
        status: 200,
        msg: "成功收取旅行奖励",
        rewards: rewards,
      };
    }

    // 6. 获取目的地列表
    case "get_destinations": {
      const petRes = await db
        .collection("pets")
        .where({ owners: OPENID })
        .get();

      const unlocked_locations =
        petRes.data.length > 0 ? petRes.data[0].unlocked_locations || [] : [];

      // 判断是否全解锁
      const isFullUnlock = unlocked_locations.length === 0;

      const destinationsRes = await db.collection("destinations").get();
      const destinations = destinationsRes.data.map((dest) => ({
        ...dest,
        unlocked: isFullUnlock || unlocked_locations.includes(dest.id),
      }));
      return { status: 200, destinations: destinations };
    }

    // 7. 获取明信片墙 (新增)
    case "get_postcards": {
      // 🌟 改为查询 postcards 独立集合
      const postcardsRes = await db
        .collection("postcards")
        .where({ owners: OPENID })
        .orderBy("collected_at", "desc")
        .limit(100) // 可根据需要分页
        .get();

      const postcards = postcardsRes.data.map((item) => {
        // 兼容处理
        const composition = item.composition || {
          bg_image: item.image_url,
          skin_id: "default",
          layout: { x: 0.5, y: 0.5, scale: 1 },
        };

        return {
          id: item._id, // 使用文档ID
          travel_date: item.collected_at,
          message: item.description || "一次难忘的旅行回忆...",
          destination_id: (item.id || "").split("_")[0] || "unknown", // 兼容旧数据结构 item.id
          destination: {
            name: item.name.replace("纪念品", "").replace("明信片", ""),
            image: item.image_url,
          },
          composition: composition,
          rewards: [
            { name: "爱意", count: 30, icon: "💧" },
            { name: "玫瑰", count: 1, icon: "🌹" },
          ],
          specialty_item: item.name,
          likes: item.likes || 0,
        };
      });

      return {
        status: 200,
        postcards: postcards,
      };
    }

    // 8. 每日打卡
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

    // 9. 看广告奖励
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

    case "rename_pet": {
      const { name } = event;
      if (!name || name.trim().length === 0)
        return { status: 400, msg: "名字不能为空" };
      if (name.length > 6) return { status: 400, msg: "名字太长啦(最多6个字)" };

      // 🛡️ 安全检测
      const isSafe = await checkTextSafety(ctx, name);
      if (!isSafe) return { status: 403, msg: "名字包含敏感词，请换一个" };

      const petRes = await db
        .collection("pets")
        .where({ owners: OPENID })
        .get();
      if (petRes.data.length === 0) return { status: 404, msg: "宠物不存在" };

      const pet = petRes.data[0];

      await db
        .collection("pets")
        .doc(pet._id)
        .update({
          data: {
            name: name,
            updatedAt: db.serverDate(),
          },
        });

      await addLog(ctx, "pet_interaction", `给宠物改名为：${name}`);

      return { status: 200, msg: "改名成功", newName: name };
    }
  }
}

// ---------------- 辅助函数 ----------------

// 计算奖励并生成快照
async function processTravelRewards(db, pet, user, CONFIG) {
  const rewards = {
    roses: 0,
    love_energy: 10, // 兜底默认值
    specialty: null,
    // [修改] 去除 guaranteed_progress 字段
  };

  const destRes = await db
    .collection("destinations")
    .where({ id: pet.current_destination })
    .get();

  if (destRes.data.length > 0) {
    const destination = destRes.data[0];

    // 1. 爱意值奖励
    if (destination.base_love_reward) {
      rewards.love_energy = destination.base_love_reward;
    }

    // [修改] 删除原有的“保底进度”逻辑 (newProgress >= 350 ...)

    // 2. 随机玫瑰掉落 (同时修复字段读取问题)
    // 优先读取 destination 中的 rose_config 对象
    const roseConfig = destination.rose_config || {
      chance: 0.2,
      min: 1,
      max: 1,
    };

    const reqMood = destination.mood_bonus_required || 60;
    const moodBonus = (pet.mood_value || 0) >= reqMood ? 0.2 : 0;

    // 计算最终概率
    const finalRoseChance = roseConfig.chance + moodBonus;

    if (Math.random() < finalRoseChance) {
      // 计算掉落数量：[min, max] 随机
      const min = roseConfig.min || 1;
      const max = roseConfig.max || 1;
      const count = Math.floor(Math.random() * (max - min + 1)) + min;
      rewards.roses += count;
    }

    // 3. [修改] 明信片/特产掉落 - 改为 100% 必得
    // 移除 Math.random() < specialtyChance 的判断

    // 动态生成名字
    let cardName = `${destination.name}纪念册`;
    if (
      destination.possible_rewards &&
      destination.possible_rewards.length > 0
    ) {
      // 简单逻辑：取第一个作为名字
      cardName = destination.possible_rewards[0];
    }

    rewards.specialty = {
      id: `${destination.id}_${Date.now()}`,
      name: cardName,
      description: destination.description,
      collected_at: new Date(),
      type: "postcard",

      // 兼容处理：优先用 postcard_image，没有则用 image
      image_url: destination.postcard_image || destination.image,

      composition: {
        // 背景图逻辑
        bg_image:
          destination.postcard_bg || destination.image_url || destination.image,
        skin_id: pet.current_skin || "default",
        layout: destination.postcard_layout || { x: 0.5, y: 0.5, scale: 1 },
      },
    };
  }

  return rewards;
}

// 心情衰减逻辑
async function applyMoodDecay(ctx, pet) {
  const { db, _, CONFIG } = ctx;
  const now = new Date();
  const lastUpdate = new Date(pet.updatedAt || pet.createdAt);

  const diffMinutes = (now - lastUpdate) / (1000 * 60);
  const decayInterval = CONFIG.MOOD_DECAY_INTERVAL_MINUTES || 60;

  if (diffMinutes < decayInterval) return pet;

  const decayCount = Math.floor(diffMinutes / decayInterval);
  const decayAmount = decayCount * (CONFIG.MOOD_DECAY_AMOUNT || 2);

  if (decayAmount <= 0) return pet;

  const currentMood = pet.mood_value || 0;
  let newMood = Math.max(0, currentMood - decayAmount);

  if (newMood === currentMood) return pet;

  await db
    .collection("pets")
    .doc(pet._id)
    .update({
      data: {
        mood_value: newMood,
        updatedAt: db.serverDate(),
      },
    });

  return { ...pet, mood_value: newMood, updatedAt: now };
}

module.exports = { handle };
