const { getTodayStr } = require("../utils/common");
const { addLog } = require("../utils/logger");
const { checkTextSafety } = require("../utils/safety");
const { tryTriggerEgg } = require("../utils/eggs");

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG } = ctx;
  const todayStr = getTodayStr();

  switch (action) {
    case "post_message": {
      const { content, color, type } = event;
      if (!content || content.length > 20)
        return { status: 400, msg: "内容无效或过长" };
      if (!(await checkTextSafety(ctx, content)))
        return { status: 403, msg: "包含敏感内容" };

      const me = (await db.collection("users").where({ _openid: OPENID }).get())
        .data[0];
      let usage = me.daily_usage || { date: todayStr, msg_count: 0 };
      if (usage.date !== todayStr) usage = { date: todayStr, msg_count: 0 };
      if ((usage.msg_count || 0) >= CONFIG.DAILY_MSG_LIMIT)
        return { status: 403, msg: "次数用尽" };

      const rot = Math.floor(Math.random() * 10) - 5;
      await db.collection("messages").add({
        data: {
          _openid: OPENID,
          content,
          color: color || "yellow",
          type: type || "text",
          rotate: rot,
          createdAt: db.serverDate(),
          dateStr: todayStr,
          isLiked: false,
        },
      });
      await addLog(ctx, "post_message", `便签:${content}`, { color });

      let rw = 5,
        msg = "已贴上墙",
        egg = null;
      const lucky = await tryTriggerEgg(
        ctx,
        "lucky_goddess",
        20,
        "幸运女神",
        "偶遇幸运女神",
        true,
        0.1
      );
      if (lucky) {
        rw += lucky.bonus;
        msg = "✨ 幸运女神降临！";
        egg = lucky;
      }

      await db
        .collection("users")
        .doc(me._id)
        .update({
          data: {
            water_count: _.inc(rw),
            daily_usage: {
              date: todayStr,
              count: usage.count || 0,
              ad_count: usage.ad_count || 0,
              msg_count: (usage.msg_count || 0) + 1,
            },
          },
        });
      return { status: 200, msg, triggerEgg: egg };
    }

    case "delete_message": {
      const { id } = event;
      try {
        const m = await db.collection("messages").doc(id).get();
        let c = m.data ? m.data.content || "" : "";
        await db.collection("messages").doc(id).remove();
        await addLog(ctx, "delete_message", `撕掉:${c}`);
        return { status: 200, msg: "已撕掉" };
      } catch (e) {
        return { status: 500 };
      }
    }

    case "like_message": {
      const { id } = event;
      try {
        const m = await db.collection("messages").doc(id).get();
        if (m.data._openid === OPENID) return { status: 403 };
        const s = !m.data.isLiked;
        await db
          .collection("messages")
          .doc(id)
          .update({ data: { isLiked: s } });
        return { status: 200, msg: s ? "已盖章" : "取消" };
      } catch (e) {
        return { status: 500 };
      }
    }

    case "get_messages": {
      const { queryDate } = event;
      const me = (await db.collection("users").where({ _openid: OPENID }).get())
        .data[0];
      const pid = me.partner_id;
      let usage = me.daily_usage || { date: todayStr };
      if (usage.date !== todayStr) usage = { date: todayStr };
      const remain = Math.max(
        0,
        CONFIG.DAILY_MSG_LIMIT - (usage.msg_count || 0)
      );

      const q = [OPENID];
      if (pid) q.push(pid);
      const targetDate = queryDate || todayStr;
      const msgs = await db
        .collection("messages")
        .where({ _openid: _.in(q), dateStr: targetDate })
        .orderBy("createdAt", "desc") // 🟢 修改点：asc -> desc (倒序)
        .get();

      const nameMap = { [OPENID]: me.nickName || "我" };
      let pStatus = null;
      if (pid) {
        const pr = await db
          .collection("users")
          .where({ _openid: pid })
          .field({ status: true, nickName: true })
          .get();
        if (pr.data.length > 0) {
          pStatus = pr.data[0].status || { text: "发呆", icon: "😶" };
          nameMap[pid] = pr.data[0].nickName || "TA";
        }
      }
      const enriched = msgs.data.map((m) => ({
        ...m,
        nickName: nameMap[m._openid] || "神秘人",
        isMine: m._openid === OPENID,
      }));
      return {
        status: 200,
        data: enriched,
        myStatus: me.status || { text: "摸鱼", icon: "🐟" },
        partnerStatus: pStatus,
        remainingMsgCount: remain,
      };
    }
  }
}

module.exports = { handle };
