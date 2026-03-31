function createToken(userId) {
  return Buffer.from(`huoda:${userId}`, 'utf8').toString('base64');
}

function parseToken(token) {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const [prefix, id] = raw.split(':');
    if (prefix !== 'huoda') {
      return null;
    }
    return Number(id);
  } catch (error) {
    return null;
  }
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: '请先登录' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: '请先登录' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: '暂无后台权限' });
  }
  next();
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function mapUser(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    name: row.name,
    role: row.role,
    status: row.status,
    school: row.school,
    department: row.department,
    class: row.class_name,
    phone: row.phone,
    avatarUrl: row.avatar_url
  };
}

function mapBanner(row) {
  return {
    id: String(row.id),
    title: row.title,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    linkType: row.link_type,
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active)
  };
}

function mapInfo(row) {
  return {
    id: String(row.id),
    title: row.title,
    summary: row.summary,
    content: row.content,
    source: row.source,
    category: row.category,
    locationType: row.location_type,
    status: row.status,
    publishTime: row.publish_time,
    viewCount: 100 + Number(row.id || 0) * 11
  };
}

function mapActivity(row) {
  return {
    id: String(row.id),
    title: row.title,
    summary: row.summary,
    content: row.content,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
    locationType: row.location_type,
    organizer: row.organizer,
    images: parseJson(row.images, []),
    activityType: row.activity_type,
    status: row.status,
    publishTime: row.publish_time,
    applyCount: row.apply_count
  };
}

function mapClassGroup(row) {
  return {
    id: String(row.id),
    className: row.class_name,
    groupName: row.group_name,
    announcement: row.announcement || '',
    qrCode: row.qr_code || '',
    memberCount: Number(row.member_count || 0),
    classmates: parseJson(row.classmates, []),
    messages: parseJson(row.messages, [])
  };
}

function ensureUserSettings(db, userId, overrides = {}) {
  const exists = db.get('SELECT id FROM user_settings WHERE user_id = ?', [userId]);
  if (exists) {
    return;
  }
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO user_settings
    (user_id, grade, education_type, interests, future_plan, notification_settings, theme_settings, ai_settings, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      overrides.grade || '',
      overrides.educationType || '',
      JSON.stringify(overrides.interests || []),
      overrides.futurePlan || '',
      JSON.stringify(overrides.notification || {}),
      JSON.stringify(overrides.theme || {}),
      JSON.stringify(overrides.aiConfig || {}),
      now
    ]
  );
}

function ensureClassGroup(db, className) {
  const trimmed = String(className || '').trim();
  if (!trimmed) {
    return null;
  }
  const existing = db.get('SELECT * FROM class_groups WHERE class_name = ?', [trimmed]);
  if (existing) {
    return existing;
  }
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO class_groups
    (class_name, group_name, announcement, qr_code, online_count, classmates, messages, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [trimmed, `${trimmed}群`, '', '', 0, '[]', '[]', now, now]
  );
  return db.get('SELECT * FROM class_groups WHERE class_name = ?', [trimmed]);
}

function buildClassmatesFromUsers(db, className) {
  const trimmed = String(className || '').trim();
  if (!trimmed) {
    return [];
  }
  return db
    .all(
      `SELECT id, name, student_id
      FROM users
      WHERE role = 'user' AND TRIM(class_name) = ?
      ORDER BY student_id ASC, id ASC`,
      [trimmed]
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      studentId: row.student_id,
      role: '群成员'
    }));
}

function getClassGroupWithMembers(db, row) {
  if (!row) {
    return null;
  }
  const classmates = buildClassmatesFromUsers(db, row.class_name);
  return {
    ...mapClassGroup({
      ...row,
      member_count: classmates.length,
      online_count: classmates.length,
      classmates: JSON.stringify(classmates)
    }),
    classmates,
    memberCount: classmates.length,
    onlineCount: classmates.length
  };
}

function parseSettings(row) {
  return {
    grade: row.grade || '',
    educationType: row.education_type || '',
    interests: parseJson(row.interests, []),
    futurePlan: row.future_plan || '',
    notification: parseJson(row.notification_settings, {}),
    theme: parseJson(row.theme_settings, {}),
    aiConfig: parseJson(row.ai_settings, {})
  };
}

function recordBrowse(db, userId, targetType, targetId, title, summary = '') {
  db.run(
    `INSERT INTO browse_history (user_id, target_type, target_id, title, summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, targetType, targetId || 0, title, summary, new Date().toISOString()]
  );
}

module.exports = {
  createToken,
  parseToken,
  requireAuth,
  requireAdmin,
  parseJson,
  mapUser,
  mapBanner,
  mapInfo,
  mapActivity,
  mapClassGroup,
  ensureUserSettings,
  ensureClassGroup,
  buildClassmatesFromUsers,
  getClassGroupWithMembers,
  parseSettings,
  recordBrowse
};
