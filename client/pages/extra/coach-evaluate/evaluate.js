// pages/coach/evaluate/evaluate.js - 提交评价
const app = getApp();
const reviewsService = require('../../../services/reviews');

Page({
  data: {
    coachId: null,
    coachName: '',
    bookingId: null,  // 可选的预约ID
    // 评分
    rating: 5,
    // 评价内容
    content: '',
    // 选中的标签
    selectedTags: [],
    // 是否正在提交
    submitting: false,
    // 标签列表
    tags: reviewsService.REVIEW_TAGS
  },

  onLoad(options) {
    const { coachId, coachName, bookingId } = options;
    if (!coachId) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
      return;
    }

    this.setData({
      coachId: parseInt(coachId),
      coachName: coachName || '教练',
      bookingId: bookingId ? parseInt(bookingId) : null
    });

    wx.setNavigationBarTitle({ title: `评价${coachName || '教练'}` });
  },

  // 评分变化
  onRatingChange(e) {
    this.setData({ rating: e.detail.value });
  },

  // 内容输入
  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  // 选择/取消标签
  onTagTap(e) {
    const tagId = e.currentTarget.dataset.id;
    const { selectedTags } = this.data;

    const index = selectedTags.indexOf(tagId);
    if (index > -1) {
      selectedTags.splice(index, 1);
    } else {
      // 最多选择3个标签
      if (selectedTags.length >= 3) {
        wx.showToast({ title: '最多选择3个标签', icon: 'none' });
        return;
      }
      selectedTags.push(tagId);
    }

    this.setData({ selectedTags });
  },

  // 获取标签文字
  getTagLabel(tagId) {
    const tag = this.data.tags.find(t => t.id === tagId);
    return tag ? tag.label : tagId;
  },

  // 提交评价
  async onSubmit() {
    const { rating, content, selectedTags, coachId, bookingId } = this.data;

    // 评分校验
    if (rating < 1) {
      wx.showToast({ title: '请选择评分', icon: 'none' });
      return;
    }

    // 内容校验（可选，但建议至少10字）
    if (content.length > 0 && content.length < 10) {
      wx.showModal({
        title: '提示',
        content: '评价内容过短（建议至少10个字），是否继续提交？',
        confirmColor: '#FF6B6B',
        success: (res) => {
          if (res.confirm) this.submitReview();
        }
      });
      return;
    }

    this.submitReview();
  },

  async submitReview() {
    const { rating, content, selectedTags, coachId, bookingId, submitting } = this.data;

    if (submitting) return;
    this.setData({ submitting: true });

    wx.showLoading({ title: '提交中...' });

    try {
      await reviewsService.createReview({
        coach_id: coachId,
        booking_id: bookingId,
        rating,
        content,
        tags: selectedTags
      });

      // 清除教练详情缓存（评分/评价数会变）
      const api = require('../../../services/api');
      api.clearCache(`coach_${coachId}`);

      wx.hideLoading();
      wx.showToast({
        title: '评价成功',
        icon: 'success',
        duration: 1500,
        success: () => {
          setTimeout(() => {
            // 返回上一页并刷新
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            if (prevPage && prevPage.route === 'pages/extra/coach-reviews/reviews') {
              prevPage.onPullDownRefresh();
            }
            wx.navigateBack();
          }, 1500);
        }
      });
    } catch (error) {
      wx.hideLoading();
      console.error('提交评价失败:', error);
      wx.showToast({
        title: error.message || '提交失败，请重试',
        icon: 'none'
      });
      this.setData({ submitting: false });
    }
  }
});
