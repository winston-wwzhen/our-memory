// cloudfunctions/user_center/services/auth.js
const { getTodayStr, getRandomName } = require("../utils/common");
const { getSudoUsers } = require("../utils/config");
const { addLog } = require("../utils/logger");
const { checkTextSafety, checkImageSafety } = require("../utils/safety");
const { tryTriggerEgg } = require("../utils/eggs"); // 🟢 [引入] 确保引入彩蛋工具

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG } = ctx;
  const SUDO_USERS = await getSudoUsers(db);
  const todayStr = getTodayStr();

  // ... (checkCooldown 函数保持不变) ...
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
      const { userInfo, inviteCode } = event; // 🟢 接收 inviteCode
      let currentUser = null,
        loginBonus = 0,
        registerDays = 1;

      const res = await db.collection("users").where({ _openid: OPENID }).get();

      if (res.data.length > 0) {
        // === 老用户逻辑 ===
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
        // === 🟢 新用户注册逻辑 (包含拉新处理) ===
        let inviterId = null;
        // 简单校验：不能邀请自己
        if (inviteCode && inviteCode !== OPENID) {
          // 校验邀请人是否存在
          const inviterCheck = await db
            .collection("users")
            .where({ _openid: inviteCode })
            .count();
          if (inviterCheck.total > 0) {
            inviterId = inviteCode;
          }
        }

        const newUser = {
          _openid: OPENID,
          nickName: userInfo?.nickName || getRandomName(),
          avatarUrl: userInfo?.avatarUrl || "",
          partner_id: null,
          bind_request_from: null,
          // 受邀奖励：初始水滴 +200 (默认50 + 额外150)
          water_count: CONFIG.DAILY_LOGIN_BONUS + (inviterId ? 150 : 0),

          rose_balance: 0,
          last_login_date: todayStr,
          createdAt: db.serverDate(),
          daily_usage: { date: todayStr, count: 0, ad_count: 0, msg_count: 0 },
          capsule_limit: CONFIG.DEFAULT_CAPSULE_LIMIT,

          // 🟢 新增字段
          extra_quota: 5, // 永久额外生图额度
          unclaimed_rewards: { water: 0, quota: 0 }, // 待领取的奖励箱
          invite_count: 0, // 累计邀请人数
          invited_by: inviterId, // 记录邀请人

          // 受邀奖励：赠送 1 天体验 VIP
          vip_expire_date: inviterId
            ? new Date(Date.now() + 24 * 60 * 60 * 1000)
            : null,
        };

        const addRes = await db.collection("users").add({ data: newUser });
        currentUser = { ...newUser, _id: addRes._id };
        loginBonus = CONFIG.DAILY_LOGIN_BONUS;
        registerDays = 1;
        await addLog(
          ctx,
          "register",
          inviterId ? `受邀注册(by ${inviterId})` : "开启了我们的纪念册"
        );

        // 🟢 处理邀请人奖励 (异步处理，不阻塞注册)
        if (inviterId) {
          try {
            await db
              .collection("users")
              .where({ _openid: inviterId })
              .update({
                data: {
                  invite_count: _.inc(1),
                  // 写入待领取奖励：100水滴 + 2次永久额度
                  "unclaimed_rewards.water": _.inc(100),
                  "unclaimed_rewards.quota": _.inc(2),
                },
              });
            await addLog(ctx, "invite_success", `邀请新用户成功`, {
              inviter: inviterId,
              new_user: OPENID,
            });
          } catch (e) {
            console.error("更新邀请人奖励失败", e);
          }
        }
      }

      const isPermanentVip = SUDO_USERS.includes(OPENID);
      const isTrialVip =
        currentUser.vip_expire_date &&
        new Date(currentUser.vip_expire_date) > new Date();
      const isVip = isPermanentVip || isTrialVip;

      let currentLimit = isPermanentVip
        ? 9999
        : isVip
        ? CONFIG.VIP_DAILY_LIMIT
        : CONFIG.NORMAL_FREE_LIMIT;

      const stats = currentUser.daily_usage || {};

      // 🟢 [修改] 剩余次数显示：今日剩余 + 永久剩余
      const dailyRemaining = Math.max(
        0,
        currentLimit + (stats.ad_count || 0) - (stats.count || 0)
      );
      const extraRemaining = currentUser.extra_quota || 0;
      const totalRemaining = dailyRemaining + extraRemaining;

      // 获取待领取奖励
      const pendingRewards = currentUser.unclaimed_rewards || {
        water: 0,
        quota: 0,
      };

      let partnerInfo = null;
      if (currentUser.partner_id) {
        const partnerRes = await db
          .collection("users")
          .where({ _openid: currentUser.partner_id })
          .field({ nickName: true, avatarUrl: true, _openid: true })
          .get();
        if (partnerRes.data.length > 0) partnerInfo = partnerRes.data[0];
      }

      let triggerEgg = null;

      // 1. ♾️ 长长久久 (原有逻辑)
      if (currentUser.anniversaryDate) {
        const start = new Date(currentUser.anniversaryDate).getTime();
        const now = new Date().getTime();
        const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));

        if (days >= 99) {
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

      // 2. 🦉 夜猫子 (0点-4点登录)
      if (!triggerEgg) {
        const currentHour = new Date().getUTCHours() + 8; // 北京时间
        const h = currentHour % 24;
        if (h >= 0 && h < 4) {
          const egg = await tryTriggerEgg(
            ctx,
            "night_owl",
            66,
            "夜猫子",
            "深夜还没睡，是在想TA吗？"
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
        remaining: totalRemaining, // 🟢 返回总剩余次数
        dailyFreeLimit: currentLimit,
        adCount: stats.ad_count || 0,
        dailyAdLimit: CONFIG.DAILY_AD_LIMIT,
        triggerEgg,
        pendingRewards, // 🟢 返回待领取奖励
      };
    }

    // === 🟢 [新增] 领取奖励接口 ===
    case "claim_rewards": {
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      if (userRes.data.length === 0) return { status: 404 };
      const user = userRes.data[0];
      const rewards = user.unclaimed_rewards || { water: 0, quota: 0 };

      if (rewards.water <= 0 && rewards.quota <= 0) {
        return { status: 400, msg: "暂无奖励可领" };
      }

      // 原子操作：将待领奖励转移到账户余额，并清空待领
      await db
        .collection("users")
        .doc(user._id)
        .update({
          data: {
            water_count: _.inc(rewards.water),
            extra_quota: _.inc(rewards.quota),
            unclaimed_rewards: { water: 0, quota: 0 }, // 重置
          },
        });

      await addLog(
        ctx,
        "claim_reward",
        `领取邀请奖励: 水滴${rewards.water}, 额度${rewards.quota}`
      );

      // 检查里程碑彩蛋 (累计邀请人数 >= 1)
      let egg = null;
      // 可以在这里扩展“社交达人”等彩蛋逻辑

      return {
        status: 200,
        msg: "领取成功",
        claimed: rewards,
        triggerEgg: egg,
      };
    }

    case "request_bind": {
      const { partnerCode } = event;
      if (!partnerCode || partnerCode === OPENID)
        return { status: 400, msg: "编号无效" };

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

        const resA = await db
          .collection("users")
          .where({ _openid: OPENID, partner_id: null })
          .update({
            data: {
              partner_id: partnerCode,
              bind_request_from: null,
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

      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() + 7);

      let updateDataMe = {
        partner_id: null,
        unbind_cooldown_until: cooldownDate,
      };
      let updateDataPartner = {
        partner_id: null,
        unbind_cooldown_until: cooldownDate,
      };

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

    case "redeem_vip_code": {
      const { code } = event;
      if (!code) return { status: 400, msg: "请输入兑换码" };

      const cleanCode = code.trim().toUpperCase();

      // 1. 查询兑换码
      const codeRes = await db
        .collection("vip_codes")
        .where({
          code: cleanCode,
        })
        .get();

      if (codeRes.data.length === 0) {
        return { status: 404, msg: "无效的兑换码" };
      }

      const vipCode = codeRes.data[0];
      const now = new Date();

      // === 🟢 核心校验逻辑开始 ===

      // 2. 检查全局开关
      if (vipCode.is_active === false) {
        return { status: 403, msg: "该兑换码已暂停使用" };
      }

      // 3. 检查有效期 (如果有设置)
      if (vipCode.valid_from && now < new Date(vipCode.valid_from)) {
        return { status: 403, msg: "活动尚未开始，敬请期待" };
      }
      if (vipCode.valid_until && now > new Date(vipCode.valid_until)) {
        return { status: 403, msg: "来晚了，兑换码已过期" };
      }

      // 4. 检查用户是否重复领取
      // (兼容旧数据：如果没有 used_users 字段，默认为空数组)
      const usedUsers = vipCode.used_users || [];
      if (usedUsers.includes(OPENID)) {
        return { status: 403, msg: "您已领取过该福利，请勿重复兑换" };
      }

      // 5. 检查剩余数量 (防止超卖)
      // usage_limit: -1 为无限量；否则需检查 used_count < usage_limit
      // (兼容旧数据：如果没设置 limit，默认视为 -1; 没设置 used_count，视为 0)
      const limit =
        vipCode.usage_limit !== undefined ? vipCode.usage_limit : -1;
      const currentCount = vipCode.used_count || 0;

      if (limit !== -1 && currentCount >= limit) {
        return { status: 403, msg: "手慢了，福利已被抢光" };
      }

      // 6. 执行原子更新 (乐观锁)
      // 如果 limit 不是无限，需在查询条件中再次确认数量，确保高并发下的安全
      const updateCondition = { _id: vipCode._id };
      if (limit !== -1) {
        updateCondition.used_count = _.lt(limit);
      }

      try {
        const updateRes = await db
          .collection("vip_codes")
          .where(updateCondition)
          .update({
            data: {
              used_count: _.inc(1), // 次数 +1
              used_users: _.addToSet(OPENID), // 记录用户ID (去重)
              updated_at: db.serverDate(),
            },
          });

        if (updateRes.stats.updated === 0) {
          // 更新失败通常意味着刚才瞬间被抢光了
          return { status: 403, msg: "手慢了，福利已被抢光" };
        }

        // 7. 码状态更新成功后，给用户充值 VIP
        const userRes = await db
          .collection("users")
          .where({ _openid: OPENID })
          .get();
        if (userRes.data.length === 0)
          return { status: 404, msg: "用户数据异常" };

        const user = userRes.data[0];

        const updateData = { warter_count: _.inc(300) }; // 兑换奖励：300水滴
        let newExpire = new Date();

        // A. 处理 VIP 天数 (如果有)
        if (vipCode.days && vipCode.days > 0) {
          newExpire = new Date();
          // 续费逻辑：如果当前已是VIP且未过期，从原过期时间顺延
          if (
            user.vip_expire_date &&
            new Date(user.vip_expire_date) > new Date()
          ) {
            newExpire = new Date(user.vip_expire_date);
          }
          newExpire.setDate(newExpire.getDate() + vipCode.days);
          updateData.vip_expire_date = newExpire;
        }

        // B. 处理 永久胶卷 (如果有)
        if (vipCode.quota && vipCode.quota > 0) {
          updateData.extra_quota = _.inc(vipCode.quota);
        }

        await db.collection("users").doc(user._id).update({
          data: updateData,
        });

        // 生成日志文案
        const logMsg =
          `兑换 ${cleanCode}: ` +
          (vipCode.days ? `VIP+${vipCode.days}天 ` : "") +
          (vipCode.quota ? `胶卷+${vipCode.quota}张` : "");

        await addLog(ctx, "redeem_vip", logMsg);

        return {
          status: 200,
          msg: "兑换成功",
          days: vipCode.days,
          expireDate: newExpire,
          quota: vipCode.quota || 0,
          bounds: 300,
        };
      } catch (err) {
        console.error(err);
        return { status: 500, msg: "系统繁忙，请稍后重试" };
      }
    }
  }
}

module.exports = { handle };
