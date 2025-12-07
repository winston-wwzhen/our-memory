// miniprogram/pages/index/index.js
const app = getApp();

// 🎨 本地兜底风格配置
const DEFAULT_STYLES = [
  {
    id: "125",
    name: "国风工笔",
    img: "https://636c-cloud1-0g4462vv9d9954a5-1387968548.tcb.qcloud.la/images/%E5%9B%BD%E9%A3%8E%E5%B7%A5%E7%AC%94.png?sign=15b57ebc93d57b2e82cf3e629e1aa5c8&t=1765008115",
    isVip: false,
  },
  {
    id: "201",
    name: "日漫风",
    img: "https://636c-cloud1-0g4462vv9d9954a5-1387968548.tcb.qcloud.la/images/%E6%97%A5%E6%BC%AB%E9%A3%8E.png?sign=6989b22c3222dd7c15aa0b91c78c9ae1&t=1765008129",
    isVip: false,
  },
  {
    id: "121",
    name: "黏土",
    img: "https://636c-cloud1-0g4462vv9d9954a5-1387968548.tcb.qcloud.la/images/%E9%BB%8F%E5%9C%9F.png?sign=05be2b007f8d5778b0d44155c417dcd5&t=1765008145",
    isVip: false,
  },
  {
    id: "129",
    name: "美式复古",
    img: "https://636c-cloud1-0g4462vv9d9954a5-1387968548.tcb.qcloud.la/images/%E7%BE%8E%E5%BC%8F%E5%A4%8D%E5%8F%A4.png?sign=8c016b605110992fbc6155b362aa5c23&t=1765008160",
    isVip: false,
  },
  {
    id: "210",
    name: "2.5D动画",
    img: "https://636c-cloud1-0g4462vv9d9954a5-1387968548.tcb.qcloud.la/images/2.5D%E5%8A%A8%E7%94%BB.png?sign=4282120a68b6826157b14446c43c623d&t=1765008172",
    isVip: false,
  },
  {
    id: "134",
    name: "厚涂手绘",
    img: "https://636c-cloud1-0g4462vv9d9954a5-1387968548.tcb.qcloud.la/images/%E5%8E%9A%E6%B6%82%E6%89%8B%E7%BB%98.png?sign=7ec0fb3d605cc205f819db1d212bc116&t=1765008213",
    isVip: false,
  },
  {
    id: "127",
    name: "瓷器",
    img: "https://636c-cloud1-0g4462vv9d9954a5-1387968548.tcb.qcloud.la/images/%E7%93%B7%E5%99%A8.png?sign=a8ec121cf1066ff876c1b4604f861cd7&t=1765008244",
    isVip: false,
  },
  {
    id: "133",
    name: "莫奈花园",
    img: "https://636c-cloud1-0g4462vv9d9954a5-1387968548.tcb.qcloud.la/images/%E8%8E%AB%E5%A5%88%E8%8A%B1%E5%9B%AD.png?sign=84ef6b6b94f52a5c085cc1b459443a5f&t=1765008196",
    isVip: true,
  },
  {
    id: "126",
    name: "玉石",
    img: "https://636c-cloud1-0g4462vv9d9954a5-1387968548.tcb.qcloud.la/images/%E7%A2%A7%E7%BB%BF%E9%A3%8E.png?sign=da8652c57d92590abcd88fe9939b9e09&t=1765008232",
    isVip: true,
  },
  {
    id: "130",
    name: "蒸汽朋克",
    img: "https://636c-cloud1-0g4462vv9d9954a5-1387968548.tcb.qcloud.la/images/%E8%92%B8%E6%B1%BD%E6%9C%8B%E5%85%8B.png?sign=9f90d3995c0c046ed97082e7539e2e04&t=1765008256",
    isVip: true,
  },
  {
    id: "132",
    name: "素描",
    img: "https://636c-cloud1-0g4462vv9d9954a5-1387968548.tcb.qcloud.la/images/%E7%B4%A0%E6%8F%8F.png?sign=ec9db8b1ef9ff70c953dc8f595e0e78e&t=1765008184",
    isVip: true,
  },
];

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
    styleList: DEFAULT_STYLES,
    currentStyleIndex: 0,
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
    isVip: false,
    adCount: 0,
    dailyAdLimit: 1,
    showAdModal: false,
    adCountdown: 3,
    isSaved: false,
    aiEvaluation: null, // 存储 AI 评分

    // 🥚 彩蛋相关
    showEggModal: false,
    eggData: null,
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
      isSaved: false,
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
    const cachedStyles = wx.getStorageSync("STYLE_LIST");
    if (cachedStyles && cachedStyles.length > 0) {
      this.setData({ styleList: cachedStyles });
    }
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
            styleList,
          } = res.result;

          if (loginBonus && loginBonus > 0) {
            wx.showToast({
              title: `每日登录 +${loginBonus}g 爱意`,
              icon: "none",
            });
          }
          if (styleList && styleList.length > 0) {
            this.setData({ styleList });
            wx.setStorageSync("STYLE_LIST", styleList);
          }
          this.setData({
            remainingCount: remaining,
            isVip: isVip,
            adCount: adCount || 0,
            dailyAdLimit: dailyAdLimit || 1,
          });
        }
        if (callback) callback();
      },
      fail: (err) => {
        console.error("Check status failed", err);
        if (callback) callback();
      },
    });
    this.checkTodayCheckIn();
  },

  checkTodayCheckIn: function () {
    wx.cloud.callFunction({
      name: "get_memory_lane",
      data: { page: 0, pageSize: 1 },
      success: (res) => {
        if (res.result.status === 200 && res.result.data.length > 0) {
          const latestLog = res.result.data[0];
          const now = new Date();
          const todayStandard = `${now.getFullYear()}-${String(
            now.getMonth() + 1
          ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
          if (latestLog.originalDate === todayStandard) {
            this.setData({ hasCheckedInToday: true });
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
    this.setData({ dailyQuote: q[Math.floor(Math.random() * q.length)] });
  },

  fetchDailyMission: function () {
    wx.cloud.callFunction({
      name: "get_daily_mission",
      success: (res) => {
        if (res.result.status === 200) {
          this.setData({
            currentTask: res.result.task,
            todayDateStr: res.result.dateStr,
          });
        }
      },
    });
  },

  showVipInfo: function () {
    wx.showModal({
      title: "💎 内测 VIP 权益",
      content:
        "感谢参与内测！\n\n✨ 新人礼：注册首日获赠 10 次生图额度\n🚀 会员礼：VIP 期间每日享有 3 次免费生图机会",
      showCancel: false,
      confirmText: "太棒了",
      confirmColor: "#ff6b81",
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
          if (res.confirm) wx.switchTab({ url: "/pages/playground/index" });
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
        if (res.confirm) this.mockWatchAd();
      },
    });
  },

  mockWatchAd: function () {
    this.setData({ showAdModal: true, adCountdown: 3 });
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
          this.checkUserStatus(() => this.startCameraFlow());
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
      sizeType: ["compressed"],
      success(res) {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: "处理中..." });
        wx.compressImage({
          src: tempFilePath,
          quality: 60,
          success: (compressRes) => {
            wx.hideLoading();
            that.uploadAndProcess(compressRes.tempFilePath);
          },
          fail: () => {
            wx.hideLoading();
            that.uploadAndProcess(tempFilePath);
          },
        });
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
        console.error("上传报错:", err);
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

    if (!this.data.isVip) {
      let seconds = 5;
      this.setData({ loadingText: `排队生成中...(${seconds}s)` });
      const timer = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
          clearInterval(timer);
          that.setData({ loadingText: "AI 正在绘制..." });
          that.doCloudCall(fileID, taskTitle, styleId);
        } else {
          that.setData({ loadingText: `排队生成中...(${seconds}s)` });
        }
      }, 1000);
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
          triggerEgg,
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

          // 🥚 触发彩蛋：天选之子
          if (triggerEgg) {
            that.setData({ showEggModal: true, eggData: triggerEgg });
            wx.vibrateLong();
          }
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
      fail: () => {
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
          this.setData({ hasCheckedInToday: true, isSaved: true });
          this.pickDailyQuote();
          this.checkUserStatus();

          // 🥚 触发彩蛋：早安吻
          if (res.result.triggerEgg) {
            this.setData({
              showEggModal: true,
              eggData: res.result.triggerEgg,
            });
            wx.vibrateLong();
          }
        } else {
          wx.showToast({ title: "保存失败", icon: "none" });
        }
      },
      fail: () => {
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
      isSaved: false,
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
          fail: () => {
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

  closeEggModal: function () {
    this.setData({ showEggModal: false });
  },
});
