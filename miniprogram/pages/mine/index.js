// miniprogram/pages/mine/index.js
const app = getApp();
const DEFAULT_AVATAR = "";

Page({
  data: {
    // === 原有业务数据 ===
    userData: {
      avatarUrl: DEFAULT_AVATAR,
      nickName: "微信用户",
    },
    partnerData: null,
    // 🟢 已移除：inputPartnerCode, partnerShortID
    needSave: false,
    isShowingRequest: false,
    daysCount: 0,
    anniversary: "",

    // VIP 状态数据...
    vipStatus: {
      isVip: false,
      expireDateStr: "",
      privilegeTip: "",
    },

    // === 🆕 弹窗控制中心 ===
    showModal: false,
    modalType: "", // 'invite' | 'unbind'

    // 解绑冷静期倒计时
    unbindCount: 5,
    canUnbind: false,
    timer: null,

    // 🆕 临时存储邀请码
    inviteCode: null,

    // 🥚 彩蛋
    showEggModal: false,
    eggData: null,
  },

  onLoad: function (options) {
    // 🟢 优化：接收到邀请码，临时存储，等待 checkLogin 确认身份后直接绑定
    if (options && options.inviteCode) {
      this.setData({
        inviteCode: options.inviteCode,
      });
    }
  },

  onShow: function () {
    this.checkLogin();
  },

  onPullDownRefresh: function () {
    this.checkLogin(() => {
      wx.stopPullDownRefresh();
    });
  },

  // ============================================================
  // 🟢 核心交互逻辑 (弹窗与分享)
  // ============================================================

  // 1. 打开“发出邀请”誓言弹窗
  showInviteModal: function () {
    wx.vibrateShort({ type: "medium" });
    this.setData({
      showModal: true,
      modalType: "invite",
    });
  },

  // 2. 打开“申请解绑”冷静期弹窗
  onUnbind: function () {
    wx.vibrateShort({ type: "heavy" });
    this.setData({
      showModal: true,
      modalType: "unbind",
      unbindCount: 5, // 重置倒计时
      canUnbind: false,
    });

    // 启动 5秒 倒计时
    this.startUnbindTimer();
  },

  // 倒计时逻辑
  startUnbindTimer: function () {
    if (this.data.timer) clearInterval(this.data.timer);

    const timer = setInterval(() => {
      let next = this.data.unbindCount - 1;
      if (next <= 0) {
        clearInterval(timer);
        this.setData({ unbindCount: 0, canUnbind: true });
      } else {
        this.setData({ unbindCount: next });
      }
    }, 1000);

    this.setData({ timer });
  },

  // 通用：关闭任意弹窗
  hideModal: function () {
    if (this.data.timer) clearInterval(this.data.timer);
    this.setData({ showModal: false });
  },

  // 动作 B：确认解绑 -> 执行解绑
  confirmUnbind: function () {
    if (!this.data.canUnbind) return;
    this.hideModal();
    this.executeUnbind();
  },

  // 🟢 核心：分享逻辑（发送邀请）
  onShareAppMessage: function (res) {
    if (res.from === "button" && this.data.modalType === "invite") {
      this.hideModal();

      const myOpenId = this.data.userData._openid;
      const myName = this.data.userData.nickName || "你的另一半";

      return {
        title: `💌 ${myName} 邀请你开启：我们的纪念册`,
        // 关键：携带 inviteCode 参数，接收方点击后直接触发绑定
        path: `/pages/mine/index?inviteCode=${myOpenId}`,
        imageUrl: "/images/share-cover.png",
      };
    }

    // 默认右上角转发逻辑（作为兜底，也携带邀请码）
    const myKey = this.data.userData._openid;
    return {
      title: "邀请你共同开启我们的纪念册",
      path: "/pages/mine/index?inviteCode=" + (myKey || ""),
      imageUrl: "/images/share-cover.png",
    };
  },

  // 🆕 核心新增：直接执行绑定（接收方）
  directBind: function (partnerCode) {
    if (this.data.userData.partner_id) {
      wx.hideLoading();
      return;
    }

    wx.showLoading({ title: "正在连接爱意...", mask: true });

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "respond_bind",
        partnerCode: partnerCode,
        decision: "accept",
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showModal({
            title: "绑定成功！",
            content: "恭喜你们正式开启了共同的回忆之旅！",
            showCancel: false,
            confirmColor: "#ff6b81",
          });
          this.checkLogin();
        } else {
          wx.showModal({
            title: "连接失败",
            content:
              res.result.msg ||
              "未能成功连接，请确认对方是否已注册且处于未绑定状态。",
            showCancel: false,
            confirmColor: "#ff6b81",
          });
          this.checkLogin();
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: "网络错误", icon: "none" });
      },
    });
  },

  // ============================================================
  // 🟢 业务逻辑
  // ============================================================

  checkLogin: function (callback) {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "login" },
      success: (res) => {
        if (res.result.status === 200 || res.result.status === 201) {
          let {
            user,
            partner,
            isVip,
            loginBonus,
            vipExpireDate,
            registerDays,
            triggerEgg,
          } = res.result;

          // 🥚 触发彩蛋：长长久久
          // 注意：需要在 auth.js 的 login 接口返回 triggerEgg
          if (triggerEgg) {
            this.setData({ showEggModal: true, eggData: triggerEgg });
            wx.vibrateLong();
          }

          if (loginBonus && loginBonus > 0) {
            wx.showToast({
              title: `每日登录 +${loginBonus}g 爱意`,
              icon: "none",
              duration: 3000,
            });
          }

          app.globalData.userInfo = user;

          // 🟢 核心：接收人加载页面时，如果未绑定且有邀请码，直接触发绑定
          if (this.data.inviteCode && !user.partner_id) {
            const codeToBind = this.data.inviteCode;
            this.setData({ inviteCode: null });

            // 🟢 优化：增加弹窗确认
            wx.showModal({
              title: "💌 收到邀请",
              content: "检测到来自另一半的绑定邀请，确认要建立关联吗？",
              confirmText: "确认绑定",
              confirmColor: "#ff6b81",
              cancelText: "我再想想",
              success: (res) => {
                if (res.confirm) {
                  this.directBind(codeToBind);
                } else {
                  wx.showToast({ title: "已取消绑定", icon: "none" });
                }
              },
            });
            return;
          }

          // ... (处理 VIP 状态)
          let vipDateStr = "";
          if (vipExpireDate) {
            const date = new Date(vipExpireDate);
            vipDateStr = `${date.getFullYear()}-${
              date.getMonth() + 1
            }-${date.getDate()}`;
          }

          let tipText = "💎 VIP特权：每日享有 3 次拍照机会";
          if (registerDays <= 1) {
            tipText = "✨ 首日特权：今日获赠 10 次拍照机会";
          }

          this.setData({
            vipStatus: {
              isVip: isVip,
              expireDateStr: vipDateStr,
              privilegeTip: tipText,
            },
          });

          // === 头像链接转换 ===
          const fileList = [];
          if (user.avatarUrl && user.avatarUrl.startsWith("cloud://")) {
            fileList.push(user.avatarUrl);
          }
          if (
            partner &&
            partner.avatarUrl &&
            partner.avatarUrl.startsWith("cloud://")
          ) {
            fileList.push(partner.avatarUrl);
          }

          if (fileList.length > 0) {
            wx.cloud.getTempFileURL({
              fileList: fileList,
              success: (tempRes) => {
                tempRes.fileList.forEach((item) => {
                  if (item.code === "SUCCESS") {
                    if (user.avatarUrl === item.fileID)
                      user.avatarUrl = item.tempFileURL;
                    if (partner && partner.avatarUrl === item.fileID)
                      partner.avatarUrl = item.tempFileURL;
                  }
                });
                this.updatePageData(user, partner);
              },
              fail: (err) => {
                console.error("头像转换失败", err);
                this.updatePageData(user, partner);
              },
            });
          } else {
            this.updatePageData(user, partner);
          }
        }
        if (callback) callback();
      },
      fail: (err) => {
        console.error(err);
        if (callback) callback();
      },
    });
  },

  updatePageData: function (user, partner) {
    this.setData({
      userData: user,
      partnerData: partner,
      anniversary: user.anniversaryDate || "",
      daysCount: this.calculateDays(user.anniversaryDate),
      // 🟢 已移除：partnerShortID
    });
  },

  calculateDays: function (dateStr) {
    if (!dateStr) return 0;
    const start = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    if (diff < 0) return 0;
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  },

  onDateChange: function (e) {
    const date = e.detail.value;
    this.setData({
      anniversary: date,
      daysCount: this.calculateDays(date),
    });

    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "update_anniversary", date: date },
      success: (res) => {
        wx.showToast({ title: "纪念日已保存", icon: "none" });
        this.checkLogin();
      },
    });
  },

  executeUnbind: function () {
    wx.showLoading({ title: "处理中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "unbind" },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "已解除关联", icon: "success" });
          this.setData({ partnerData: null });
          this.checkLogin();
        } else if (res.result.status === 403) {
          wx.showModal({
            title: "提示",
            content: res.result.msg,
            showCancel: false,
          });
        } else {
          wx.showToast({ title: "操作失败", icon: "none" });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: "网络开小差了", icon: "none" });
      },
    });
  },

  // 🟢 复制按钮现在仅供调试或备份，不用于主要流程
  copyMyKey: function () {
    if (!this.data.userData._openid) return;
    wx.setClipboardData({
      data: this.data.userData._openid,
      success: () => wx.showToast({ title: "编号已复制", icon: "none" }),
    });
  },

  // 🟢 移除 onInputKey, bindPartner 等函数

  onChooseAvatar: function (e) {
    const { avatarUrl } = e.detail;
    this.setData({ "userData.avatarUrl": avatarUrl, needSave: true });
  },

  onInputNickname: function (e) {
    const nickName = e.detail.value;
    this.setData({ "userData.nickName": nickName, needSave: true });
  },

  saveProfile: async function () {
    const { avatarUrl, nickName } = this.data.userData;
    if (!avatarUrl || !nickName) return;

    wx.showLoading({ title: "同步云端..." });
    try {
      let finalAvatarUrl = avatarUrl;
      if (avatarUrl.includes("tmp") || avatarUrl.includes("wxfile")) {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${this.data.userData._openid}_${Date.now()}.jpg`,
          filePath: avatarUrl,
        });
        finalAvatarUrl = uploadRes.fileID;
      }
      const res = await wx.cloud.callFunction({
        name: "user_center",
        data: {
          action: "update_profile",
          avatarUrl: finalAvatarUrl,
          nickName: nickName,
        },
      });

      if (res.result.status === 200) {
        wx.hideLoading();
        wx.showToast({ title: "保存成功", icon: "success" });
        this.setData({ needSave: false });
        this.checkLogin();
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: "保存失败", icon: "none" });
    }
  },

  showVipInfo: function () {
    if (this.data.vipStatus.isVip) {
      wx.showModal({
        title: "💎 内测 VIP 尊享权益",
        content:
          "感谢成为首批内测体验官！\n\n✨ 新人礼：注册首日获赠 10 次生图额度\n🚀 会员礼：VIP 期间每日享有 3 次免费生图机会\n\n(额度每日凌晨刷新，快去体验不同风格吧！)",
        showCancel: false,
        confirmText: "太棒了",
        confirmColor: "#ff6b81",
      });
    } else {
      wx.showModal({
        title: "🚀 VIP 筹备中",
        content:
          "为了带给你们更好的体验，VIP 会员计划正在紧锣密鼓地筹备中！\n\n后续将解锁更多专属风格、无限畅玩特权，敬请期待~",
        showCancel: false,
        confirmText: "期待",
        confirmColor: "#9e9e9e",
      });
    }
  },

  // ... (其他原有函数保持不变) ...
  closeEggModal: function () {
    this.setData({ showEggModal: false });
  },
});
