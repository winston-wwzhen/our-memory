// miniprogram/pages/postcards/index.js
const app = getApp();

Page({
  data: {
    // Postcards data
    postcards: [],
    loading: false, // 初始设为 false，由 loadPostcards 控制
    
    // Pagination
    page: 1,
    pageSize: 10,
    hasMore: true,

    // Statistics (基于前端已加载数据或后端返回)
    totalPostcards: 0,
    totalDestinations: 0,
    specialItems: 0,

    // Modal
    showDetailModal: false,
    selectedPostcard: null,
    showShareActions: false
  },

  onLoad: function(options) {
    // 首次加载，重置列表
    this.loadPostcards(true);
  },

  onShow: function() {
    // 注意：分页模式下，建议移除 onShow 的自动刷新，
    // 否则用户浏览到第 5 页切出去再回来，列表被重置会影响体验。
    // 如果列表为空，可以尝试加载
    if (this.data.postcards.length === 0) {
      this.loadPostcards(true);
    }
  },

  // ✅ 监听用户下拉动作
  onPullDownRefresh: function() {
    // 触发重置 + 标记为下拉动作
    this.loadPostcards(true, true);
  },

  // ✅ 监听用户上拉触底
  onReachBottom: function() {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadPostcards(false); // 不重置，追加数据
    }
  },

  // ✅ 核心加载方法：融合了重置(reset)和下拉刷新(isPullDown)逻辑
  loadPostcards: function(reset = false, isPullDown = false) {
    if (this.data.loading) return;

    // 如果是重置，先初始化分页状态
    if (reset) {
      this.setData({ 
        page: 1, 
        hasMore: true
        // 注意：这里暂时不清空 postcards，避免页面闪白，等数据回来后再覆盖
      });
    }

    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'user_center',
      data: { 
        action: 'get_postcards',
        page: this.data.page,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        if (res.result.status === 200) {
          const rawPostcards = res.result.postcards || [];
          const totalCount = res.result.total || 0; // 假设后端返回总数

          // 数据预处理
          const processedNewItems = rawPostcards.map(postcard => {
            return {
              ...postcard,
              travel_date_formatted: this.formatDate(postcard.travel_date),
              liked: false, // 只有后端记录了用户点赞状态，这里才能回显
              likes: postcard.likes || 0
            };
          });

          // 决定是覆盖还是追加
          const finalPostcards = reset 
            ? processedNewItems 
            : this.data.postcards.concat(processedNewItems);

          // 计算统计数据 (基于当前已有的所有数据)
          // ⚠️ 最佳实践：这些统计数据最好由后端直接返回，前端计算只在数据量少时可行
          const destinations = new Set(finalPostcards.map(p => p.destination_id));
          const specialItemsCount = finalPostcards.filter(p => p.specialty_item).length;

          // 智能判断是否还有更多数据
          // 1. 如果后端返回了 total，直接对比
          // 2. 如果没返回 total，判断本次返回条数是否小于 pageSize
          let hasMore = true;
          if (res.result.total !== undefined) {
            hasMore = finalPostcards.length < res.result.total;
          } else {
            hasMore = rawPostcards.length === this.data.pageSize;
          }

          this.setData({
            postcards: finalPostcards,
            totalPostcards: res.result.total || finalPostcards.length,
            totalDestinations: destinations.size,
            specialItems: specialItemsCount,
            hasMore: hasMore,
            loading: false
          });
        } else {
          this.setData({ loading: false });
          wx.showToast({ title: '加载明信片失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('Failed to load postcards:', err);
        this.setData({ loading: false });
        wx.showToast({ title: '网络错误', icon: 'none' });
      },
      complete: () => {
        // ✅ 无论成功失败，如果是下拉触发的，必须停止动画
        if (isPullDown) {
          wx.stopPullDownRefresh();
          wx.showToast({ title: '刷新成功', icon: 'none' });
        }
      }
    });
  },

  // Format date
  formatDate: function(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}年${month}月${day}日`;
  },

  // View postcard detail
  onPostcardTap: function(e) {
    const postcard = e.currentTarget.dataset.postcard;
    this.setData({
      selectedPostcard: postcard,
      showDetailModal: true
    });
  },

  // Like postcard (Optimized with Backend Call)
  onLikePostcard: function(e) {
    const id = e.currentTarget.dataset.id;
    const postcards = this.data.postcards;

    const index = postcards.findIndex(p => p.id === id);
    if (index !== -1) {
      const isLiked = !postcards[index].liked;
      
      // 1. 乐观更新 (Optimistic UI Update) - 先变色，让用户感觉快
      postcards[index].liked = isLiked;
      postcards[index].likes = isLiked ? (postcards[index].likes + 1) : (postcards[index].likes - 1);
      
      this.setData({ postcards: postcards });

      // 2. 后端同步
      wx.cloud.callFunction({
        name: 'user_center',
        data: {
          action: 'toggle_like_postcard', // 记得在 pet.js 实现这个 action
          postcardId: id,
          isLiked: isLiked
        },
        fail: (err) => {
          // 失败回滚
          console.error("Like failed", err);
          postcards[index].liked = !isLiked;
          postcards[index].likes = isLiked ? (postcards[index].likes - 1) : (postcards[index].likes + 1);
          this.setData({ postcards: postcards });
          wx.showToast({ title: '点赞失败', icon: 'none' });
        }
      });
    }
  },

  // Close detail modal
  closeDetailModal: function() {
    this.setData({
      showDetailModal: false,
      selectedPostcard: null
    });
  },

  // Share button
  onShare: function() {
    this.setData({ showShareActions: true });
  },

  // Share postcard
  onSharePostcard: function() {
    if (!this.data.selectedPostcard) return;
    wx.showShareMenu({ withShareTicket: true });
    this.setData({ showShareActions: false });
  },

// --- 新增辅助方法：Promisify 图片加载 ---
  loadImage: function(canvas, src) {
    return new Promise((resolve, reject) => {
      const img = canvas.createImage();
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        console.error("加载图片失败:", src, e);
        // 为了不阻断流程，加载失败可以返回 null，绘制时做容错
        resolve(null); 
      };
      img.src = src;
    });
  },

  // --- 终极优化版海报生成 ---
onSavePostcard: function() {
  const postcard = this.data.selectedPostcard;
  if (!postcard) return;

  wx.createSelectorQuery()
    .select('#posterCanvas')
    .fields({ node: true, size: true })
    .exec(async (res) => {
      if (!res[0] || !res[0].node) {
        console.error("Canvas node not found.");
        return;
      }

      wx.showLoading({ title: '用心绘制中...', mask: true });

      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      const width = res[0].width;
      const height = res[0].height;
      const dpr = wx.getSystemInfoSync().pixelRatio;

      // --- 1. 初始化画布与样式常量 ---
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      const colors = {
        bg: '#FDFCF8',
        frameShadow: 'rgba(0,0,0,0.1)',
        title: '#333333',
        text: '#666666',
        accent: '#E6A23C',
        qrText: '#999999'
      };

      const paddingX = 24;
      const paddingY = 30;
      const contentWidth = width - paddingX * 2;
      let currentY = paddingY;

      // --- 2. 并发加载资源 (修改点：移除解构赋值) ---
      const mainImageSrc = postcard.destination.image;
      // 记得替换为您的真实二维码链接
      const qrCodeSrc = 'https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/our_memories_pord_scan.jpg?sign=b7e99aad773f42ec2fc11067e5491296&t=1766198653'; 

      try {
        // ✅ 修改点：不使用 const [a, b] = ... 语法，避开报错
        const imageResults = await Promise.all([
          this.loadImage(canvas, mainImageSrc),
          this.loadImage(canvas, qrCodeSrc)
        ]);
        
        const mainImgObj = imageResults[0];
        const qrImgObj = imageResults[1];

        if (!mainImgObj) throw new Error("主图加载失败");

        // --- 3. 开始绘制 ---
        
        // 3.1 绘制背景
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        // 3.2 绘制拍立得相框
        const photoMargin = 12;
        const photoDisplayHeight = (contentWidth - photoMargin * 2) * (3 / 4);
        const frameHeight = photoMargin + photoDisplayHeight + photoMargin * 3;

        ctx.shadowColor = colors.frameShadow;
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 10;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(paddingX, currentY, contentWidth, frameHeight);
        ctx.shadowColor = 'transparent';

        // 3.3 绘制照片 (Aspect Fill)
        const photoX = paddingX + photoMargin;
        const photoY = currentY + photoMargin;
        const photoW = contentWidth - photoMargin * 2;
        const photoH = photoDisplayHeight;

        const sWidth = mainImgObj.width;
        const sHeight = mainImgObj.height;
        let sDrawWidth = sWidth;
        let sDrawHeight = sHeight;
        let sX = 0; let sY = 0;
        if (sWidth / sHeight > photoW / photoH) {
           sDrawWidth = sHeight * (photoW / photoH); sX = (sWidth - sDrawWidth) / 2;
        } else {
           sDrawHeight = sWidth * (photoH / photoW); sY = (sHeight - sDrawHeight) / 2;
        }
        ctx.drawImage(mainImgObj, sX, sY, sDrawWidth, sDrawHeight, photoX, photoY, photoW, photoH);
        
        currentY += frameHeight + 40;

        // --- 4. 文字排版 ---
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';

        // 标题
        ctx.fillStyle = colors.title;
        ctx.font = `bold 26px sans-serif`;
        ctx.fillText(postcard.destination.name, width / 2, currentY);
        currentY += 45;

        // 装饰线
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(width / 2 - 20, currentY);
        ctx.lineTo(width / 2 + 20, currentY);
        ctx.stroke();
        currentY += 35;

        // 正文
        ctx.textAlign = 'left';
        ctx.fillStyle = colors.text;
        ctx.font = `normal 17px sans-serif`;
        
        const message = postcard.message || "这是我们共同珍藏的美好回忆。";
        const lineHeight = 28;
        let line = '';
        for (let n = 0; n < message.length; n++) {
          const testLine = line + message[n];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > contentWidth && n > 0) {
            ctx.fillText(line, paddingX, currentY);
            line = message[n];
            currentY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, paddingX, currentY);

        // --- 5. 底部水印 ---
        const footerHeight = 100;
        const footerStartY = height - footerHeight - paddingY;
        currentY = Math.max(currentY + 50, footerStartY);

        if (qrImgObj) {
            const qrSize = 80;
            const qrX = width - paddingX - qrSize;
            const qrY = height - paddingY - qrSize;

            ctx.drawImage(qrImgObj, qrX, qrY, qrSize, qrSize);

            ctx.textAlign = 'right';
            ctx.fillStyle = colors.qrText;
            ctx.font = '12px sans-serif';
            ctx.fillText('长按识别小程序', qrX - 10, qrY + qrSize / 2 - 8);
            ctx.fillText('生成你的专属回忆', qrX - 10, qrY + qrSize / 2 + 10);
            
            ctx.textAlign = 'left';
            ctx.fillText(postcard.travel_date_formatted || this.formatDate(new Date()), paddingX, qrY + qrSize - 10);
        }

        // --- 6. 导出 ---
        wx.canvasToTempFilePath({
          canvas,
          fileType: 'jpg',
          quality: 0.95,
          success: (tempRes) => {
            wx.saveImageToPhotosAlbum({
              filePath: tempRes.tempFilePath,
              success: () => wx.showToast({ title: '已保存相册', icon: 'success' }),
              fail: (err) => {
                 if (err.errMsg.includes("auth")) {
                    wx.showModal({ title: '提示', content: '需要相册权限才能保存哦', success: sm => { if(sm.confirm) wx.openSetting() } });
                 }
              }
            });
          },
          complete: () => wx.hideLoading()
        });

      } catch (error) {
        console.error("绘图流程异常:", error);
        wx.hideLoading();
        wx.showToast({ title: '生成海报失败', icon: 'none' });
      }
    });
},
  // 辅助方法：绘制简易邮戳 (可复用)
  drawPostmark: function(ctx, x, y, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 6); // 旋转 30度

    // 外圈圆
    ctx.strokeStyle = color + '80'; // 半透明
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, 2 * Math.PI);
    ctx.stroke();
    
    // 内圈圆
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, 2 * Math.PI);
    ctx.stroke();

    // 文字
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('OUR MEMORY', 0, -10);
    ctx.font = '10px sans-serif';
    ctx.fillText('POSTCARD', 0, 5);
    ctx.fillText('★★★', 0, 18);

    ctx.restore();
  },

  // Share to Wechat/Moments actions
  onShareToWechat: function() {
    this.setData({ showShareActions: false });
    // Trigger WeChat share (button open-type="share" is preferred)
  },

  onShareToMoments: function() {
    this.setData({ showShareActions: false });
    // Tips: 小程序不能直接调起发朋友圈，通常是保存海报引导用户发
    this.onSavePostcard(); 
  },

  onShareActionChange: function() {
    this.setData({ showShareActions: false });
  },

  goToTravelMap: function() {
    wx.navigateTo({
      url: '/pages/travel_map/index'
    });
  },

  stopPropagation: function() {},

  onShareAppMessage: function(res) {
    const postcard = this.data.selectedPostcard;
    if (postcard) {
      return {
        title: `我的宠物从${postcard.destination.name}寄来了明信片！`,
        path: `/pages/postcards/index`,
        imageUrl: postcard.destination.image
      };
    }
    return {
      title: '我们的旅行回忆',
      path: `/pages/postcards/index`
    };
  }
});