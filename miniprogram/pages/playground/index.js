// miniprogram/pages/playground/index.js
const app = getApp();

Page({
  data: {
    loading: false,
    waterCount: 0,
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
    loveEnergy: 0,
    travelCount: 0,
    hasNewPostcards: false,
    statusMessage: "",
    returnTimeStr: "",

    // 宠物对话气泡相关
    petMessage: "",
    showBubble: false,

    // 飘字弹窗数组
    popups: [],

    // 倒计时字符串
    countdownStr: "",
    // 控制礼品盒显示
    showGiftBox: false,

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
    helpTitle: "",
    helpContent: "",
    // 🟢 关键新增：追踪食物制作的来源
    prepSource: "",
    helpTexts: {
      mood: {
        title: "关于心情 (Mood)",
        content:
          "心情影响着宠物的成长效率和互动反馈。\n\n💕 如何提升：\n经常抚摸宠物（点击它），或者给它准备好吃的食物，都能让它开心起来哦！",
      },
      energy: {
        title: "关于体力 (Energy)",
        content:
          "体力决定了宠物能否出门去远方旅行。\n\n🍱 如何提升：\n当体力不足时，请点击“行囊”为宠物准备便当，进食后体力会迅速恢复！",
      },
      love: {
        title: "关于爱意 (Love Energy)",
        content:
          "爱意是情侣空间的核心能量 💧\n\n✨ 主要作用：\n1. 制作宠物便当 (行囊 -> 制作)\n\n📈 获取方式：\n每日拍照打卡、完成每日任务、宠物旅行带回、或触发幸运彩蛋。",
      },
      rose: {
        title: "关于玫瑰 (Rose)",
        content:
          "玫瑰是珍贵的稀有信物 🌹\n\n✨ 主要作用：\n用于兑换「特权工坊」中的稀有卡券（如和好卡、许愿卡、静音卡等）。后续可兑换高级情侣头像、获取宠物皮肤等多种用途。\n\n📈 获取方式：\n宠物旅行时概率掉落，心情越好掉落概率越高哦！",
      },
    },

    roseBalance: 0, // 🌹 玫瑰余额
  },

  timer: null, // 定时器引用
  bubbleTimer: null, // 气泡定时器

  onShow: function () {
    if (!this.data.navHeight) {
      this.setData({
        navHeight: app.globalData.navBarHeight,
        statusBarHeight: app.globalData.statusBarHeight,
      });
    }
    this.updateUserStatus();
    this.fetchPetData(true); // 传入 true 表示是 onShow 触发

    // 检查红点状态
    if (app.globalData.userInfo && app.globalData.userInfo.partner_id) {
      this.checkCapsuleRedDot();
      this.checkMessageHint();
      this.checkQuizHint();
    }
  },

  onHide: function () {
    this.stopCountdown();
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
  },

  onUnload: function () {
    this.stopCountdown();
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
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
      wx.showToast({
        title: "刷新成功",
        icon: "none",
      });
    });
  },

  // 🟢 新增：显示飘字动画
  showPopup: function (text) {
    const id = Date.now() + Math.random(); // 唯一ID
    // 随机微调位置，让飘字不重叠
    const randomX = (Math.random() - 0.5) * 60;

    const newPopup = { id, text, x: randomX };

    this.setData({
      popups: [...this.data.popups, newPopup],
    });

    // 动画结束后移除
    setTimeout(() => {
      const nextPopups = this.data.popups.filter((p) => p.id !== id);
      this.setData({ popups: nextPopups });
    }, 1000);
  },

  // 宠物说话逻辑
  sayHello: function () {
    const hours = new Date().getHours();
    let msgs = [
      "你回来啦！",
      "好想你呀~",
      "等你很久咯！",
      "你已经三分钟没看我了",
      "生活不易，狗狗叹气。",
      "今天的心情是：想去旅游！",
      "你在看什么好玩的？",
      "我会一直陪着你~",
    ];
    if (hours < 9)
      msgs = [
        "早安主人！",
        "又是元气满满的一天！",
        "太阳晒屁股啦！",
        "早起的狗狗有肉吃！",
      ];
    else if (hours > 22)
      msgs = [
        "这么晚了，早点休息哦",
        "还没睡嘛？",
        "熬夜会变秃的~",
        "本汪要去梦里追蝴蝶了。",
        "还不睡？在偷偷想谁呢？",
      ];

    this.sayRandomText(msgs);
  },

  sayInteractText: function () {
    const msgs = [
      "嘻嘻~",
      "再摸摸头",
      "好痒呀~",
      "最喜欢你了❤️",
      "蹭蹭你~",
      "好痒~ 再挠一下！",
      "你的手好暖和呀~",
      "再摸我要收费了哦~",
      "蹭蹭~ 最喜欢你了！",
    ];
    this.sayRandomText(msgs);
  },

  sayEatingText: function () {
    const msgs = [
      "真好吃！",
      "啊呜啊呜",
      "肚子饱饱，心情好好",
      "谢谢主人的投喂！",
      "真香！干饭人干饭魂！",
      "呜好吃好吃，满血复活！",
      "这就是五星级大厨的水准吗？",
    ];
    this.sayRandomText(msgs);
  },

  sayRandomText: function (msgs) {
    if (!msgs || msgs.length === 0) return;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    this.showPetMessage(msg);
  },

  showPetMessage: function (msg) {
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);

    this.setData({
      petMessage: msg,
      showBubble: true,
    });

    this.bubbleTimer = setTimeout(() => {
      this.setData({ showBubble: false });
    }, 3500); // 3.5秒后消失
  },

  // 更新用户状态 (爱意值等)
  updateUserStatus: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "login",
      },
      success: (res) => {
        if (res.result.status === 200) {
          app.globalData.userInfo = res.result.user;
          this.setData({
            loveEnergy: res.result.user.water_count || 0,
            roseBalance: res.result.user.rose_balance || 0, // 🟢 [新增] 同步玫瑰数量
          });
        }
      },
      fail: (err) => {
        console.error("Failed to update user status:", err);
      },
    });
  },

  // 检查绑定状态
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
            wx.switchTab({
              url: "/pages/mine/index",
            });
          }
        },
      });
      return false;
    }
    return true;
  },

  // 倒计时核心逻辑
  startCountdown: function (returnTimeStr) {
    this.stopCountdown(); // 清除旧的

    if (!returnTimeStr) return;

    const targetTime = new Date(returnTimeStr).getTime();

    const update = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        // 倒计时结束，显示礼品盒 🎁
        this.stopCountdown();
        this.setData({
          countdownStr: "",
          showGiftBox: true,
        });
        wx.vibrateLong(); // 震动提示
        return;
      }

      // 格式化 HH:MM:SS
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      const pad = (n) => (n < 10 ? `0${n}` : n);
      this.setData({
        countdownStr: `${pad(h)}:${pad(m)}:${pad(s)}`,
      });
    };

    update(); // 立即执行一次
    this.timer = setInterval(update, 1000);
  },

  stopCountdown: function () {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // 获取宠物数据
  fetchPetData: function (isFromOnShow = false) {
    // 如果传入的是 function，则认为是回调
    let callback = null;
    if (typeof isFromOnShow === "function") {
      callback = isFromOnShow;
      isFromOnShow = false;
    }

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "get_pet_status",
      },
      success: (res) => {
        if (res.result.status === 200) {
          const pet = res.result.pet || {};
          const moodValue = pet.mood_value || 60;
          const energyLevel = pet.energy_level || 80;

          const rawLogs = res.result.logs || [];
          const myAvatar =
            app.globalData.userInfo?.avatarUrl || "/images/default-avatar.png";
          const partnerAvatar = "/images/default-avatar.png";

          const processedLogs = rawLogs.map((log) => ({
            ...log,
            timeAgo: this.formatTimeAgo(log.date),
            nickName: log.isMine ? "我" : "TA",
            avatarUrl: log.isMine ? myAvatar : partnerAvatar,
          }));

          // 检查是否需要启动倒计时或显示礼品盒
          let showGiftBox = false;
          if (pet.state === "traveling" && pet.return_time) {
            const now = new Date().getTime();
            const returnTime = new Date(pet.return_time).getTime();

            if (now >= returnTime) {
              // 时间已到，但后端未结算 -> 显示礼品盒 🎁
              showGiftBox = true;
              this.stopCountdown();
            } else {
              // 时间未到 -> 继续倒计时 ⏳
              this.startCountdown(pet.return_time);
            }
          } else {
            this.stopCountdown();
            this.setData({
              countdownStr: "",
            }); // 重置
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
            roseBalance: res.result.rose_balance || 0,
            logs: processedLogs,
            showGiftBox: showGiftBox,
          });

          // 如果是进入页面且宠物在家，打个招呼
          if (isFromOnShow === true && pet.state !== "traveling") {
            this.sayHello();
          }
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
        if (callback) callback();
      },
      fail: (err) => {
        console.error("Failed to fetch pet data:", err);
        this.updateUserStatus();
        if (callback) callback();
      },
    });
  },

  // 点击礼品盒领取奖励
  onCollectReward: function () {
    if (this.data.loading) return;

    this.setData({
      loading: true,
    });
    wx.showLoading({
      title: "拆礼物中...",
      mask: true,
    });

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "collect_travel_rewards",
      },
      success: (res) => {
        wx.hideLoading();
        this.setData({
          loading: false,
        });

        if (res.result.status === 200) {
          const { rewards } = res.result;

          // 隐藏礼品盒
          this.setData({
            showGiftBox: false,
            petState: "idle", // 强制设为空闲
            statusMessage: "", // 清空可能存在的提示
            countdownStr: "", // 清空倒计时
          });

          // 构造奖励提示文案
          let msg = `🌹 玫瑰 +${rewards.roses}`;
          if (rewards.specialty) {
            msg += `\n🍱 特产：${rewards.specialty.name}`;
          }
          if (rewards.love_energy > 0) {
            msg += `\n💧 爱意值 +${rewards.love_energy}`;
          }

          // 弹窗展示喜悦
          wx.showModal({
            title: "🎁 旅行归来",
            content: msg,
            showCancel: false,
            confirmText: "开心收下",
            confirmColor: "#ff6b81",
            success: () => {
              // 用户点确认后，刷新最新状态
              this.fetchPetData();
              this.updateUserStatus();
            },
          });
        } else {
          wx.showToast({
            title: res.result.msg || "领取失败",
            icon: "none",
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        this.setData({
          loading: false,
        });
        console.error(err);
        wx.showToast({
          title: "网络开小差了",
          icon: "none",
        });
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
        this.setData({
          statusMessage: "",
        });
      }, 2000);
      return;
    }

    this.setData({
      petAnimation: "pet-bounce",
    });

    // 触发对话
    this.sayInteractText();

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
          });

          // 🟢 触发好感度飘字，而不是 statusMessage
          this.showPopup("❤️ +2");

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
      this.setData({
        petAnimation: "",
      });
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
      wx.showToast({
        title: "宠物正在忙碌中",
        icon: "none",
      });
      return;
    }
    // 🟢 修改：记录来源为 'backpack'
    this.setData({
      prepSource: "backpack",
    });
    this.showFoodPrepModal();
  },

  onPostcardsTap: function () {
    this.setData({
      hasNewPostcards: false,
    });
    wx.showToast({
      title: "明信片功能开发中...",
      icon: "none",
    });
  },

  // 喂食相关逻辑
  showFeedModal() {
    if (this.data.petState !== "idle") {
      wx.showToast({
        title: "宠物正在忙碌中",
        icon: "none",
      });
      return;
    }
    this.setData({
      showFeedModal: true,
    });
  },

  closeFeedModal() {
    this.setData({
      showFeedModal: false,
    });
  },

  onFeed(e) {
    if (this.data.petState !== "idle") {
      wx.showToast({
        title: "宠物正在忙碌中",
        icon: "none",
      });
      this.setData({ showFeedModal: false });
      return;
    }

    const type = e.currentTarget.dataset.type;
    const count = this.data.foodInventory[type] || 0;

    // 1. 检查库存
    if (count <= 0) {
      this.setData({
        showFeedModal: false,
        // 🟢 修改：记录来源为 'feed'
        prepSource: "feed",
      });
      setTimeout(() => {
        this.showFoodPrepModal();
        wx.showToast({
          title: "库存不足，请先制作",
          icon: "none",
        });
      }, 300);
      return;
    }

    // 2. 调用喂食接口
    wx.showLoading({
      title: "喂食中...",
    });
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "interact_with_pet",
        type: "feed",
        food_type: type,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({
            title: "喂食成功",
            icon: "success",
          });

          this.setData({
            showFeedModal: false,
            statusMessage: "体力恢复中...",
            petState: "eating",
          });

          // 喂食说话
          this.sayEatingText();

          this.fetchPetData();

          setTimeout(() => {
            this.setData({
              statusMessage: "",
              petState: "idle",
            });
          }, 3000);
        } else {
          wx.showToast({
            title: res.result.msg || "喂食失败",
            icon: "none",
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error(err);
        wx.showToast({
          title: "网络异常",
          icon: "none",
        });
      },
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

  onFoodPrepModalCancel: function () {
    // 🟢 修改：取消制作时，重置 prepSource，但不影响 feed 弹窗
    const prepSource = this.data.prepSource;
    this.setData({
      showFoodPrepModal: false,
      prepSource: "",
    });
    // 如果是从 feed 跳转过来的，取消时重新打开 feed modal
    if (prepSource === "feed") {
      this.showFeedModal();
    }
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
            this.onFoodPrepSuccess({
              detail: {
                foodType,
              },
            });
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

  // 🟢 关键修改：根据 prepSource 决定是否重新弹出喂食弹窗
  onFoodPrepSuccess: function (e) {
    const { foodType } = e.detail;
    const foodName = foodType === "rice_ball" ? "饭团便当" : "豪华御膳";
    const prepSource = this.data.prepSource; // 获取制作来源

    const currentCount = this.data.foodInventory[foodType];
    this.setData({
      [`foodInventory.${foodType}`]: currentCount + 1,
      showFoodPrepModal: false,
      statusMessage: `成功准备${foodName}！`,
      prepSource: "", // 重置来源，防止影响下一次操作
    });

    setTimeout(() => {
      this.setData({
        statusMessage: "",
      });
    }, 2000);

    wx.showToast({
      title: `获得${foodName}+1`,
      icon: "success",
    });

    this.fetchPetData();

    // 只有当制作来源是 'feed' (因库存不足) 时，才重新显示喂食弹窗
    if (prepSource === "feed") {
      this.showFeedModal();
    }
  },

  onTravelMap: function () {
    if (this.data.petState !== "idle") {
      wx.showToast({
        title: "宠物正在旅行中",
        icon: "none",
      });
      return;
    }
    wx.navigateTo({
      url: "/pages/travel_map/index",
    });
  },

  onPostcards: function () {
    this.setData({
      hasNewPostcards: false,
    });
    wx.navigateTo({
      url: "/pages/postcards/index",
    });
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

  getMoodText: function (value) {
    if (value >= 80) return "超开心";
    if (value >= 60) return "很开心";
    if (value >= 40) return "还不错";
    if (value >= 20) return "有点低落";
    return "很沮丧";
  },

  getEnergyText: function (value) {
    if (value >= 80) return "精力充沛";
    if (value >= 60) return "活力满满";
    if (value >= 40) return "还不错";
    if (value >= 30) return "有点累了";
    return "疲惫不堪";
  },

  // 🟢 宠物改名逻辑
  onRenamePet: function () {
    wx.showModal({
      title: "给宠物起个名字",
      content: this.data.petName,
      editable: true, // 开启输入框
      placeholderText: "请输入新名字 (6字内)",
      success: (res) => {
        if (res.confirm && res.content) {
          const newName = res.content.trim();
          if (newName === this.data.petName) return;

          this.doRename(newName);
        }
      },
    });
  },

  doRename: function (newName) {
    wx.showLoading({ title: "改名中..." });

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "rename_pet",
        name: newName,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          this.setData({
            petName: newName,
          });
          wx.showToast({ title: "改名成功", icon: "success" });

          // 触发一个小气泡反馈
          this.showPetMessage(`我有新名字啦！叫我${newName}吧~`);
        } else {
          wx.showToast({ title: res.result.msg || "改名失败", icon: "none" });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: "网络开小差了", icon: "none" });
      },
    });
  },

  toggleLogModal: function () {
    this.setData({
      showLogModal: !this.data.showLogModal,
    });
  },

  checkMessageHint: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "get_messages",
      },
      success: (res) => {
        if (res.result.status === 200) {
          const msgs = res.result.data || [];
          const partnerMsgs = msgs.filter((m) => !m.isMine);
          if (partnerMsgs.length > 0) {
            const latest = partnerMsgs[0];
            if (!latest.isLiked) {
              this.setData({
                messageHint: true,
              });
            } else {
              this.setData({
                messageHint: false,
              });
            }
          } else {
            this.setData({
              messageHint: false,
            });
          }
        }
      },
    });
  },

  navToBoard: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({
      url: "/pages/message_board/index",
    });
  },

  checkCapsuleRedDot: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "get_capsules",
      },
      success: (res) => {
        if (res.result.status === 200) {
          const inbox = res.result.inbox || [];
          const hasNewSurprise = inbox.some((item) => item.canOpen);
          this.setData({
            capsuleRedDot: hasNewSurprise,
          });
        }
      },
    });
  },

  checkQuizHint: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "get_quiz_home",
      },
      success: (res) => {
        if (res.result.status === 200) {
          const round = res.result.currentRound;
          if (round) {
            if (round.my_progress < round.total) {
              this.setData({
                quizHint: true,
              });
            } else {
              this.setData({
                quizHint: false,
              });
            }
          } else {
            this.setData({
              quizHint: false,
            });
          }
        }
      },
    });
  },

  navToCapsule: function () {
    if (!this.checkPartner()) return;
    this.setData({
      capsuleRedDot: false,
    });
    wx.navigateTo({
      url: "/pages/capsule/index",
    });
  },

  navToDecision: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({
      url: "/pages/decision/index",
    });
  },
  navToCoupons: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({
      url: "/pages/coupons/index",
    });
  },
  navToQuiz: function () {
    if (!this.checkPartner()) return;
    this.setData({
      quizHint: false,
    });
    wx.navigateTo({
      url: "/pages/quiz/index",
    });
  },
  navToGuide: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({
      url: "/pages/guide/index",
    });
  },
  navToCoupleAvatar: function () {
    wx.navigateTo({
      url: "/pages/avatar_list/index",
    });
  },

  onTodo: function () {
    if (!this.checkPartner()) return;
    wx.showToast({
      title: "功能开发中...",
      icon: "none",
    });
  },

  closeEggModal: function () {
    this.setData({
      showEggModal: false,
    });
  },

  showHelp(e) {
    const type = e.currentTarget.dataset.type;
    const info = this.data.helpTexts[type];

    if (info) {
      this.setData({
        showHelpModal: true,
        helpTitle: info.title,
        helpContent: info.content,
      });
    }
  },

  closeHelpModal() {
    this.setData({
      showHelpModal: false,
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
