// miniprogram/pages/decision/index.js
const app = getApp();

Page({
  data: {
    themes: [
      {
        id: "food",
        title: "今天吃什么",
        options: [
          "火锅",
          "烧烤",
          "日料",
          "麻辣烫",
          "轻食",
          "自己做",
          "牛肉面",
          "披萨",
          "汉堡",
          "川菜",
          "粤菜",
          "米线",
        ],
      },
      {
        id: "play",
        title: "周末去哪玩",
        options: [
          "看电影",
          "逛公园",
          "游乐园",
          "宅家",
          "博物馆",
          "爬山",
          "逛街",
          "书店",
          "密室",
          "看展",
        ],
      },
      {
        id: "housework",
        title: "谁做家务",
        options: [
          "我做",
          "TA做",
          "一起做",
          "掷骰子",
          "点外卖",
          "扫地机器人",
          "石头剪刀布",
        ],
      },
      {
        id: "drink",
        title: "喝点什么",
        options: ["奶茶", "咖啡", "果汁", "快乐水", "白开水", "酸奶", "气泡水"],
      },
      {
        id: "truth",
        title: "真心话",
        options: [
          "初印象",
          "最喜欢TA哪点",
          "想一起做的事",
          "最感动的瞬间",
          "尴尬糗事",
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
