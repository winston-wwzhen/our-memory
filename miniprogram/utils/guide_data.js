// miniprogram/utils/guide_data.js

const LOVE_LIST = [
  { id: 1, title: "一起看日出", icon: "🌅" },
  { id: 2, title: "一起去迪士尼", icon: "🏰" },
  { id: 3, title: "一起做顿饭", icon: "🍳" },
  { id: 4, title: "穿情侣装逛街", icon: "👕" },
  { id: 5, title: "一起看演唱会", icon: "🎤" },
  { id: 6, title: "为对方吹头发", icon: "💇" },
  { id: 7, title: "一起去海边", icon: "🌊" },
  { id: 8, title: "一起坐摩天轮", icon: "🎡" },
  { id: 9, title: "一起养只宠物", icon: "🐱" },
  { id: 10, title: "一起去露营", icon: "⛺" },
  { id: 11, title: "互换头像一天", icon: "🖼️" },
  { id: 12, title: "一起拼乐高", icon: "🧩" },
  { id: 13, title: "一起逛宜家", icon: "🛋️" },
  { id: 14, title: "一起去滑雪", icon: "🏂" },
  { id: 15, title: "给对方写封信", icon: "💌" },
  { id: 16, title: "一起看恐怖片", icon: "🎬" },
  { id: 17, title: "一起去动物园", icon: "🦒" },
  { id: 18, title: "一起喝醉一次", icon: "🍻" },
  { id: 19, title: "一起过生日", icon: "🎂" },
  { id: 20, title: "一起跨年", icon: "🎆" },
  { id: 21, title: "一起去健身", icon: "🏋️" },
  { id: 22, title: "互相化妆", icon: "💄" },
  { id: 23, title: "一起去寺庙祈福", icon: "🙏" },
  { id: 24, title: "一起坐过山车", icon: "🎢" },
  { id: 25, title: "一起看烟花", icon: "🎇" },
  { id: 26, title: "一起去博物馆", icon: "🏛️" },
  { id: 27, title: "一起放风筝", icon: "🪁" },
  { id: 28, title: "一起去野餐", icon: "🥪" },
  { id: 29, title: "一起看雪", icon: "❄️" },
  { id: 30, title: "一起变老", icon: "👵" },
];

// 2. 送礼指南
const GIFT_GUIDE = [
  {
    category: "送男友",
    items: [
      { name: "机械键盘", desc: "提升游戏/办公体验", tag: "实用" },
      { name: "乐高积木", desc: "男人的快乐很简单", tag: "趣味" },
      { name: "运动鞋", desc: "陪他走更远的路", tag: "贴心" },
      { name: "Switch游戏", desc: "塞尔达/马里奥", tag: "娱乐" },
      { name: "电动牙刷", desc: "早晚都想起你", tag: "日常" },
    ],
  },
  {
    category: "送女友",
    items: [
      { name: "拍立得", desc: "记录美好瞬间", tag: "文艺" },
      { name: "香薰蜡烛", desc: "提升生活幸福感", tag: "氛围" },
      { name: "定制相册", desc: "装满你们的回忆", tag: "感动" },
      { name: "护肤套装", desc: "呵护她的美丽", tag: "实用" },
      { name: "迪士尼玩偶", desc: "守护童心", tag: "可爱" },
    ],
  },
  {
    category: "纪念日",
    items: [
      { name: "情侣对戒", desc: "圈住彼此的爱", tag: "仪式感" },
      { name: "手工DIY", desc: "Tufting/陶艺", tag: "体验" },
      { name: "定制黑胶", desc: "刻录专属声音", tag: "浪漫" },
    ],
  },
];

// 3. 吵架急救包
const SOS_QUOTES = [
  "小女子/小的 知错了，跪求开恩！🧎",
  "理智归你，我归你。❤️",
  "別生气了，我带你去吃好吃的！🍔",
  "我的错，下次不敢了（下次还敢）。🌚",
  "不要因为我这个笨蛋影响了你的心情。🐷",
  "申请无条件和好，同意请眨眼。👀",
];

module.exports = {
  LOVE_LIST,
  GIFT_GUIDE,
  SOS_QUOTES,
};
