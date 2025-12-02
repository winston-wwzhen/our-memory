// miniprogram/pages/message_board/index.js
Page({
  data: {
    messages: [],
    showInput: false,
    inputContent: "",
    selectedColor: "yellow",
    isLoading: false,
    remainingMsgCount: 0,
    currentDate: "",
    isToday: true,

    // 彩蛋弹窗数据
    showEggModal: false,
    eggData: null,

    // 状态配置
    myStatus: null,
    partnerStatus: null,
    showStatusPanel: false,
    statusOptions: [
      { icon: "🐷", text: "想你了" },
      { icon: "🍚", text: "干饭中" },
      { icon: "💻", text: "搬砖中" },
      { icon: "💤", text: "睡大觉" },
      { icon: "🎮", text: "打游戏中" },
      { icon: "😠", text: "正在生气" },
      { icon: "🌧️", text: "emo了" },
      { icon: "👀", text: "暗中观察" },
    ],
  },

  onLoad: function () {
    // 初始化为今天
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const today = `${y}-${m}-${d}`;

    this.setData({ currentDate: today, isToday: true });
    // onShow 会自动调用 fetchMessages，这里不用重复调用
  },

  // 每次进入页面自动刷新
  onShow: function () {
    this.fetchMessages();
  },

  onPullDownRefresh: function () {
    this.fetchMessages(() => wx.stopPullDownRefresh());
  },

  // 🟢 日期选择
  onDateChange: function (e) {
    const selected = e.detail.value;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const today = `${y}-${m}-${d}`;

    this.setData({
      currentDate: selected,
      isToday: selected === today,
    });

    this.fetchMessages();
  },

  // 🟢 用户点击转发按钮时触发
  onShareAppMessage: function (res) {
    // 如果是从按钮触发（彩蛋弹窗里的转发）
    if (res.from === "button") {
      if (this.data.showEggModal && this.data.eggData) {
        return {
          title: `✨ 哇！我在留言板偶遇了${this.data.eggData.title}！好运分你一半~`,
          path: "/pages/index/index", // 统一落地页为首页，保证用户路径完整
          imageUrl: "", // 可选：指定一张好运图片
        };
      }
    }

    // 默认分享
    return {
      title: "快来我们的留言板看看吧~",
      path: "/pages/index/index",
    };
  },

  fetchMessages: function (cb) {
    // 避免 onShow 闪烁，不强制 setData isLoading
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "get_messages", queryDate: this.data.currentDate },
      success: (res) => {
        if (res.result.status === 200) {
          const msgs = res.result.data.map((item, index) => {
            const d = new Date(item.createdAt);
            // 简单格式化时间 MM.DD HH:mm
            item.timeStr = `${
              d.getMonth() + 1
            }.${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(
              2,
              "0"
            )}`;

            // 🟢 视觉优化：生成伪随机偏移量，让便签看起来是随意贴的
            // 利用 index 保证列表刷新时位置不会乱跳
            const offsetX = ((index % 3) - 1) * 10;
            const offsetY = (index % 4) * 5;
            item.style = `transform: rotate(${item.rotate}deg) translate(${offsetX}rpx, ${offsetY}rpx);`;

            return item;
          });

          this.setData({
            messages: msgs,
            myStatus: res.result.myStatus,
            partnerStatus: res.result.partnerStatus,
            remainingMsgCount: res.result.remainingMsgCount,
            isLoading: false,
          });
        }
        if (cb) cb();
      },
      fail: () => {
        if (cb) cb();
      },
    });
  },

  // ❤️ 盖章互动
  onToggleLike: function (e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    const msg = this.data.messages[index];

    // 🟢 前端拦截：如果是自己的便签，禁止盖章
    if (msg.isMine) {
      return wx.showToast({ title: "不能给自己盖章哦 🙈", icon: "none" });
    }

    const currentStatus = msg.isLiked;

    // 本地乐观更新 (先变色，再请求)
    const key = `messages[${index}].isLiked`;
    this.setData({ [key]: !currentStatus });

    // 震动反馈
    wx.vibrateShort({ type: "light" });

    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "like_message", id: id },
      success: (res) => {
        // 如果后端校验失败(如403)，回滚状态
        if (res.result.status !== 200) {
          this.setData({ [key]: currentStatus });
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      },
      fail: () => {
        this.setData({ [key]: currentStatus });
      },
    });
  },

  // 🗑️ 长按撕掉留言
  onDeleteMessage: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: "撕掉便签",
      content: "确定要撕掉这张便签吗？此操作无法撤销。",
      confirmColor: "#d32f2f",
      confirmText: "撕掉",
      success: (res) => {
        if (res.confirm) {
          this.doDelete(id);
        }
      },
    });
  },

  doDelete: function (id) {
    wx.showLoading({ title: "处理中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "delete_message", id: id },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "已撕掉", icon: "success" });
          // 本地移除，体验更流畅
          const newMessages = this.data.messages.filter((m) => m._id !== id);
          this.setData({ messages: newMessages });
        } else {
          wx.showToast({ title: "操作失败", icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "网络错误", icon: "none" });
      },
    });
  },

  // === 状态相关 ===
  toggleStatusPanel: function () {
    this.setData({ showStatusPanel: !this.data.showStatusPanel });
  },

  selectStatus: function (e) {
    const { icon, text } = e.currentTarget.dataset.item;
    this.setData({
      myStatus: { icon, text },
      showStatusPanel: false,
    });

    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "update_status", statusIcon: icon, statusText: text },
    });
  },

  // === 发布留言相关 ===
  openInput: function () {
    if (this.data.remainingMsgCount <= 0) {
      return wx.showToast({ title: "今日次数已用完", icon: "none" });
    }
    this.setData({ showInput: true, inputContent: "" });
  },

  closeInput: function () {
    this.setData({ showInput: false });
  },

  onInputChange: function (e) {
    this.setData({ inputContent: e.detail.value });
  },

  selectNoteColor: function (e) {
    this.setData({ selectedColor: e.currentTarget.dataset.color });
  },

  postMessage: function () {
    if (!this.data.inputContent.trim()) return;

    wx.showLoading({ title: "张贴中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "post_message",
        content: this.data.inputContent,
        color: this.data.selectedColor,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          this.setData({ showInput: false });
          // 刷新列表
          if (this.data.isToday) {
            this.fetchMessages();
          } else {
            wx.showToast({ title: "已贴到今天的板上啦~", icon: "none" });
          }
          // 本地扣减次数
          this.setData({
            remainingMsgCount: Math.max(0, this.data.remainingMsgCount - 1),
          });

          // 🟢 检查是否触发彩蛋
          if (res.result.triggerEgg) {
            this.setData({
              showEggModal: true,
              eggData: res.result.triggerEgg,
            });
            wx.vibrateLong(); // 惊喜震动
          } else {
            wx.showToast({
              title: res.result.msg,
              icon: "success",
              duration: 2000,
            });
          }
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "网络开小差了", icon: "none" });
      },
    });
  },

  closeEggModal: function () {
    this.setData({ showEggModal: false });
  },
});
