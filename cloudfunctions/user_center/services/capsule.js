const { getTodayStr } = require("../utils/common");
const { addLog } = require("../utils/logger");
const { checkTextSafety, checkImageSafety } = require("../utils/safety");
const { tryTriggerEgg } = require("../utils/eggs");

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG } = ctx;
  const todayStr = getTodayStr();

  switch (action) {
    case "bury_capsule": {
      const { content, imageFileID, openDate } = event;
      if (!content && !imageFileID) return { status: 400 };
      if (!openDate || new Date(openDate) <= new Date(todayStr))
        return { status: 400 };

      if (content && !(await checkTextSafety(ctx, content)))
        return { status: 403, msg: "内容含敏感词" };
      if (imageFileID && !(await checkImageSafety(ctx, imageFileID)))
        return { status: 403, msg: "图片含敏感内容" };

      const me = (await db.collection("users").where({ _openid: OPENID }).get())
        .data[0];
      if (!me.partner_id) return { status: 403 };

      const limit = me.capsule_limit || CONFIG.DEFAULT_CAPSULE_LIMIT;
      const cnt = (
        await db.collection("capsules").where({ _openid: OPENID }).count()
      ).total;
      if (cnt >= limit) return { status: 403, code: "LIMIT_EXCEEDED" };

      await db.collection("capsules").add({
        data: {
          _openid: OPENID,
          to_openid: me.partner_id,
          content: content || "",
          imageFileID: imageFileID || "",
          openDate,
          createDate: todayStr,
          createdAt: db.serverDate(),
          status: 0,
        },
      });

      await addLog(ctx, "bury_capsule", content ? "埋下文字" : "埋下图片", {
        openDate,
      });
      await db
        .collection("users")
        .doc(me._id)
        .update({ data: { water_count: _.inc(10) } });

      let egg = null;
      const h = (new Date().getHours() + 8) % 24;
      if (h >= 0 && h < 4) {
        egg = await tryTriggerEgg(
          ctx,
          "moonlight_box",
          66,
          "月光宝盒",
          "深夜埋藏秘密"
        );
        if (egg)
          await db
            .collection("users")
            .doc(me._id)
            .update({ data: { water_count: _.inc(egg.bonus) } });
      }
      const days = Math.ceil(
        Math.abs(new Date(openDate) - new Date(todayStr)) /
          (1000 * 60 * 60 * 24)
      );
      if (days >= 365) {
        const e2 = await tryTriggerEgg(
          ctx,
          "time_traveler",
          365,
          "时间领主",
          "埋下1年契约"
        );
        if (e2) {
          egg = e2;
          await db
            .collection("users")
            .doc(me._id)
            .update({ data: { water_count: _.inc(e2.bonus) } });
        }
      }
      return { status: 200, msg: "已埋下", triggerEgg: egg };
    }

    case "get_capsules": {
      const me = (await db.collection("users").where({ _openid: OPENID }).get())
        .data[0];
      const inbox = (
        await db
          .collection("capsules")
          .where({ to_openid: OPENID })
          .orderBy("openDate", "asc")
          .get()
      ).data;
      const sent = (
        await db
          .collection("capsules")
          .where({ _openid: OPENID })
          .orderBy("createDate", "desc")
          .get()
      ).data;

      const proc = (i, isInbox) => {
        const ok = i.openDate <= todayStr;
        const sec = isInbox && i.status === 0;
        return {
          _id: i._id,
          openDate: i.openDate,
          createDate: i.createDate,
          status: i.status,
          content: sec ? "???" : i.content,
          imageFileID: sec ? "" : i.imageFileID,
          isLocked: !ok && i.status === 0,
          canOpen: ok && i.status === 0,
          isOpened: i.status === 1,
        };
      };
      return {
        status: 200,
        inbox: inbox.map((i) => proc(i, true)),
        sent: sent.map((i) => proc(i, false)),
        limit: me.capsule_limit || CONFIG.DEFAULT_CAPSULE_LIMIT,
        usage: sent.length,
      };
    }

    case "open_capsule": {
      const { capsuleId } = event;
      const cap = (await db.collection("capsules").doc(capsuleId).get()).data;
      if (cap.to_openid !== OPENID || cap.openDate > todayStr)
        return { status: 403 };
      if (cap.status === 1) return { status: 200, data: cap };

      await db
        .collection("capsules")
        .doc(capsuleId)
        .update({ data: { status: 1 } });
      await addLog(ctx, "open_capsule", "开启胶囊");

      let egg = null;
      if (
        (
          await db
            .collection("capsules")
            .where({ to_openid: OPENID, status: 1 })
            .count()
        ).total === 1
      ) {
        egg = await tryTriggerEgg(
          ctx,
          "worth_the_wait",
          100,
          "守得云开",
          "开启第一个胶囊"
        );
        if (egg)
          await db
            .collection("users")
            .where({ _openid: OPENID })
            .update({ data: { water_count: _.inc(egg.bonus) } });
      }
      return { status: 200, data: cap, msg: "开启成功", triggerEgg: egg };
    }
  }
}

module.exports = { handle };
