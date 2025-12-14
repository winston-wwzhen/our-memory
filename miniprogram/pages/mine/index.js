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
    daysCount: 0,
    anniversary: "",

    // VIP 状态数据
    vipStatus: {
      isVip: false,
      expireDateStr: "",
      privilegeTip: "",
    },

    // 🟢 [新增] 胶卷/额度数据
    filmData: {
      total: 0,
      daily: 0,
      permanent: 0,
    },

    // === 弹窗控制中心 ===
    showModal: false,
    modalType: "", // 'invite' | 'unbind'

    // 解绑冷静期倒计时
    unbindCount: 5,
    canUnbind: false,
    timer: null,

    // 临时存储邀请码
    inviteCode: null,

    // 🥚 彩蛋
    showEggModal: false,
    eggData: null,

    // 待领取奖励数据
    pendingRewards: null,

    showVipExchange: false,
  },

  onLoad: function (options) {
    console.log('>>> Mine Page onLoad 触发了');
    this.fetchSystemConfig();
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
  // 交互逻辑
  // ============================================================

  fetchSystemConfig() {
    wx.cloud.callFunction({
      name: 'user_center',
      data: {
        action: 'get_system_config'
      }
    }).then(res => {
      if (res.result && res.result.success) {
        const configOpen = res.result.data.showVipExchange;
        
        this.setData({
          // 逻辑：只有当【云端开关开启】且【非iOS端(可选)】时才显示
          // 如果你的策略是完全依赖云端开关，直接用 configOpen 即可
          showVipExchange: configOpen 
        });
      }
    }).catch(err => {
      console.error('获取配置失败，默认隐藏VIP入口', err);
    });
  },

  showInviteModal: function () {
    wx.vibrateShort({ type: "medium" });
    this.setData({
      showModal: true,
      modalType: "invite",
    });
  },

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

  onShareAppMessage: function (res) {
    const myOpenId = this.data.userData._openid;
    const myName = this.data.userData.nickName || "我";
    const SHARE_IMG = "../../images/default-avatar.png";

    if (res.from === "button" && this.data.modalType === "invite") {
      this.hideModal();
      return {
        title: `💌 ${myName} 邀请你开启：我们的纪念册`,
        path: `/pages/mine/index?inviteCode=${myOpenId}`,
        imageUrl: SHARE_IMG,
      };
    }

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

  onShareTimeline: function () {
    return {
      title: "邀请你共同开启我们的纪念册",
    };
  },

  onClaimRewards: function () {
    if (!this.data.pendingRewards) return;

    wx.showLoading({ title: "领取中..." });
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
              bonus: water,
            },
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
      },
    });
  },

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
    const inviteCode = this.data.inviteCode || app.globalData.tempInviteCode;

    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "login", inviteCode: inviteCode },
      success: (res) => {
        if (res.result.status === 200 || res.result.status === 201) {
          if (inviteCode) {
            this.setData({ inviteCode: null });
            app.globalData.tempInviteCode = null;
          }

          let {
            user,
            partner,
            isVip,
            loginBonus,
            vipExpireDate,
            registerDays,
            triggerEgg,
            pendingRewards,
            remaining, // 🟢 获取后端返回的总剩余次数
          } = res.result;

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

          if (inviteCode && !user.partner_id) {
            const codeToBind = inviteCode;
            wx.showModal({
              title: "💌 收到邀请",
              content: "检测到来自另一半的绑定邀请，确认要建立关联吗？",
              confirmText: "确认绑定",
              confirmColor: "#ff6b81",
              cancelText: "只是好友",
              success: (res) => {
                if (res.confirm) {
                  this.directBind(codeToBind);
                }
              },
            });
          }

          // 处理 VIP 日期
          let vipDateStr = "";
          if (vipExpireDate) {
            const date = new Date(vipExpireDate);
            // 格式化为 YYYY-MM-DD
            vipDateStr = `${date.getFullYear()}-${String(
              date.getMonth() + 1
            ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
          }

          let tipText = "💎 VIP特权：每日享有 3 次拍照机会";
          if (registerDays <= 1) {
            tipText = "✨ 首日特权：今日获赠 10 次拍照机会";
          }

          // 🟢 计算胶卷/额度详情
          const permanentCount = user.extra_quota || 0;
          const totalCount = remaining || 0;
          const dailyCount = Math.max(0, totalCount - permanentCount);

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
            filmData: {
              total: totalCount,
              daily: dailyCount,
              permanent: permanentCount,
            },
            pendingRewards:
              pendingRewards &&
              (pendingRewards.water > 0 || pendingRewards.quota > 0)
                ? pendingRewards
                : null,
          });

          this.convertAvatars(user, partner);
        }
        if (callback) callback();
      },
      fail: (err) => {
        console.error(err);
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

  copyMyKey: function () {
    if (!this.data.userData._openid) return;
    wx.setClipboardData({
      data: this.data.userData._openid,
      success: () => wx.showToast({ title: "编号已复制", icon: "none" }),
    });
  },

  // 🟢 [修改] 选择头像后立即保存
  onChooseAvatar: function (e) {
    const { avatarUrl } = e.detail;
    this.setData({ "userData.avatarUrl": avatarUrl });
    this.saveProfile(); // 自动触发保存
  },

  // 🟢 [修改] 输入时仅更新数据
  onNicknameInput: function (e) {
    const nickName = e.detail.value;
    this.setData({ "userData.nickName": nickName });
  },

  // 🟢 [修改] 失去焦点（输入完成）时自动保存
  onNicknameBlur: function (e) {
    const nickName = e.detail.value;
    // 确保数据是最新的
    this.setData({ "userData.nickName": nickName });
    this.saveProfile();
  },

  // 🟢 [修改] 保存逻辑（通用）
  saveProfile: async function () {
    const { avatarUrl, nickName } = this.data.userData;
    if (!avatarUrl || !nickName) return;

    // 显示loading 防止用户误操作，也作为反馈
    wx.showLoading({ title: "保存中...", mask: true });

    try {
      let finalAvatarUrl = avatarUrl;
      // 检查是否为临时文件，如果是则上传
      if (avatarUrl.includes("tmp") || avatarUrl.includes("wxfile")) {
        const openid = this.data.userData._openid || "user";
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${openid}_${Date.now()}.jpg`,
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
        // 给一个轻微的成功提示
        wx.showToast({ title: "已更新", icon: "success", duration: 1000 });
        this.checkLogin();
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: "保存失败", icon: "none" });
      console.error(err);
    }
  },

  showVipInfo: function () {
    if (this.data.vipStatus.isVip) {
      wx.showModal({
        title: "💎 内测 VIP 尊享权益",
        content: `有效期至：${this.data.vipStatus.expireDateStr}\n\n感谢成为首批内测体验官！\n\n✨ 新人礼：注册首日获赠 10 次生图额度\n🚀 会员礼：VIP 期间每日享有 3 次免费生图机会`,
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

  closeEggModal: function () {
    this.setData({ showEggModal: false });
  },

  showRedeemInput: function () {
    wx.showModal({
      title: "💎 兑换 VIP",
      placeholderText: "请输入兑换码",
      editable: true,
      confirmText: "兑换",
      confirmColor: "#ff6b81",
      success: (res) => {
        if (res.confirm && res.content) {
          this.doRedeemCode(res.content);
        }
      },
    });
  },

  doRedeemCode: function (code) {
    if (!code || !code.trim()) return;

    wx.showLoading({ title: "兑换中..." });
    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "redeem_vip_code",
        code: code,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          const days = res.result.days;
          const quota = res.result.extra_quota || 0;
          const waterBonus = res.result.waterBonus || 300;

          let descMsg = `VIP 时长已增加 ${days} 天！\n获得 ${waterBonus} 爱意值！`;
          if (quota > 0) {
            descMsg += `\n额外获得 ${quota} 张永久胶卷！`;
          }

          this.setData({
            showEggModal: true,
            eggData: {
              title: "兑换成功",
              icon: "💎",
              desc: descMsg,
              bonus: waterBonus,
            },
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
      },
    });
  },
});
