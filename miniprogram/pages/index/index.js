// miniprogram/pages/index/index.js
const app = getApp();

Page({
  data: {
    displayImage: "", 
    loading: false,
    loadingText: "甜蜜生成中❤...",
    todayDateStr: "",
    currentTask: null,

    pendingSave: false,
    tempFileID: "",
    remainingCount: 0, 

    hasCheckedInToday: false,

    // 🎨 风格配置
    styleList: [
      {
        id: "201",
        name: "日漫风",
        img: "cloud://cloud1-0g4462vv9d9954a5.636c-cloud1-0g4462vv9d9954a5-1387968548/images/日漫风.png",
        isVip: false,
      },
      {
        id: "107",
        name: "卡通插画",
        img: "cloud://cloud1-0g4462vv9d9954a5.636c-cloud1-0g4462vv9d9954a5-1387968548/images/卡通插图.png",
        isVip: false,
      },
      {
        id: "210",
        name: "2.5D动画",
        img: "cloud://cloud1-0g4462vv9d9954a5.636c-cloud1-0g4462vv9d9954a5-1387968548/images/2.5D动画.png",
        isVip: false, 
      },
      {
        id: "121",
        name: "黏土",
        img: "cloud://cloud1-0g4462vv9d9954a5.636c-cloud1-0g4462vv9d9954a5-1387968548/images/黏土.png",
        isVip: false,
      },
      {
        id: "125",
        name: "国风工笔",
        img: "cloud://cloud1-0g4462vv9d9954a5.636c-cloud1-0g4462vv9d9954a5-1387968548/images/国风工笔.png",
        isVip: true, 
      },
      {
        id: "127",
        name: "瓷器",
        img: "cloud://cloud1-0g4462vv9d9954a5.636c-cloud1-0g4462vv9d9954a5-1387968548/images/瓷器.png",
        isVip: false,
      },
      {
        id: "129",
        name: "美式复古",
        img: "cloud://cloud1-0g4462vv9d9954a5.636c-cloud1-0g4462vv9d9954a5-1387968548/images/美式复古.png",
        isVip: true, 
      },
      {
        id: "130",
        name: "蒸汽朋克",
        img: "cloud://cloud1-0g4462vv9d9954a5.636c-cloud1-0g4462vv9d9954a5-1387968548/images/蒸汽朋克.png",
        isVip: false,
      },
      {
        id: "132",
        name: "素描",
        img: "cloud://cloud1-0g4462vv9d9954a5.636c-cloud1-0g4462vv9d9954a5-1387968548/images/素描.png",
        isVip: false,
      },
      {
        id: "133",
        name: "莫奈花园",
        img: "cloud://cloud1-0g4462vv9d9954a5.636c-cloud1-0g4462vv9d9954a5-1387968548/images/莫奈花园.png",
        isVip: true, 
      },
      {
        id: "134",
        name: "厚涂手绘",
        img: "cloud://cloud1-0g4462vv9d9954a5.636c-cloud1-0g4462vv9d9954a5-1387968548/images/厚涂手绘.png",
        isVip: false,
      },
      {
        id: "126",
        name: "玉石",
        img: "cloud://cloud1-0g4462vv9d9954a5.636c-cloud1-0g4462vv9d9954a5-1387968548/images/碧绿风.png",
        isVip: true, 
      },
    ],
    currentStyleIndex: 0,

    randomSampleImg: "",

    dailyQuote: {},
    quotes: [
      { text: "斯人若彩虹，遇上方知有。", author: "Flipped" },
      { text: "月色与雪色之间，你是第三种绝色。", author: "余光中" },
      {
        text: "To love and to be loved is everything.",
        author: "Bill Russell",
      },
      { text: "晓看天色暮看云，行也思君，坐也思君。", author: "唐寅" },
      { text: "你是我所有的少女情怀和心之所向。", author: "佚名" },
      { text: "世间所有的相遇，都是久别重逢。", author: "白落梅" },
      { text: "我想和你一起，虚度短的沉默，长的无意义。", author: "李元胜" },
      { text: "这世界很烦，但你要很可爱。", author: "佚名" },
    ],

    // 🟢 移除 registerDays 和 isNewUser
    isVip: false,
    adCount: 0,
    dailyAdLimit: 1,
    showAdModal: false,
    adCountdown: 3,
  },

  onShow: function () {
    this.checkUserStatus();
  },

  onPullDownRefresh: function () {
    this.setData({
      displayImage: "",
      pendingSave: false,
      aiEvaluation: null,
      loading: false,
    });

    this.fetchDailyMission();
    this.pickDailyQuote();
    this.checkUserStatus(() => {
      wx.stopPullDownRefresh();
    });
  },

  onLoad: function () {
    this.fetchDailyMission();
    this.pickDailyQuote();
  },

  onStyleChange: function (e) {
    this.setData({ currentStyleIndex: e.detail.current });
  },

  checkUserStatus: function (callback) {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "login" },
      success: (res) => {
        if (res.result.status === 200 || res.result.status === 201) {
          const {
            user,
            isVip,
            loginBonus,
            remaining,
            adCount,
            dailyAdLimit,
          } = res.result;

          if (loginBonus && loginBonus > 0) {
            wx.showToast({
              title: `每日登录 +${loginBonus}g 爱意`,
              icon: "none",
            });
          }

          this.setData({
            remainingCount: remaining, 
            // 🟢 移除 registerDays 和 isNewUser 的计算
            isVip: isVip,
            adCount: adCount || 0,
            dailyAdLimit: dailyAdLimit || 1,
          });
        }
        if (callback && typeof callback === "function") callback();
      },
      fail: (err) => {
        console.error("Check status failed", err);
        if (callback && typeof callback === "function") callback();
      },
    });

    // 获取最新回忆状态
    wx.cloud.callFunction({
      name: "get_memory_lane",
      data: { page: 0, pageSize: 1 },
      success: (res) => {
        if (res.result.status === 200 && res.result.data.length > 0) {
          const latestLog = res.result.data[0];
          const now = new Date();
          const y = now.getFullYear();
          const m = String(now.getMonth() + 1).padStart(2, "0");
          const d = String(now.getDate()).padStart(2, "0");
          const todayStandard = `${y}-${m}-${d}`;

          if (latestLog.originalDate === todayStandard) {
            this.setData({
              hasCheckedInToday: true,
              displayImage: "",
              pendingSave: false,
            });
          } else {
            this.setData({
              hasCheckedInToday: false,
              displayImage: "",
              pendingSave: false,
            });
          }
        } else {
          this.setData({ hasCheckedInToday: false, displayImage: "" });
        }
      },
    });
  },

  pickDailyQuote: function () {
    const q = this.data.quotes;
    const idx = Math.floor(Math.random() * q.length);
    this.setData({ dailyQuote: q[idx] });
  },

  fetchDailyMission: function () {
    wx.showLoading({ title: "加载中..." });
    wx.cloud.callFunction({
      name: "get_daily_mission",
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          this.setData({
            currentTask: res.result.task,
            todayDateStr: res.result.dateStr,
          });
          this.checkUserStatus();
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error(err);
      },
    });
  },

  // 显示 VIP 权益
  showVipInfo: function () {
    wx.showModal({
      title: '💎 内测 VIP 权益',
      content: '感谢参与内测！\n\n✨ 新人礼：注册首日获赠 10 次生图额度\n🚀 会员礼：VIP 期间每日享有 3 次免费生图机会\n\n快去体验不同风格吧！',
      showCancel: false,
      confirmText: '太棒了',
      confirmColor: '#ff6b81'
    });
  },

  onCapture: function () {
    const currentStyle = this.data.styleList[this.data.currentStyleIndex];
    if (currentStyle.isVip && !this.data.isVip) {
      wx.showModal({
        title: "VIP 专属风格",
        content: `【${currentStyle.name}】需要 VIP 身份才能解锁哦，内测新用户可免费体验3天！`,
        showCancel: false,
        confirmText: "知道了",
      });
      return;
    }

    if (this.data.hasCheckedInToday && this.data.remainingCount > 0) {
      wx.showModal({
        title: "今日已打卡",
        content: "再次拍摄将覆盖今日的打卡记录，确定要重新拍摄吗？",
        confirmText: "重拍",
        confirmColor: "#ff6b81",
        success: (res) => {
          if (res.confirm) this.startCameraFlow();
        },
      });
      return;
    }

    if (this.data.remainingCount > 0) {
      this.startCameraFlow();
      return;
    }

    if (this.data.adCount >= this.data.dailyAdLimit) {
      wx.showModal({
        title: "今日额度已耗尽",
        content: "去 [Fun乐园] 探索更多情侣互动玩法吧！",
        confirmText: "去玩耍",
        confirmColor: "#ff6b81",
        showCancel: false,
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: "/pages/playground/index" });
          }
        },
      });
      return;
    }

    wx.showModal({
      title: "今日次数已用完",
      content: "完成一个浪漫小挑战，立即解锁 1 次 AI 绘图机会？",
      confirmText: "解锁",
      confirmColor: "#ff6b81",
      cancelText: "不需要",
      success: (res) => {
        if (res.confirm) {
          this.mockWatchAd();
        }
      },
    });
  },

  mockWatchAd: function () {
    this.setData({
      showAdModal: true,
      adCountdown: 3,
    });

    const timer = setInterval(() => {
      let next = this.data.adCountdown - 1;
      if (next <= 0) {
        clearInterval(timer);
        this.setData({ showAdModal: false });
        this.grantReward();
      } else {
        this.setData({ adCountdown: next });
      }
    }, 1000);
  },

  grantReward: function () {
    wx.showLoading({ title: "奖励发放中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "watch_ad_reward" },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "已解锁 +1", icon: "success" });
          this.checkUserStatus(() => {
            this.startCameraFlow();
          });
        } else {
          wx.showToast({ title: res.result.msg || "获取失败", icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "解锁失败", icon: "none" });
      },
    });
  },

  startCameraFlow: function () {
    const that = this;
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sourceType: ["camera", "album"],
      camera: "front",
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        that.uploadAndProcess(tempFilePath);
      },
    });
  },

  uploadAndProcess: function (filePath) {
    this.setData({
      displayImage: filePath,
      loading: true,
      loadingText: "正在上传...",
    });

    const cloudPath = `temp_uploads/${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}.jpg`;
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: (res) => {
        this.callCloudBrain(res.fileID);
      },
      fail: (err) => {
        this.setData({ loading: false, displayImage: "" });
        wx.showToast({ title: "上传失败", icon: "none" });
      },
    });
  },

  callCloudBrain: function (fileID) {
    const that = this;
    const taskTitle = this.data.currentTask
      ? this.data.currentTask.title
      : "自由发挥";
    const currentStyle = this.data.styleList[this.data.currentStyleIndex];
    const styleId = currentStyle.id;

    // 🟢 核心修改：仅判断 VIP。VIP（含试用）则极速，非VIP则排队。
    if (!this.data.isVip) {
      this.setData({ loadingText: "排队生成中(预计10s)..." });
      setTimeout(() => {
        that.doCloudCall(fileID, taskTitle, styleId);
      }, 5000);
    } else {
      this.setData({ loadingText: "VIP极速生成中✨..." });
      that.doCloudCall(fileID, taskTitle, styleId);
    }
  },

  doCloudCall: function (fileID, taskTitle, styleId) {
    const that = this;
    wx.cloud.callFunction({
      name: "process_anime",
      data: { imageFileID: fileID, taskTitle: taskTitle, styleId: styleId },
      success: (res) => {
        const {
          status,
          msg,
          result,
          remaining,
          evaluation,
          requireAd,
          redirectFun,
        } = res.result;

        if (status === 200) {
          that.setData({
            displayImage: result,
            loading: false,
            pendingSave: true,
            tempFileID: result,
            remainingCount: remaining,
            aiEvaluation: evaluation,
          });
          wx.vibrateShort();
        } else if (status === 403) {
          that.setData({ loading: false, displayImage: "" });

          if (redirectFun) {
            wx.showModal({
              title: "次数彻底用尽",
              content: "今日AI算力已耗尽，去花园玩玩吧~",
              confirmText: "去花园",
              showCancel: false,
              success: (r) => {
                if (r.confirm) wx.switchTab({ url: "/pages/playground/index" });
              },
            });
          } else if (requireAd) {
            wx.showModal({
              title: "次数不足",
              content: "请求被拦截，请先解锁次数。",
              confirmText: "去解锁",
              success: (r) => {
                if (r.confirm) that.mockWatchAd();
              },
            });
          } else {
            wx.showToast({ title: msg, icon: "none" });
          }
        } else {
          that.setData({ loading: false, displayImage: "" });
          wx.showToast({ title: msg || "AI 走神了", icon: "none" });
        }
      },
      fail: (err) => {
        that.setData({ loading: false, displayImage: "" });
        wx.showToast({ title: "连接中断", icon: "none" });
      },
    });
  },

  onConfirmSave: function () {
    if (!this.data.tempFileID) return;
    this.doSave();
  },

  doSave: function () {
    wx.showLoading({ title: "正在珍藏..." });
    const currentStyleName =
      this.data.styleList[this.data.currentStyleIndex].name;

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "check_in",
        imageFileID: this.data.tempFileID,
        style: currentStyleName,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: res.result.msg, icon: "none", duration: 2500 });
          this.setData({
            pendingSave: false,
            hasCheckedInToday: true,
            displayImage: "",
          });
          this.pickDailyQuote();
          this.checkUserStatus();
        } else {
          wx.showToast({ title: "保存失败", icon: "none" });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: "保存出错", icon: "none" });
      },
    });
  },

  onRetry: function () {
    this.setData({
      displayImage: "",
      pendingSave: false,
      tempFileID: "",
      aiEvaluation: null,
    });
  },

  onSaveToPhone: function () {
    if (!this.data.tempFileID) return;
    wx.showLoading({ title: "下载中..." });
    wx.cloud.downloadFile({
      fileID: this.data.tempFileID,
      success: (res) => {
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({ title: "已保存", icon: "success" });
          },
          fail: (err) => {
            wx.hideLoading();
            wx.showToast({ title: "保存失败或无权限", icon: "none" });
          },
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "下载失败", icon: "none" });
      },
    });
  },

  previewImage: function () {
    if (this.data.displayImage) {
      wx.previewImage({
        urls: [this.data.displayImage],
        current: this.data.displayImage,
      });
    }
  },
});