const { getTodayStr } = require("../utils/common");
const { addLog } = require("../utils/logger");
const { checkImageSafety } = require("../utils/safety");
const { tryTriggerEgg } = require("../utils/eggs");

// 模拟明信片奖池 (Phase 2)
const POSTCARD_POOL = [
  {
    id: "p1",
    name: "富士山下",
    url: "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/postcards/fuji.jpg",
  },
  {
    id: "p2",
    name: "海边落日",
    url: "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/postcards/sunset.jpg",
  },
  {
    id: "p3",
    name: "森林公园",
    url: "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/postcards/forest.jpg",
  },
];

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG } = ctx;
  const todayStr = getTodayStr();

  // 获取配置的旅行时长（分钟），默认 120 分钟
  const TRAVEL_MINUTES = CONFIG.TRAVEL_DURATION_MINUTES || 120;

  switch (action) {
    case "get_garden": {
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];
      const partnerId = me.partner_id;

      let conditions = [{ owners: OPENID }];
      if (partnerId) conditions.push({ owners: partnerId });

      const gardenRes = await db
        .collection("gardens")
        .where(_.or(conditions))
        .orderBy("growth_value", "desc")
        .get();
      let myGarden = null;

      if (gardenRes.data.length > 0) {
        myGarden = gardenRes.data[0];

        // 使用事务同步 owners 逻辑，确保数据一致性
        try {
          await db.runTransaction(async (transaction) => {
            // 获取最新的花园数据
            const freshGardenRes = await transaction
              .collection("gardens")
              .doc(myGarden._id)
              .get();
            const freshGarden = freshGardenRes.data;

            // 准备更新数据
            const updateData = { updatedAt: db.serverDate() };
            let needUpdate = false;

            // 检查并添加伴侣ID
            if (partnerId && freshGarden.owners && !freshGarden.owners.includes(partnerId)) {
              updateData.owners = _.addToSet(partnerId);
              needUpdate = true;
            }

            // 检查并添加用户自己ID
            if (!freshGarden.owners || !freshGarden.owners.includes(OPENID)) {
              updateData.owners = updateData.owners ?
                _.addToSet(OPENID) :
                { $push: [OPENID] };
              needUpdate = true;
            }

            // 同步玫瑰余额
            if (freshGarden.rose_balance > 0) {
              // 更新用户玫瑰余额
              await transaction
                .collection("users")
                .doc(me._id)
                .update({ data: { rose_balance: _.inc(freshGarden.rose_balance) } });

              // 清空花园玫瑰余额
              updateData.rose_balance = 0;
              needUpdate = true;
            }

            // 如果需要更新，执行更新
            if (needUpdate) {
              await transaction
                .collection("gardens")
                .doc(myGarden._id)
                .update({ data: updateData });
            }
          });
        } catch (error) {
          console.error("Sync owners transaction failed:", error);
          // 事务失败不影响主要流程，记录日志即可
          await addLog(ctx, "error", `同步花园数据失败: ${error.message}`);
        }

        // 重新获取更新后的数据
        const updatedGardenRes = await db
          .collection("gardens")
          .doc(myGarden._id)
          .get();
        myGarden = updatedGardenRes.data;
      } else {
        // 创建新花园
        let owners = [OPENID];
        if (partnerId) owners.push(partnerId);
        const newGarden = {
          owners,
          interaction_count: 0, // 改为互动次数
          harvest_count: 0,
          harvest_total: 0,
          created_at: db.serverDate(), // 添加创建时间
          updatedAt: db.serverDate(),
          // 宠物等级和心情系统
          pet_level: 1, // 宠物等级
          pet_exp: 0, // 宠物经验
          pet_mood: 100, // 心情值（0-100）
          pet_last_mood_update: db.serverDate(), // 上次心情更新时间
        };
        await db.collection("gardens").add({ data: newGarden });
        myGarden = newGarden;
      }

      myGarden.rose_balance = me.rose_balance || 0;

      // === Phase 2: 计算剩余旅行时间 (秒) ===
      let travelLeft = 0;
      if (myGarden.travel_start_time) {
        const now = new Date().getTime();
        const start = new Date(myGarden.travel_start_time).getTime();
        const passed = (now - start) / 1000;
        const totalNeed = TRAVEL_MINUTES * 60;
        travelLeft = Math.max(0, totalNeed - passed);
      }
      // ======================================

      let recentLogs = [];
      try {
        const owners = myGarden.owners || [OPENID];
        const logsRes = await db
          .collection("logs")
          .where({
            type: _.in(["water", "harvest", "travel_start"]),
            _openid: _.in(owners),
          }) // 包含旅行日志
          .orderBy("createdAt", "desc")
          .limit(10)
          .get();
        recentLogs = logsRes.data.map((log) => ({
          content: log.content,
          date: log.createdAt,
          type: log.type, // 包含日志类型
          isMine: log._openid === OPENID,
          _openid: log._openid, // 保留openid用于获取用户信息
        }));
      } catch (e) {
        console.error("获取日志失败:", e);
        // 日志获取失败不影响主要功能，返回空数组
      }

      // 获取伴侣最近的活动
      let partnerActivity = null;
      try {
        const activityRes = await db.collection("partner_activities")
          .where({ _openid: OPENID })
          .orderBy("createdAt", "desc")
          .limit(1)
          .get();

        if (activityRes.data.length > 0) {
          const activity = activityRes.data[0];
          partnerActivity = {
            nickName: activity.partnerName,
            action: activity.action,
            timestamp: activity.timestamp
          };
        }
      } catch (e) {
        console.error("获取伴侣活动失败:", e);
        // 伴侣活动获取失败不影响主要功能，返回null
      }

      // 计算宠物等级和心情
      const petInfo = calculatePetInfo(myGarden, CONFIG);

      return {
        status: 200,
        garden: myGarden,
        water: me.water_count || 0,
        travelLeft: Math.floor(travelLeft), // 返回倒计时秒数
        logs: recentLogs,
        partnerActivity: partnerActivity,
        petInfo: petInfo // 包含等级、心情等信息
      };
    }

    case "water_flower": {
      // 添加请求ID用于防重复提交
      const requestId = event.requestId || Date.now().toString();

      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];

      if ((me.water_count || 0) < 1)
        return { status: 400, msg: "今日记录次数已用完" };

      const gardenRes = await db
        .collection("gardens")
        .where({ owners: OPENID })
        .get();
      if (gardenRes.data.length === 0) return { status: 404 };

      const garden = gardenRes.data[0];

      // 校验：整理回忆中不可记录
      if (garden.travel_start_time) {
        const now = new Date().getTime();
        const start = new Date(garden.travel_start_time).getTime();
        if ((now - start) / 1000 < TRAVEL_MINUTES * 60) {
          return { status: 400, msg: "萌宠正在旅行中，请稍后再喂食" };
        }
      }
      // 校验：满30次不可记录
      if (garden.interaction_count >= 30) {
        return { status: 400, msg: "本阶段记录已满，请生成回忆录" };
      }

      // 使用事务确保数据一致性
      try {
        const res = await db.runTransaction(async (transaction) => {
          // 再次检查用户的 water_count（防止并发）
          const freshUserRes = await transaction
            .collection("users")
            .where({ _openid: OPENID })
            .get();
          const freshUser = freshUserRes.data[0];

          if ((freshUser.water_count || 0) < 1) {
            await transaction.rollback();
            return { success: false, msg: "今日记录次数已用完" };
          }

          // 检查数据完整性
          if (freshUser.water_count < 0 || garden.interaction_count < 0) {
            await transaction.rollback();
            return { success: false, msg: "数据异常，请联系客服" };
          }

          // 扣除次数
          await transaction
            .collection("users")
            .doc(me._id)
            .update({ data: { water_count: _.inc(-1) } });

          // 更新花园状态
          await transaction
            .collection("gardens")
            .doc(garden._id)
            .update({
              data: {
                interaction_count: _.inc(CONFIG.WATER_FEED_GROWTH || 5), // 使用配置值
                pet_mood: _.inc(CONFIG.PET_FEED_MOOD_BOOST), // 提升心情值
                pet_last_mood_update: db.serverDate(), // 更新心情时间
                updatedAt: db.serverDate(),
              },
            });

          return { success: true };
        });

        if (!res.success) {
          return { status: 400, msg: res.msg };
        }
      } catch (error) {
        console.error("Transaction failed:", error);
        // 记录错误日志
        await addLog(ctx, "error", `喂食操作失败: ${error.message}`);
        return { status: 500, msg: "系统繁忙，请稍后重试" };
      }

      await addLog(ctx, "water", `喂食萌宠，它很开心~`);

      // 记录伴侣活动状态
      await recordPartnerActivity(ctx, "feed");

      return { status: 200, msg: "投喂成功" };
    }

    // === Phase 2: 开始记录回忆接口 ===
    case "start_travel": {
      const gardenRes = await db
        .collection("gardens")
        .where({ owners: OPENID })
        .get();
      if (gardenRes.data.length === 0) return { status: 404 };

      const garden = gardenRes.data[0];

      // 校验记录次数是否足够
      if (garden.interaction_count < 30) {
        return { status: 400, msg: "记录次数不足，无法生成回忆录" };
      }
      // 校验是否已经在整理
      if (garden.travel_start_time) {
        return { status: 400, msg: "正在整理回忆中" };
      }

      await db
        .collection("gardens")
        .doc(garden._id)
        .update({
          data: {
            travel_start_time: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        });

      await addLog(ctx, "travel_start", "萌宠出门旅行，去收集美好的纪念啦~");

      // 记录伴侣活动状态
      await recordPartnerActivity(ctx, "travel");

      return { status: 200, msg: "开始旅行" };
    }

    // === Phase 2: 完成回忆录并保存 ===
    case "harvest_garden": {
      const gardenRes = await db
        .collection("gardens")
        .where({ owners: OPENID })
        .get();
      if (gardenRes.data.length > 0) {
        const garden = gardenRes.data[0];

        // 基础校验
        if (garden.interaction_count < 30)
          return { status: 400, msg: "记录数不足" };

        // 校验整理时间
        if (!garden.travel_start_time) {
          // 兼容旧数据：若直接达到30次但没点开始，允许直接完成
          // 此处允许直接收，但在UI层引导去点开始
        } else {
          const now = new Date().getTime();
          const start = new Date(garden.travel_start_time).getTime();
          if ((now - start) / 1000 < TRAVEL_MINUTES * 60) {
            return { status: 400, msg: "还在整理中，请稍候" };
          }
        }

        // 📝 生成纪念页 (随机选择)
        let memorialPage = null;
        if (POSTCARD_POOL.length > 0) {
          // 随机选择一张明信片
          const randomIndex = Math.floor(Math.random() * POSTCARD_POOL.length);
          memorialPage = POSTCARD_POOL[randomIndex];
          // 存入 albums 集合 (需在云数据库创建 'albums' 集合)
          try {
            const albumData = {
              _openid: OPENID,
              owners: garden.owners,
              url: memorialPage.url,
              name: `回忆录第${(garden.harvest_total || 0) + 1}期`,
              createdAt: db.serverDate(),
              id: memorialPage.id, // 添加明信片ID
            };
            console.log("保存相册数据:", albumData);
            await db.collection("albums").add({
              data: albumData,
            });
            console.log("相册保存成功");
          } catch (e) {
            console.error("Save album failed", e);
          }
        }

        // 重置计数
        await db
          .collection("gardens")
          .doc(garden._id)
          .update({
            data: {
              interaction_count: 0,
              travel_start_time: _.remove(), // 清除整理标记
              harvest_total: _.inc(1),
              updatedAt: db.serverDate(),
            },
          });

        const owners = garden.owners || [];
        if (owners.length > 0)
          await db
            .collection("users")
            .where({ _openid: _.in(owners) })
            .update({ data: { rose_balance: _.inc(1) } });

        const logMsg = memorialPage
          ? `旅行归来，带回明信片：【${memorialPage.name}】`
          : `旅行归来，带回珍贵纪念`;
        await addLog(ctx, "harvest", logMsg);

        // 触发彩蛋
        let egg = null;
        if (garden.harvest_total === 0) {
          egg = await tryTriggerEgg(
            ctx,
            "first_memory",
            150,
            "回忆收藏家",
            "完成了第一本回忆录"
          );
          if (egg) {
            await db
              .collection("users")
              .where({ _openid: OPENID })
              .update({ data: { water_count: _.inc(egg.bonus) } });
          }
        }

        return {
          status: 200,
          msg: "保存成功",
          triggerEgg: egg,
          drop: memorialPage,
        };
      }
      return { status: 404 };
    }

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

        // 使用更可靠的时区处理
        const now = new Date();
        const hour = now.getHours(); // getHours() 已经返回本地时间（考虑时区）

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

    // === Phase 3: 获取相册数据 ===
    case "get_albums": {
      try {
        // 直接查询该用户的明信片
        const albumsRes = await db
          .collection("albums")
          .where({ _openid: OPENID })
          .orderBy("createdAt", "desc")
          .get();

        console.log("查询条件:", { _openid: OPENID });
        console.log("查询到的相册数据:", albumsRes.data);

        // 获取明信片URL（处理云存储路径）
        const albums = await Promise.all(albumsRes.data.map(async (item) => {
          try {
            // 如果URL是云存储路径，尝试转换为临时访问URL
            if (item.url && item.url.startsWith("cloud://")) {
              const fileList = [item.url];
              const result = await cloud.getTempFileURL({
                fileList: fileList
              });

              if (result.fileList && result.fileList[0] && result.fileList[0].tempFileURL) {
                return {
                  ...item,
                  url: result.fileList[0].tempFileURL,
                  isCloudPath: true,
                  originalUrl: item.url // 保留原始URL
                };
              }
            }
            return item;
          } catch (urlError) {
            console.error("获取临时URL失败:", urlError, "for item:", item);
            // 返回原始URL，让前端处理
            return {
              ...item,
              urlError: true
            };
          }
        }));

        return {
          status: 200,
          data: albums,
        };
      } catch (error) {
        console.error("获取相册数据失败:", error);
        return {
          status: 500,
          msg: "获取相册数据失败",
          data: []
        };
      }
    }
  }
}

