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
  if (req.user.status === 'disabled') {
    return res.status(403).json({ message: '该账户已停用' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: '请先登录' });
  }
  if (req.user.status === 'disabled') {
    return res.status(403).json({ message: '该账户已停用' });
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
    sourceUrl: row.source_url || '',
    attachments: parseJson(row.attachments, []),
    category: row.category,
    locationType: row.location_type,
    isTop: Boolean(row.is_top),
    status: row.status,
    publishTime: row.publish_time,
    favoriteCount: Number(row.favorite_count || 0),
    viewCount: Number(row.view_count || 0),
    isCollected: Boolean(row.is_collected),
    recommendationReason: row.recommendation_reason || ''
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
    isTop: Boolean(row.is_top),
    status: row.status,
    publishTime: row.publish_time,
    applyCount: Number(row.application_count || row.apply_count || 0),
    favoriteCount: Number(row.favorite_count || 0),
    isCollected: Boolean(row.is_collected),
    isApplied: Boolean(row.is_applied),
    recommendationReason: row.recommendation_reason || ''
  };
}

function mapClassGroup(row) {
  return {
    id: String(row.id),
    className: row.class_name,
    groupName: row.group_name,
    announcement: row.announcement || '',
    qrCode: row.qr_code || '',
    onlineCount: Number(row.online_count || 0),
    memberCount: Number(row.member_count || row.online_count || 0),
    classmates: parseJson(row.classmates, []),
    messages: parseJson(row.messages, [])
  };
}

function mapNotification(row) {
  return {
    id: String(row.id),
    type: row.type || 'system',
    title: row.title || '',
    content: row.content || '',
    payload: parseJson(row.payload, {}),
    releaseId: row.release_id || '',
    isRead: Boolean(row.is_read),
    createdAt: row.created_at || '',
    readAt: row.read_at || ''
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
  const now = new Date().toISOString();
  const existing = db.get(
    `SELECT id FROM browse_history
    WHERE user_id = ? AND target_type = ? AND target_id = ?`,
    [userId, targetType, targetId || 0]
  );
  if (existing) {
    db.run(
      `UPDATE browse_history
      SET title = ?, summary = ?, created_at = ?
      WHERE id = ?`,
      [title, summary, now, existing.id]
    );
    return;
  }
  db.run(
    `INSERT INTO browse_history (user_id, target_type, target_id, title, summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, targetType, targetId || 0, title, summary, now]
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
  mapNotification,
  ensureUserSettings,
  ensureClassGroup,
  buildClassmatesFromUsers,
  getClassGroupWithMembers,
  parseSettings,
  recordBrowse
};
