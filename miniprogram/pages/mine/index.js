const app = getApp();
const DEFAULT_AVATAR = ''; // 这里可以填入一个默认头像的网络链接

Page({
  data: {
    userData: {
      avatarUrl: DEFAULT_AVATAR,
      nickName: "微信用户",
    },
    inputPartnerCode: "",
    needSave: false, // 标记是否修改过资料
    partnerShortID: "" // 用于显示对方ID缩略
  },

  onShow: function () {
    this.checkLogin();
  },

  // 1. 登录并获取自己的信息
  checkLogin: function () {
    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "login" },
      success: (res) => {
        if (res.result.status === 200 || res.result.status === 201) {
          const user = res.result.user;
          this.setData({
            userData: user,
            // 截取一下 ID 后几位显示，看起来更极客
            partnerShortID: user.partner_id
              ? "..." + user.partner_id.slice(-6)
              : "",
          });
          app.globalData.userInfo = user;
        }
      },
      fail: (err) => {
        console.error("Login failed", err);
      }
    });
  },

  // 🆕 新增：解绑 (分手)
  onUnbind: function () {
    wx.showModal({
      title: "⚠️ 警告 (Warning)",
      content: "确定要断开连接吗？此操作不可撤销，且对方会立即变回单身状态。",
      confirmText: "断开",
      confirmColor: "#ff4d4f",
      cancelText: "再想想",
      success: (res) => {
        if (res.confirm) {
          this.executeUnbind();
        }
      },
    });
  },

  // 修复了这里的拼写错误：从 xecuteUnbind 改回 executeUnbind
  executeUnbind: function () {
    wx.showLoading({ title: "正在断开..." });

    wx.cloud.callFunction({
      name: "user_center",
      data: { action: "unbind" }, // 调用云函数的 unbind 逻辑
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "恢复单身", icon: "success" });
          // 清空本地显示的 partnerShortID
          this.setData({ partnerShortID: "" });
          this.checkLogin(); // 刷新页面，此时应该回到单身界面
        } else if (res.result.status === 403) {
          wx.showModal({
            title: "权限不足",
            content: res.result.msg,
            showCancel: false,
          });
        } else {
          wx.showToast({ title: "操作失败", icon: "none" });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error(err);
        wx.showToast({ title: "网络错误", icon: "none" });
      },
    });
  },

  // 2. 复制我的密钥
  copyMyKey: function () {
    if (!this.data.userData._openid) return;
    wx.setClipboardData({
      data: this.data.userData._openid,
      success: () => wx.showToast({ title: "密钥已复制", icon: "none" }),
    });
  },

  // 3. 监听输入框
  onInputKey: function (e) {
    this.setData({ inputPartnerCode: e.detail.value });
  },

  // 4. 执行绑定
  bindPartner: function () {
    const code = this.data.inputPartnerCode;
    if (!code) return wx.showToast({ title: "请输入密钥", icon: "none" });

    wx.showLoading({ title: "正在建立连接..." });

    wx.cloud.callFunction({
      name: "user_center",
      data: {
        action: "bind",
        partnerCode: code,
      },
      success: (res) => {
        wx.hideLoading();
        if (res.result.status === 200) {
          wx.showToast({ title: "绑定成功！", icon: "success" });
          this.checkLogin(); // 刷新状态
        } else {
          wx.showModal({
            title: "连接失败",
            content: res.result.msg,
            showCancel: false,
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error(err);
        wx.showToast({ title: "请求超时", icon: "none" });
      },
    });
  },

  // 5. 选择头像
  onChooseAvatar: function (e) {
    const { avatarUrl } = e.detail;
    // 更新本地显示
    this.setData({
      "userData.avatarUrl": avatarUrl,
      needSave: true,
    });
  },

  // 6. 输入昵称
  onInputNickname: function (e) {
    const nickName = e.detail.value;
    this.setData({
      "userData.nickName": nickName,
      needSave: true,
    });
  },

  // 7. 保存个人资料
  saveProfile: async function () {
    const { avatarUrl, nickName } = this.data.userData;

    if (!avatarUrl || !nickName) return;

    wx.showLoading({ title: "同步云端..." });

    try {
      let finalAvatarUrl = avatarUrl;

      // 核心判断：如果头像路径是临时路径 (tmp开头 或 wxfile开头)，说明用户新换了头像，需要上传
      // 如果已经是 cloud:// 开头，说明没改过，不用重复上传
      if (avatarUrl.includes("tmp") || avatarUrl.includes("wxfile")) {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${this.data.userData._openid}_${Date.now()}.jpg`,
          filePath: avatarUrl,
        });
        finalAvatarUrl = uploadRes.fileID; // 拿到永久ID
      }

      // 调用云函数更新数据库
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
        this.setData({ needSave: false }); // 隐藏保存按钮

        // 更新全局数据
        app.globalData.userInfo = {
          ...this.data.userData,
          avatarUrl: finalAvatarUrl,
          nickName: nickName,
        };
      }
    } catch (err) {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: "保存失败", icon: "none" });
    }
  },
});