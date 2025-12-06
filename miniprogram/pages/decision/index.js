// miniprogram/pages/decision/index.js
const app = getApp();

Page({
  data: {
    themes: [
      {
        id: "daily_food",
        title: "🍽️ 今天吃什么",
        options: [
          "火锅", "烧烤", "日料", "快餐（汉堡/披萨）", 
          "家常菜（我做）", "家常菜（TA做）", "麻辣烫/米线", 
          "西餐（意面/牛排）", "点外卖（不限）", "掷硬币决定"
        ],
      },
      {
        id: "evening_activity",
        title: "🎮 晚上干点啥",
        options: [
          "看一部新电影/剧集",
          "玩一把双人游戏",
          "出门散步/逛街",
          "一起健身/拉伸",
          "安静阅读/学习",
          "深度聊天/规划未来",
          "给对方做个按摩",
          "早点睡觉",
        ],
      },
      {
        id: "daily_chores",
        title: "🧼 甜蜜家务分配",
        options: [
          "我洗碗，TA拖地",
          "TA洗碗，我拖地",
          "一起做，快速完成",
          "家务豁免卡（下次再议）",
          "石头剪刀布决定",
          "叫外卖，减少家务",
          "扫地机器人值班",
        ],
      },
      {
        id: "quick_purchase",
        title: "🛒 明天买什么",
        options: [
          "奶茶", "咖啡", "快乐水/气泡水", "冰淇淋", "水果", 
          "鲜花/小礼物", "零食大礼包", "矿泉水"
        ],
      },
      {
        id: "light_talk",
        title: "💬 聊点轻松的",
        options: [
          "分享一个今天发生的糗事",
          "互相夸赞对方3个优点",
          "给对方讲个笑话",
          "今天最幸福/累的一件事",
          "对未来的一个期待",
        ],
      },
    ],
    currentTab: 0,
    cards: [],
    isShuffling: false,
    showResult: false,
    finalResult: "",
    partnerDecision: null,
  },

  onLoad: function () {
    this.initGame();
    this.checkPartnerDecision();
  },

  onShareAppMessage: function () {
    return {
      title: this.data.finalResult
        ? `✨ 命运指引我们去：${this.data.finalResult}`
        : "🔮 快来开启我们的命运抉择！",
      path: "/pages/decision/index",
      imageUrl: "/images/share-cover.png",
    };
  },

  checkPartnerDecision: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_partner_decision" },
      success: (res) => {
        if (res.result.status === 200 && res.result.data) {
          const pd = res.result.data;
          const diff = new Date() - new Date(pd.time);
          if (diff < 24 * 60 * 60 * 1000) {
            this.setData({ partnerDecision: pd });
          }
        }
      },
    });
  },

  switchTab: function (e) {
    if (this.data.isShuffling || this.data.showResult) return;
    this.setData({ currentTab: e.currentTarget.dataset.index });
    this.initGame();
  },

  initGame: function () {
    const cardCount = 6;
    const cards = Array.from({ length: cardCount }).map((_, i) => ({
      id: i,
      flipped: false,
      value: "?",
      rotate: (i - (cardCount - 1) / 2) * 12,
    }));

    this.setData({
      showResult: false,
      finalResult: "",
      cards: cards,
      isShuffling: true,
    });

    setTimeout(() => {
      this.shuffleCards();
    }, 300);
  },

  shuffleCards: function () {
    this.setData({ isShuffling: true });
    // 🟢 洗牌完成震动
    setTimeout(() => {
      this.setData({ isShuffling: false });
      wx.vibrateShort({ type: "light" });
    }, 1200);
  },

  flipCard: function (e) {
    if (this.data.showResult || this.data.isShuffling) return;

    // 🟢 点击震动
    wx.vibrateShort({ type: "light" });

    const index = e.currentTarget.dataset.index;
    const theme = this.data.themes[this.data.currentTab];
    const randomIdx = Math.floor(Math.random() * theme.options.length);
    const result = theme.options[randomIdx];

    const newCards = this.data.cards;
    newCards[index].flipped = true;
    newCards[index].value = result;

    this.setData({ cards: newCards });

    // 延迟展示大图
    setTimeout(() => {
      // 🟢 结果揭晓：改为重一点的短震，取消长震
      wx.vibrateShort({ type: "heavy" });
      this.setData({
        showResult: true,
        finalResult: result,
      });
      this.uploadDecision(theme.title, result);
    }, 800);
  },

  uploadDecision: function (category, result) {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "make_decision", category, result },
    });
  },

  resetGame: function () {
    this.setData({ showResult: false });
    setTimeout(() => {
      this.initGame();
    }, 300);
  },
});