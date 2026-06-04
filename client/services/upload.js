/**
 * services/upload.js - 图片上传服务
 * 支持：用户头像、教练头像、资质证书等
 * 注意：不要在模块顶层调用 getApp()，因为此时 App() 可能还未初始化
 */

let _app = null;
function getAppInstance() {
  if (!_app) _app = getApp();
  return _app;
}

/**
 * 上传类型枚举
 */
const UPLOAD_TYPES = {
  AVATAR: 'avatar',     // 用户头像
  COACH: 'coach',       // 教练相关图片
  CERT: 'cert',         // 资质证书
  MISC: 'misc'          // 其他
};

/**
 * 选择图片并上传
 * @param {Object} options - 配置选项
 * @param {string} options.type - 上传类型 avatar|coach|cert
 * @param {number} options.count - 最多选择图片数，默认1
 * @param {string} options.sourceType - 图片来源 album|camera
 * @param {number} options.sizeType - 图片大小 compressed|original
 * @param {number} options.maxSize - 单个文件最大MB，默认5
 */
function chooseAndUpload(options = {}) {
  const {
    type = UPLOAD_TYPES.MISC,
    count = 1,
    sourceType = ['album', 'camera'],
    sizeType = ['compressed'],
    maxSize = 5
  } = options;

  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      sourceType,
      sizeType,
      success: async (res) => {
        const tempFiles = res.tempFiles;
        const results = [];

        for (const file of tempFiles) {
          // 检查文件大小
          if (file.size > maxSize * 1024 * 1024) {
            wx.showToast({ 
              title: `${file.tempFilePath.split('/').pop()} 超过${maxSize}MB`, 
              icon: 'none' 
            });
            continue;
          }

          try {
            const result = await uploadFile({
              filePath: file.tempFilePath,
              type
            });
            results.push(result);
          } catch (error) {
            console.error('上传失败:', error);
            wx.showToast({ title: '上传失败，请重试', icon: 'none' });
          }
        }

        if (results.length > 0) {
          resolve(count === 1 ? results[0] : results);
        } else {
          reject(new Error('上传失败'));
        }
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) {
          // 用户取消选择
          resolve(null);
        } else {
          reject(err);
        }
      }
    });
  });
}

/**
 * 上传单个文件
 * @param {Object} options
 * @param {string} options.filePath - 文件临时路径
 * @param {string} options.type - 上传类型
 * @param {string} options.name - 表单字段名，默认 file
 */
function uploadFile(options = {}) {
  const {
    filePath,
    type = UPLOAD_TYPES.MISC,
    name = 'file'
  } = options;

  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');
    
    wx.uploadFile({
      url: `${getAppInstance().globalData.apiBaseUrl}/api/upload/${type}`,
      filePath,
      name,
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        const data = JSON.parse(res.data);
        
        if (data.success) {
          // 拼接完整URL
          const url = data.data.url.startsWith('http') 
            ? data.data.url 
            : `${getAppInstance().globalData.apiBaseUrl}${data.data.url}`;
          
          resolve({
            url,
            filename: data.data.filename,
            size: data.data.size
          });
        } else {
          reject(new Error(data.message || '上传失败'));
        }
      },
      fail: (err) => {
        console.error('上传请求失败:', err);
        reject(new Error('上传失败'));
      }
    });
  });
}

/**
 * 选择并上传头像
 * 专门优化头像上传：正方形裁剪、较小文件大小
 */
function uploadAvatar() {
  return new Promise((resolve, reject) => {
    // 先让用户选择图片来源
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        const sourceType = res.tapIndex === 0 ? ['camera'] : ['album'];
        
        wx.chooseMedia({
          count: 1,
          sourceType,
          mediaType: ['image'],
          success: async (chooseRes) => {
            const tempFile = chooseRes.tempFiles[0];
            
            // 如果文件过大，提示用户
            if (tempFile.size > 2 * 1024 * 1024) {
              wx.showToast({ 
                title: '图片请小于2MB', 
                icon: 'none' 
              });
              return;
            }

            try {
              const result = await uploadFile({
                filePath: tempFile.tempFilePath,
                type: UPLOAD_TYPES.AVATAR
              });
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        });
      },
      fail: (err) => {
        if (err.errMsg !== 'cancel') {
          reject(err);
        }
      }
    });
  });
}

/**
 * 上传教练资质证书
 * 支持多张图片
 */
function uploadCertificates(maxCount = 4) {
  return chooseAndUpload({
    type: UPLOAD_TYPES.CERT,
    count: maxCount,
    maxSize: 5
  });
}

/**
 * 删除上传的文件
 * @param {string} filename - 文件名（不含路径）
 */
async function deleteFile(filename) {
  try {
    const result = await getAppInstance().request(`/upload/${filename}`, 'DELETE');
    return { success: true, ...result };
  } catch (error) {
    console.error('删除文件失败:', error);
    return { success: false, error };
  }
}

/**
 * 压缩图片并上传
 * 使用 canvas 压缩后上传
 */
function compressAndUpload(options = {}) {
  const {
    filePath,
    type = UPLOAD_TYPES.MISC,
    quality = 0.8,
    maxWidth = 800,
    maxHeight = 800
  } = options;

  return new Promise((resolve, reject) => {
    // 获取图片原始尺寸
    wx.getImageInfo({
      src: filePath,
      success: (info) => {
        // 计算压缩后的尺寸
        let { width, height } = info;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // 创建 canvas 绘制
        const ctx = wx.createCanvasContext('compress-canvas');
        ctx.drawImage(filePath, 0, 0, width, height);
        ctx.draw(false, () => {
          // 导出压缩后的图片
          wx.canvasToTempFilePath({
            x: 0,
            y: 0,
            width,
            height,
            canvasId: 'compress-canvas',
            fileType: 'jpg',
            quality,
            success: (res) => {
              // 上传压缩后的图片
              uploadFile({
                filePath: res.tempFilePath,
                type
              }).then(resolve).catch(reject);
            },
            fail: reject
          });
        });
      },
      fail: reject
    });
  });
}

/**
 * 预览图片
 */
function previewImage(urls, current = 0) {
  wx.previewImage({
    urls: Array.isArray(urls) ? urls : [urls],
    current: typeof current === 'number' ? urls[current] : current
  });
}

module.exports = {
  UPLOAD_TYPES,
  chooseAndUpload,
  uploadFile,
  uploadAvatar,
  uploadCertificates,
  deleteFile,
  compressAndUpload,
  previewImage
};
