const { getTodayStr, getRandomName } = require("../utils/common");
const { getSudoUsers } = require("../utils/config");
const { addLog } = require("../utils/logger");
const { checkTextSafety, checkImageSafety } = require("../utils/safety");

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG } = ctx;
  const SUDO_USERS = await getSudoUsers(db);
  const todayStr = getTodayStr();

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
        // 🟢 移除 VIP 试用赠送逻辑，改为在绑定时赠送
        // const vipExpire = new Date();
        // vipExpire.setDate(vipExpire.getDate() + CONFIG.VIP_TRIAL_DAYS);

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
          // vip_expire_date: vipExpire, // 移除此字段初始化
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
      // 使用纪念日 anniversaryDate 来计算，如果没有纪念日，暂时无法精确计算
      let triggerEgg = null; 
      if (currentUser.anniversaryDate) {
        const start = new Date(currentUser.anniversaryDate).getTime();
        const now = new Date().getTime();
        const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));

        if (days >= 99) {
          // 这里调用 tryTriggerEgg 需要引入
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
            // 可以选择将彩蛋信息放入返回体，让前端弹窗（需修改前端支持 login 接口弹窗）
            // 或者仅静默发放奖励
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
        triggerEgg: triggerEgg,
      };
    }

    case "request_bind": {
      // partnerCode 在此处为接收邀请的用户的 OpenID
      const { partnerCode } = event;
      if (!partnerCode || partnerCode === OPENID)
        return { status: 400, msg: "编号无效" };
      const pr = await db
        .collection("users")
        .where({ _openid: partnerCode })
        .get();
      if (pr.data.length === 0) return { status: 404 };
      // 检查接收方是否已绑定
      if (pr.data[0].partner_id) return { status: 403, msg: "对方已绑定伴侣" };

      // 在接收方记录上设置邀请人（OPENID）
      await db
        .collection("users")
        .where({ _openid: partnerCode })
        .update({ data: { bind_request_from: OPENID } });
      return { status: 200, msg: "请求已发送" };
    }

    case "respond_bind": {
      const { decision, partnerCode } = event; // partnerCode 是邀请人（Inviter）的 OpenID
      if (!partnerCode) return { status: 400 };

      // 1. 拒绝 (Recipient: OPENID)
      if (decision === "reject") {
        await db
          .collection("users")
          .where({ _openid: OPENID })
          .update({ data: { bind_request_from: null } });
        return { status: 200, msg: "已拒绝" };
      }

      // 2. 接受 (Recipient: OPENID)
      if (decision === "accept") {
        // 准备 VIP 赠送数据
        const vipExpire = new Date();
        vipExpire.setDate(vipExpire.getDate() + CONFIG.VIP_TRIAL_DAYS);
        const vipUpdate = {
          vip_expire_date: vipExpire,
        };

        // 🔒 第一步：原子更新接受方（自己），确保自己当前未绑定
        const resA = await db
          .collection("users")
          .where({
            _openid: OPENID,
            partner_id: null, // 👈 核心修复：必须是单身才能绑定
          })
          .update({
            data: {
              partner_id: partnerCode,
              bind_request_from: null,
              ...vipUpdate,
            },
          });

        // 如果更新数为 0，说明 where 条件不满足（即已经绑定了别人）
        if (resA.stats.updated === 0) {
          return { status: 403, msg: "操作失败：你当前已绑定伴侣" };
        }

        // 🔒 第二步：原子更新邀请方（对方），确保对方当前未绑定
        const resB = await db
          .collection("users")
          .where({
            _openid: partnerCode,
            partner_id: null, // 👈 核心修复：对方也必须是单身
          })
          .update({
            data: {
              partner_id: OPENID,
              bind_request_from: null,
              bind_notification: true,
              ...vipUpdate,
            },
          });

        // 🚨 异常回滚处理：如果对方在这一瞬间绑定了别人
        if (resB.stats.updated === 0) {
          // 回滚自己的状态：解绑
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
      // if (!SUDO_USERS.includes(OPENID)) return { status: 403, msg: "暂未开放" };
      const myRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      if (myRes.data.length === 0) return { status: 404 };
      const me = myRes.data[0];
      const pid = me.partner_id;
      await db
        .collection("users")
        .where({ _openid: OPENID })
        .update({ data: { partner_id: null } });
      if (pid)
        await db
          .collection("users")
          .where({ _openid: pid })
          .update({ data: { partner_id: null } });
      await addLog(ctx, "unbind", "解除关联");
      return { status: 200, msg: "已解除" };
    }

    // 清除绑定通知标志
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
  }
}

module.exports = { handle };
