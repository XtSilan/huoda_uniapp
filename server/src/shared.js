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
    return res.status(403).json({ message: '无后台权限' });
  }
  next();
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
    viewCount: 100 + row.id * 11
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
    images: JSON.parse(row.images || '[]'),
    activityType: row.activity_type,
    status: row.status,
    publishTime: row.publish_time,
    applyCount: row.apply_count
  };
}

function parseSettings(row) {
  return {
    grade: row.grade || '',
    educationType: row.education_type || '',
    interests: JSON.parse(row.interests || '[]'),
    futurePlan: row.future_plan || '',
    notification: JSON.parse(row.notification_settings || '{}'),
    theme: JSON.parse(row.theme_settings || '{}'),
    aiConfig: JSON.parse(row.ai_settings || '{}')
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
  mapUser,
  mapBanner,
  mapInfo,
  mapActivity,
  parseSettings,
  recordBrowse
};
