const { addLog } = require("../utils/logger");
const { checkTextSafety } = require("../utils/safety");

// 🔒 安全配置：后端硬编码卡券价格，防止前端篡改
// 也可以选择从数据库 static_content 集合读取，这里为了性能直接配置
const COUPON_TEMPLATES = {
  massage: { cost: 10, title: "💆‍♂️ 揉肩卡", type: "service" },
  tea: { cost: 15, title: "🥤 投喂卡", type: "food" },
  errand: { cost: 10, title: "💨 召唤卡", type: "service" },
  dish: { cost: 30, title: "🍽️ 免洗金牌", type: "labor" },
  clean: { cost: 40, title: "🧹 清洁卡", type: "labor" },
  game: { cost: 50, title: "🎮 开黑卡", type: "play" },
  forgive: { cost: 99, title: "🤝 和好卡", type: "special" },
  shut: { cost: 80, title: "🤐 静音卡", type: "special" },
  wish: { cost: 200, title: "🧞‍♂️ 许愿卡", type: "special" },
};

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG } = ctx;

  switch (action) {
    // === 互动部分 (保持不变) ===
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
      // ✨ 新增彩蛋逻辑：🎲 命运主宰 (累计20次)
      // 我们通过统计 logs 表中 type='decision' 的记录数来判断
      const countRes = await db
        .collection("logs")
        .where({ _openid: OPENID, type: "decision" })
        .count();
      let egg = null;

      // 注意：这里 count 已经是包含本次的了（因为 addLog 在前）
      if (countRes.total === 20) {
        egg = await tryTriggerEgg(
          ctx,
          "decision_king",
          88,
          "命运主宰",
          "累计使用20次转盘"
        );
        if (egg) {
          await db
            .collection("users")
            .where({ _openid: OPENID })
            .update({ data: { water_count: _.inc(egg.bonus) } });
        }
      }

      return { status: 200, msg: "已生效", triggerEgg: egg };
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

    // === 🟢 修复核心：特权工坊 ===
    case "redeem_coupon": {
      const { templateId } = event; // 只接收 ID，忽略前端传的 cost/title

      // 1. 校验模版有效性
      const template = COUPON_TEMPLATES[templateId];
      if (!template) return { status: 400, msg: "无效的卡券类型" };

      const cost = template.cost;
      const title = template.title;

      // 2. 原子操作扣费 (解决并发负余额问题)
      // 只有当 rose_balance >= cost 时才执行 update
      const userRes = await db
        .collection("users")
        .where({
          _openid: OPENID,
          rose_balance: _.gte(cost),
        })
        .update({
          data: { rose_balance: _.inc(-cost) },
        });

      // stats.updated 为 0 说明条件不满足（余额不足）
      if (userRes.stats.updated === 0) {
        return { status: 400, msg: "玫瑰不足" };
      }

      // 3. 扣费成功后，发放卡券
      await db.collection("coupons").add({
        data: {
          _openid: OPENID,
          templateId,
          title,
          desc: event.desc || template.title, // 描述可以允许前端传，或者也读配置
          type: template.type,
          cost,
          status: 0, // 0:未使用
          createdAt: db.serverDate(),
        },
      });

      await addLog(ctx, "redeem", `兑换${title}`);
      let egg = null;
      // ✨ 新增彩蛋逻辑 1: 💰 挥金如土 (单次消费 > 100)
      if (cost > 100) {
        const eRich = await tryTriggerEgg(
          ctx,
          "rich_spender",
          188,
          "挥金如土",
          "兑换了昂贵的特权券"
        );
        if (eRich) {
          egg = eRich;
          await addWater(eRich.bonus);
        }
      }

      // ✨ 新增彩蛋逻辑 2: 🕊️ 和平鸽 (兑换和好卡/原谅卡)
      // 检查 templateId 是否包含 forgive 或 peace 相关字眼，或者直接检查 ID
      if (templateId === "forgive") {
        const ePeace = await tryTriggerEgg(
          ctx,
          "peace_dove",
          500,
          "和平鸽",
          "退一步海阔天空"
        );
        if (ePeace) {
          egg = ePeace;
          await addWater(ePeace.bonus);
        }
      }

      // 辅助函数：加水 (定义在函数内部即可)
      async function addWater(bonus) {
        await db
          .collection("users")
          .where({ _openid: OPENID })
          .update({ data: { water_count: _.inc(bonus) } });
      }

      return { status: 200, msg: "兑换成功", triggerEgg: egg };
    }

    case "get_my_coupons": {
      // 4. 性能修复：增加分页支持
      const { page = 0, pageSize = 20 } = event;

      const res = await db
        .collection("coupons")
        .where({ _openid: OPENID })
        .orderBy("createdAt", "desc")
        .skip(page * pageSize)
        .limit(pageSize)
        .get();

      return { status: 200, data: res.data };
    }

    case "use_coupon": {
      const { id } = event;
      if (!id) return { status: 400, msg: "缺少卡券 ID" };

      // 5. 逻辑修复：乐观锁核销
      // 确保只有当 status 为 0 (未使用) 时才能更新为 2 (已使用)
      const updateRes = await db
        .collection("coupons")
        .where({
          _id: id,
          _openid: OPENID, // 确保是自己的
          status: 0,
        })
        .update({
          data: {
            status: 2,
            usedAt: db.serverDate(),
          },
        });

      if (updateRes.stats.updated === 0) {
        return { status: 403, msg: "操作失败：卡券已被使用或不存在" };
      }

      // 获取一下卡券信息用于写日志（可选）
      const coupon = (await db.collection("coupons").doc(id).get()).data;
      await addLog(
        ctx,
        "use_coupon",
        `使用卡券: ${coupon ? coupon.title : "未知卡券"}`
      );

      return { status: 200, msg: "卡券核销成功！" };
    }

    // === 恋爱清单 (保持不变) ===
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