// 计算宠物等级和心情
function calculatePetInfo(garden, CONFIG) {
  const interactionCount = garden.interaction_count || 0;

  // 计算等级
  let level = 1;
  const levelExp = CONFIG.PET_LEVEL_EXP;
  for (let i = levelExp.length - 1; i >= 0; i--) {
    if (interactionCount >= levelExp[i]) {
      level = i + 1;
      break;
    }
  }

  // 获取等级名称
  const levelName = CONFIG.PET_LEVEL_NAMES[level - 1] || '未知';

  // 计算当前等级经验进度
  const currentLevelExp = levelExp[level - 1] || 0;
  const nextLevelExp = levelExp[level] || interactionCount;
  const expProgress = ((interactionCount - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100;

  // 计算心情值（考虑自然衰减）
  let mood = garden.pet_mood || 100;
  if (garden.pet_last_mood_update) {
    const lastUpdate = new Date(garden.pet_last_mood_update);
    const now = new Date();
    const hoursDiff = (now - lastUpdate) / (1000 * 60 * 60);

    // 心情每小时衰减2点
    const decay = Math.floor(hoursDiff * 2);
    mood = Math.max(0, mood - decay);
  }

  // 获取心情状态
  let moodLevel = CONFIG.PET_MOOD_LEVELS[CONFIG.PET_MOOD_LEVELS.length - 1];
  for (let i = 0; i < CONFIG.PET_MOOD_LEVELS.length; i++) {
    if (mood >= CONFIG.PET_MOOD_LEVELS[i].min) {
      moodLevel = CONFIG.PET_MOOD_LEVELS[i];
      break;
    }
  }

  return {
    level: level,
    levelName: levelName,
    exp: interactionCount,
    currentLevelExp: currentLevelExp,
    nextLevelExp: nextLevelExp,
    expProgress: Math.round(expProgress),
    mood: mood,
    moodName: moodLevel.name,
    moodEmoji: moodLevel.emoji
  };
}

// 记录伴侣活动状态
async function recordPartnerActivity(ctx, action) {
  const { OPENID, db } = ctx;

  try {
    // 获取用户信息
    const userRes = await db.collection("users").where({ _openid: OPENID }).get();
    if (userRes.data.length === 0) return;

    const user = userRes.data[0];

    // 获取花园信息，找到伴侣
    const gardenRes = await db.collection("gardens").where({ owners: OPENID }).get();
    if (gardenRes.data.length === 0) return;

    const garden = gardenRes.data[0];
    const partnerId = garden.owners.find(id => id !== OPENID);

    if (!partnerId) return;

    // 记录活动到 partner_activities 集合
    await db.collection("partner_activities").add({
      data: {
        _openid: partnerId, // 记录到伴侣的账户下
        partnerId: OPENID, // 谁触发的活动
        partnerName: user.nickName || "匿名",
        action: action, // 'feed' 或 'travel'
        timestamp: new Date(),
        createdAt: new Date()
      }
    });

    // 清理旧的活动记录（只保留最近的5分钟）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    await db.collection("partner_activities")
      .where({
        _openid: partnerId,
        createdAt: _.lt(fiveMinutesAgo)
      })
      .remove();

  } catch (err) {
    console.error("记录伴侣活动失败:", err);
  }
}

module.exports = { handle };
