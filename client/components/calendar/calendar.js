// components/calendar/calendar.js - 日历组件
Component({
  properties: {
    // 默认选中的日期 (YYYY-MM-DD)
    selectedDate: {
      type: String,
      value: ''
    },
    // 最小日期 (YYYY-MM-DD)
    minDate: {
      type: String,
      value: ''
    },
    // 最大日期 (YYYY-MM-DD)
    maxDate: {
      type: String,
      value: ''
    },
    // 可选的日期数组 (YYYY-MM-DD)
    availableDates: {
      type: Array,
      value: []
    },
    // 不可选的日期数组 (YYYY-MM-DD)
    disabledDates: {
      type: Array,
      value: []
    },
    // 是否显示农历
    showLunar: {
      type: Boolean,
      value: false
    }
  },

  data: {
    // 当前显示的年月
    currentYear: 0,
    currentMonth: 0,
    // 周视图数据
    weeks: [],
    // 日期矩阵
    days: [],
    // 星期标题
    weekDays: ['日', '一', '二', '三', '四', '五', '六']
  },

  lifetimes: {
    attached() {
      // 在 attached 中初始化日期，避免在 data 中使用函数
      const now = new Date();
      this.setData({
        currentYear: now.getFullYear(),
        currentMonth: now.getMonth() + 1
      });
      this.initCalendar();
    }
  },

  observers: {
    'currentYear, currentMonth': function() {
      this.renderDays();
    },
    'selectedDate': function(newVal) {
      this.renderDays();
    }
  },

  methods: {
    initCalendar() {
      const today = new Date();
      const todayStr = this.formatDate(today);

      // 设置默认最小/最大日期
      if (!this.data.minDate) {
        this.setData({ minDate: todayStr });
      }
      if (!this.data.maxDate) {
        const maxDate = new Date(today);
        maxDate.setMonth(maxDate.getMonth() + 2);
        this.setData({ maxDate: this.formatDate(maxDate) });
      }

      this.renderDays();
    },

    // 格式化日期为 YYYY-MM-DD
    formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },

    // 获取某年某月有多少天
    getMonthDays(year, month) {
      return new Date(year, month, 0).getDate();
    },

    // 获取某年某月第一天是星期几
    getFirstDayOfWeek(year, month) {
      return new Date(year, month - 1, 1).getDay();
    },

    // 渲染日期
    renderDays() {
      const { currentYear, currentMonth, selectedDate, minDate, maxDate, availableDates, disabledDates } = this.data;

      const daysInMonth = this.getMonthDays(currentYear, currentMonth);
      const firstDayOfWeek = this.getFirstDayOfWeek(currentYear, currentMonth);

      const days = [];
      let week = [];

      // 填充空白
      for (let i = 0; i < firstDayOfWeek; i++) {
        week.push({ empty: true });
      }

      // 填充日期
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

        // 判断是否可选
        let disabled = false;

        // 检查是否在最小/最大日期范围内
        if (minDate && date < minDate) disabled = true;
        if (maxDate && date > maxDate) disabled = true;

        // 检查是否在禁用列表中
        if (disabledDates.includes(date)) disabled = true;

        // 如果有可选日期列表，检查是否在列表中
        if (availableDates.length > 0 && !availableDates.includes(date)) {
          disabled = true;
        }

        // 判断是否选中
        const isSelected = date === selectedDate;

        // 判断是否是今天
        const today = new Date();
        const isToday = date === this.formatDate(today);

        // 获取星期几
        const dayOfWeek = new Date(currentYear, currentMonth - 1, day).getDay();
        const weekDayText = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][dayOfWeek];

        week.push({
          day,
          date,
          disabled,
          isSelected,
          isToday,
          weekDayText
        });

        // 每7天换一行
        if (week.length === 7) {
          days.push(week);
          week = [];
        }
      }

      // 填充剩余空白
      if (week.length > 0) {
        while (week.length < 7) {
          week.push({ empty: true });
        }
        days.push(week);
      }

      this.setData({ days });
    },

    // 上个月
    prevMonth() {
      let { currentYear, currentMonth } = this.data;

      if (currentMonth === 1) {
        currentMonth = 12;
        currentYear--;
      } else {
        currentMonth--;
      }

      this.setData({ currentYear, currentMonth });
      this.triggerEvent('monthChange', { year: currentYear, month: currentMonth });
    },

    // 下个月
    nextMonth() {
      let { currentYear, currentMonth } = this.data;

      if (currentMonth === 12) {
        currentMonth = 1;
        currentYear++;
      } else {
        currentMonth++;
      }

      this.setData({ currentYear, currentMonth });
      this.triggerEvent('monthChange', { year: currentYear, month: currentMonth });
    },

    // 选择日期
    onDayTap(e) {
      const { date, disabled } = e.currentTarget.dataset;

      if (disabled) return;

      this.triggerEvent('select', { date });
    }
  }
});
