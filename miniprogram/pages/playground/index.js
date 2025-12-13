// miniprogram/pages/playground/index.js
const app = getApp();

Page({
  data: {
    loading: false,
    waterCount: 0, // 今日剩余记录次数
    interactionCount: 0, // 总互动次数
    daysTogether: 0, // 相伴天数
    memoryCount: 0, // 回忆数量
    chancesLeft: 0, // 今日剩余机会
    progress: 0,
    logs: [],
    showLogModal: false,
    navHeight: app.globalData.navBarHeight,
    statusBarHeight: app.globalData.statusBarHeight,

    // 添加缺失的数据字段
    lastRequestTime: 0, // 最后请求时间，用于防重复

    // 提示状态
    capsuleRedDot: false,
    messageHint: false,
    quizHint: false,

    // 🥚 彩蛋
    showEggModal: false,
    eggData: null,

    // 记录状态
    status: "IDLE", // 枚举: IDLE, READY_TO_TRAVEL, TRAVELING, READY_TO_HARVEST
    travelLeftSec: 0, // 剩余秒数
    travelCountDown: "00:00:00", // 格式化显示

    // 动画效果
    showHearts: false,
    feedingAnimation: false,
    interactionHint: '', // 互动提示
    partnerStatus: '', // 伴侣状态

    // 旅行进度
    travelProgress: 0, // 进度环旋转角度
    travelProgressPercentage: 0, // 进度百分比

    // 宠物信息
    petInfo: {
      level: 1,
      levelName: '幼崽期',
      exp: 0,
      currentLevelExp: 0,
      nextLevelExp: 30,
      expProgress: 0,
      mood: 100,
      moodName: '超开心',
      moodEmoji: '😄'
    },

    // 新增UI状态
    showStatusDetail: false, // 是否展开状态详情
    currentWeather: '☀️', // 当前天气
    currentTime: '', // 当前时间
    petState: 'happy', // 宠物状态
    petSpeechText: '嗨，主人！来陪我玩吧~', // 宠物对话
    showSparkles: false, // 是否显示星星特效
    petAnimation: 'bounce-anim idle-breathing', // 宠物动画
    petMainAnimation: null, // 主要动画效果
    showGuide: false, // 是否显示引导
    guideDirection: 'up', // 引导方向
    guideText: '点击宠物进行互动', // 引导文字

    // 动画实例
    heartAnimation1: null,
    heartAnimation2: null,
    heartAnimation3: null,
    sparkleAnimation1: null,
    sparkleAnimation2: null,
    sparkleAnimation3: null,

    // 宠物状态图片映射
    petImages: {
      'IDLE': '../../images/pet_idle.png',
      'READY_TO_TRAVEL': '../../images/pet_return.png',
      'TRAVELING': '../../images/note.png',
      'READY_TO_HARVEST': '../../images/gift.png'
    },
    defaultPetImage: '../../images/pet_idle.png',

    // 状态图标映射
    statusIcons: {
      'READY_TO_TRAVEL': '🎒',
      'READY_TO_HARVEST': '🎁',
      'TRAVELING': '✈️'
    },

    // 新增UI状态
    showPetGlow: true, // 是否显示光环
    petMoodLevel: 'happy', // 心情等级
    showMoodIndicator: true, // 是否显示心情指示器
    showMusicNotes: false, // 是否显示音符特效
    guideType: 'default', // 引导类型
    heartAnimation4: null, // 第4个爱心动画
    sparkleAnimation4: null, // 第4个星星动画
    noteAnimation1: null, // 音符动画
    noteAnimation2: null,
    noteAnimation3: null
  },

  timer: null, // 倒计时句柄

  onUnload: function () {
    if (this.timer) clearInterval(this.timer);
  },

  onShow: function () {
    if (!this.data.navHeight) {
      this.setData({
        navHeight: app.globalData.navBarHeight,
        statusBarHeight: app.globalData.statusBarHeight,
      });
    }
    this.updateUserStatus();
    this.fetchGardenData();

    // 初始化新功能
    this.updateTimeAndWeather();

    // 仅当有伴侣时，才检查双人互动的红点
    if (app.globalData.userInfo && app.globalData.userInfo.partner_id) {
      this.checkCapsuleRedDot();
      this.checkMessageHint();
      this.checkQuizHint();
    }
  },

  onPullDownRefresh: function () {
    this.updateUserStatus();
    if (app.globalData.userInfo && app.globalData.userInfo.partner_id) {
      this.checkCapsuleRedDot();
      this.checkMessageHint();
      this.checkQuizHint();
    }
    this.fetchGardenData(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: "状态已更新", icon: "none" });
    });
  },

  // === 核心逻辑修改：新增登录检查，用于单人功能 ===
  checkLogin: function () {
    if (!app.globalData.userInfo) {
      wx.showToast({ title: "数据加载中...", icon: "none" });
      return false;
    }
    return true;
  },

  // === 保持原有：双人强关联功能检查 ===
  checkPartner: function () {
    const user = app.globalData.userInfo;
    if (!user || !user.partner_id) {
      wx.showModal({
        title: "情侣专属功能",
        content:
          "此功能需要两个人一起玩哦 💕\n\n快去【Mine】页面邀请另一半绑定吧！",
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

  updateUserStatus: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "login" },
      success: (res) => {
        if (res.result.status === 200) {
          app.globalData.userInfo = res.result.user;
        }
      },
    });
  },

  fetchGardenData: function (callback) {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_garden" },
      success: (res) => {
        if (res.result.status === 200) {
          const { garden, water, logs, travelLeft, partnerActivity, petInfo } = res.result;
          const interaction = garden.interaction_count || 0;

          // 计算相伴天数
          const startDate = garden.created_at ? new Date(garden.created_at) : new Date();
          const daysTogether = Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24)) + 1;

          const memoryCount = garden.harvest_total || 0;
          const chancesLeft = water || 0;

          // === Phase 2 状态推导 ===
          let currentStatus = "IDLE";
          if (interaction >= 30) {  // 满30次互动可以创建回忆录
            if (garden.travel_start_time) {
              if (travelLeft && travelLeft > 0) {
                currentStatus = "TRAVELING";
              } else {
                currentStatus = "READY_TO_HARVEST";
              }
            } else {
              currentStatus = "READY_TO_TRAVEL";
            }
          }

          // 如果在整理回忆中，启动倒计时
          if (currentStatus === "TRAVELING") {
            this.startCountdown(travelLeft);
          } else {
            if (this.timer) clearInterval(this.timer);
          }

          let finalProgress = Math.min((interaction % 30 / 30) * 100, 100);

          const formattedLogs = (logs || []).map((item) => {
            item.timeAgo = this.formatTimeAgo(item.date);
            // 保持原有的宠物相关文案
            // 单人模式下修正显示
            if (!item.nickName && item.isMine && app.globalData.userInfo) {
              item.nickName = app.globalData.userInfo.nickName;
            }
            return item;
          });

          // 处理伴侣活动状态
          let partnerStatus = '';
          if (partnerActivity) {
            const now = Date.now();
            const activityTime = new Date(partnerActivity.timestamp).getTime();
            const timeDiff = now - activityTime;

            // 如果5分钟内有活动
            if (timeDiff < 5 * 60 * 1000) {
              if (partnerActivity.action === 'feed') {
                partnerStatus = `${partnerActivity.nickName} 刚刚喂食了萌宠 🐾`;
              } else if (partnerActivity.action === 'travel') {
                partnerStatus = `${partnerActivity.nickName} 带萌宠去旅行了 ✈️`;
              }
            }
          }

          this.setData({
            waterCount: chancesLeft,
            interactionCount: interaction,
            daysTogether: daysTogether,
            memoryCount: memoryCount,
            chancesLeft: chancesLeft,
            progress: finalProgress + "%",
            status: currentStatus,
            travelLeftSec: travelLeft || 0,
            logs: formattedLogs,
            partnerStatus: partnerStatus,
            petInfo: petInfo || this.data.petInfo // 更新宠物信息
          });

          // 更新宠物状态和对话
          this.updatePetState();
        }
        if (callback) callback();
      },
      fail: (err) => {
        console.error(err);
        if (callback) callback();
      },
    });
  },

  // 倒计时逻辑
  startCountdown: function (seconds) {
    if (this.timer) clearInterval(this.timer);

    const TRAVEL_DURATION = 60; // 1分钟 = 60秒
    let left = seconds;
    const update = () => {
      if (left <= 0) {
        clearInterval(this.timer);
        this.setData({ status: "READY_TO_HARVEST" });
        return;
      }
      // 格式化 HH:mm:ss
      const h = Math.floor(left / 3600);
      const m = Math.floor((left % 3600) / 60);
      const s = Math.floor(left % 60);
      const str = `${h}:${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;

      // 计算进度
      const progress = ((TRAVEL_DURATION - left) / TRAVEL_DURATION) * 100;
      const rotation = (progress / 100) * 360;

      this.setData({
        travelCountDown: str,
        travelProgress: rotation,
        travelProgressPercentage: Math.round(progress)
      });
      left--;
    };

    update(); // 立即执行一次
    this.timer = setInterval(update, 1000);
  },

  // 新增：开始旅行
  onStartTravel: function () {
    if (!this.checkLogin()) return;
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "start_travel" },
      success: (res) => {
        this.setData({ loading: false });
        if (res.result.status === 200) {
          wx.showToast({ title: "出发啦！", icon: "none" });
          this.fetchGardenData(); // 刷新以进入倒计时状态
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      },
      fail: () => {
        this.setData({ loading: false });
        wx.showToast({ title: "网络异常", icon: "none" });
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

  // 🟢 修改：仅检查登录，单人可喂食
  onFeed: function () {
    if (!this.checkLogin()) return;

    // 防重复提交检查
    if (this.data.loading) {
      console.log("操作进行中，请勿重复点击");
      return;
    }

    if (this.data.waterCount < 1) {
      wx.showToast({ title: "粮仓空了，快去打卡赚爱心粮！", icon: "none" });
      return;
    }

    // 生成唯一的请求ID
    const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

    this.setData({
      loading: true,
      lastRequestTime: Date.now() // 记录请求时间
    });

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "water_flower",
        requestId: requestId // 发送请求ID
      },
      success: (res) => {
        // 检查是否是最新的请求（防止旧请求的响应覆盖新请求）
        if (Date.now() - this.data.lastRequestTime > 5000) {
          console.log("请求响应超时，忽略");
          return;
        }

        this.setData({ loading: false });
        if (res.result.status === 200) {
          // 播放喂食动画
          this.playFeedAnimation();
          wx.showToast({ title: "投喂成功 +5❤️", icon: "success" });
          this.fetchGardenData();
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      },
      fail: (err) => {
        console.error("喂食失败:", err);
        // 检查是否是最新的请求
        if (Date.now() - this.data.lastRequestTime > 5000) {
          console.log("请求响应超时，忽略");
          return;
        }

        this.setData({ loading: false });
        wx.showToast({ title: "网络开小差了，请重试", icon: "none" });
      },
    });
  },

  toggleLogModal: function () {
    if (!this.checkLogin()) return;
    this.setData({ showLogModal: !this.data.showLogModal });
  },

  onWelcomeHome: function () {
    if (!this.checkLogin()) return;
    wx.showModal({
      title: "宝贝回家啦！",
      content:
        "您的萌宠旅行归来，不仅带回了珍贵的明信片，还为您准备了 1 朵玫瑰花！🌹\n\n快去相册看看带回的明信片吧~",
      confirmText: "收下礼物",
      confirmColor: "#ff6b81",
      showCancel: false,
      success: (res) => {
        if (res.confirm) this.doFinishTravel();
      },
    });
  },

  doFinishTravel: function () {
    this.setData({ loading: true });
    wx.showLoading({ title: "领取中..." });

    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "harvest_garden" },
      success: (res) => {
        wx.hideLoading();
        this.setData({ loading: false });
        if (res.result.status === 200) {
          // 检查是否有明信片
          if (res.result.drop) {
            wx.showModal({
              title: "🎁 旅行归来",
              content: `萌宠带回了珍贵的明信片：${res.result.drop.name}！\n快去相册查看吧~`,
              showCancel: false,
              confirmText: "去相册",
              success: (modalRes) => {
                if (modalRes.confirm) {
                  // 延迟跳转，让用户看到成功提示
                  setTimeout(() => {
                    wx.navigateTo({ url: "/pages/album/index" });
                  }, 300);
                }
              }
            });
          } else {
            wx.showToast({
              title: "领取成功 🌹",
              icon: "success",
              duration: 2000,
            });
          }

          this.fetchGardenData();

          if (res.result.triggerEgg) {
            this.setData({
              showEggModal: true,
              eggData: res.result.triggerEgg,
            });
            wx.vibrateLong();
          }
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        this.setData({ loading: false });
        wx.showToast({ title: "网络错误", icon: "none" });
      },
    });
  },

  // === 页面跳转区 ===

  // 🟡 保持限制：留言板是双人互动
  navToBoard: function () {
    if (!this.checkPartner()) return;
    wx.navigateTo({ url: "/pages/message_board/index" });
  },

  // 🟡 保持限制：默契问答是双人互动
  navToQuiz: function () {
    if (!this.checkPartner()) return;
    this.setData({ quizHint: false });
    wx.navigateTo({ url: "/pages/quiz/index" });
  },

  // 🟡 保持限制：时光胶囊通常寄给对方（也可改为单人，暂时保留限制）
  navToCapsule: function () {
    if (!this.checkPartner()) return;
    this.setData({ capsuleRedDot: false });
    wx.navigateTo({ url: "/pages/capsule/index" });
  },

  // 🟢 开放：决定助手是工具
  navToDecision: function () {
    if (!this.checkLogin()) return;
    wx.navigateTo({ url: "/pages/decision/index" });
  },

  // 🟢 开放：权益券（单人模式下部分锁定，页面内处理）
  navToCoupons: function () {
    if (!this.checkLogin()) return;
    wx.navigateTo({ url: "/pages/coupons/index" });
  },

  // 🟢 开放：恋爱宝典是攻略
  navToGuide: function () {
    wx.navigateTo({ url: "/pages/guide/index" });
  },

  // 🟢 导航到相册
  navToAlbum: function () {
    wx.navigateTo({ url: "/pages/album/index" });
  },

  // 导航到更多功能页面
  navToFunHub: function () {
    wx.switchTab({
      url: '/pages/fun-hub/index'
    });
  },

  // 辅助函数
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
            this.setData({ messageHint: !latest.isLiked });
          } else {
            this.setData({ messageHint: false });
          }
        }
      },
    });
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
          if (round && round.my_progress < round.total) {
            this.setData({ quizHint: true });
          } else {
            this.setData({ quizHint: false });
          }
        }
      },
    });
  },

  closeEggModal: function () {
    this.setData({ showEggModal: false });
  },

  onShareAppMessage: function () {
    return {
      title: "快来喂养我们的专属萌宠 🐶",
      path: "/pages/playground/index",
    };
  },

  onShareTimeline: function () {
    return {
      title: "我们的纪念册 - 恋爱萌宠上线啦 🎡",
    };
  },

  // 播放喂食动画
  playFeedAnimation: function () {
    // 触发震动反馈
    wx.vibrateShort();

    // 显示互动提示
    this.showInteractionHint("❤️");

    // 显示爱心
    this.setData({ showHearts: true });

    // 触发宠物动画
    this.setData({ feedingAnimation: true });

    // 延时隐藏爱心和动画
    setTimeout(() => {
      this.setData({ showHearts: false });
      this.setData({ feedingAnimation: false });
    }, 1500);
  },

  // 显示互动提示
  showInteractionHint: function(hint) {
    this.setData({ interactionHint: hint });
    setTimeout(() => {
      this.setData({ interactionHint: '' });
    }, 1000);
  },

  // === 新增的UI交互方法 ===

  // 切换状态详情展示
  toggleStatusDetail: function() {
    this.setData({
      showStatusDetail: !this.data.showStatusDetail
    });
  },

  // 更新时间和天气
  updateTimeAndWeather: function() {
    const now = new Date();
    const hour = now.getHours();

    // 更新时间
    let timeText = '';
    if (hour < 6) {
      timeText = '凌晨';
      this.setData({ currentWeather: '🌙', petState: 'sleepy', petSpeechText: '嘘...主人，我好困...' });
    } else if (hour < 12) {
      timeText = '上午';
      this.setData({ currentWeather: '☀️', petState: 'happy', petSpeechText: '早上好，主人！充满活力的一天开始啦！' });
    } else if (hour < 18) {
      timeText = '下午';
      this.setData({ currentWeather: '⛅', petState: 'happy', petSpeechText: '主人，陪我玩一会儿吧~' });
    } else {
      timeText = '晚上';
      this.setData({ currentWeather: '🌙', petState: 'excited', petSpeechText: '夜晚最适合玩耍啦！' });
    }

    this.setData({ currentTime: timeText });
  },

  // 宠物点击事件
  onPetTap: function() {
    // 隐藏引导
    if (this.data.showGuide) {
      this.setData({ showGuide: false });
    }

    // 播放点击动画
    const animation = wx.createAnimation({
      duration: 200,
      timingFunction: 'ease-in-out'
    });
    animation.scale(0.9).step();
    animation.scale(1).step();
    this.setData({ petMainAnimation: animation.export() });

    // 显示爱心特效
    this.triggerHeartEffect();

    // 随机改变宠物对话
    const randomTexts = [
      '嘿嘿，好痒呀~',
      '再来一下！',
      '好舒服~',
      '主人真好！',
      '我最喜欢主人了！'
    ];
    const randomIndex = Math.floor(Math.random() * randomTexts.length);
    this.setData({ petSpeechText: randomTexts[randomIndex] });

    // 如果宠物饿了，提示喂食
    if (this.data.waterCount > 0 && this.data.status === 'IDLE') {
      this.setData({
        showGuide: true,
        guideText: '点击"喂食罐头"按钮',
        guideDirection: 'down'
      });
      setTimeout(() => {
        this.setData({ showGuide: false });
      }, 3000);
    }
  },

  // 宠物长按事件
  onPetLongPress: function() {
    // 显示星星特效
    this.triggerSparkleEffect();

    // 随机显示音符特效
    if (Math.random() > 0.5) {
      this.triggerMusicNoteEffect();
    }

    // 特殊对话
    const longPressTexts = [
      '哇！主人好厉害！这是我们的秘密互动哦~',
      '嗯嗯~ 最喜欢主人的抚摸了！',
      '嘻嘻，这是只有我们知道的魔法！',
      '和主人在一起的时光最幸福了！'
    ];
    const randomIndex = Math.floor(Math.random() * longPressTexts.length);
    this.setData({
      petSpeechText: longPressTexts[randomIndex],
      petState: 'excited',
      petMoodLevel: 'excited'
    });

    // 触发震动反馈
    wx.vibrateShort({
      type: 'medium'
    });
  },

  // 触发爱心特效
  triggerHeartEffect: function() {
    // 创建动画
    const animations = [];
    for (let i = 1; i <= 3; i++) {
      const animation = wx.createAnimation({
        duration: 2000,
        timingFunction: 'ease-out'
      });

      // 设置动画路径
      animation.opacity(1).scale(0).translateY(0).step();
      animation.opacity(0).scale(1.5).translateY(-100).step();

      animations.push(animation.export());
    }

    // 更新动画数据
    this.setData({
      heartAnimation1: animations[0],
      heartAnimation2: animations[1],
      heartAnimation3: animations[2],
      showHearts: true
    });

    // 2秒后隐藏
    setTimeout(() => {
      this.setData({ showHearts: false });
    }, 2000);
  },

  // 触发星星特效
  triggerSparkleEffect: function() {
    // 创建动画
    const animations = [];
    for (let i = 1; i <= 3; i++) {
      const animation = wx.createAnimation({
        duration: 1500,
        timingFunction: 'ease-out'
      });

      animation.opacity(1).scale(0).rotate(0).step();
      animation.opacity(0).scale(1.2).rotate(180).step();

      animations.push(animation.export());
    }

    // 更新动画数据
    this.setData({
      sparkleAnimation1: animations[0],
      sparkleAnimation2: animations[1],
      sparkleAnimation3: animations[2],
      showSparkles: true
    });

    // 1.5秒后隐藏
    setTimeout(() => {
      this.setData({ showSparkles: false });
    }, 1500);
  },

  // 触发音符特效
  triggerMusicNoteEffect: function() {
    // 创建动画
    const animations = [];
    for (let i = 1; i <= 3; i++) {
      const animation = wx.createAnimation({
        duration: 2500,
        timingFunction: 'ease-out'
      });

      animation.opacity(1).translateY(0).rotate(0).scale(0).step();
      animation.opacity(1).translateY(-80).rotate(180).scale(1.2).step();
      animation.opacity(0).translateY(-160).rotate(360).scale(0).step();

      animations.push(animation.export());
    }

    // 更新动画数据
    this.setData({
      noteAnimation1: animations[0],
      noteAnimation2: animations[1],
      noteAnimation3: animations[2],
      showMusicNotes: true
    });

    // 2.5秒后隐藏
    setTimeout(() => {
      this.setData({ showMusicNotes: false });
    }, 2500);
  },

  // 更新宠物状态和对话
  updatePetState: function() {
    const { status, petInfo, interactionCount } = this.data;

    // 根据不同状态更新宠物表现
    switch(status) {
      case 'IDLE':
        if (interactionCount === 0) {
          this.setData({
            petState: 'hungry',
            petSpeechText: '主人，我饿了，快喂我吃罐头吧！'
          });
          // 显示引导
          if (this.data.waterCount > 0) {
            this.setData({
              showGuide: true,
              guideText: '点击"喂食罐头"开始互动',
              guideDirection: 'down'
            });
          }
        } else if (interactionCount < 20) {
          this.setData({
            petState: 'happy',
            petSpeechText: '加油！再收集一些爱心就能去旅行啦！'
          });
        } else {
          this.setData({
            petState: 'excited',
            petSpeechText: '哇！快满能量了，好期待旅行呀！'
          });
        }
        break;

      case 'READY_TO_TRAVEL':
        this.setData({
          petState: 'excited',
          petSpeechText: '能量满满！准备好出发咯！✈️',
          showGuide: true,
          guideText: '点击"收拾行囊出发"按钮',
          guideDirection: 'down'
        });
        break;

      case 'TRAVELING':
        this.setData({
          petState: 'happy',
          petSpeechText: '旅行中...期待给主人带礼物！'
        });
        break;

      case 'READY_TO_HARVEST':
        this.setData({
          petState: 'excited',
          petSpeechText: '我回来啦！带了珍贵的礼物给主人！🎁',
          showGuide: true,
          guideText: '点击"迎接回家"查看礼物',
          guideDirection: 'down'
        });
        break;
    }

    // 根据心情值调整宠物状态和视觉效果
    if (petInfo) {
      let moodLevel = 'happy';
      let petMoodEmoji = petInfo.moodEmoji || '😊';

      if (petInfo.mood >= 80) {
        moodLevel = 'excited';
      } else if (petInfo.mood >= 60) {
        moodLevel = 'happy';
      } else if (petInfo.mood >= 40) {
        moodLevel = 'normal';
      } else {
        moodLevel = 'sleepy';
      }

      this.setData({
        petMoodLevel: moodLevel,
        petMoodEmoji: petMoodEmoji,
        showPetGlow: petInfo.mood >= 60,
        showMoodIndicator: petInfo.mood !== 60 // 心情值不是普通状态时显示指示器
      });

      if (petInfo.mood < 40) {
        this.setData({
          petState: 'sleepy',
          petSpeechText: '有点不开心...需要主人多陪陪我...'
        });
      }
    }
  }
});
