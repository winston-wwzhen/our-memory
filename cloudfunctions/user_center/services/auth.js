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
        const vipExpire = new Date();
        vipExpire.setDate(vipExpire.getDate() + CONFIG.VIP_TRIAL_DAYS);

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
          vip_expire_date: vipExpire,
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
      };
    }

    // 🟢 移除手动输入的请求绑定逻辑，请使用邀请链接直接绑定
    case "request_bind": {
      return { status: 404, msg: "请求绑定功能已移除，请使用邀请链接直接绑定" };
    }

    // 🟢 移除响应绑定逻辑
    case "respond_bind": {
      return { status: 404, msg: "响应绑定功能已移除，请使用邀请链接直接绑定" };
    }
    
    // 🆕 新增直接绑定逻辑 (接收方点击邀请链接后触发)
    case "direct_accept_bind": {
      const { partnerCode } = event; // partnerCode 是邀请人的 OpenID
      if (!partnerCode || partnerCode === OPENID)
        return { status: 400, msg: "编号无效或不能绑定自己" };
      
      // 1. 检查自己是否已绑定 (接收人)
      const meRes = await db.collection("users").where({ _openid: OPENID }).get();
      if (meRes.data.length === 0) return { status: 404, msg: "您的账户信息异常" };
      const me = meRes.data[0];

      if (me.partner_id) return { status: 403, msg: "您已绑定伴侣" };

      // 2. 检查对方是否已绑定 (邀请人)
      const partnerRes = await db
        .collection("users")
        .where({ _openid: partnerCode })
        .get();
      
      if (partnerRes.data.length === 0) return { status: 404, msg: "对方用户不存在" };
      const partner = partnerRes.data[0];
      if (partner.partner_id) return { status: 403, msg: `对方（${partner.nickName}）已绑定伴侣` }; 

      // 3. 执行双向绑定
      await db
        .collection("users")
        .where({ _openid: OPENID })
        .update({ data: { partner_id: partnerCode, bind_request_from: null } });
        
      await db
        .collection("users")
        .where({ _openid: partnerCode })
        .update({ data: { partner_id: OPENID, bind_request_from: null } });
        
      // 4. 记录日志
      await addLog(ctx, "bind", "通过邀请链接直接绑定成功");
      
      return { status: 200, msg: "绑定成功" };
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
      if (!SUDO_USERS.includes(OPENID)) return { status: 403, msg: "暂未开放" };
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