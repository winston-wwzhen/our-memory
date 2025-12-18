// miniprogram/pages/avatar_detail/index.js
const app = getApp();

Page({
  data: {
    currentId: null, // 保存当前 ID 用于下拉刷新
    detail: null, // 头像详情数据
    quality: "normal", // 画质模式: 'normal' | 'hd'
    isHdUnlocked: false, // 是否已解锁高清
    isVip: false, // 是否 VIP
    loading: true,
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ currentId: id });
      this.fetchDetail(id);
    }
    this.checkVipStatus();
  },

  // 🔄 1. 下拉刷新逻辑
  onPullDownRefresh() {
    wx.vibrateShort({ type: "light" }); // 震动反馈

    const id = this.data.currentId;
    if (!id) {
      wx.stopPullDownRefresh();
      return;
    }

    // 并行刷新数据
    Promise.all([
      this.fetchDetail(id, true), // true 表示刷新模式
      this.checkVipStatus(),
    ]).then(() => {
      wx.stopPullDownRefresh();
      wx.showToast({ title: "已刷新", icon: "none" });
    });
  },

  // 获取详情 (返回 Promise)
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

  // 检查 VIP (返回 Promise)
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

  // 2. 切换画质
  switchQuality(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.quality) return;

    if (mode === "normal") {
      this.setData({ quality: "normal" });
    } else {
      // 切换高清需检查权限
      if (this.data.isHdUnlocked) {
        this.setData({ quality: "hd" });
        wx.showToast({ title: "已切换高清画质", icon: "none" });
      } else {
        this.triggerUnlock();
      }
    }
  },

  // 3. 触发解锁弹窗
  triggerUnlock() {
    const that = this;
    wx.showModal({
      title: "解锁高清原图",
      content: "观看一次完整视频，即可免费下载高清无损原图~",
      confirmText: "去解锁",
      confirmColor: "#ff6b81",
      cancelText: "再想想",
      success(res) {
        if (res.confirm) {
          that.showVideoAd();
        }
      },
    });
  },

  // 模拟/真实广告逻辑
  showVideoAd() {
    wx.showLoading({ title: "广告加载中..." });
    // 模拟 1.5秒后看完广告
    setTimeout(() => {
      wx.hideLoading();
      this.setData({ isHdUnlocked: true, quality: "hd" });
      wx.showToast({ title: "解锁成功！", icon: "success" });
    }, 1500);
  },

  // === 4. 核心下载与保存逻辑 ===

  saveAvatar(e) {
    const type = e.currentTarget.dataset.type; // 'boy' or 'girl'
    this.doDownload([type]);
  },

  saveAll() {
    this.doDownload(["boy", "girl"]);
  },

  async doDownload(types) {
    if (!this.data.detail) return;
    const { detail, quality } = this.data;

    wx.showLoading({ title: "保存中...", mask: true });

    // 构建下载任务队列
    const tasks = types.map(async (type) => {
      // 1. 确定字段名
      const normalKey = `${type}_img`;
      const hdKey = `${type}_img_hd`;

      let url;

      // 2. 智能取值：高清模式且有高清图 -> 用高清；否则 -> 降级用普通
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

      // 3. 执行下载保存
      return this.downloadAndSave(url);
    });

    try {
      await Promise.all(tasks);
      wx.hideLoading();
      wx.showToast({ title: "已保存到相册", icon: "success" });
    } catch (err) {
      wx.hideLoading();
      console.error("保存流程异常:", err);

      // 如果不是权限取消错误，才弹窗提示
      if (
        !(
          err.errMsg &&
          (err.errMsg.includes("auth") || err.errMsg.includes("deny"))
        )
      ) {
        wx.showModal({
          title: "保存失败",
          content: err.message || "网络请求失败",
          showCancel: false,
        });
      }
    }
  },

  // 单个文件流程
  async downloadAndSave(url) {
    const tempFilePath = await this.downloadFilePromise(url);
    await this.saveToAlbumPromise(tempFilePath);
  },

  // Promise: 下载文件 (兼容 HTTPS 和 CloudID)
  downloadFilePromise(url) {
    return new Promise((resolve, reject) => {
      // 🟢 情况 A: HTTPS 网络图片 -> wx.downloadFile
      if (url.startsWith("http")) {
        wx.downloadFile({
          url: url,
          success: (res) => {
            if (res.statusCode === 200) resolve(res.tempFilePath);
            else reject(new Error(`下载失败 code:${res.statusCode}`));
          },
          fail: (err) => reject(new Error(err.errMsg || "下载网络图片失败")),
        });
      }
      // 🔵 情况 B: 云存储 ID -> wx.cloud.downloadFile
      else if (url.startsWith("cloud://")) {
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

  // Promise: 保存到相册 (含权限引导)
  saveToAlbumPromise(filePath) {
    return new Promise((resolve, reject) => {
      wx.saveImageToPhotosAlbum({
        filePath: filePath,
        success: resolve,
        fail: (err) => {
          // 权限拒绝自动引导
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

  // 5. 预览大图
  previewImage(e) {
    const idx = e.currentTarget.dataset.idx;
    const { detail, quality } = this.data;
    if (!detail) return;

    // 预览也遵循高清优先逻辑
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

  // 📤 6. 分享给朋友
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

  // 🌍 7. 分享到朋友圈
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
