// miniprogram/pages/quiz/index.js
const app = getApp();

Page({
  data: {
    mode: "loading", // loading, home, answering, waiting, result
    history: [],
    currentRoundInfo: null,
    roundId: "",
    currentQuestion: null,
    qIndex: 0,
    total: 10,
    roundResult: null,
    isUserA: true,
    inputText: "",
    isMatch: false,
    showEggModal: false,
    eggData: null,
    displayOptions: [],
    hasAnswered: false,
  },

  _reqId: 0,
  pollingTimer: null,

  onShow: function () {
    this.loadHome();
  },

  onHide: function () {
    this.stopPolling();
  },
  onUnload: function () {
    this.stopPolling();
  },

  // 1. 加载首页 (🟢 增加日期格式化)
  loadHome: function () {
    this.stopPolling();
    this._reqId++;
    const reqId = this._reqId;

    this.setData({ mode: "loading" });

    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_quiz_home" },
      success: (res) => {
        if (reqId !== this._reqId) return;

        if (res.result.status === 200) {
          // 格式化日期
          const history = (res.result.history || []).map((item) => {
            const d = new Date(item.createdAt);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            const hh = String(d.getHours()).padStart(2, "0");
            const mm = String(d.getMinutes()).padStart(2, "0");
            // 显示格式：2023-10-27 14:30
            item.dateStr = `${y}-${m}-${day} ${hh}:${mm}`;
            return item;
          });

          this.setData({
            mode: "home",
            history: history,
            currentRoundInfo: res.result.currentRound,
          });
        }
      },
    });
  },

  // 🟢 点击历史记录 -> 查看详情
  onHistoryTap: function (e) {
    const roundId = e.currentTarget.dataset.id;
    // 直接复用进入轮次的逻辑，因为后端会自动判断 if finished -> return mode: result
    this.enterRound(roundId);
  },

  // 2. 开始/继续
  onStart: function () {
    if (this.data.currentRoundInfo) {
      this.enterRound(this.data.currentRoundInfo._id);
    } else {
      wx.showLoading({ title: "准备题目..." });
      this._reqId++;
      const reqId = this._reqId;

      wx.cloud.callFunction({
        name: "user_center",
        data: { action: "start_new_round" },
        success: (res) => {
          if (reqId !== this._reqId) return;
          wx.hideLoading();
          setTimeout(() => this.autoEnterNewRound(), 500);
        },
      });
    }
  },

  autoEnterNewRound: function () {
    const reqId = this._reqId;
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_quiz_home" },
      success: (res) => {
        if (reqId !== this._reqId) return;
        if (res.result.currentRound) {
          this.enterRound(res.result.currentRound._id);
        }
      },
    });
  },

  // 3. 进入轮次
  enterRound: function (roundId, isPolling = false) {
    if (!isPolling) {
      this._reqId++;
      this.setData({ roundId, mode: "loading" });
    }

    const reqId = this._reqId;

    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_round_detail", roundId },
      success: (res) => {
        if (reqId !== this._reqId) return;

        const { mode, question, index, total, round, isUserA } = res.result;

        if (mode === "answering") {
          this.stopPolling();
          let opts = question.options;
          const partnerName =
            app.globalData.userInfo?.partner_nick_name || "TA";

          if (question.is_person) {
            opts = ["我", partnerName];
            if (question.options.length > 2)
              opts = opts.concat(question.options.slice(2));
          }

          this.setData({
            mode: "answering",
            currentQuestion: question,
            displayOptions: opts,
            qIndex: index,
            total,
            hasAnswered: false,
          });
        } else if (mode === "waiting") {
          this.setData({ mode: "waiting" });
          this.startPolling(roundId);
        } else if (mode === "result") {
          this.stopPolling();
          // 结果页
          let match = false;
          if (round.score === 100) match = true;

          this.setData({
            mode: "result",
            roundResult: round,
            isUserA,
            isMatch: match,
          });
        }
      },
    });
  },

  startPolling: function (roundId) {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(() => {
      this.enterRound(roundId, true);
    }, 3000);
  },

  stopPolling: function () {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  },

  onManualRefresh: function () {
    wx.showToast({ title: "刷新中...", icon: "loading", duration: 500 });
    this.enterRound(this.data.roundId);
  },

  // 4. 提交答案
  onOptionClick: function (e) {
    if (this.data.hasAnswered) return;
    this.setData({ hasAnswered: true });

    const answer = e.currentTarget.dataset.index;
    const { roundId, qIndex } = this.data;

    wx.showLoading({ title: "提交中", mask: true });
    const reqId = this._reqId;

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "submit_round_answer",
        roundId,
        questionIdx: qIndex - 1,
        answer,
      },
      success: (res) => {
        wx.hideLoading();
        if (reqId !== this._reqId) return;

        if (res.result.triggerEgg) {
          this.setData({ showEggModal: true, eggData: res.result.triggerEgg });
          wx.vibrateLong();
        }
        this.enterRound(roundId);
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "网络异常", icon: "none" });
        this.setData({ hasAnswered: false });
      },
    });
  },

  onTextSubmit: function () {
    if (!this.data.inputText.trim()) return;
    wx.showToast({ title: "暂支持选择题", icon: "none" });
  },
  onInput: function (e) {
    this.setData({ inputText: e.detail.value });
  },
  closeEggModal: function () {
    this.setData({ showEggModal: false });
  },
});
