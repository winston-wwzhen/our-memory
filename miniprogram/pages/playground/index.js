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
    petAnimation: "",
    heartParticles: [], // Heart particles for pet interaction
    foodInventory: {
      rice_ball: 0,
      luxury_bento: 0,
    },

    // Food Preparation Modal
    showFoodPrepModal: false,
    testModal: false,

    // 提示状态
    capsuleRedDot: false,
    messageHint: false,
    quizHint: false,

    // 🥚 彩蛋
    showEggModal: false,
    eggData: null,
  },

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

  // 🟢 修复：添加下拉刷新监听函数
  onPullDownRefresh: function () {
    // 1. 刷新用户状态（积分等）
    this.updateUserStatus();

    // 2. 刷新提示红点
    if (app.globalData.userInfo && app.globalData.userInfo.partner_id) {
      this.checkCapsuleRedDot();
      this.checkMessageHint();
      this.checkQuizHint();
    }

    // 3. 刷新宠物数据，并在回调中停止下拉动画
    this.fetchPetData(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: "刷新成功", icon: "none" });
    });
  },

  // Time-based background update
  updateRoomBackground: function () {
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour >= 18;
    this.setData({
      roomBgImage: isNight ? "/images/pet/back.png" : "/images/pet/home.jpg",
    });
  },

  // Pet interaction
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

    // Trigger animation
    this.setData({
      petAnimation: "pet-pat",
    });

    // Create heart particles
    this.createHeartParticles();

    // Call backend to interact with pet
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

          // Refresh pet data to sync with backend
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

    // Reset animation
    setTimeout(() => {
      this.setData({ petAnimation: "" });
    }, 1000);
  },

  // Create heart particle effect
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

  // Create single heart particle
  createHeartParticle: function (leftPosition) {
    const particle = {
      id: Date.now() + Math.random(),
      left: leftPosition,
    };

    // Add particle to array
    const particles = this.data.heartParticles || [];
    particles.push(particle);

    this.setData({
      heartParticles: particles,
    });

    // Remove particle after animation
    setTimeout(() => {
      const updatedParticles = this.data.heartParticles.filter(
        (p) => p.id !== particle.id
      );
      this.setData({
        heartParticles: updatedParticles,
      });
    }, 2000);

    // Vibrate for haptic feedback
    wx.vibrateShort();
  },

  // Navigation handlers
  onBackpackTap: function () {
    if (this.data.petState !== "idle") {
      wx.showToast({ title: "宠物正在忙碌中", icon: "none" });
      return;
    }
    this.showFoodPrepModal();
  },

  onPostcardsTap: function () {
    this.setData({ hasNewPostcards: false });
    // Navigate to postcards page when implemented
    wx.showToast({ title: "明信片功能开发中...", icon: "none" });
  },

  onFoodPrep: function () {
    console.log(
      "onFoodPrep clicked! Current showFoodPrepModal:",
      this.data.showFoodPrepModal
    );

    // 检查宠物状态
    if (this.data.petState !== "idle") {
      wx.showToast({
        title: "宠物正在忙碌中",
        icon: "none",
      });
      return;
    }

    // 强制设置模态框显示
    this.setData(
      {
        showFoodPrepModal: true,
      },
      () => {
        console.log(
          "After setData callback - showFoodPrepModal:",
          this.data.showFoodPrepModal
        );
      }
    );
  },

  // Test function
  testModalFunction: function () {
    console.log("Test button clicked!");
    this.setData({ showFoodPrepModal: true });
  },

  // Food Preparation Modal handlers
  showFoodPrepModal: function () {
    if (this.data.petState !== "idle") {
      wx.showToast({ title: "宠物正在忙碌中", icon: "none" });
      return;
    }
    console.log("showFoodPrepModal called, setting to true");
    this.setData({ showFoodPrepModal: true });
  },

  onFoodPrepModalCancel: function () {
    this.setData({ showFoodPrepModal: false });
  },

  onFoodPrepare: function (e) {
    const { foodType, cost } = e.detail;

    // Check if user has enough love energy
    if (this.data.loveEnergy < cost) {
      wx.showToast({
        title: "爱意不足，去首页打卡获取吧~",
        icon: "none",
      });
      return;
    }

    // Call backend to prepare food
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "prepare_food",
        food_type: foodType,
      },
      success: (res) => {
        if (res.result.status === 200) {
          // Update love energy and food inventory
          this.setData({
            loveEnergy: this.data.loveEnergy - cost,
            statusMessage: "正在准备食物...",
          });

          // Simulate preparation time
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

    // Update food inventory
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

    // Refresh pet data to sync with backend
    this.fetchPetData();
  },

  onTravelMap: function () {
    if (this.data.petState !== "idle") {
      wx.showToast({ title: "宠物正在旅行中", icon: "none" });
      return;
    }
    // Navigate to travel map page
    wx.navigateTo({ url: "/pages/travel_map/index" });
  },

  onPostcards: function () {
    this.setData({ hasNewPostcards: false });
    // Navigate to postcards page
    wx.navigateTo({ url: "/pages/postcards/index" });
  },

  // Format return time
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

  // 🟢 核心修改：基于"盖章状态"判断提示
  checkMessageHint: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_messages" },
      success: (res) => {
        if (res.result.status === 200) {
          const msgs = res.result.data || [];

          // 1. 筛选出"对方"发的留言 (过滤掉我自己的)
          const partnerMsgs = msgs.filter((m) => !m.isMine);

          // 2. 找到最新一条
          if (partnerMsgs.length > 0) {
            const latest = partnerMsgs[0];

            // 3. 只有当"未盖章(isLiked false)"时，才显示提示
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

  // 💊 时光胶囊
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

  updateUserStatus: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "login" },
      success: (res) => {
        if (res.result.status === 200) {
          app.globalData.userInfo = res.result.user;
          // Update love energy from user data
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

  // Modified to fetch pet data instead of garden data
  fetchPetData: function (callback) {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_pet_status" },
      success: (res) => {
        if (res.result.status === 200) {
          const pet = res.result.pet || {};
          const moodValue = pet.mood_value || 60;
          const energyLevel = pet.energy_level || 80;
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
            // Update love energy from backend response
            loveEnergy: res.result.love_energy || 0,
            roseBalance: res.result.rose_balance || 0,
          });
        } else {
          // Fallback to default values if no pet exists
          const defaultMood = 60;
          const defaultEnergy = 80;
          this.setData({
            petState: "idle",
            moodValue: defaultMood,
            energyLevel: defaultEnergy,
            moodText: this.getMoodText(defaultMood),
            energyText: this.getEnergyText(defaultEnergy),
            travelCount: 0,
            foodInventory: {
              rice_ball: 0,
              luxury_bento: 0,
            },
          });
          // Still update user status to get love energy
          this.updateUserStatus();
        }
        this.updateRoomBackground();
        if (callback) callback();
      },
      fail: (err) => {
        console.error("Failed to fetch pet data:", err);
        // Fallback to default values on error
        const errorMood = 60;
        const errorEnergy = 80;
        this.setData({
          petState: "idle",
          moodValue: errorMood,
          energyLevel: errorEnergy,
          moodText: this.getMoodText(errorMood),
          energyText: this.getEnergyText(errorEnergy),
          travelCount: 0,
          foodInventory: {
            rice_ball: 0,
            luxury_bento: 0,
          },
        });
        // Still update user status to get love energy
        this.updateUserStatus();
        this.updateRoomBackground();
        if (callback) callback();
      },
    });
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

  // 转换心情数值为文字描述
  getMoodText: function(value) {
    if (value >= 80) return "超开心";
    if (value >= 60) return "很开心";
    if (value >= 40) return "还不错";
    if (value >= 20) return "有点低落";
    return "很沮丧";
  },

  // 转换体力数值为文字描述
  getEnergyText: function(value) {
    if (value >= 80) return "精力充沛";
    if (value >= 60) return "活力满满";
    if (value >= 40) return "还不错";
    if (value >= 30) return "有点累了";
    return "疲惫不堪";
  },

  // Legacy garden methods (kept for compatibility)
  onWater: function () {
    if (!this.checkPartner()) return;
    wx.showToast({ title: "请使用宠物互动功能", icon: "none" });
  },

  toggleLogModal: function () {
    if (!this.checkPartner()) return;
    this.setData({ showLogModal: !this.data.showLogModal });
  },

  onHarvest: function () {
    if (!this.checkPartner()) return;
    wx.showToast({ title: "请使用旅行功能", icon: "none" });
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
