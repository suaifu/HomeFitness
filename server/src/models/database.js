/**
 * 数据库初始化和模型 (使用 sql.js) — 优化版：延迟写入 + 数据安全
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/homefitness.db');
let db = null;

// ============ 延迟写入机制 ============
let _saveTimer = null;
let _isDirty = false;

/**
 * 标记数据库为脏（需要保存）
 */
function markDirty() {
  _isDirty = true;
  if (!_saveTimer) {
    _saveTimer = setTimeout(() => {
      if (_isDirty) {
        saveDatabase();
        _isDirty = false;
      }
      _saveTimer = null;
    }, 1000); // 1秒后批量写入
  }
}

/**
 * 立即保存（用于关键数据如订单/支付）
 */
function flushDatabase() {
  if (_saveTimer) {
    clearTimeout(_saveTimer);
    _saveTimer = null;
  }
  if (_isDirty) {
    saveDatabase();
    _isDirty = false;
  }
}

/**
 * 初始化数据库
 */
async function initDatabase() {
  const SQL = await initSqlJs();

  // 确保 data 目录存在
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // 尝试加载已有数据库
  if (fs.existsSync(dbPath)) {
    try {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } catch (e) {
      console.warn('数据库文件损坏，将重建:', e.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // 启用外键
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL');

  // 创建表
  createTables();

  // 种子数据
  seedData();

  // 保存数据库
  saveDatabase();

  // 进程退出前确保数据写入
  process.on('exit', flushDatabase);
  process.on('SIGINT', () => { flushDatabase(); process.exit(0); });
  process.on('SIGTERM', () => { flushDatabase(); process.exit(0); });

  console.log('✅ 数据库初始化完成');
}

/**
 * 保存数据库到文件（安全写入：先写临时文件再重命名）
 */
function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const tmpPath = dbPath + '.tmp';

    // 先写入临时文件
    fs.writeFileSync(tmpPath, buffer);
    // 重命名替换（原子操作，避免写入中断导致数据损坏）
    fs.renameSync(tmpPath, dbPath);
  } catch (e) {
    console.error('数据库保存失败:', e.message);
  }
}

/**
 * 创建表 — 新增评价表
 */
function createTables() {
  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openid TEXT UNIQUE NOT NULL,
      nickname TEXT,
      avatar_url TEXT,
      phone TEXT,
      gender INTEGER DEFAULT 0,
      birthday TEXT,
      height REAL,
      weight REAL,
      fitness_goal TEXT,
      health_condition TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 教练表
  db.run(`
    CREATE TABLE IF NOT EXISTS coaches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      avatar_url TEXT,
      gender INTEGER DEFAULT 0,
      age INTEGER,
      phone TEXT,
      intro TEXT,
      specialty TEXT,
      certificates TEXT,
      rating REAL DEFAULT 5.0,
      order_count INTEGER DEFAULT 0,
      price REAL NOT NULL,
      service_area TEXT,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 课程表
  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      duration INTEGER DEFAULT 60,
      price REAL NOT NULL,
      category TEXT,
      cover_url TEXT,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (coach_id) REFERENCES coaches(id)
    )
  `);

  // 预约表
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      coach_id INTEGER NOT NULL,
      course_id INTEGER,
      booking_date TEXT NOT NULL,
      booking_time TEXT NOT NULL,
      address TEXT NOT NULL,
      contact_name TEXT,
      contact_phone TEXT,
      remark TEXT,
      status INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (coach_id) REFERENCES coaches(id),
      FOREIGN KEY (course_id) REFERENCES courses(id)
    )
  `);

  // 订单表
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      booking_id INTEGER,
      amount REAL NOT NULL,
      status INTEGER DEFAULT 0,
      pay_type TEXT,
      pay_time TEXT,
      transaction_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )
  `);

  // 评价表（新增）
  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      coach_id INTEGER NOT NULL,
      booking_id INTEGER,
      rating INTEGER NOT NULL DEFAULT 5,
      content TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (coach_id) REFERENCES coaches(id),
      FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )
  `);

  // 健身分类表
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 轮播图表
  db.run(`
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      image_url TEXT NOT NULL,
      link_type TEXT,
      link_value TEXT,
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      coach_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, coach_id)
    )
  `);

  // 创建索引
  db.run('CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_bookings_coach ON bookings(coach_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_coaches_status ON coaches(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_reviews_coach ON reviews(coach_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_favorites_coach ON favorites(coach_id)');
}

/**
 * 种子数据
 */
function seedData() {
  // 检查 categories 表（核心表，只要它有数据就不重复插入）
  const result = db.exec('SELECT COUNT(*) as count FROM categories');
  const count = result.length > 0 ? result[0].values[0][0] : 0;
  if (count > 0) return;

  console.log('📦 正在初始化种子数据...');

  const categories = [
    { name: '减脂塑形', icon: '🔥', description: '科学减脂，打造完美体型', sort_order: 1 },
    { name: '增肌训练', icon: '💪', description: '力量训练，肌肉增长', sort_order: 2 },
    { name: '瑜伽冥想', icon: '🧘', description: '身心平衡，舒缓压力', sort_order: 3 },
    { name: '拉伸放松', icon: '🤸', description: '专业拉伸，缓解酸痛', sort_order: 4 },
    { name: '体能提升', icon: '⚡', description: '综合体能，全面提升', sort_order: 5 },
    { name: '产后恢复', icon: '🤱', description: '专业指导，安全恢复', sort_order: 6 }
  ];

  categories.forEach(c => {
    db.run('INSERT INTO categories (name, icon, description, sort_order) VALUES (?, ?, ?, ?)',
      [c.name, c.icon, c.description, c.sort_order]);
  });

  const banners = [
    { title: '新用户首单立减50', image_url: '/images/banner1.png', sort_order: 1 },
    { title: '明星教练推荐', image_url: '/images/banner2.png', sort_order: 2 },
    { title: '限时优惠活动', image_url: '/images/banner3.png', sort_order: 3 }
  ];

  banners.forEach(b => {
    db.run('INSERT INTO banners (title, image_url, sort_order) VALUES (?, ?, ?)',
      [b.title, b.image_url, b.sort_order]);
  });

  const coaches = [
    {
      name: '李明教练', avatar_url: '/images/coach1.png', gender: 1, age: 28,
      phone: '13800138001',
      intro: '国家职业健身教练，8年教学经验，专注减脂塑形和增肌训练',
      specialty: '减脂塑形,增肌训练,体能提升',
      certificates: '国家职业教练,ACSM认证',
      rating: 4.9, order_count: 1256, price: 298, service_area: '朝阳区,海淀区'
    },
    {
      name: '王芳教练', avatar_url: '/images/coach2.png', gender: 2, age: 26,
      phone: '13800138002',
      intro: '资深瑜伽导师，全美瑜伽联盟认证，擅长瑜伽和普拉提',
      specialty: '瑜伽冥想,拉伸放松,产后恢复',
      certificates: 'RYT-500认证,普拉提教练',
      rating: 4.8, order_count: 892, price: 358, service_area: '海淀区,西城区'
    },
    {
      name: '张伟教练', avatar_url: '/images/coach3.png', gender: 1, age: 30,
      phone: '13800138003',
      intro: '运动康复专家，物理治疗师背景，专注体态矫正和运动康复',
      specialty: '拉伸放松,体能提升,产后恢复',
      certificates: '运动康复师,国家职业教练',
      rating: 4.7, order_count: 567, price: 328, service_area: '东城区,朝阳区'
    },
    {
      name: '刘洋教练', avatar_url: '/images/coach4.png', gender: 1, age: 25,
      phone: '13800138004',
      intro: '年轻有活力的健身教练，擅长HIIT和功能性训练',
      specialty: '减脂塑形,增肌训练,体能提升',
      certificates: '国家职业教练,HIIT认证',
      rating: 4.6, order_count: 423, price: 268, service_area: '丰台区,石景山区'
    }
  ];

  coaches.forEach(c => {
    db.run(`
      INSERT INTO coaches (name, avatar_url, gender, age, phone, intro, specialty,
                          certificates, rating, order_count, price, service_area)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [c.name, c.avatar_url, c.gender, c.age, c.phone, c.intro,
        c.specialty, c.certificates, c.rating, c.order_count, c.price, c.service_area]);

    const coachIdResult = db.exec('SELECT last_insert_rowid()');
    const coachId = coachIdResult[0].values[0][0];

    const courses = [
      { name: `${c.name.split('教练')[0]}私教课`, duration: 60, price: c.price, category: '私教' },
      { name: `${c.name.split('教练')[0]}体验课`, duration: 45, price: Math.round(c.price * 0.7), category: '体验' }
    ];

    courses.forEach(course => {
      db.run('INSERT INTO courses (coach_id, name, duration, price, category) VALUES (?, ?, ?, ?, ?)',
        [coachId, course.name, course.duration, course.price, course.category]);
    });
  });

  console.log('✅ 种子数据初始化完成');
}

