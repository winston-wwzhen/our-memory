const { addLog } = require("../utils/logger");
const { checkTextSafety } = require("../utils/safety");

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG } = ctx;

  switch (action) {
    case "make_decision": {
      const { category, result } = event;
      if (category || result) {
        if (!(await checkTextSafety(ctx, `${category} ${result}`)))
          return { status: 403, msg: "决定内容包含敏感词" };
      }
      await addLog(ctx, "decision", `决定${category}：${result}`);
      await db
        .collection("users")
        .where({ _openid: OPENID })
        .update({
          data: { last_decision: { category, result, time: db.serverDate() } },
        });
      return { status: 200, msg: "已生效" };
    }

    case "get_partner_decision": {
      const me = (await db.collection("users").where({ _openid: OPENID }).get())
        .data[0];
      let pd = null;
      if (me.partner_id) {
        const pr = await db
          .collection("users")
          .where({ _openid: me.partner_id })
          .field({ last_decision: true, nickName: true })
          .get();
        if (pr.data.length > 0) {
          pd = pr.data[0].last_decision;
          if (pd) pd.nickName = pr.data[0].nickName;
        }
      }
      return { status: 200, data: pd };
    }

    case "redeem_coupon": {
      const { title, desc, cost, templateId, type } = event;
      if (title || desc) {
        if (!(await checkTextSafety(ctx, `${title} ${desc}`)))
          return { status: 403, msg: "卡券信息包含敏感词" };
      }
      const me = (await db.collection("users").where({ _openid: OPENID }).get())
        .data[0];
      if ((me.rose_balance || 0) < cost)
        return { status: 400, msg: "玫瑰不足" };

      await db
        .collection("users")
        .doc(me._id)
        .update({ data: { rose_balance: _.inc(-cost) } });
      await db.collection("coupons").add({
        data: {
          _openid: OPENID,
          templateId,
          title,
          desc,
          type,
          cost,
          status: 0,
          createdAt: db.serverDate(),
        },
      });
      await addLog(ctx, "redeem", `兑换${title}`);
      return { status: 200, msg: "兑换成功" };
    }

    case "get_my_coupons": {
      const res = await db
        .collection("coupons")
        .where({ _openid: OPENID })
        .orderBy("createdAt", "desc")
        .get();
      return { status: 200, data: res.data };
    }

    case "get_love_list_status": {
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      if (userRes.data.length === 0) return { status: 404 };
      return {
        status: 200,
        finishedList: userRes.data[0].finished_love_list || [],
      };
    }

    case "toggle_love_list_item": {
      const { itemId } = event;
      if (!itemId) return { status: 400 };
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];
      const list = me.finished_love_list || [];
      let newList = [];
      let isFinished = false;

      if (list.includes(itemId)) {
        newList = list.filter((id) => id !== itemId);
      } else {
        newList = [...list, itemId];
        isFinished = true;
        await db
          .collection("users")
          .doc(me._id)
          .update({ data: { water_count: _.inc(5) } });
        await addLog(ctx, "love_list", `打卡了恋爱清单 No.${itemId}`);
      }
      await db
        .collection("users")
        .doc(me._id)
        .update({ data: { finished_love_list: newList } });
      return {
        status: 200,
        isFinished,
        msg: isFinished ? "打卡成功 +5g爱意" : "已取消打卡",
      };
    }
  }
}

module.exports = { handle };
