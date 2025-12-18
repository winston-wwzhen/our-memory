// cloudfunctions/user_center/index.js
const cloud = require("wx-server-sdk");
const { getBizConfig } = require("./utils/config");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 引入各个服务模块
const authService = require("./services/auth");
const petService = require("./services/pet"); // Replaced garden with pet
const messageService = require("./services/message");
const capsuleService = require("./services/capsule");
const quizService = require("./services/quiz");
const playgroundService = require("./services/playground");

exports.main = async (event, context) => {
  const { action } = event;
  const wxContext = cloud.getWXContext();
  const OPENID = wxContext.OPENID;

  // 统一上下文
  const ctx = {
    OPENID,
    APPID: wxContext.APPID,
    UNIONID: wxContext.UNIONID,
    db,
    _,
    cloud,
    CONFIG: await getBizConfig(db),
  };

  console.log(`[UserCenter] Action: ${action}, User: ${OPENID}`);

  // 路由分发
  switch (action) {
    // === Auth (用户/绑定) ===
    case "login":
    case "request_bind":
    case "respond_bind":
    case "update_profile":
    case "update_anniversary":
    case "unbind":
    case "clear_bind_notification":
    case "update_status":
    case "redeem_vip_code":
    case "claim_rewards": // 🟢 [修复] 补上了 claim_rewards 路由
      return await authService.handle(action, event, ctx);

    // === Pet (宠物/打卡) ===
    case "get_pet_status":
    case "interact_with_pet":
    case "prepare_food":
    case "send_pet_travel":
    case "collect_travel_rewards":
    case "get_destinations":
    case "check_in":
    case "watch_ad_reward":
    case "get_postcards":
    case "rename_pet":
      return await petService.handle(action, event, ctx);

    // === Message (留言板) ===
    case "post_message":
    case "delete_message":
    case "like_message":
    case "get_messages":
      return await messageService.handle(action, event, ctx);

    // === Capsule (时光胶囊) ===
    case "bury_capsule":
    case "get_capsules":
    case "open_capsule":
      return await capsuleService.handle(action, event, ctx);

    // === Quiz (默契问答) ===
    case "get_quiz_home":
    case "start_new_round":
    case "get_round_detail":
    case "submit_round_answer":
      return await quizService.handle(action, event, ctx);

    // === Playground (特权/决定/清单) ===
    case "make_decision":
    case "get_partner_decision":
    case "redeem_coupon":
    case "get_my_coupons":
    case "use_coupon":
    case "get_love_list_status":
    case "toggle_love_list_item":
    case "get_avatar_list":
    case "get_avatar_detail":
    case "confirm_coupon":
      return await playgroundService.handle(action, event, ctx);

    case "get_system_config":
      return {
        success: true,
        data: {
          showVipExchange: ctx.CONFIG.SHOW_VIP_EXCHANGE,
        },
      };

    default:
      return { status: 400, msg: `未知的action: ${action}` };
  }
};
