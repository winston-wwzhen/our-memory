// miniprogram/pages/mine/index.js
const app = getApp();
const DEFAULT_AVATAR = "../../images/default-avatar.png";

Page({
  data: {
    // === 用户数据 ===
    userData: {
      avatarUrl: DEFAULT_AVATAR,
      nickName: "微信用户",
    },
    partnerData: null,
    daysCount: 0,
    anniversary: "",

    // === VIP 状态 ===
    vipStatus: {
      isVip: false,
      expireDateStr: "",
      privilegeTip: "",
    },

    // === 弹窗控制 ===
    showModal: false,
    modalType: "", // 'invite' | 'unbind'

    // 解绑倒计时
    unbindCount: 5,
    canUnbind: false,
    timer: null,

    // 邀请码
    inviteCode: null,

    // === 彩蛋与奖励 ===
    showEggModal: false,
    eggData: null,
    pendingRewards: null, // 待领取奖励
  },

  onLoad: function (options) {
    // 处理邀请码逻辑
    if (options && options.inviteCode) {
      this.setData({
        inviteCode: options.inviteCode,
      });
      app.globalData.tempInviteCode = options.inviteCode;
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
  // 🟢 核心优化：自动保存逻辑
  // ============================================================

  // 1. 修改头像 (自动上传 + 自动保存)
  onChooseAvatar: function (e) {
    const { avatarUrl } = e.detail;
    
    // 立即更新本地视图，提升体验
    this.setData({ "userData.avatarUrl": avatarUrl });

    wx.showLoading({ title: "更新头像...", mask: true });

    // 构造云端路径
    const cloudPath = `avatars/${this.data.userData._openid}_${Date.now()}.jpg`;

    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: avatarUrl,
      success: (res) => {
        // 上传成功后，拿到 fileID 同步到数据库
        const fileID = res.fileID;
        this.updateUserData({ avatarUrl: fileID });
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({ title: "头像上传失败", icon: "none" });
        console.error("头像上传失败", err);
      },
    });
  },

  // 2. 修改昵称 (失焦/回车后自动保存)
  onInputNickname: function (e) {
    const nickName = e.detail.value;
    // 如果昵称没变，不发请求
    if (nickName === this.data.userData.nickName) return;

    this.setData({ "userData.nickName": nickName });
    this.updateUserData({ nickName: nickName });
  },

  // 3. 通用云端同步函数
  updateUserData: function (updateFields) {
    // 合并当前最新的数据
    const payload = {
      nickName: this.data.userData.nickName,
      avatarUrl: this.data.userData.avatarUrl,
      ...updateFields // 覆盖最新的字段
    };

    // 如果没有显示loading（例如昵称修改），显示一个轻提示
    if (!updateFields.avatarUrl) { 
       wx.showNavigationBarLoading();
    }

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "update_profile",
        ...payload
      },
      success: (res) => {
        wx.hideLoading();
        wx.hideNavigationBarLoading();
        
        if (res.result.status === 200) {
          wx.showToast({ title: "已同步", icon: "success", duration: 800 });
        } else if (res.result.status === 403) {
          wx.showToast({ title: res.result.msg || "内容包含敏感词", icon: "none" });
          // 只有鉴黄失败才回滚，重新拉取用户信息
          this.checkLogin(); 
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.hideNavigationBarLoading();
        wx.showToast({ title: "同步失败", icon: "none" });
        console.error("同步失败", err);
      }
    });
  },

  // ============================================================
  // 🟢 业务逻辑
  // ============================================================

  checkLogin: function (callback) {
    const inviteCode = this.data.inviteCode || app.globalData.tempInviteCode;
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "login", inviteCode: inviteCode },
      success: (res) => {
        if (res.result.status === 200 || res.result.status === 201) {
          // 清除已使用的邀请码
          if (inviteCode) {
             this.setData({ inviteCode: null });
             app.globalData.tempInviteCode = null;
          }

          let { user, partner, isVip, vipExpireDate, registerDays, loginBonus, triggerEgg, pendingRewards } = res.result;

          // 触发彩蛋
          if (triggerEgg) {
            this.setData({ showEggModal: true, eggData: triggerEgg });
            wx.vibrateLong();
          }

          // 登录奖励提示
          if (loginBonus && loginBonus > 0) {
            wx.showToast({
              title: `每日登录 +${loginBonus}g 爱意`,
              icon: "none",
              duration: 3000
            });
          }

          app.globalData.userInfo = user;

          // 核心：接收人加载页面时，如果未绑定且有邀请码，弹窗提示绑定
          if (this.data.inviteCode && !user.partner_id) {
             const codeToBind = this.data.inviteCode;
             this.setData({ inviteCode: null });
             
             wx.showModal({
                title: "💌 收到邀请",
                content: "检测到来自另一半的绑定邀请，确认要建立关联吗？\n(如果只是好友邀请，点击取消即可)",
                confirmText: "确认绑定",
                confirmColor: "#ff6b81",
                cancelText: "只是好友",
                success: (res) => {
                  if (res.confirm) this.directBind(codeToBind);
                },
             });
          }

          // 处理 VIP 状态
          let vipDateStr = "";
          if (vipExpireDate) {
            const date = new Date(vipExpireDate);
            vipDateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
          }

          let tipText = "💎 VIP特权：每日享有 3 次拍照机会";
          if (registerDays <= 1) {
            tipText = "✨ 首日特权：今日获赠 10 次拍照机会";
          }

          this.setData({
            userData: user,
            partnerData: partner,
            anniversary: user.anniversaryDate || "",
            daysCount: this.calculateDays(user.anniversaryDate),
            vipStatus: {
              isVip: isVip,
              expireDateStr: vipDateStr,
              privilegeTip: tipText,
            },
            // 更新待领取奖励状态
            pendingRewards: (pendingRewards && (pendingRewards.water > 0 || pendingRewards.quota > 0)) ? pendingRewards : null
          });

          this.convertAvatars(user, partner);
        }
        if (callback) callback();
      },
      fail: (err) => {
        console.error("Check login failed", err);
        if (callback) callback();
      },
    });
  },

  convertAvatars: function (user, partner) {
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
          let newUser = { ...user };
          let newPartner = partner ? { ...partner } : null;
          
          tempRes.fileList.forEach((item) => {
            if (item.code === "SUCCESS") {
              if (newUser.avatarUrl === item.fileID)
                newUser.avatarUrl = item.tempFileURL;
              if (newPartner && newPartner.avatarUrl === item.fileID)
                newPartner.avatarUrl = item.tempFileURL;
            }
          });
          this.setData({ userData: newUser, partnerData: newPartner });
        },
        fail: (err) => {
          console.error("头像转换失败", err);
        },
      });
    }
  },

  calculateDays: function (dateStr) {
    if (!dateStr) return 0;
    const start = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    if (diff < 0) return 0;
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  },

  // 纪念日修改
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
      },
    });
  },

  // ============================================================
  // 🟢 交互与弹窗
  // ============================================================

  // 1. 打开“发出邀请”弹窗
  showInviteModal: function () {
    wx.vibrateShort({ type: "medium" });
    this.setData({
      showModal: true,
      modalType: "invite",
    });
  },

  // 2. 打开“申请解绑”弹窗
  onUnbind: function () {
    wx.vibrateShort({ type: "heavy" });
    this.setData({
      showModal: true,
      modalType: "unbind",
      unbindCount: 5,
      canUnbind: false,
    });
    this.startUnbindTimer();
  },

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

  hideModal: function () {
    if (this.data.timer) clearInterval(this.data.timer);
    this.setData({ showModal: false });
  },

  confirmUnbind: function () {
    if (!this.data.canUnbind) return;
    this.hideModal();
    this.executeUnbind();
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
        wx.showToast({ title: "网络错误", icon: "none" });
      },
    });
  },

  copyMyKey: function () {
    if (!this.data.userData._openid) return;
    wx.setClipboardData({
      data: this.data.userData._openid,
      success: () => wx.showToast({ title: "编号已复制", icon: "none" }),
    });
  },

  showVipInfo: function () {
    if (this.data.vipStatus.isVip) {
      wx.showModal({
        title: "💎 内测 VIP 尊享权益",
        content:
          "感谢成为首批内测体验官！\n\n✨ 新人礼：注册首日获赠 10 次生图额度\n🚀 会员礼：VIP 期间每日享有 3 次免费生图机会\n\n(额度每日凌晨刷新)",
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

  // 🟢 领取奖励
  onClaimRewards: function() {
    if (!this.data.pendingRewards) return;
    
    wx.showLoading({ title: '领取中...' });
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "claim_rewards" },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          const { water, quota } = res.result.claimed;
          
          this.setData({ 
            pendingRewards: null, 
            showEggModal: true,   
            eggData: {
              title: "收益到账",
              icon: "💰",
              desc: `成功领取：${water}g 爱意 + ${quota}张 永久额度`,
              bonus: water 
            }
          });
          wx.vibrateLong();
          this.checkLogin(); 
        } else {
          wx.showToast({ title: res.result.msg, icon: "none" });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: "网络错误", icon: "none" });
      }
    });
  },

  // 🟢 直接执行绑定（接收方）
  directBind: function (partnerCode) {
    if (this.data.userData.partner_id) return;

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
            content: res.result.msg || "连接失败，请确认对方状态。",
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

  // 🟢 分享逻辑
  onShareAppMessage: function (res) {
    const myOpenId = this.data.userData._openid;
    const myName = this.data.userData.nickName || "我";
    // 默认分享图，可以使用云存储图片地址
    const SHARE_IMG = "../../images/default-avatar.png"; 

    // 场景 A：绑定伴侣邀请
    if (res.from === "button" && this.data.modalType === "invite") {
      this.hideModal();
      return {
        title: `💌 ${myName} 邀请你开启：我们的纪念册`,
        path: `/pages/mine/index?inviteCode=${myOpenId}`,
        imageUrl: SHARE_IMG, 
      };
    }

    // 场景 B：拉新邀请
    if (res.from === "button" && res.target.dataset.type === "referral") {
      return {
        title: `🎁 ${myName} 送你VIP和爱意值！快来和我一起记录生活~`,
        path: `/pages/mine/index?inviteCode=${myOpenId}`,
        imageUrl: SHARE_IMG, 
      };
    }

    return {
      title: "邀请你共同开启我们的纪念册",
      path: "/pages/mine/index?inviteCode=" + (myOpenId || ""),
      imageUrl: SHARE_IMG,
    };
  },
  
  onTapBindMenu: function() {
    if (this.data.userData.partner_id) {
      // 如果已有伴侣，执行解绑逻辑
      this.onUnbind();
    } else {
      // 如果没有伴侣，执行邀请逻辑
      this.showInviteModal();
    }
  },
  closeEggModal: function () {
    this.setData({ showEggModal: false });
  },
});