// ============ 辅助函数 ============

function queryOne(sql, params = []) {
  try {
    const result = db.exec(sql, params);
    if (result.length === 0 || result[0].values.length === 0) return null;

    const columns = result[0].columns;
    const values = result[0].values[0];
    const row = {};
    columns.forEach((col, i) => row[col] = values[i]);
    return row;
  } catch (e) {
    console.error('queryOne error:', sql, e.message);
    return null;
  }
}

function queryAll(sql, params = []) {
  try {
    const result = db.exec(sql, params);
    if (result.length === 0) return [];

    const columns = result[0].columns;
    return result[0].values.map(values => {
      const row = {};
      columns.forEach((col, i) => row[col] = values[i]);
      return row;
    });
  } catch (e) {
    console.error('queryAll error:', sql, e.message);
    return [];
  }
}

/**
 * run — 普通写操作，使用延迟写入
 */
function run(sql, params = []) {
  try {
    db.run(sql, params);
    markDirty(); // 延迟保存
    return { lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0].values[0][0] };
  } catch (e) {
    console.error('run error:', sql, e.message);
    throw e;
  }
}

/**
 * runCritical — 关键写操作，立即写入（订单/支付等）
 */
function runCritical(sql, params = []) {
  try {
    db.run(sql, params);
    flushDatabase(); // 立即保存
    return { lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0].values[0][0] };
  } catch (e) {
    console.error('runCritical error:', sql, e.message);
    throw e;
  }
}

