// miniprogram/pages/playground/index.js
const app = getApp();

Page({
  data: {
    loading: false,
    waterCount: 0,
    growth: 0,
    level: 1,
    maxGrowth: 100,
    progress: 0,
    harvestCount: 0,
    logs: [],
    showLogModal: false,
    navHeight: app.globalData.navBarHeight,
    statusBarHeight: app.globalData.statusBarHeight,

    // Pet Paradise Data
    petState: "idle",
    moodValue: 60,
    energyLevel: 80,
    moodText: "很开心",
    energyText: "精力充沛",
    petName: "小可爱",
    roomBgImage: "/images/pet/home.jpg",
    loveEnergy: 0,
    travelCount: 0,
    hasNewPostcards: false,
    statusMessage: "",
    returnTimeStr: "",
    
    // 🟢 新增：倒计时字符串 (初始为空，防止闪烁)
    countdownStr: "", 
    
    petAnimation: "",
    heartParticles: [], 
    foodInventory: {
      rice_ball: 0,
      luxury_bento: 0,
    },

    // Modals & Hints
    showFoodPrepModal: false,
    testModal: false,
    showFeedModal: false,
    capsuleRedDot: false,
    messageHint: false,
    quizHint: false,
    showEggModal: false,
    eggData: null,
    showHelpModal: false,
    helpTitle: '',
    helpContent: '',
    helpTexts: {
      mood: { title: '关于心情 (Mood)', content: '心情影响着宠物的成长效率和互动反馈。\n\n💕 如何提升：\n经常抚摸宠物（点击它），或者给它准备好吃的食物，都能让它开心起来哦！' },
      energy: { title: '关于体力 (Energy)', content: '体力决定了宠物能否出门去远方旅行。\n\n🍱 如何提升：\n当体力不足时，请点击“行囊”为宠物准备便当，进食后体力会迅速恢复！' }
    }
  },

  timer: null, // 定时器引用

  onShow: function () {
    if (!this.data.navHeight) {
      this.setData({
        navHeight: app.globalData.navBarHeight,
        statusBarHeight: app.globalData.statusBarHeight,
      });
    }
    this.updateUserStatus();
    this.fetchPetData();

    // 检查红点状态
    if (app.globalData.userInfo && app.globalData.userInfo.partner_id) {
      this.checkCapsuleRedDot();
      this.checkMessageHint();
      this.checkQuizHint();
    }
  },

  onHide: function() {
    this.stopCountdown();
  },

  onUnload: function() {
    this.stopCountdown();
  },

  onPullDownRefresh: function () {
    this.updateUserStatus();
    if (app.globalData.userInfo && app.globalData.userInfo.partner_id) {
      this.checkCapsuleRedDot();
      this.checkMessageHint();
      this.checkQuizHint();
    }
    this.fetchPetData(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: "刷新成功", icon: "none" });
    });
  },

  // 🟢 更新用户状态 (爱意值等)
  updateUserStatus: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "login" },
      success: (res) => {
        if (res.result.status === 200) {
          app.globalData.userInfo = res.result.user;
          this.setData({
            loveEnergy: res.result.user.water_count || 0,
          });
        }
      },
      fail: (err) => {
        console.error("Failed to update user status:", err);
      },
    });
  },

  // 🟢 检查绑定状态
  checkPartner: function () {
    const user = app.globalData.userInfo;
    if (!user || !user.partner_id) {
      wx.showModal({
        title: "情侣专属功能",
        content:
          "萌宠乐园是情侣专属的互动空间哦 🐾\n\n请先去【Mine】页面邀请另一半绑定，开启你们的甜蜜之旅吧！",
        confirmText: "去绑定",
        confirmColor: "#ff6b81",
        cancelText: "再逛逛",
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({ url: "/pages/mine/index" });
          }
        },
      });
      return false;
    }
    return true;
  },

  updateRoomBackground: function () {
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 18;
    this.setData({
      roomBgImage: isNight ? "/images/pet/back.png" : "/images/pet/home.jpg",
    });
  },

  // 🟢 倒计时核心逻辑
  startCountdown: function(returnTimeStr) {
    this.stopCountdown(); // 清除旧的
    
    if(!returnTimeStr) return;

    const targetTime = new Date(returnTimeStr).getTime();

    const update = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        // 倒计时结束
        this.stopCountdown();
        this.setData({ 
          countdownStr: "即将归来",
          petState: "idle" 
        });
        
        // 延迟刷新数据
        setTimeout(() => {
          this.fetchPetData(() => {
            wx.showToast({ title: '旅行结束啦！', icon: 'success' });
          });
        }, 1500);
        return;
      }

      // 格式化 HH:MM:SS
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      const pad = n => n < 10 ? `0${n}` : n;
      this.setData({
        countdownStr: `${pad(h)}:${pad(m)}:${pad(s)}`
      });
    };

    update(); // 立即执行一次
    this.timer = setInterval(update, 1000);
  },

  stopCountdown: function() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // 获取宠物数据
  fetchPetData: function (callback) {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_pet_status" },
      success: (res) => {
        if (res.result.status === 200) {
          const pet = res.result.pet || {};
          const moodValue = pet.mood_value || 60;
          const energyLevel = pet.energy_level || 80;

          const rawLogs = res.result.logs || [];
          const myAvatar = app.globalData.userInfo?.avatarUrl || "/images/default-avatar.png";
          const partnerAvatar = "/images/default-avatar.png"; 

          const processedLogs = rawLogs.map(log => ({
            ...log,
            timeAgo: this.formatTimeAgo(log.date),
            nickName: log.isMine ? "我" : "TA",
            avatarUrl: log.isMine ? myAvatar : partnerAvatar
          }));

          // 🟢 检查是否需要启动倒计时
          if (pet.state === 'traveling' && pet.return_time) {
            this.startCountdown(pet.return_time);
          } else {
            this.stopCountdown();
            this.setData({ countdownStr: "" }); // 重置
          }

          this.setData({
            petState: pet.state || "idle",
            moodValue: moodValue,
            energyLevel: energyLevel,
            moodText: this.getMoodText(moodValue),
            energyText: this.getEnergyText(energyLevel),
            travelCount: pet.travel_count || 0,
            foodInventory: pet.food_inventory || {
              rice_ball: 0,
              luxury_bento: 0,
            },
            returnTimeStr: pet.return_time
              ? this.formatReturnTime(pet.return_time)
              : "",
            loveEnergy: res.result.love_energy || 0,
            logs: processedLogs, 
          });
        } else {
          // Fallback
          this.setData({
            petState: "idle",
            moodValue: 60,
            energyLevel: 80,
            moodText: "很开心",
            energyText: "精力充沛",
          });
          this.updateUserStatus();
        }
        this.updateRoomBackground();
        if (callback) callback();
      },
      fail: (err) => {
        console.error("Failed to fetch pet data:", err);
        this.updateUserStatus();
        this.updateRoomBackground();
        if (callback) callback();
      },
    });
  },

  onPetTap: function () {
    if (this.data.petState !== "idle") {
      this.setData({
        statusMessage:
          this.data.petState === "eating" ? "吃饭中..." : "旅行中...",
      });
      setTimeout(() => {
        this.setData({ statusMessage: "" });
      }, 2000);
      return;
    }

    this.setData({
      petAnimation: "pet-bounce",
    });

    this.createHeartParticles();

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "interact_with_pet",
        type: "pat",
      },
      success: (res) => {
        if (res.result.status === 200) {
          const newMood = Math.min(100, this.data.moodValue + 2);
          this.setData({
            moodValue: newMood,
            statusMessage: "好感度 +2 ❤️",
          });

          setTimeout(() => {
            this.setData({ statusMessage: "" });
          }, 2000);

          this.fetchPetData();
        } else {
          this.setData({
            statusMessage: res.result.msg || "互动失败",
          });
        }
      },
      fail: (err) => {
        console.error("Failed to interact with pet:", err);
        this.setData({
          statusMessage: "网络开小差了",
        });
      },
    });

    setTimeout(() => {
      this.setData({ petAnimation: "" });
    }, 600);
  },

  createHeartParticles: function () {
    const particles = [];
    for (let i = 0; i < 5; i++) {
      particles.push({
        id: Date.now() + i,
        left: 45 + Math.random() * 10,
        delay: i * 100,
      });
    }

    particles.forEach((p) => {
      setTimeout(() => {
        this.createHeartParticle(p.left);
      }, p.delay);
    });
  },

  createHeartParticle: function (leftPosition) {
    const particle = {
      id: Date.now() + Math.random(),
      left: leftPosition,
    };

    const particles = this.data.heartParticles || [];
    particles.push(particle);

    this.setData({
      heartParticles: particles,
    });

    setTimeout(() => {
      const updatedParticles = this.data.heartParticles.filter(
        (p) => p.id !== particle.id
      );
      this.setData({
        heartParticles: updatedParticles,
      });
    }, 2000);
  },

  onBackpackTap: function () {
    if (this.data.petState !== "idle") {
      wx.showToast({ title: "宠物正在忙碌中", icon: "none" });
      return;
    }
    this.showFoodPrepModal();
  },

  onPostcardsTap: function () {
    this.setData({ hasNewPostcards: false });
    wx.showToast({ title: "明信片功能开发中...", icon: "none" });
  },

  // 喂食相关逻辑
  showFeedModal() {
    if (this.data.petState !== "idle") {
      wx.showToast({ title: "宠物正在忙碌中", icon: "none" });
      return;
    }
    this.setData({ showFeedModal: true });
  },

  closeFeedModal() {
    this.setData({ showFeedModal: false });
  },

  onFeed(e) {
    const type = e.currentTarget.dataset.type;
    const count = this.data.foodInventory[type] || 0;

    // 1. 检查库存
    if (count <= 0) {
      this.setData({ showFeedModal: false });
      setTimeout(() => {
        this.showFoodPrepModal(); 
        wx.showToast({ title: '库存不足，请先制作', icon: 'none' });
      }, 300);
      return;
    }

    // 2. 调用喂食接口
    wx.showLoading({ title: '喂食中...' });
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "interact_with_pet",
        type: "feed",
        food_type: type
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: '喂食成功', icon: 'success' });
          this.setData({ 
            showFeedModal: false,
            statusMessage: "体力恢复中...", // 暂时显示
            petState: 'eating' // 播放动画
          });
          
          this.fetchPetData();
          
          setTimeout(() => {
             this.setData({
               statusMessage: "",
               petState: "idle"
             });
          }, 3000);
          
        } else {
          wx.showToast({ title: res.result.msg || '喂食失败', icon: 'none' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error(err);
        wx.showToast({ title: '网络异常', icon: 'none' });
      }
    });
  },

  onFoodPrep: function () {
    if (this.data.petState !== "idle") {
      wx.showToast({
        title: "宠物正在忙碌中",
        icon: "none",
      });
      return;
    }

    this.setData({
      showFoodPrepModal: true,
    });
  },

  showFoodPrepModal: function () {
    if (this.data.petState !== "idle") {
      wx.showToast({ title: "宠物正在忙碌中", icon: "none" });
      return;
    }
    this.setData({ showFoodPrepModal: true });
  },

  onFoodPrepModalCancel: function () {
    this.setData({ showFoodPrepModal: false });
  },

  onFoodPrepare: function (e) {
    const { foodType, cost } = e.detail;

    if (this.data.loveEnergy < cost) {
      wx.showToast({
        title: "爱意不足，去首页打卡获取吧~",
        icon: "none",
      });
      return;
    }

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "prepare_food",
        food_type: foodType,
      },
      success: (res) => {
        if (res.result.status === 200) {
          this.setData({
            loveEnergy: this.data.loveEnergy - cost,
            statusMessage: "正在准备食物...",
          });

          setTimeout(() => {
            this.onFoodPrepSuccess({ detail: { foodType } });
          }, 1000);
        } else {
          wx.showToast({
            title: res.result.msg || "准备失败",
            icon: "none",
          });
        }
      },
      fail: (err) => {
        console.error("Failed to prepare food:", err);
        wx.showToast({
          title: "网络开小差了",
          icon: "none",
        });
      },
    });
  },

  onFoodPrepSuccess: function (e) {
    const { foodType } = e.detail;
    const foodName = foodType === "rice_ball" ? "饭团便当" : "豪华御膳";

    const currentCount = this.data.foodInventory[foodType];
    this.setData({
      [`foodInventory.${foodType}`]: currentCount + 1,
      showFoodPrepModal: false,
      statusMessage: `成功准备${foodName}！`,
    });

    setTimeout(() => {
      this.setData({ statusMessage: "" });
    }, 2000);

    wx.showToast({
      title: `获得${foodName} x1`,
      icon: "success",
    });

    this.fetchPetData();
  },

  onTravelMap: function () {
    if (this.data.petState !== "idle") {
      wx.showToast({ title: "宠物正在旅行中", icon: "none" });
      return;
    }
    wx.navigateTo({ url: "/pages/travel_map/index" });
  },

  onPostcards: function () {
    this.setData({ hasNewPostcards: false });
    wx.navigateTo({ url: "/pages/postcards/index" });
  },

  formatReturnTime: function (returnTime) {
    const now = new Date();
    const returnDate = new Date(returnTime);
    const diff = returnDate - now;

    if (diff <= 0) return "已返回";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    }
    return `${minutes}分钟`;
  },

  formatTimeAgo: function (dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return "刚刚";
    if (diff < 3600) return Math.floor(diff / 60) + "分钟前";
    if (diff < 86400) return Math.floor(diff / 3600) + "小时前";
    return Math.floor(diff / 86400) + "天前";
  },

  getMoodText: function(value) {
    if (value >= 80) return "超开心";
    if (value >= 60) return "很开心";
    if (value >= 40) return "还不错";
    if (value >= 20) return "有点低落";
    return "很沮丧";
  },

  getEnergyText: function(value) {
    if (value >= 80) return "精力充沛";
    if (value >= 60) return "活力满满";
    if (value >= 40) return "还不错";
    if (value >= 30) return "有点累了";
    return "疲惫不堪";
  },

  onWater: function () {
    if (!this.checkPartner()) return;
    wx.showToast({ title: "请使用宠物互动功能", icon: "none" });
  },

  toggleLogModal: function () {
    this.setData({ showLogModal: !this.data.showLogModal });
  },

  onHarvest: function () {
    if (!this.checkPartner()) return;
    wx.showToast({ title: "请使用旅行功能", icon: "none" });
  },

  checkMessageHint: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_messages" },
      success: (res) => {
        if (res.result.status === 200) {
          const msgs = res.result.data || [];
          const partnerMsgs = msgs.filter((m) => !m.isMine);
          if (partnerMsgs.length > 0) {
            const latest = partnerMsgs[0];
            if (!latest.isLiked) {
              this.setData({ messageHint: true });
            } else {
              this.setData({ messageHint: false });
            }
          } else {
            this.setData({ messageHint: false });
          }
        }
      },
    });
  },

  navToBoard: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({ url: "/pages/message_board/index" });
  },

  checkCapsuleRedDot: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_capsules" },
      success: (res) => {
        if (res.result.status === 200) {
          const inbox = res.result.inbox || [];
          const hasNewSurprise = inbox.some((item) => item.canOpen);
          this.setData({ capsuleRedDot: hasNewSurprise });
        }
      },
    });
  },

  checkQuizHint: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_quiz_home" },
      success: (res) => {
        if (res.result.status === 200) {
          const round = res.result.currentRound;
          if (round) {
            if (round.my_progress < round.total) {
              this.setData({ quizHint: true });
            } else {
              this.setData({ quizHint: false });
            }
          } else {
            this.setData({ quizHint: false });
          }
        }
      },
    });
  },

  navToCapsule: function () {
    if (!this.checkPartner()) return;
    this.setData({ capsuleRedDot: false });
    wx.navigateTo({ url: "/pages/capsule/index" });
  },

  navToDecision: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({ url: "/pages/decision/index" });
  },
  navToCoupons: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({ url: "/pages/coupons/index" });
  },
  navToQuiz: function () {
    if (!this.checkPartner()) return;
    this.setData({ quizHint: false });
    wx.navigateTo({ url: "/pages/quiz/index" });
  },
  navToGuide: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({ url: "/pages/guide/index" });
  },
  onTodo: function () {
    if (!this.checkPartner()) return;
    wx.showToast({ title: "功能开发中...", icon: "none" });
  },

  closeEggModal: function () {
    this.setData({ showEggModal: false });
  },

  showHelp(e) {
    const type = e.currentTarget.dataset.type;
    const info = this.data.helpTexts[type];
    
    if (info) {
      this.setData({
        showHelpModal: true,
        helpTitle: info.title,
        helpContent: info.content
      });
    }
  },

  closeHelpModal() {
    this.setData({
      showHelpModal: false
    });
  },

  onShareAppMessage: function () {
    return {
      title: "欢迎来到萌宠乐园 🐾",
      path: "/pages/playground/index",
    };
  },

  onShareTimeline: function () {
    return {
      title: "欢迎来到萌宠乐园 🐾",
    };
  },
});