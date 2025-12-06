const cloud = require("wx-server-sdk");

// 初始化云环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 引入业务模块
const authService = require("./services/auth");
const gardenService = require("./services/garden");
const messageService = require("./services/message");
const capsuleService = require("./services/capsule");
const quizService = require("./services/quiz");
const playgroundService = require("./services/playground");

// 引入配置工具
const { getBizConfig } = require("./utils/config");

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();

  // 获取全局配置
  const CONFIG = await getBizConfig(db);

  // 统一上下文对象，透传给所有 Service
  const ctx = {
    cloud,
    db,
    _,
    wxContext,
    OPENID: wxContext.OPENID,
    CONFIG,
  };

  console.log(`⚡️ [Router] Action: ${action} | User: ${ctx.OPENID}`);

  switch (true) {
    // 👤 用户与授权相关
    case [
      "login",
      "request_bind",
      "respond_bind",
      "unbind",
      "update_profile",
      "update_anniversary",
      "update_status",
    ].includes(action):
      return await authService.handle(action, event, ctx);

    // 🌹 花园与每日打卡相关
    case [
      "get_garden",
      "water_flower",
      "harvest_garden",
      "check_in",
      "watch_ad_reward",
    ].includes(action):
      return await gardenService.handle(action, event, ctx);

    // 📝 留言板相关
    case [
      "post_message",
      "delete_message",
      "like_message",
      "get_messages",
    ].includes(action):
      return await messageService.handle(action, event, ctx);

    // 💊 时光胶囊相关
    case ["bury_capsule", "get_capsules", "open_capsule"].includes(action):
      return await capsuleService.handle(action, event, ctx);

    // 🧩 默契问答相关
    case action.startsWith("get_quiz_") ||
      action.includes("round") ||
      action === "start_new_round":
      return await quizService.handle(action, event, ctx);

    // 🎡 游乐园其他 (决定、优惠券、清单)
    case [
      "make_decision",
      "get_partner_decision",
      "redeem_coupon",
      "get_my_coupons",
      "get_love_list_status",
      "toggle_love_list_item",
    ].includes(action):
      return await playgroundService.handle(action, event, ctx);

    default:
      return { status: 404, msg: `未知的 Action: ${action}` };
  }
};
