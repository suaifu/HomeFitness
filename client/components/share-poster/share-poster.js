// components/share-poster/share-poster.js
// 分享海报组件 — Canvas 绘制带小程序码的分享海报

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    // 海报数据
    coachName: { type: String, value: '' },
    coachAvatar: { type: String, value: '' },
    coachSpecialty: { type: String, value: '' },
    coachPrice: { type: Number, value: 0 },
    coachRating: { type: Number, value: 0 },
    coachId: { type: String, value: '' },
    // 场景：coach（教练详情）或 booking（预约成功）
    scene: { type: String, value: 'coach' },
  },

  data: {
    posterUrl: '',
    isDrawing: false,
    canvasWidth: 600,
    canvasHeight: 900,
  },

  observers: {
    show(val) {
      if (val && !this.data.posterUrl) {
        this.drawPoster();
      }
    }
  },

  methods: {
    // 绘制海报
    async drawPoster() {
      if (this.data.isDrawing) return;
      this.setData({ isDrawing: true });

      try {
        const query = this.createSelectorQuery();
        query.select('#posterCanvas')
          .fields({ node: true, size: true })
          .exec(async (res) => {
            if (!res[0]) {
              this.setData({ isDrawing: false });
              return;
            }

            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            const dpr = wx.getWindowInfo().pixelRatio;
            const width = this.data.canvasWidth;
            const height = this.data.canvasHeight;

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);

            // 清空画布
            ctx.clearRect(0, 0, width, height);

            // 1. 背景渐变
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#FF6B6B');
            gradient.addColorStop(0.4, '#FF8E8E');
            gradient.addColorStop(1, '#FFFFFF');
            ctx.fillStyle = gradient;
            this._roundRect(ctx, 0, 0, width, height, 0);
            ctx.fill();

            // 2. 顶部标题
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('上门健身', width / 2, 80);
            ctx.font = '24px sans-serif';
            ctx.fillText('专业教练 · 上门服务', width / 2, 115);

            // 3. 教练头像（圆形裁剪）
            const avatarSize = 140;
            const avatarX = width / 2;
            const avatarY = 240;

            try {
              const avatarImg = canvas.createImage();
              avatarImg.src = this.data.coachAvatar || '/images/default-coach.png';
              await new Promise((resolve, reject) => {
                avatarImg.onload = resolve;
                avatarImg.onerror = reject;
                setTimeout(reject, 3000); // 3秒超时
              });

              ctx.save();
              ctx.beginPath();
              ctx.arc(avatarX, avatarY, avatarSize / 2, 0, 2 * Math.PI);
              ctx.clip();
              ctx.drawImage(avatarImg, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
              ctx.restore();
            } catch (e) {
              // 头像加载失败，画默认圆形
              ctx.beginPath();
              ctx.arc(avatarX, avatarY, avatarSize / 2, 0, 2 * Math.PI);
              ctx.fillStyle = '#FFE0E0';
              ctx.fill();
              ctx.fillStyle = '#FF6B6B';
              ctx.font = '48px sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('🏋️', avatarX, avatarY + 16);
            }

            // 头像边框
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarSize / 2 + 3, 0, 2 * Math.PI);
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 4;
            ctx.stroke();

            // 4. 教练名字
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 34px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.data.coachName || '专业教练', width / 2, 350);

            // 5. 专长
            ctx.fillStyle = '#666666';
            ctx.font = '24px sans-serif';
            ctx.fillText(this.data.coachSpecialty || '专业私教', width / 2, 385);

            // 6. 评分 + 价格
            ctx.fillStyle = '#FF6B6B';
            ctx.font = 'bold 28px sans-serif';
            const ratingText = `★ ${this.data.coachRating || 5.0}`;
            const priceText = `¥${this.data.coachPrice || 0}/课时`;
            ctx.fillText(ratingText + '    ' + priceText, width / 2, 430);

            // 7. 白色卡片区域
            ctx.fillStyle = '#FFFFFF';
            this._roundRect(ctx, 40, 470, width - 80, 280, 20);
            ctx.fill();

            // 卡片文字
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 28px sans-serif';
            ctx.textAlign = 'center';
            if (this.data.scene === 'booking') {
              ctx.fillText('🎉 预约成功！', width / 2, 520);
              ctx.fillStyle = '#666666';
              ctx.font = '24px sans-serif';
              ctx.fillText('快来体验专业上门健身服务', width / 2, 560);
            } else {
              ctx.fillText('推荐一位好教练给你', width / 2, 520);
              ctx.fillStyle = '#666666';
              ctx.font = '24px sans-serif';
              ctx.fillText('专业认证 · 上门服务 · 品质保障', width / 2, 560);
            }

            // 小程序码占位
            const qrSize = 120;
            const qrX = width / 2 - qrSize / 2;
            const qrY = 590;

            // 画小程序码占位区（实际生产环境需调用后端获取小程序码）
            ctx.fillStyle = '#F5F5F5';
            this._roundRect(ctx, qrX, qrY, qrSize, qrSize, 8);
            ctx.fill();
            ctx.strokeStyle = '#E0E0E0';
            ctx.lineWidth = 1;
            this._roundRect(ctx, qrX, qrY, qrSize, qrSize, 8);
            ctx.stroke();

            // 小程序码图标
            ctx.fillStyle = '#999999';
            ctx.font = '20px sans-serif';
            ctx.fillText('小程序码', width / 2, qrY + qrSize / 2 + 6);

            // 底部提示
            ctx.fillStyle = '#999999';
            ctx.font = '20px sans-serif';
            ctx.fillText('长按识别小程序码', width / 2, 780);

            // 8. 导出图片
            wx.canvasToTempFilePath({
              canvas,
              width: width * dpr,
              height: height * dpr,
              destWidth: width * 2,
              destHeight: height * 2,
              success: (res) => {
                this.setData({
                  posterUrl: res.tempFilePath,
                  isDrawing: false
                });
              },
              fail: (err) => {
                console.error('导出海报失败:', err);
                this.setData({ isDrawing: false });
                wx.showToast({ title: '生成失败', icon: 'none' });
              }
            });
          });
      } catch (error) {
        console.error('绘制海报失败:', error);
        this.setData({ isDrawing: false });
      }
    },

    // 保存到相册
    async onSaveToAlbum() {
      if (!this.data.posterUrl) return;

      try {
        const auth = await wx.authorize({ scope: 'scope.writePhotosAlbum' });
      } catch (e) {
        wx.showModal({
          title: '需要相册权限',
          content: '请授权保存图片到相册',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
        return;
      }

      wx.saveImageToPhotosAlbum({
        filePath: this.data.posterUrl,
        success: () => {
          wx.showToast({ title: '已保存到相册', icon: 'success' });
          this.triggerEvent('saved');
        },
        fail: () => {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      });
    },

    // 关闭弹窗
    onClose() {
      this.setData({ posterUrl: '' });
      this.triggerEvent('close');
    },

    // 阻止冒泡
    noop() {},

    // 圆角矩形辅助
    _roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r);
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h);
      ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    }
  }
});
