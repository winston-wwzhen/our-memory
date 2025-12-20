// miniprogram/pages/avatar_detail/index.js
const app = getApp();

Page({
  data: {
    currentId: null, // 保存当前 ID 用于下拉刷新
    detail: null, // 头像详情数据
    quality: "normal", // 画质模式: 'normal' | 'hd'
    isHdUnlocked: false, // 是否已解锁高清 (保留字段以兼容后续)
    isVip: false, // 是否 VIP
    loading: true,
  },

  async onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ currentId: id });
      
      // 🟢 1. 启动全屏 Loading
      wx.showLoading({ title: '加载中...', mask: true });

      try {
        // 🟢 2. 并行请求
        await Promise.all([
          this.checkVipStatus(),
          this.fetchDetail(id, true) 
        ]);

        // 🟢 3. 数据就绪后校验
        this.checkAccess();

      } catch (err) {
        console.error("页面初始化失败", err);
      } finally {
        wx.hideLoading();
      }
    }
  },

  // 🛡️ 页面准入校验
  checkAccess() {
    const { detail, isVip } = this.data;
    if (!detail) return;

    if (detail.is_vip && !isVip) {
      wx.showModal({
        title: 'VIP 专属',
        content: '该头像为 VIP 会员专属资源 \n 请联系客服领取VIP福利哦',
        showCancel: false,
        confirmText: '返回',
        confirmColor: '#ff6b81',
        success: () => {
          wx.navigateBack({ delta: 1 });
        }
      });
    }
  },

  // 🔄 下拉刷新
  onPullDownRefresh() {
    wx.vibrateShort({ type: "light" });

    const id = this.data.currentId;
    if (!id) {
      wx.stopPullDownRefresh();
      return;
    }

    Promise.all([
      this.fetchDetail(id, true),
      this.checkVipStatus(),
    ]).then(() => {
      this.checkAccess();
      wx.stopPullDownRefresh();
      wx.showToast({ title: "已刷新", icon: "none" });
    });
  },

  // 获取详情
  fetchDetail(id, isRefresh = false) {
    if (!isRefresh) wx.showLoading({ title: "加载中..." });

    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: "user_center",
        data: { action: "get_avatar_detail", id },
        success: (res) => {
          if (res.result.status === 200) {
            this.setData({ detail: res.result.data, loading: false });
          } else {
            if (!isRefresh) {
              wx.showToast({ title: "头像不存在或已下架", icon: "none" });
              setTimeout(() => wx.navigateBack(), 1500);
            }
          }
          resolve();
        },
        fail: (err) => {
          console.error(err);
          if (!isRefresh) wx.showToast({ title: "网络异常", icon: "none" });
          resolve();
        },
        complete: () => {
          if (!isRefresh) wx.hideLoading();
        },
      });
    });
  },

  // 检查 VIP
  checkVipStatus() {
    return new Promise((resolve) => {
      wx.cloud.callFunction({
        name: "user_center",
        data: { action: "login" },
        success: (res) => {
          if (res.result.isVip) {
            this.setData({ isVip: true, isHdUnlocked: true });
          }
          resolve();
        },
        fail: () => resolve(),
      });
    });
  },

  // 切换画质
  switchQuality(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.quality) return;

    if (mode === "normal") {
      this.setData({ quality: "normal" });
    } else {
      if (this.data.isVip || this.data.isHdUnlocked) {
        this.setData({ quality: "hd" });
        wx.showToast({ title: "已切换高清画质", icon: "none" });
      } else {
        this.showVipHint();
      }
    }
  },

  // 提示 VIP 权益
  showVipHint() {
    wx.showModal({
      title: "VIP 专属权益",
      content: "高清无损原图是 VIP 会员专属权益哦~ \n可联系客服领取VIP福利哦！",
      confirmText: "我知道了",
      confirmColor: "#ff6b81",
      showCancel: false
    });
  },

  // === 下载保存逻辑 ===

  saveAvatar(e) {
    const type = e.currentTarget.dataset.type;
    this.doDownload([type]);
  },

  saveAll() {
    this.doDownload(["boy", "girl"]);
  },

  async doDownload(types) {
    if (!this.data.detail) return;
    const { detail, quality, isVip, isHdUnlocked } = this.data;

    // 🛑 下载二次拦截
    if (detail.is_vip && !isVip && !isHdUnlocked) {
      this.showVipHint();
      return;
    }

    wx.showLoading({ title: "保存中...", mask: true });

    const tasks = types.map(async (type) => {
      const normalKey = `${type}_img`;
      const hdKey = `${type}_img_hd`;
      let url;

      if (quality === "hd" && detail[hdKey]) {
        url = detail[hdKey];
        console.log(`[下载] ${type} 使用高清源`);
      } else {
        url = detail[normalKey];
        console.log(`[下载] ${type} 使用普通源`);
      }

      if (!url) {
        throw new Error(`未找到 ${type === "boy" ? "男生" : "女生"} 头像地址`);
      }

      return this.downloadAndSave(url);
    });

    try {
      await Promise.all(tasks);
      wx.hideLoading();
      wx.showToast({ title: "已保存到相册", icon: "success" });
    } catch (err) {
      wx.hideLoading();
      console.error("保存流程异常:", err);

      // 1. 权限问题：已在 saveToAlbumPromise 处理，此处忽略
      if (err.errMsg && (err.errMsg.includes("auth") || err.errMsg.includes("deny"))) {
        return;
      }

      // ✅ 2. 修复点：检测用户主动取消操作
      // 微信 API 文档说明取消时 errMsg 通常包含 "cancel"
      if (err.errMsg && err.errMsg.includes("cancel")) {
        wx.showToast({ title: "已取消保存", icon: "none" });
        return;
      }

      // 3. 其他真实错误才弹窗
      wx.showModal({
        title: "保存失败",
        content: err.message || "网络请求失败",
        showCancel: false,
      });
    }
  },

  async downloadAndSave(url) {
    const tempFilePath = await this.downloadFilePromise(url);
    await this.saveToAlbumPromise(tempFilePath);
  },

  downloadFilePromise(url) {
    return new Promise((resolve, reject) => {
      if (url.startsWith("http")) {
        wx.downloadFile({
          url: url,
          success: (res) => {
            if (res.statusCode === 200) resolve(res.tempFilePath);
            else reject(new Error(`下载失败 code:${res.statusCode}`));
          },
          fail: (err) => reject(new Error(err.errMsg || "下载网络图片失败")),
        });
      } else if (url.startsWith("cloud://")) {
        wx.cloud.downloadFile({
          fileID: url,
          success: (res) => resolve(res.tempFilePath),
          fail: (err) => reject(new Error(err.errMsg || "下载云文件失败")),
        });
      } else {
        reject(new Error("无效的图片地址格式"));
      }
    });
  },

  saveToAlbumPromise(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath: filePath,
        success: resolve,
        fail: (err) => {
          if (
            err.errMsg &&
            (err.errMsg.includes("auth") || err.errMsg.includes("deny"))
          ) {
            wx.showModal({
              title: "权限提示",
              content: "保存图片需要相册权限，请前往设置开启",
              confirmText: "去设置",
              success: (res) => {
                if (res.confirm) wx.openSetting();
              },
            });
          }
          reject(err);
        },
      });
    });
  },

  previewImage(e) {
    const idx = e.currentTarget.dataset.idx;
    const { detail, quality } = this.data;
    if (!detail) return;

    const getUrl = (type) => {
      const hdKey = `${type}_img_hd`;
      const normalKey = `${type}_img`;
      return quality === "hd" && detail[hdKey]
        ? detail[hdKey]
        : detail[normalKey];
    };

    const urls = [getUrl("boy"), getUrl("girl")];
    wx.previewImage({
      current: urls[idx],
      urls: urls,
    });
  },

  onShareAppMessage() {
    const { detail } = this.data;
    const title = detail?.title
      ? `快来看看这对情侣头像：${detail.title}`
      : "这对情侣头像也太甜了吧！💕";
    const imageUrl = detail?.cover_url || detail?.boy_img;

    return {
      title: title,
      path: `/pages/avatar_detail/index?id=${this.data.currentId}`,
      imageUrl: imageUrl,
    };
  },

  onShareTimeline() {
    const { detail } = this.data;
    const title = detail?.title || "甜蜜情侣头像分享";
    const imageUrl = detail?.cover_url || detail?.boy_img;

    return {
      title: title,
      query: `id=${this.data.currentId}`,
      imageUrl: imageUrl,
    };
  },
});