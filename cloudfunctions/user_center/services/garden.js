const { getTodayStr } = require("../utils/common");
const { addLog } = require("../utils/logger");
const { checkImageSafety } = require("../utils/safety");

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG } = ctx;
  const todayStr = getTodayStr();

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
        if (partnerId && !myGarden.owners.includes(partnerId))
          await db
            .collection("gardens")
            .doc(myGarden._id)
            .update({ data: { owners: _.addToSet(partnerId) } });
        if (!myGarden.owners.includes(OPENID))
          await db
            .collection("gardens")
            .doc(myGarden._id)
            .update({ data: { owners: _.addToSet(OPENID) } });

        if (myGarden.rose_balance > 0) {
          await db
            .collection("users")
            .doc(me._id)
            .update({ data: { rose_balance: _.inc(myGarden.rose_balance) } });
          await db
            .collection("gardens")
            .doc(myGarden._id)
            .update({ data: { rose_balance: 0 } });
        }
      } else {
        let owners = [OPENID];
        if (partnerId) owners.push(partnerId);
        const newGarden = {
          owners,
          level: 1,
          growth_value: 0,
          harvest_count: 0,
          harvest_total: 0,
          updatedAt: db.serverDate(),
        };
        await db.collection("gardens").add({ data: newGarden });
        myGarden = newGarden;
      }

      myGarden.rose_balance = me.rose_balance || 0;
      let recentLogs = [];
      try {
        const owners = myGarden.owners || [OPENID];
        const logsRes = await db
          .collection("logs")
          .where({ type: "water", _openid: _.in(owners) })
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
        garden: myGarden,
        water: me.water_count || 0,
        logs: recentLogs,
      };
    }

    case "water_flower": {
      const { WATER_COST, WATER_GROWTH } = CONFIG;
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];
      if ((me.water_count || 0) < WATER_COST)
        return { status: 400, msg: "爱意不足" };

      await db
        .collection("users")
        .doc(me._id)
        .update({ data: { water_count: _.inc(-WATER_COST) } });
      const gardenRes = await db
        .collection("gardens")
        .where({ owners: OPENID })
        .get();
      if (gardenRes.data.length > 0) {
        await db
          .collection("gardens")
          .doc(gardenRes.data[0]._id)
          .update({
            data: {
              growth_value: _.inc(WATER_GROWTH),
              updatedAt: db.serverDate(),
            },
          });
        await addLog(ctx, "water", `注入${WATER_COST}g爱意`);
        return { status: 200, msg: "注入成功" };
      }
      return { status: 404 };
    }

    case "harvest_garden": {
      const gardenRes = await db
        .collection("gardens")
        .where({ owners: OPENID })
        .get();
      if (gardenRes.data.length > 0) {
        const garden = gardenRes.data[0];
        if (garden.growth_value < CONFIG.HARVEST_MIN_GROWTH)
          return { status: 400, msg: "未盛开" };

        await db
          .collection("gardens")
          .doc(garden._id)
          .update({
            data: {
              growth_value: 0,
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
        await addLog(ctx, "harvest", `收获第${garden.harvest_total + 1}朵玫瑰`);
        return { status: 200, msg: "收获成功" };
      }
      return { status: 404 };
    }

    case "check_in": {
      const { imageFileID, style } = event;
      if (!imageFileID) return { status: 400 };
      // 图片安全检查，暂时不开启
      // const safetyRes = await checkImageSafety(ctx, imageFileID);
      // if (!safetyRes.pass) {
        // 返回具体的错误信息（是违规还是太大）
        // return { status: 403, msg: safetyRes.msg || "图片校验未通过" };
      // }

      const oldLog = await db
        .collection("logs")
        .where({
          _openid: OPENID,
          originalDate: todayStr,
          type: "daily_check_in",
        })
        .get();
      if (oldLog.data.length > 0) {
        await db
          .collection("logs")
          .doc(oldLog.data[0]._id)
          .update({
            data: {
              imageFileID,
              updatedAt: db.serverDate(),
              style: style || "Sweet",
            },
          });
        return { status: 200, msg: "更新成功" };
      } else {
        await db.collection("logs").add({
          data: {
            _openid: OPENID,
            type: "daily_check_in",
            content: "打卡",
            imageFileID,
            originalDate: todayStr,
            createdAt: db.serverDate(),
            style,
          },
        });
        await db
          .collection("users")
          .where({ _openid: OPENID })
          .update({ data: { water_count: _.inc(CONFIG.CHECKIN_REWARD) } });
        return { status: 200, msg: "打卡成功" };
      }
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

module.exports = { handle };
