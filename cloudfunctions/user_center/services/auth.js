// cloudfunctions/user_center/services/auth.js
const { getTodayStr, getRandomName } = require("../utils/common");
const { getSudoUsers } = require("../utils/config");
const { addLog } = require("../utils/logger");
const { checkTextSafety, checkImageSafety } = require("../utils/safety");

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG } = ctx;
  const SUDO_USERS = await getSudoUsers(db);
  const todayStr = getTodayStr();

  // 辅助函数：检查是否处于解绑冷静期
  const checkCooldown = (user) => {
    if (
      user.unbind_cooldown_until &&
      new Date(user.unbind_cooldown_until) > new Date()
    ) {
      const date = new Date(user.unbind_cooldown_until);
      return `解绑冷静期中，${
        date.getMonth() + 1
      }月${date.getDate()}日后方可绑定`;
    }
    return null;
  };

  switch (action) {
    case "login": {
      const { userInfo } = event;
      let currentUser = null,
        loginBonus = 0,
        registerDays = 1;

      const res = await db.collection("users").where({ _openid: OPENID }).get();

      if (res.data.length > 0) {
        currentUser = res.data[0];
        if (currentUser.last_login_date !== todayStr) {
          loginBonus = CONFIG.DAILY_LOGIN_BONUS;
          const resetUsage = {
            date: todayStr,
            count: 0,
            ad_count: 0,
            msg_count: 0,
          };
          await db
            .collection("users")
            .doc(currentUser._id)
            .update({
              data: {
                water_count: _.inc(loginBonus),
                last_login_date: todayStr,
                daily_usage: resetUsage,
              },
            });
          currentUser.water_count = (currentUser.water_count || 0) + loginBonus;
          currentUser.daily_usage = resetUsage;
        }
        if (currentUser.createdAt) {
          registerDays =
            Math.ceil(
              Math.abs(new Date() - new Date(currentUser.createdAt)) /
                (1000 * 60 * 60 * 24)
            ) || 1;
        }
      } else {
        const newUser = {
          _openid: OPENID,
          nickName: userInfo?.nickName || getRandomName(),
          avatarUrl: userInfo?.avatarUrl || "",
          partner_id: null,
          bind_request_from: null,
          water_count: CONFIG.DAILY_LOGIN_BONUS,
          rose_balance: 0,
          last_login_date: todayStr,
          createdAt: db.serverDate(),
          daily_usage: { date: todayStr, count: 0, ad_count: 0, msg_count: 0 },
          capsule_limit: CONFIG.DEFAULT_CAPSULE_LIMIT,
        };

        const addRes = await db.collection("users").add({ data: newUser });
        currentUser = { ...newUser, _id: addRes._id };
        loginBonus = CONFIG.DAILY_LOGIN_BONUS;
        registerDays = 1;
        await addLog(ctx, "register", "开启了我们的纪念册");
      }

      const isPermanentVip = SUDO_USERS.includes(OPENID);
      const isTrialVip =
        currentUser.vip_expire_date &&
        new Date(currentUser.vip_expire_date) > new Date();
      const isVip = isPermanentVip || isTrialVip;

      let currentLimit = isPermanentVip
        ? 9999
        : isVip
        ? registerDays <= 1
          ? CONFIG.REG_DAY_LIMIT
          : CONFIG.VIP_DAILY_LIMIT
        : CONFIG.NORMAL_FREE_LIMIT;

      const stats = currentUser.daily_usage || {};
      const remaining = Math.max(
        0,
        currentLimit + (stats.ad_count || 0) - (stats.count || 0)
      );

      let partnerInfo = null;
      if (currentUser.partner_id) {
        const partnerRes = await db
          .collection("users")
          .where({ _openid: currentUser.partner_id })
          .field({ nickName: true, avatarUrl: true, _openid: true })
          .get();
        if (partnerRes.data.length > 0) partnerInfo = partnerRes.data[0];
      }

      // ✨ 新增彩蛋逻辑：♾️ 长长久久 (关联 99 天)
      let triggerEgg = null;
      if (currentUser.anniversaryDate) {
        const start = new Date(currentUser.anniversaryDate).getTime();
        const now = new Date().getTime();
        const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));

        if (days >= 99) {
          const { tryTriggerEgg } = require("../utils/eggs");
          const egg = await tryTriggerEgg(
            ctx,
            "long_love",
            520,
            "长长久久",
            "相爱天数达到99天"
          );
          if (egg) {
            await db
              .collection("users")
              .doc(currentUser._id)
              .update({ data: { water_count: _.inc(egg.bonus) } });
            triggerEgg = egg;
          }
        }
      }

      return {
        status: 200,
        user: currentUser,
        partner: partnerInfo,
        loginBonus,
        isVip,
        vipExpireDate: isTrialVip ? currentUser.vip_expire_date : null,
        registerDays,
        remaining,
        dailyFreeLimit: currentLimit,
        adCount: stats.ad_count || 0,
        dailyAdLimit: CONFIG.DAILY_AD_LIMIT,
        triggerEgg,
      };
    }

    case "request_bind": {
      const { partnerCode } = event;
      if (!partnerCode || partnerCode === OPENID)
        return { status: 400, msg: "编号无效" };

      // 🟢 检查自己是否在冷静期
      const meRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      if (meRes.data.length > 0) {
        const cooldownMsg = checkCooldown(meRes.data[0]);
        if (cooldownMsg) return { status: 403, msg: cooldownMsg };
      }

      const pr = await db
        .collection("users")
        .where({ _openid: partnerCode })
        .get();
      if (pr.data.length === 0) return { status: 404 };
      if (pr.data[0].partner_id) return { status: 403, msg: "对方已绑定伴侣" };

      // 🟢 检查对方是否在冷静期
      const pCooldownMsg = checkCooldown(pr.data[0]);
      if (pCooldownMsg) return { status: 403, msg: "对方处于解绑冷静期" };

      await db
        .collection("users")
        .where({ _openid: partnerCode })
        .update({ data: { bind_request_from: OPENID } });
      return { status: 200, msg: "请求已发送" };
    }

    case "respond_bind": {
      const { decision, partnerCode } = event;
      if (!partnerCode) return { status: 400 };

      if (decision === "reject") {
        await db
          .collection("users")
          .where({ _openid: OPENID })
          .update({ data: { bind_request_from: null } });
        return { status: 200, msg: "已拒绝" };
      }

      if (decision === "accept") {
        // 🟢 双重检查冷静期 (防止请求发送后进入冷静期)
        const meRes = await db
          .collection("users")
          .where({ _openid: OPENID })
          .get();
        const pRes = await db
          .collection("users")
          .where({ _openid: partnerCode })
          .get();

        if (meRes.data.length > 0) {
          const msg = checkCooldown(meRes.data[0]);
          if (msg) return { status: 403, msg: msg };
        }
        if (pRes.data.length === 0) return { status: 404, msg: "对方不存在" };
        const pMsg = checkCooldown(pRes.data[0]);
        if (pMsg) return { status: 403, msg: "对方处于解绑冷静期" };

        const vipExpire = new Date();
        vipExpire.setDate(vipExpire.getDate() + CONFIG.VIP_TRIAL_DAYS);
        const vipUpdate = {
          vip_expire_date: vipExpire,
        };

        const resA = await db
          .collection("users")
          .where({ _openid: OPENID, partner_id: null })
          .update({
            data: {
              partner_id: partnerCode,
              bind_request_from: null,
              ...vipUpdate,
            },
          });

        if (resA.stats.updated === 0) {
          return { status: 403, msg: "操作失败：你当前已绑定伴侣" };
        }

        const resB = await db
          .collection("users")
          .where({ _openid: partnerCode, partner_id: null })
          .update({
            data: {
              partner_id: OPENID,
              bind_request_from: null,
              bind_notification: true,
              ...vipUpdate,
            },
          });

        if (resB.stats.updated === 0) {
          await db
            .collection("users")
            .where({ _openid: OPENID })
            .update({
              data: { partner_id: null },
            });
          return { status: 403, msg: "绑定失败：对方已绑定伴侣" };
        }

        await addLog(ctx, "bind", "绑定成功");
        return { status: 200, msg: "绑定成功" };
      }
      break;
    }

    case "update_profile": {
      const { nickName, avatarUrl } = event;
      if (nickName) {
        if (!(await checkTextSafety(ctx, nickName)))
          return { status: 403, msg: "昵称包含敏感内容" };
      }
      if (avatarUrl && avatarUrl.startsWith("cloud://")) {
        if (!(await checkImageSafety(ctx, avatarUrl)))
          return { status: 403, msg: "头像图片包含敏感内容" };
      }
      await db
        .collection("users")
        .where({ _openid: OPENID })
        .update({ data: { avatarUrl, nickName } });
      return { status: 200, msg: "OK" };
    }

    case "update_anniversary": {
      const { date } = event;
      const me = (await db.collection("users").where({ _openid: OPENID }).get())
        .data[0];
      const data = {
        anniversaryDate: date,
        anniversaryModifier: me.nickName,
        anniversaryUpdatedAt: db.serverDate(),
      };
      await db.collection("users").doc(me._id).update({ data });
      if (me.partner_id)
        await db
          .collection("users")
          .where({ _openid: me.partner_id })
          .update({ data });
      await addLog(ctx, "update_anniversary", `修改纪念日${date}`);
      return { status: 200, msg: "已更新" };
    }

    case "unbind": {
      const myRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      if (myRes.data.length === 0) return { status: 404 };
      const me = myRes.data[0];
      const pid = me.partner_id;

      // 🟢 1. 计算 7 天后的冷却时间
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() + 7);

      // 🟢 2. 准备更新数据：清除 partner_id，设置冷却期
      let updateDataMe = {
        partner_id: null,
        unbind_cooldown_until: cooldownDate,
      };
      let updateDataPartner = {
        partner_id: null,
        unbind_cooldown_until: cooldownDate,
      };

      // 🟢 3. 检查并清除 VIP (如果处于试用期，即有过期时间且未过期)
      // 注意：这里简单判定只要有过期时间就清除。如果是手动充值的 VIP，这里也会被清除。
      // 如果要保留手动充值的，需要额外字段区分。鉴于需求是“解绑后VIP失效”，这里统一清除。
      const now = new Date();
      if (me.vip_expire_date && new Date(me.vip_expire_date) > now) {
        updateDataMe.vip_expire_date = null;
      }

      await db.collection("users").doc(me._id).update({ data: updateDataMe });

      if (pid) {
        const pRes = await db.collection("users").where({ _openid: pid }).get();
        if (pRes.data.length > 0) {
          const p = pRes.data[0];
          if (p.vip_expire_date && new Date(p.vip_expire_date) > now) {
            updateDataPartner.vip_expire_date = null;
          }
          await db
            .collection("users")
            .doc(p._id)
            .update({ data: updateDataPartner });
        }
      }

      await addLog(ctx, "unbind", "解除关联");
      return { status: 200, msg: "已解除" };
    }

    case "clear_bind_notification": {
      await db
        .collection("users")
        .where({ _openid: OPENID })
        .update({ data: { bind_notification: false } });
      return { status: 200 };
    }

    case "update_status": {
      const { statusText, statusIcon } = event;
      if (statusText && !(await checkTextSafety(ctx, statusText)))
        return { status: 403, msg: "状态包含敏感词" };
      await db
        .collection("users")
        .where({ _openid: OPENID })
        .update({
          data: {
            status: {
              icon: statusIcon,
              text: statusText,
              updatedAt: db.serverDate(),
            },
          },
        });
      await addLog(ctx, "update_status", `状态:${statusIcon}`);
      return { status: 200, msg: "已同步" };
    }

    // 管理员充值逻辑 (保留)
    case "admin_grant_vip": {
      if (!SUDO_USERS.includes(OPENID)) {
        return { status: 403, msg: "无权操作" };
      }
      const { targetOpenId, days } = event;
      if (!targetOpenId || !days) {
        return { status: 400, msg: "参数缺失" };
      }
      const targetUserRes = await db
        .collection("users")
        .where({ _openid: targetOpenId })
        .get();
      if (targetUserRes.data.length === 0) {
        return { status: 404, msg: "未找到该用户 ID" };
      }
      const targetUser = targetUserRes.data[0];
      let newExpire = new Date();
      if (
        targetUser.vip_expire_date &&
        new Date(targetUser.vip_expire_date) > new Date()
      ) {
        newExpire = new Date(targetUser.vip_expire_date);
      }
      newExpire.setDate(newExpire.getDate() + parseInt(days));
      await db
        .collection("users")
        .doc(targetUser._id)
        .update({
          data: { vip_expire_date: newExpire },
        });
      const dateStr = newExpire.toISOString().split("T")[0];
      await addLog(ctx, "admin_vip", `管理员充值 ${days} 天`);
      return { status: 200, msg: `充值成功！有效期至: ${dateStr}` };
    }
  }
}

module.exports = { handle };
