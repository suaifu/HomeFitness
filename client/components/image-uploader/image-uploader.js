// components/image-uploader/image-uploader.js
const { chooseAndUpload } = require('../../services/upload');

Component({
  properties: {
    // 图片列表 [{ url: string, uploading?: boolean, progress?: number }]
    images: {
      type: Array,
      value: []
    },
    
    // 最大图片数
    maxCount: {
      type: Number,
      value: 9
    },
    
    // 上传类型: avatar | coach | cert | misc
    uploadType: {
      type: String,
      value: 'misc'
    },
    
    // 是否禁用
    disabled: {
      type: Boolean,
      value: false
    },
    
    // 是否显示删除按钮
    showRemove: {
      type: Boolean,
      value: true
    },
    
    // 图片裁剪模式
    mode: {
      type: String,
      value: 'aspectFill'
    },
    
    // 是否懒加载
    lazyLoad: {
      type: Boolean,
      value: true
    },
    
    // 占位文字
    placeholder: {
      type: String,
      value: '添加图片'
    },
    
    // 提示文字
    tip: {
      type: String,
      value: ''
    },
    
    // 自定义样式类
    customClass: {
      type: String,
      value: ''
    },
    
    // 单个文件最大MB
    maxSize: {
      type: Number,
      value: 5
    }
  },

  data: {},

  methods: {
    // 选择图片
    async onChooseImage() {
      if (this.data.disabled) return;
      
      const remaining = this.data.maxCount - this.data.images.length;
      if (remaining <= 0) {
        wx.showToast({ title: `最多${this.data.maxCount}张图片`, icon: 'none' });
        return;
      }

      try {
        // 添加上传中状态
        const tempImage = {
          url: '',
          uploading: true,
          progress: 0
        };
        
        this.triggerEvent('change', {
          type: 'adding',
          images: [...this.data.images, tempImage]
        });

        // 选择并上传
        const result = await chooseAndUpload({
          type: this.data.uploadType,
          count: remaining,
          maxSize: this.data.maxSize
        });

        if (result) {
          // 上传成功
          const newImages = [...this.data.images];
          
          if (Array.isArray(result)) {
            // 多张图片
            result.forEach(url => {
              newImages.push({ url, uploading: false });
            });
          } else {
            // 单张图片 - 替换上传中的占位图
            const uploadIndex = newImages.findIndex(img => img.uploading);
            if (uploadIndex >= 0) {
              newImages[uploadIndex] = result;
            } else {
              newImages.push(result);
            }
          }

          this.triggerEvent('change', {
            type: 'success',
            images: newImages
          });
        } else {
          // 用户取消，移除占位图
          const newImages = this.data.images.filter(img => !img.uploading);
          this.triggerEvent('change', {
            type: 'cancel',
            images: newImages
          });
        }
      } catch (error) {
        console.error('上传失败:', error);
        
        // 移除上传中状态
        const newImages = this.data.images.filter(img => !img.uploading);
        this.triggerEvent('change', {
          type: 'error',
          images: newImages,
          error
        });
        
        wx.showToast({ title: error.message || '上传失败', icon: 'none' });
      }
    },

    // 删除图片
    onRemove(e) {
      if (this.data.disabled) return;
      
      const { index } = e.currentTarget.dataset;
      const image = this.data.images[index];
      
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这张图片吗？',
        success: (res) => {
          if (res.confirm) {
            const newImages = this.data.images.filter((_, i) => i !== index);
            
            this.triggerEvent('change', {
              type: 'remove',
              images: newImages,
              removedImage: image
            });
            
            this.triggerEvent('remove', {
              index,
              image
            });
          }
        }
      });
    },

    // 预览图片
    onPreview(e) {
      const { index } = e.currentTarget.dataset;
      const urls = this.data.images.map(img => img.url);
      
      wx.previewImage({
        urls,
        current: urls[index]
      });
    }
  }
});
