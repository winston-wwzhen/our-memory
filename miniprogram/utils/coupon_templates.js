const COUPONS = [
  // 🟢 N级 - 甜蜜互动
  {
    id: "massage",
    type: "service",
    title: "💆‍♂️ 揉肩卡",
    cost: 3,
    color: "#ffb7b2",
    desc: "凭此卡享受 10 分钟专属揉肩服务",
  },
  {
    id: "tea",
    type: "food",
    title: "🥤 投喂卡",
    cost: 4,
    color: "#ffd1dc",
    desc: "使用后，召唤 TA 为你买一杯快乐水",
  },
  {
    id: "errand",
    type: "service",
    title: "💨 召唤卡",
    cost: 5,
    color: "#a8e6cf",
    desc: "下楼拿外卖/快递，随叫随到",
  },

  // 🔵 R级 - 家务豁免
  {
    id: "dish",
    type: "labor",
    title: "🍽️ 免洗金牌",
    cost: 20,
    color: "#add8e6",
    desc: "本次洗碗任务转移给对方",
  },
  {
    id: "clean",
    type: "labor",
    title: "🧹 清洁卡",
    cost: 40,
    color: "#87cefa",
    desc: "承包一次周末房间大扫除",
  },
  {
    id: "game",
    type: "play",
    title: "🎮 开黑卡",
    cost: 50,
    color: "#b39eb5",
    desc: "陪玩 2 小时，输了不许生气",
  },

  // 🟡 SSR级 - 绝对特权
  {
    id: "forgive",
    type: "special",
    title: "🤝 和好卡",
    cost: 50,
    color: "#ffdac1",
    desc: "吵架专用，出示此卡，申请无条件和好",
  },
  {
    id: "shut",
    type: "special",
    title: "🤐 静音卡",
    cost: 80,
    color: "#ff9a9e",
    desc: "停止唠叨/说教，立即生效",
  },
  {
    id: "wish",
    type: "special",
    title: "🧞‍♂️ 许愿卡",
    cost: 99,
    color: "#fff68f",
    desc: "填写任意一个不过分的愿望",
  },
];

module.exports = COUPONS;