// ============ 模型 ============

const User = {
  findByOpenid(openid) {
    return queryOne('SELECT * FROM users WHERE openid = ?', [openid]);
  },

  findById(id) {
    return queryOne('SELECT * FROM users WHERE id = ?', [id]);
  },

  findByPhone(phone) {
    return queryOne('SELECT * FROM users WHERE phone = ?', [phone]);
  },

  create(userData) {
    // 为手机号登录生成虚拟 openid
    const openid = userData.openid || `phone_${userData.phone}`;
    const result = run(
      'INSERT INTO users (openid, nickname, avatar_url, phone) VALUES (?, ?, ?, ?)',
      [openid, userData.nickname || null, userData.avatar_url || null, userData.phone || null]
    );
    return this.findById(result.lastInsertRowid);
  },

  update(id, userData) {
    const fields = [];
    const values = [];

    ['nickname', 'avatar_url', 'phone', 'gender', 'birthday', 'height', 'weight', 'fitness_goal', 'health_condition']
      .forEach(key => {
        if (userData[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(userData[key]);
        }
      });

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = datetime("now")');
    values.push(id);

    run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }
};

const Coach = {
  findAll(filters = {}) {
    let sql = 'SELECT * FROM coaches WHERE status = 1';
    const params = [];

    if (filters.category) {
      sql += ' AND specialty LIKE ?';
      params.push(`%${filters.category}%`);
    }

    if (filters.keyword) {
      sql += ' AND (name LIKE ? OR intro LIKE ? OR specialty LIKE ?)';
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`);
    }

    switch (filters.sortBy) {
      case 'rating': sql += ' ORDER BY rating DESC'; break;
      case 'orders': sql += ' ORDER BY order_count DESC'; break;
      case 'price_asc': sql += ' ORDER BY price ASC'; break;
      case 'price_desc': sql += ' ORDER BY price DESC'; break;
      default: sql += ' ORDER BY order_count DESC';
    }

    return queryAll(sql, params);
  },

  findById(id) {
    return queryOne('SELECT * FROM coaches WHERE id = ? AND status = 1', [id]);
  },

  getCourses(coachId) {
    return queryAll('SELECT * FROM courses WHERE coach_id = ? AND status = 1', [coachId]);
  },

  getReviews(coachId) {
    return queryAll(`
      SELECT r.*, u.nickname as user_name, u.avatar_url as user_avatar
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.coach_id = ?
      ORDER BY r.created_at DESC
    `, [coachId]);
  }
};

const Booking = {
  create(bookingData) {
    const result = run(`
      INSERT INTO bookings (user_id, coach_id, course_id, booking_date, booking_time,
                           address, contact_name, contact_phone, remark)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [bookingData.user_id, bookingData.coach_id, bookingData.course_id || null,
        bookingData.booking_date, bookingData.booking_time,
        bookingData.address, bookingData.contact_name, bookingData.contact_phone, bookingData.remark || null]);
    return this.findById(result.lastInsertRowid);
  },

  findById(id) {
    return queryOne(`
      SELECT b.*, c.name as coach_name, c.avatar_url as coach_avatar, c.price, c.phone as coach_phone,
             u.nickname as user_name
      FROM bookings b
      LEFT JOIN coaches c ON b.coach_id = c.id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE b.id = ?
    `, [id]);
  },

  findByUserId(userId, status) {
    let sql = `
      SELECT b.*, c.name as coach_name, c.avatar_url as coach_avatar, c.phone as coach_phone,
             co.name as course_name, co.duration
      FROM bookings b
      LEFT JOIN coaches c ON b.coach_id = c.id
      LEFT JOIN courses co ON b.course_id = co.id
      WHERE b.user_id = ?
    `;
    const params = [userId];

    if (status !== undefined) {
      sql += ' AND b.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY b.created_at DESC';
    return queryAll(sql, params);
  },

  updateStatus(id, status) {
    run('UPDATE bookings SET status = ?, updated_at = datetime("now") WHERE id = ?', [status, id]);
  },

  findByCoachId(coachId, bookingDate) {
    let sql = 'SELECT * FROM bookings WHERE coach_id = ? AND status != 3';
    const params = [coachId];
    if (bookingDate) {
      sql += ' AND booking_date = ?';
      params.push(bookingDate);
    }
    return queryAll(sql, params);
  },

  // 查找用户对某教练已完成的预约
  findCompletedByUserAndCoach(userId, coachId) {
    return queryAll(`
      SELECT b.*, co.name as course_name
      FROM bookings b
      LEFT JOIN courses co ON b.course_id = co.id
      WHERE b.user_id = ? AND b.coach_id = ? AND b.status = 2
      ORDER BY b.booking_date DESC
    `, [userId, coachId]);
  }
};

const Order = {
  create(orderData) {
    const orderNo = `HF${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    // 订单创建是关键操作，使用立即写入
    const result = runCritical(`
      INSERT INTO orders (order_no, user_id, booking_id, amount, status)
      VALUES (?, ?, ?, ?, ?)
    `, [orderNo, orderData.user_id, orderData.booking_id, orderData.amount, orderData.status || 0]);
    return this.findById(result.lastInsertRowid);
  },

  findById(id) {
    return queryOne(`
      SELECT o.*, b.booking_date, b.booking_time, b.address,
             c.name as coach_name, c.avatar_url as coach_avatar, c.phone as coach_phone
      FROM orders o
      LEFT JOIN bookings b ON o.booking_id = b.id
      LEFT JOIN coaches c ON b.coach_id = c.id
      WHERE o.id = ?
    `, [id]);
  },

  findByOrderNo(orderNo) {
    return queryOne('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
  },

  findByUserId(userId, status) {
    let sql = `
      SELECT o.*, b.booking_date, b.booking_time, b.address, b.status as booking_status,
             c.name as coach_name, c.avatar_url as coach_avatar, c.phone as coach_phone
      FROM orders o
      LEFT JOIN bookings b ON o.booking_id = b.id
      LEFT JOIN coaches c ON b.coach_id = c.id
      WHERE o.user_id = ?
    `;
    const params = [userId];

    if (status !== undefined) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';
    return queryAll(sql, params);
  },

  updateStatus(id, status, payData = {}) {
    const updates = ['status = ?', 'updated_at = datetime("now")'];
    const params = [status];

    if (payData.pay_time) {
      updates.push('pay_time = ?');
      params.push(payData.pay_time);
    }
    if (payData.transaction_id) {
      updates.push('transaction_id = ?');
      params.push(payData.transaction_id);
    }

    params.push(id);
    // 订单状态变更也是关键操作
    runCritical(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, params);
  }
};

const Review = {
  create(reviewData) {
    const result = run(`
      INSERT INTO reviews (user_id, coach_id, booking_id, rating, content, tags)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [reviewData.user_id, reviewData.coach_id, reviewData.booking_id || null,
        reviewData.rating, reviewData.content || null, reviewData.tags || null]);

    // 更新教练评分
    this.updateCoachRating(reviewData.coach_id);

    const review = this.findById(result.lastInsertRowid);
    return review;
  },

  updateCoachRating(coachId) {
    const result = queryOne('SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE coach_id = ?', [coachId]);
    if (result && result.avg_rating) {
      run('UPDATE coaches SET rating = ?, review_count = ? WHERE id = ?',
        [Math.round(result.avg_rating * 10) / 10, result.review_count, coachId]);
    }
  },

  findById(id) {
    return queryOne(`
      SELECT r.*, u.nickname as user_name, u.avatar_url as user_avatar
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [id]);
  },

  findByCoachId(coachId) {
    return queryAll(`
      SELECT r.*, u.nickname as user_name, u.avatar_url as user_avatar
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.coach_id = ?
      ORDER BY r.created_at DESC
    `, [coachId]);
  },

  findByCoachIdWithPagination(coachId, limit = 10, offset = 0) {
    return queryAll(`
      SELECT r.*, u.nickname as user_name, u.avatar_url as user_avatar
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.coach_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [coachId, limit, offset]);
  },

  getCoachStats(coachId) {
    const result = queryOne(`
      SELECT
        COUNT(*) as total,
        AVG(rating) as avg_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM reviews WHERE coach_id = ?
    `, [coachId]);

    return {
      total: result?.total || 0,
      avg_rating: result?.avg_rating ? Math.round(result.avg_rating * 10) / 10 : 0,
      distribution: {
        5: result?.five_star || 0,
        4: result?.four_star || 0,
        3: result?.three_star || 0,
        2: result?.two_star || 0,
        1: result?.one_star || 0
      }
    };
  },

  countByCoachId(coachId) {
    return queryOne('SELECT COUNT(*) as count FROM reviews WHERE coach_id = ?', [coachId]);
  },

  findByUserId(userId, limit = 10, offset = 0) {
    return queryAll(`
      SELECT r.*, c.name as coach_name, c.avatar_url as coach_avatar
      FROM reviews r
      LEFT JOIN coaches c ON r.coach_id = c.id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);
  },

  countByUserId(userId) {
    return queryOne('SELECT COUNT(*) as count FROM reviews WHERE user_id = ?', [userId]);
  },

  findByUserAndBooking(userId, bookingId) {
    return queryOne('SELECT * FROM reviews WHERE user_id = ? AND booking_id = ?', [userId, bookingId]);
  },

  delete(id) {
    const review = this.findById(id);
    if (review) {
      run('DELETE FROM reviews WHERE id = ?', [id]);
      this.updateCoachRating(review.coach_id);
    }
  }
};

const Category = {
  findAll() {
    return queryAll('SELECT * FROM categories WHERE status = 1 ORDER BY sort_order');
  }
};

const Banner = {
  findAll() {
    return queryAll('SELECT * FROM banners WHERE status = 1 ORDER BY sort_order');
  }
};

const Favorite = {
  findByUserId(userId) {
    return queryAll(`
      SELECT f.id as favorite_id, f.created_at as favorited_at,
             c.* 
      FROM favorites f 
      JOIN coaches c ON f.coach_id = c.id 
      WHERE f.user_id = ? 
      ORDER BY f.created_at DESC
    `, [userId]);
  },

  findByUserAndCoach(userId, coachId) {
    return queryOne(
      'SELECT id FROM favorites WHERE user_id = ? AND coach_id = ?',
      [userId, coachId]
    );
  },

  add(userId, coachId) {
    runCritical(
      'INSERT INTO favorites (user_id, coach_id) VALUES (?, ?)',
      [userId, coachId]
    );
  },

  remove(userId, coachId) {
    runCritical(
      'DELETE FROM favorites WHERE user_id = ? AND coach_id = ?',
      [userId, coachId]
    );
  },

  isFavorited(userId, coachId) {
    const row = this.findByUserAndCoach(userId, coachId);
    return !!row;
  }
};

module.exports = {
  initDatabase,
  flushDatabase,
  User,
  Coach,
  Booking,
  Order,
  Review,
  Favorite,
  Category,
  Banner
};
