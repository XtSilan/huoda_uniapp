const fs = require('fs');
const path = require('path');
const {
  createToken,
  requireAuth,
  mapUser,
  mapBanner,
  mapInfo,
  mapActivity,
  mapNotification,
  ensureClassGroup,
  getClassGroupWithMembers,
  parseSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  parseJson,
  recordBrowse
} = require('./shared');
const {
  DEFAULT_AI_CONFIG,
  DEFAULT_USER_AI_SETTINGS,
  normalizeAiConfig,
  validateAiConfig,
  sanitizeMessages,
  chatWithAi,
  validateAiConnection
} = require('./ai-client');
const { readAppUpdateConfig } = require('./app-update-store');
const {
  assetProxyPath,
  toAssetProxyUrl,
  toAttachmentDownloadUrl,
  sendAssetToResponse,
  finalizeUploadedLocalFile
} = require('./storage-service');

const userUploadDir = path.resolve(__dirname, '..', 'uploads', 'user');

function compareVersion(a = '0.0.0', b = '0.0.0') {
  const aParts = String(a).split('.').map((item) => Number(item) || 0);
  const bParts = String(b).split('.').map((item) => Number(item) || 0);
  const maxLength = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < maxLength; i += 1) {
    const left = aParts[i] || 0;
    const right = bParts[i] || 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }
  return 0;
}

function resolvePublicAssetUrl(req, filePath) {
  return toAssetProxyUrl(req, filePath);
}

function mapUserForClient(row, req) {
  const mapped = mapUser(row);
  return {
    ...mapped
  };
}

function mapBannerForClient(row, req) {
  const mapped = mapBanner(row);
  return {
    ...mapped,
    imageUrl: resolvePublicAssetUrl(req, mapped.imageUrl)
  };
}

function mapInfoForClient(row, req) {
  const mapped = mapInfo(row);
  return {
    ...mapped,
    attachments: (mapped.attachments || []).map((item) => ({
      ...item,
      path: item && item.path ? item.path : '',
      url: resolvePublicAssetUrl(req, item && item.path ? item.path : '')
    }))
  };
}

async function mapInfoDetailForClient(row, req, db) {
  const mapped = mapInfoForClient(row, req);
  const attachments = await Promise.all(
    (mapped.attachments || []).map(async (item) => {
      const assetPath = item && item.path ? item.path : '';
      const name = item && item.name ? item.name : '';
      return {
        ...item,
        path: assetPath,
        url: resolvePublicAssetUrl(req, assetPath),
        downloadUrl: await toAttachmentDownloadUrl(req, db, assetPath, name)
      };
    })
  );

  return {
    ...mapped,
    attachments
  };
}

function mapActivityForClient(row, req) {
  const mapped = mapActivity(row);
  return {
    ...mapped,
    images: (mapped.images || []).map((item) => resolvePublicAssetUrl(req, item))
  };
}

function mapPopupAnnouncement(row, req) {
  if (!row) {
    return null;
  }

  const version = String(row.announcement_version || row.published_at || row.updated_at || row.id || '').trim();
  return {
    id: String(row.id),
    title: row.title || '',
    content: row.content || '',
    imageUrl: resolvePublicAssetUrl(req, row.image_url || ''),
    buttonText: row.button_text || '我知道了',
    version,
    publishedAt: row.published_at || '',
    isActive: Boolean(row.is_active)
  };
}

function mapPreset(row) {
  return {
    id: String(row.id),
    name: row.name,
    provider: row.provider,
    baseUrl: row.base_url,
    model: row.model,
    temperature: row.temperature,
    topP: row.top_p,
    maxTokens: row.max_tokens,
    presencePenalty: row.presence_penalty,
    frequencyPenalty: row.frequency_penalty,
    systemPrompt: row.system_prompt,
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active)
  };
}

function parseUserAiSettings(rawValue, db) {
  const raw = parseJson(rawValue, null);
  const defaultPreset = db.get('SELECT * FROM ai_model_presets WHERE is_default = 1 ORDER BY id ASC LIMIT 1');
  const defaultPresetId = defaultPreset ? String(defaultPreset.id) : '';

  if (!raw || !raw.mode) {
    const legacy = normalizeAiConfig(raw || DEFAULT_AI_CONFIG);
    return {
      mode: 'preset',
      selectedPresetId: defaultPresetId,
      customOpenAI: normalizeAiConfig(legacy.provider === 'openai' ? legacy : DEFAULT_USER_AI_SETTINGS.customOpenAI),
      customAnthropic: normalizeAiConfig(legacy.provider === 'anthropic' ? legacy : DEFAULT_USER_AI_SETTINGS.customAnthropic)
    };
  }

  return {
    mode: ['preset', 'custom-openai', 'custom-anthropic'].includes(raw.mode) ? raw.mode : 'preset',
    selectedPresetId: String(raw.selectedPresetId || defaultPresetId || ''),
    customOpenAI: normalizeAiConfig({ ...DEFAULT_USER_AI_SETTINGS.customOpenAI, ...(raw.customOpenAI || {}) }),
    customAnthropic: normalizeAiConfig({ ...DEFAULT_USER_AI_SETTINGS.customAnthropic, ...(raw.customAnthropic || {}) })
  };
}

function resolveUserAiConfig(aiSettings, db) {
  if (aiSettings.mode === 'custom-openai') {
    return aiSettings.customOpenAI;
  }
  if (aiSettings.mode === 'custom-anthropic') {
    return aiSettings.customAnthropic;
  }
  const selectedPreset = aiSettings.selectedPresetId
    ? db.get('SELECT * FROM ai_model_presets WHERE id = ? AND is_active = 1', [aiSettings.selectedPresetId])
    : null;
  const preset = selectedPreset || db.get('SELECT * FROM ai_model_presets WHERE is_default = 1 AND is_active = 1 ORDER BY id ASC LIMIT 1');
  return preset
    ? normalizeAiConfig({
        provider: preset.provider,
        baseUrl: preset.base_url,
        apiKey: preset.api_key,
        model: preset.model,
        temperature: preset.temperature,
        topP: preset.top_p,
        maxTokens: preset.max_tokens,
        presencePenalty: preset.presence_penalty,
        frequencyPenalty: preset.frequency_penalty,
        systemPrompt: preset.system_prompt
      })
    : normalizeAiConfig(DEFAULT_AI_CONFIG);
}

function buildSearchConditions(search, columns, params) {
  if (!search) {
    return '';
  }
  const condition = columns.map((column) => `${column} LIKE ?`).join(' OR ');
  columns.forEach(() => {
    params.push(`%${search}%`);
  });
  return `(${condition})`;
}

function normalizeNotificationType(type = '') {
  if (type === 'app_update') {
    return 'version';
  }
  return ['system', 'activity', 'sign', 'version'].includes(type) ? type : 'system';
}

function getNotificationTypeLabel(type = '') {
  const normalized = normalizeNotificationType(type);
  const labels = {
    system: '系统通知',
    activity: '活动通知',
    sign: '签到通知',
    version: '版本通知'
  };
  return labels[normalized] || '系统通知';
}

function createNotification(db, payload = {}) {
  const userId = Number(payload.userId || 0);
  if (!userId) {
    return null;
  }
  const now = payload.createdAt || new Date().toISOString();
  const type = normalizeNotificationType(payload.type);
  const releaseId = String(payload.releaseId || '').trim();
  const serializedPayload = JSON.stringify(payload.payload || {});

  if (releaseId) {
    const existing = db.get('SELECT id FROM notifications WHERE user_id = ? AND type = ? AND release_id = ?', [userId, type, releaseId]);
    if (existing) {
      db.run(
        `UPDATE notifications
        SET title = ?, content = ?, payload = ?, is_read = 0, read_at = '', created_at = ?
        WHERE id = ?`,
        [payload.title || '', payload.content || '', serializedPayload, now, existing.id]
      );
      return db.get('SELECT * FROM notifications WHERE id = ?', [existing.id]);
    }
  }

  const result = db.run(
    `INSERT INTO notifications
    (user_id, type, title, content, payload, release_id, is_read, created_at, read_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, type, payload.title || '', payload.content || '', serializedPayload, releaseId, 0, now, '']
  );
  return db.get('SELECT * FROM notifications WHERE id = ?', [result.lastID]);
}

function createNotificationsForUsers(db, userIds = [], payload = {}) {
  const uniqueIds = [...new Set((userIds || []).map((item) => Number(item || 0)).filter(Boolean))];
  return uniqueIds.map((userId) => createNotification(db, { ...payload, userId })).filter(Boolean);
}

function parseNotificationPreferences(reqUser, db) {
  const row = reqUser ? db.get('SELECT notification_settings FROM user_settings WHERE user_id = ?', [reqUser.id]) : null;
  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    ...parseJson(row && row.notification_settings, {})
  };
}

function ensureActivityStartNotifications(db, userId) {
  const upcomingRows = db.all(
    `SELECT a.id, a.title, a.start_time
    FROM activity_applications aa
    INNER JOIN activities a ON a.id = aa.activity_id
    WHERE aa.user_id = ?
      AND a.status = 'upcoming'
      AND datetime(a.start_time) >= datetime('now')
      AND datetime(a.start_time) <= datetime('now', '+24 hour')
    ORDER BY datetime(a.start_time) ASC`,
    [userId]
  );

  upcomingRows.forEach((row) => {
    createNotification(db, {
      userId,
      type: 'activity',
      title: '活动即将开始',
      content: `你报名的“${row.title}”将在 24 小时内开始，记得准时参加。`,
      releaseId: `activity-start-${row.id}`,
      payload: {
        targetType: 'activity',
        targetId: String(row.id),
        action: 'open-activity-detail',
        startTime: row.start_time
      }
    });
  });
}

function formatSignWindow(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return '';
  }
  const formatPart = (value) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  return `${formatPart(start)}-${formatPart(end)}`;
}

function appendClassGroupMessage(db, className, message) {
  const trimmed = String(className || '').trim();
  if (!trimmed || !message) {
    return;
  }
  ensureClassGroup(db, trimmed);
  const row = db.get('SELECT * FROM class_groups WHERE class_name = ?', [trimmed]);
  if (!row) {
    return;
  }
  const messages = parseJson(row.messages, []);
  messages.push({
    id: Date.now(),
    sender: '签到助手',
    text: message,
    time: new Date().toISOString(),
    type: 'system'
  });
  db.run('UPDATE class_groups SET messages = ?, updated_at = ? WHERE id = ?', [JSON.stringify(messages.slice(-100)), new Date().toISOString(), row.id]);
}

function mapSignBatch(row, currentSign = null, leaveRequest = null) {
  const now = new Date();
  const endTime = new Date(row.end_time);
  const lateEndTime = new Date(row.late_end_time);
  let signStatus = currentSign ? currentSign.status : '';
  let actionText = '立即签到';
  let canSign = row.status === 'active' && !currentSign;

  if (currentSign) {
    actionText = currentSign.status === 'makeup' ? '已补签' : currentSign.status === 'late' ? '已迟到签到' : '已签到';
  } else if (leaveRequest) {
    signStatus = `leave_${leaveRequest.status}`;
    actionText =
      leaveRequest.status === 'approved'
        ? '请假已通过'
        : leaveRequest.status === 'rejected'
          ? '请假未通过'
          : '请假审核中';
  } else if (row.status !== 'active') {
    canSign = false;
    signStatus = row.status;
    actionText = row.status === 'closed' ? '已结束' : '未开放';
  } else if (now > lateEndTime) {
    canSign = false;
    signStatus = 'expired';
    actionText = '已错过签到';
  } else if (now > endTime) {
    signStatus = 'makeup_available';
    actionText = '可以补签';
  } else if (now < new Date(row.start_time)) {
    canSign = false;
    signStatus = 'upcoming';
    actionText = '未到签到时间';
  }

  return {
    id: String(row.id),
    className: row.class_name,
    courseName: row.course_name,
    teacher: row.teacher,
    signDate: row.sign_date,
    startTime: row.start_time,
    endTime: row.end_time,
    lateEndTime: row.late_end_time,
    time: formatSignWindow(row.start_time, row.end_time),
    status: row.status,
    signStatus,
    actionText,
    canSign,
    currentSign: currentSign
      ? {
          id: String(currentSign.id),
          status: currentSign.status,
          time: currentSign.time
        }
      : null,
    leaveRequest: leaveRequest
      ? {
          id: String(leaveRequest.id),
          status: leaveRequest.status,
          reason: leaveRequest.reason,
          leaveTime: leaveRequest.leave_time,
          reviewComment: leaveRequest.review_comment || '',
          reviewedAt: leaveRequest.reviewed_at || ''
        }
      : null
  };
}

function requireTeacher(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: '请先登录' });
  }
  if (req.user.status === 'disabled') {
    return res.status(403).json({ message: '该账号已停用' });
  }
  if (!['teacher', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ message: '当前账号没有教师权限' });
  }
  next();
}

function getTeacherScopeClassName(req) {
  return String(req.user && req.user.class_name ? req.user.class_name : '').trim();
}

function mapTeacherBatchSummary(row) {
  return {
    id: String(row.id),
    className: row.class_name,
    courseName: row.course_name,
    teacher: row.teacher,
    signDate: row.sign_date,
    startTime: row.start_time,
    endTime: row.end_time,
    lateEndTime: row.late_end_time,
    time: formatSignWindow(row.start_time, row.end_time),
    status: row.status,
    signCount: Number(row.sign_count || 0),
    approvedLeaveCount: Number(row.approved_leave_count || 0),
    pendingLeaveCount: Number(row.pending_leave_count || 0),
    studentCount: Number(row.student_count || 0),
    unsignedCount: Math.max(Number(row.student_count || 0) - Number(row.sign_count || 0) - Number(row.approved_leave_count || 0), 0)
  };
}

function dedupeById(rows = []) {
  const seen = new Set();
  return rows.filter((row) => {
    const id = String(row && row.id ? row.id : '');
    if (!id || seen.has(id)) {
      return false;
    }
    seen.add(id);
    return true;
  });
}

function withReason(rows = [], reason = '') {
  return rows.map((row) => ({
    ...row,
    recommendation_reason: reason
  }));
}

function buildHomeInfoRecommendations(db, reqUser, infoSelect, interests = []) {
  const sections = [];
  const usedIds = new Set();
  const pushRows = (rows) => {
    rows.forEach((row) => {
      if (!row || usedIds.has(String(row.id))) {
        return;
      }
      usedIds.add(String(row.id));
      sections.push(row);
    });
  };

  if (reqUser) {
    const favoriteSeed = db.get(
      `SELECT i.id, i.title, i.category
      FROM favorites f
      INNER JOIN infos i ON i.id = f.target_id
      WHERE f.user_id = ? AND f.target_type = 'info'
      ORDER BY datetime(f.created_at) DESC, f.id DESC
      LIMIT 1`,
      [reqUser.id]
    );
    if (favoriteSeed && favoriteSeed.category) {
      pushRows(
        withReason(
          db.all(
            `${infoSelect}
            WHERE i.category = ? AND i.id != ?
            ORDER BY i.is_top DESC, datetime(i.publish_time) DESC, i.id DESC
            LIMIT 2`,
            [favoriteSeed.category, favoriteSeed.id]
          ),
          `因为你收藏过 ${favoriteSeed.title}`
        )
      );
    }

    const browseSeed = db.get(
      `SELECT i.id, i.title, i.category
      FROM browse_history bh
      INNER JOIN infos i ON i.id = bh.target_id
      WHERE bh.user_id = ? AND bh.target_type = 'info'
      ORDER BY datetime(bh.created_at) DESC, bh.id DESC
      LIMIT 1`,
      [reqUser.id]
    );
    if (browseSeed && browseSeed.category) {
      pushRows(
        withReason(
          db.all(
            `${infoSelect}
            WHERE i.category = ? AND i.id != ?
            ORDER BY i.is_top DESC, datetime(i.publish_time) DESC, i.id DESC
            LIMIT 2`,
            [browseSeed.category, browseSeed.id]
          ),
          `因为你看过 ${browseSeed.title}`
        )
      );
    }

    const className = String(reqUser.class_name || '').trim();
    if (className) {
      pushRows(
        withReason(
          db.all(
            `${infoSelect}
            WHERE i.id IN (
              SELECT bh.target_id
              FROM browse_history bh
              INNER JOIN users u ON u.id = bh.user_id
              WHERE bh.target_type = 'info'
                AND u.id != ?
                AND TRIM(u.class_name) = ?
              GROUP BY bh.target_id
              ORDER BY COUNT(*) DESC, MAX(datetime(bh.created_at)) DESC
              LIMIT 2
            )
            ORDER BY i.is_top DESC, datetime(i.publish_time) DESC, i.id DESC`,
            [reqUser.id, className]
          ),
          '本班同学最近在看'
        )
      );
    }
  }

  if (interests.length) {
    const placeholders = interests.map(() => '?').join(',');
    pushRows(
      withReason(
        db.all(
          `${infoSelect}
          WHERE i.category IN (${placeholders})
          ORDER BY i.is_top DESC, datetime(i.publish_time) DESC, i.id DESC
          LIMIT 3`,
          interests
        ),
        '根据你的兴趣推荐'
      )
    );
  }

  pushRows(
    withReason(
      db.all(`${infoSelect} ORDER BY i.is_top DESC, datetime(i.publish_time) DESC, i.id DESC LIMIT 4`),
      '最新发布'
    )
  );

  return dedupeById(sections).slice(0, 4);
}

function buildHomeActivityRecommendations(db, reqUser, activitySelect, interests = []) {
  const sections = [];
  const usedIds = new Set();
  const pushRows = (rows) => {
    rows.forEach((row) => {
      if (!row || usedIds.has(String(row.id))) {
        return;
      }
      usedIds.add(String(row.id));
      sections.push(row);
    });
  };

  if (reqUser) {
    const activitySeed = db.get(
      `SELECT a.id, a.title, a.activity_type
      FROM activity_applications aa
      INNER JOIN activities a ON a.id = aa.activity_id
      WHERE aa.user_id = ?
      ORDER BY datetime(aa.created_at) DESC, aa.id DESC
      LIMIT 1`,
      [reqUser.id]
    );
    if (activitySeed && activitySeed.activity_type) {
      pushRows(
        withReason(
          db.all(
            `${activitySelect}
            WHERE a.activity_type = ? AND a.id != ? AND a.status = 'upcoming'
            ORDER BY a.is_top DESC, datetime(a.publish_time) DESC, a.id DESC
            LIMIT 2`,
            [activitySeed.activity_type, activitySeed.id]
          ),
          `因为你参加过 ${activitySeed.title}`
        )
      );
    }
  }

  pushRows(
    withReason(
      db.all(
        `${activitySelect}
        WHERE a.status = 'upcoming'
        ORDER BY a.is_top DESC, application_count DESC, datetime(a.publish_time) DESC, a.id DESC
        LIMIT 2`
      ),
      '最近报名最多的活动'
    )
  );

  pushRows(
    withReason(
      db.all(
        `${activitySelect}
        WHERE a.status = 'upcoming'
        ORDER BY a.is_top DESC, datetime(a.end_time) ASC, datetime(a.publish_time) DESC, a.id DESC
        LIMIT 2`
      ),
      '离截止时间最近'
    )
  );

  if (interests.length) {
    const placeholders = interests.map(() => '?').join(',');
    pushRows(
      withReason(
        db.all(
          `${activitySelect}
          WHERE a.activity_type IN (${placeholders}) AND a.status = 'upcoming'
          ORDER BY a.is_top DESC, datetime(a.publish_time) DESC, a.id DESC
          LIMIT 2`,
          interests
        ),
        '符合你的兴趣偏好'
      )
    );
  }

  pushRows(
    withReason(
      db.all(
        `${activitySelect}
        ORDER BY a.is_top DESC, datetime(a.publish_time) DESC, a.id DESC
        LIMIT 4`
      ),
      '最新活动'
    )
  );

  return dedupeById(sections).slice(0, 4);
}

function buildAiUserProfile(db, user) {
  if (!user || !user.id) {
    return null;
  }

  const interestsRow = db.get('SELECT interests FROM user_settings WHERE user_id = ?', [user.id]);
  const interests = parseJson(interestsRow && interestsRow.interests, []);
  const favorites = db.all(
    `SELECT f.target_type, f.target_id, f.created_at, COALESCE(i.title, a.title, '') AS title
    FROM favorites f
    LEFT JOIN infos i ON f.target_type = 'info' AND i.id = f.target_id
    LEFT JOIN activities a ON f.target_type = 'activity' AND a.id = f.target_id
    WHERE f.user_id = ?
    ORDER BY datetime(f.created_at) DESC, f.id DESC
    LIMIT 6`,
    [user.id]
  );
  const browseHistory = db.all(
    `SELECT bh.target_type, bh.target_id, bh.title, bh.summary, bh.created_at
    FROM browse_history bh
    WHERE bh.user_id = ?
    ORDER BY datetime(bh.created_at) DESC, bh.id DESC
    LIMIT 8`,
    [user.id]
  );
  const appliedActivities = db.all(
    `SELECT a.id, a.title, a.activity_type, a.start_time, aa.created_at
    FROM activity_applications aa
    INNER JOIN activities a ON a.id = aa.activity_id
    WHERE aa.user_id = ?
    ORDER BY datetime(aa.created_at) DESC, aa.id DESC
    LIMIT 6`,
    [user.id]
  );
  const recentNotifications = db.all(
    `SELECT type, title, content, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT 10`,
    [user.id]
  );

  return {
    interests,
    favorites,
    browseHistory,
    appliedActivities,
    recentNotifications
  };
}

function serializeAiProfile(profile) {
  if (!profile) {
    return '暂无用户画像。';
  }
  const lines = [];
  lines.push(`兴趣偏好：${profile.interests && profile.interests.length ? profile.interests.join('、') : '暂无'}`);
  lines.push(
    `最近收藏：${
      profile.favorites && profile.favorites.length
        ? profile.favorites.map((item) => `${item.target_type === 'activity' ? '活动' : '资讯'}《${item.title || '未命名'}》`).join('；')
        : '暂无'
    }`
  );
  lines.push(
    `最近浏览：${
      profile.browseHistory && profile.browseHistory.length
        ? profile.browseHistory.map((item) => `${item.target_type === 'activity' ? '活动' : '资讯'}《${item.title || '未命名'}》`).join('；')
        : '暂无'
    }`
  );
  lines.push(
    `最近报名：${
      profile.appliedActivities && profile.appliedActivities.length
        ? profile.appliedActivities.map((item) => `《${item.title}》`).join('；')
        : '暂无'
    }`
  );
  return lines.join('\n');
}

function getAiIntentPrompt(intent, options = {}) {
  const prompts = {
    recommend_activities: `你是校园助手“小达老师”。请根据用户画像和候选活动，推荐最适合该用户的活动。
输出要求：
1. 先给出简洁结论。
2. 明确说明“为什么适合我”。
3. 优先结合用户的收藏、浏览、报名记录。
4. 不要空泛，要像校园助手在替学生做筛选。`,
    summarize_notifications: `你是校园助手“小达老师”。请把最近通知总结成用户一眼能看懂的重点提醒。
输出要求：
1. 先给一句总览。
2. 再分点列出最重要的 3 到 5 条提醒。
3. 优先提示和用户行为相关的通知。
4. 语气简洁，像消息中心摘要。`,
    extract_info_highlights: `你是校园助手“小达老师”。请从最近校园资讯里提炼重点。
输出要求：
1. 先给一句整体判断。
2. 再列出 3 到 5 条重点。
3. 每条尽量说明“适合谁看”“要不要现在处理”。
4. 不要照抄原文标题，要做提炼。`
  };
  return prompts[intent] || options.fallback || '你是校园助手“小达老师”，请结合校园上下文回答。';
}

function buildAiIntentContext(db, reqUser, intent, infoSelect, activitySelect, req) {
  const profile = buildAiUserProfile(db, reqUser);

  if (intent === 'recommend_activities') {
    const activities = buildHomeActivityRecommendations(db, reqUser, activitySelect, profile && profile.interests ? profile.interests : []);
    return {
      intent,
      systemPrompt: getAiIntentPrompt(intent),
      userPrompt: `用户画像：
${serializeAiProfile(profile)}

候选活动：
${activities.length ? activities.map((item, index) => `${index + 1}. ${item.title}｜类型：${item.activity_type || '其他'}｜推荐理由：${item.recommendation_reason || '无'}｜时间：${item.start_time || ''}｜地点：${item.location || ''}`).join('\n') : '暂无候选活动'}`,
      relatedInfos: activities.map((item) => mapActivityForClient(item, req))
    };
  }

  if (intent === 'summarize_notifications') {
    const notifications = profile && profile.recentNotifications ? profile.recentNotifications : [];
    const linkedIds = [];
    notifications.forEach((item) => {
      const title = String(item.title || '');
      const content = String(item.content || '');
      if (/活动/.test(title + content)) {
        linkedIds.push(...db.all(`SELECT id FROM activities WHERE title LIKE ? ORDER BY datetime(publish_time) DESC LIMIT 2`, [`%${title.slice(0, 8)}%`]).map((row) => row.id));
      }
      if (/资讯|通知/.test(title + content)) {
        linkedIds.push(...db.all(`SELECT id FROM infos WHERE title LIKE ? ORDER BY datetime(publish_time) DESC LIMIT 2`, [`%${title.slice(0, 8)}%`]).map((row) => row.id));
      }
    });
    const activityCards = linkedIds.length
      ? db
          .all(`${activitySelect} WHERE a.id IN (${linkedIds.filter((item) => Number(item)).map(() => '?').join(',') || '0'})`, linkedIds.filter((item) => Number(item)))
          .map((item) => mapActivityForClient(item, req))
      : [];
    const infoCards = linkedIds.length
      ? db
          .all(`${infoSelect} WHERE i.id IN (${linkedIds.filter((item) => Number(item)).map(() => '?').join(',') || '0'})`, linkedIds.filter((item) => Number(item)))
          .map((item) => mapInfoForClient(item, req))
      : [];
    return {
      intent,
      systemPrompt: getAiIntentPrompt(intent),
      userPrompt: `用户最近通知：
${notifications.length ? notifications.map((item, index) => `${index + 1}. [${getNotificationTypeLabel(item.type)}] ${item.title}｜${item.content}`).join('\n') : '暂无通知'}`,
      relatedInfos: dedupeById([...activityCards, ...infoCards]).slice(0, 4)
    };
  }

  if (intent === 'extract_info_highlights') {
    const infos = buildHomeInfoRecommendations(db, reqUser, infoSelect, profile && profile.interests ? profile.interests : []);
    return {
      intent,
      systemPrompt: getAiIntentPrompt(intent),
      userPrompt: `用户画像：
${serializeAiProfile(profile)}

待提炼资讯：
${infos.length ? infos.map((item, index) => `${index + 1}. ${item.title}｜分类：${item.category}｜摘要：${item.summary || item.content || ''}`).join('\n') : '暂无资讯'}`,
      relatedInfos: infos.map((item) => mapInfoForClient(item, req))
    };
  }

  return {
    intent: 'chat',
    systemPrompt: '你是校园助手“小达老师”，请结合校园场景，用简洁中文回答。',
    userPrompt: '',
    relatedInfos: []
  };
}

module.exports = function registerPublicRoutes(app, db) {
  fs.mkdirSync(userUploadDir, { recursive: true });

  app.get(assetProxyPath, async (req, res) => {
    const assetPath = String(req.query.path || '').trim();
    if (!assetPath) {
      return res.status(400).json({ message: '缺少资源路径' });
    }
    try {
      await sendAssetToResponse(req, res, db, assetPath);
    } catch (error) {
      if (!res.headersSent) {
        res.status(404).json({ message: error.message || '资源读取失败' });
      }
    }
  });
  app.get(`${assetProxyPath}/:downloadName`, async (req, res) => {
    const assetPath = String(req.query.path || '').trim();
    if (!assetPath) {
      return res.status(400).json({ message: '缺少资源路径' });
    }
    try {
      await sendAssetToResponse(req, res, db, assetPath);
    } catch (error) {
      if (!res.headersSent) {
        res.status(404).json({ message: error.message || '资源读取失败' });
      }
    }
  });
  const infoSelect = `
    SELECT i.*,
      (SELECT COUNT(*) FROM favorites f WHERE f.target_type = 'info' AND f.target_id = i.id) AS favorite_count,
      (SELECT COUNT(*) FROM browse_history bh WHERE bh.target_type = 'info' AND bh.target_id = i.id) AS view_count
    FROM infos i
  `;
  const activitySelect = `
    SELECT a.*,
      (SELECT COUNT(*) FROM favorites f WHERE f.target_type = 'activity' AND f.target_id = a.id) AS favorite_count,
      (SELECT COUNT(*) FROM activity_applications aa WHERE aa.activity_id = a.id) AS application_count
    FROM activities a
  `;

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/app/version', async (req, res) => {
    const platform = String(req.query.platform || 'android').toLowerCase();
    const currentVersionName = String(req.query.versionName || '0.0.0');
    const currentVersionCode = Number(req.query.versionCode || 0) || 0;
    const config = readAppUpdateConfig();
    const current = config[platform] || {};
    const latestVersion = String(current.latestVersion || currentVersionName || '0.0.0');
    const latestVersionCode = Number(current.versionCode || 0) || 0;
    const hasUpdate = compareVersion(latestVersion, currentVersionName) > 0 || latestVersionCode > currentVersionCode;
    const packagePath = current.packagePath || '';
    const packageName = current.packageName || '';
    const wgtPath = current.wgtUrl || packagePath || '';
    const apkPath = current.apkUrl || packagePath || '';

    try {
      res.json({
      platform,
      hasUpdate,
      latestVersion,
      versionCode: latestVersionCode,
      updateType: String(current.updateType || 'none'),
      force: Boolean(current.force),
      title: current.title || '发现新版本',
      description: current.description || '',
      wgtUrl: await toAttachmentDownloadUrl(req, db, wgtPath, packageName || 'update.wgt'),
      apkUrl: await toAttachmentDownloadUrl(req, db, apkPath, packageName || 'update.apk'),
      packagePath,
      packageName,
      packageSize: Number(current.packageSize || 0) || 0,
      releaseId: current.releaseId || '',
      marketUrl: current.marketUrl || '',
      publishedAt: current.publishedAt || ''
      });
    } catch (error) {
      res.status(500).json({ message: error.message || '鐗堟湰淇℃伅鑾峰彇澶辫触' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    const { studentId, password } = req.body || {};
    const user = db.get('SELECT * FROM users WHERE student_id = ? AND password = ?', [studentId, password]);
    if (!user) {
      return res.status(400).json({ message: '账号或密码错误' });
    }
    if (user.status === 'disabled') {
      return res.status(403).json({ message: '该账户已停用' });
    }
    db.run('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?', [new Date().toISOString(), new Date().toISOString(), user.id]);
    res.json({ token: createToken(user.id), user: mapUserForClient(user, req) });
  });

  app.post('/api/auth/refresh', requireAuth, (req, res) => {
    res.json({ token: createToken(req.user.id), user: mapUserForClient(req.user, req) });
  });

  app.post('/api/auth/change-password', requireAuth, (req, res) => {
    const { oldPassword, newPassword } = req.body || {};
    if (req.user.password !== oldPassword) {
      return res.status(400).json({ message: '原密码错误' });
    }
    db.run('UPDATE users SET password = ?, updated_at = ? WHERE id = ?', [newPassword, new Date().toISOString(), req.user.id]);
    res.json({ success: true });
  });

  app.get('/api/home/overview', (req, res) => {
    const banners = db.all('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order ASC, id ASC');
    const settings = req.user ? db.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]) : null;
    const interests = settings ? parseJson(settings.interests, []) : [];
    const recommendations = buildHomeInfoRecommendations(db, req.user, infoSelect, interests);
    const activities = buildHomeActivityRecommendations(db, req.user, activitySelect, interests);

    const hotInfos = db.all(`${infoSelect} ORDER BY i.is_top DESC, datetime(i.publish_time) DESC, i.id DESC LIMIT 6`);
    res.json({
      banners: banners.map((item) => mapBannerForClient(item, req)),
      recommendations: recommendations.map((item) => mapInfoForClient(item, req)),
      hotInfos: hotInfos.map((item) => mapInfoForClient(item, req)),
      latestActivities: activities.map((item) => mapActivityForClient(item, req))
    });
  });

  app.get('/api/banners', (req, res) => {
    const rows = db.all('SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order ASC, id ASC');
    res.json({ list: rows.map((item) => mapBannerForClient(item, req)) });
  });

  app.get('/api/user/profile', requireAuth, (req, res) => {
    res.json(mapUserForClient(req.user, req));
  });

  app.put('/api/user/profile', requireAuth, (req, res) => {
    const body = req.body || {};
    const nextClassName = String(body.class !== undefined ? body.class : req.user.class_name || '').trim();
    db.run(
      `UPDATE users SET
      name = ?, school = ?, department = ?, class_name = ?, phone = ?, avatar_url = ?, updated_at = ?
      WHERE id = ?`,
      [body.name || req.user.name, body.school || '', body.department || '', nextClassName, body.phone || '', body.avatarUrl || '', new Date().toISOString(), req.user.id]
    );
    ensureClassGroup(db, nextClassName);
    const updated = db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json(mapUserForClient(updated, req));
  });

  app.post('/api/user/avatar/upload', requireAuth, async (req, res) => {
    const body = req.body || {};
    const fileName = String(body.fileName || '').trim();
    const content = String(body.content || '');
    const match = content.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

    if (!fileName || !match) {
      return res.status(400).json({ message: '请上传有效图片' });
    }

    const mimeType = match[1];
    const extMap = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif'
    };
    const ext = extMap[mimeType];
    if (!ext) {
      return res.status(400).json({ message: '仅支持 png、jpg、webp、gif 图片' });
    }

    const safeBase = path.basename(fileName, path.extname(fileName)).replace(/[^a-zA-Z0-9_-]/g, '') || 'avatar';
    const storedName = `${Date.now()}-${req.user.id}-${safeBase}${ext}`;
    const targetPath = path.join(userUploadDir, storedName);
    fs.writeFileSync(targetPath, Buffer.from(match[2], 'base64'));
    try {
      const stored = await finalizeUploadedLocalFile(db, targetPath, {
        contentType: mimeType
      });
      res.json({
        path: stored.storedPath,
        url: toAssetProxyUrl(req, stored.storedPath)
      });
    } catch (error) {
      res.status(400).json({ message: error.message || '头像上传失败' });
    }
  });

  app.get('/api/user/settings', requireAuth, (req, res) => {
    const row = db.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]);
    res.json(parseSettings(row));
  });

  app.get('/api/user/notifications', requireAuth, (req, res) => {
    ensureActivityStartNotifications(db, req.user.id);
    const type = normalizeNotificationType(String(req.query.type || '').trim());
    const status = String(req.query.status || 'all').trim();
    const preferences = parseNotificationPreferences(req.user, db);
    const conditions = ['user_id = ?'];
    const params = [req.user.id];

    if (String(req.query.type || '').trim()) {
      conditions.push('type = ?');
      params.push(type);
    }
    if (status === 'read') {
      conditions.push('is_read = 1');
    } else if (status === 'unread') {
      conditions.push('is_read = 0');
    }

    const rows = db.all(
      `SELECT *
      FROM notifications
      WHERE ${conditions.join(' AND ')}
      ORDER BY is_read ASC, datetime(created_at) DESC, id DESC
      LIMIT 50`,
      params
    );
    const list = rows.map(mapNotification);
    const totalUnread = db.get('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0', [req.user.id]).count;
    res.json({
      list,
      unreadCount: Number(totalUnread || 0),
      unreadBadgeCount: preferences.doNotDisturb ? 0 : Number(totalUnread || 0),
      preferences,
      filters: {
        type: String(req.query.type || '').trim() ? type : 'all',
        status
      }
    });
  });

  app.get('/api/user/popup-announcement', requireAuth, (req, res) => {
    const current = db.get(
      `SELECT *
      FROM popup_announcements
      WHERE is_active = 1
      ORDER BY datetime(published_at) DESC, datetime(updated_at) DESC, id DESC
      LIMIT 1`
    );

    const announcement = mapPopupAnnouncement(current, req);
    if (!announcement) {
      return res.json({ active: false, announcement: null });
    }

    const confirmed = db.get(
      `SELECT id
      FROM popup_announcement_reads
      WHERE announcement_id = ? AND announcement_version = ? AND user_id = ?
      LIMIT 1`,
      [announcement.id, announcement.version, req.user.id]
    );

    if (confirmed) {
      return res.json({ active: false, announcement: null });
    }

    res.json({ active: true, announcement });
  });

  app.post('/api/user/popup-announcement/:id/ack', requireAuth, (req, res) => {
    const current = db.get('SELECT * FROM popup_announcements WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!current) {
      return res.status(404).json({ message: '弹窗通知不存在' });
    }

    const announcement = mapPopupAnnouncement(current, req);
    db.run(
      `INSERT OR IGNORE INTO popup_announcement_reads
      (announcement_id, announcement_version, user_id, confirmed_at)
      VALUES (?, ?, ?, ?)`,
      [current.id, announcement.version, req.user.id, new Date().toISOString()]
    );

    res.json({ success: true });
  });

  app.post('/api/user/notifications/:id/read', requireAuth, (req, res) => {
    const current = db.get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!current) {
      return res.status(404).json({ message: '通知不存在' });
    }
    if (!Number(current.is_read || 0)) {
      db.run('UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ?', [new Date().toISOString(), req.params.id]);
    }
    const updated = db.get('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
    res.json(mapNotification(updated));
  });

  app.post('/api/user/notifications/read-all', requireAuth, (req, res) => {
    const type = String(req.body && req.body.type ? req.body.type : '').trim();
    const status = String(req.body && req.body.status ? req.body.status : 'all').trim();
    const conditions = ['user_id = ?', 'is_read = 0'];
    const params = [req.user.id];
    if (type) {
      conditions.push('type = ?');
      params.push(normalizeNotificationType(type));
    }
    if (status === 'read') {
      return res.json({ success: true });
    }
    db.run(
      `UPDATE notifications
      SET is_read = 1, read_at = ?
      WHERE ${conditions.join(' AND ')}`,
      [new Date().toISOString(), ...params]
    );
    res.json({ success: true });
  });

  app.put('/api/user/settings', requireAuth, (req, res) => {
    const body = req.body || {};
    const current = db.get('SELECT * FROM user_settings WHERE user_id = ?', [req.user.id]);
    const currentSettings = parseSettings(current);
    const currentAiSettings = parseUserAiSettings(current && current.ai_settings, db);
    const merged = {
      grade: body.grade !== undefined ? body.grade : currentSettings.grade,
      educationType: body.educationType !== undefined ? body.educationType : currentSettings.educationType,
      interests: body.interests !== undefined ? body.interests : currentSettings.interests,
      futurePlan: body.futurePlan !== undefined ? body.futurePlan : currentSettings.futurePlan,
      notification: body.notification !== undefined ? { ...currentSettings.notification, ...body.notification } : currentSettings.notification,
      theme: body.theme !== undefined ? { ...currentSettings.theme, ...body.theme } : currentSettings.theme,
      aiConfig: body.aiConfig !== undefined ? body.aiConfig : currentAiSettings
    };
    db.run(
      `UPDATE user_settings SET
      grade = ?, education_type = ?, interests = ?, future_plan = ?, notification_settings = ?, theme_settings = ?, ai_settings = ?, updated_at = ?
      WHERE user_id = ?`,
      [
        merged.grade || '',
        merged.educationType || '',
        JSON.stringify(merged.interests || []),
        merged.futurePlan || '',
        JSON.stringify(merged.notification || {}),
        JSON.stringify(merged.theme || {}),
        JSON.stringify(merged.aiConfig || currentAiSettings),
        new Date().toISOString(),
        req.user.id
      ]
    );
    res.json({ success: true });
  });

  app.get('/api/user/collections', requireAuth, (req, res) => {
    const rows = db.all(
      `SELECT f.id, f.target_type, f.target_id, f.created_at,
      i.title AS info_title, i.summary AS info_summary,
      a.title AS activity_title, a.summary AS activity_summary
      FROM favorites f
      LEFT JOIN infos i ON f.target_type = 'info' AND f.target_id = i.id
      LEFT JOIN activities a ON f.target_type = 'activity' AND f.target_id = a.id
      WHERE f.user_id = ?
      ORDER BY datetime(f.created_at) DESC`,
      [req.user.id]
    );
    res.json({
      list: rows.map((row) => ({
        id: String(row.id),
        targetType: row.target_type,
        targetId: String(row.target_id),
        title: row.info_title || row.activity_title || '未知内容',
        summary: row.info_summary || row.activity_summary || '',
        time: row.created_at
      }))
    });
  });

  app.post('/api/user/collections/toggle', requireAuth, (req, res) => {
    const { targetType, targetId } = req.body || {};
    const existing = db.get('SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?', [req.user.id, targetType, targetId]);
    if (existing) {
      db.run('DELETE FROM favorites WHERE id = ?', [existing.id]);
      return res.json({ collected: false });
    }
    db.run('INSERT INTO favorites (user_id, target_type, target_id, created_at) VALUES (?, ?, ?, ?)', [req.user.id, targetType, targetId, new Date().toISOString()]);
    res.json({ collected: true });
  });

  app.get('/api/user/history', requireAuth, (req, res) => {
    const browse = db.all(
      `SELECT bh.*
      FROM browse_history bh
      INNER JOIN (
        SELECT target_type, target_id, MAX(datetime(created_at)) AS latest_time
        FROM browse_history
        WHERE user_id = ?
        GROUP BY target_type, target_id
      ) latest
      ON latest.target_type = bh.target_type
      AND latest.target_id = bh.target_id
      AND latest.latest_time = datetime(bh.created_at)
      WHERE bh.user_id = ?
      ORDER BY datetime(bh.created_at) DESC
      LIMIT 50`,
      [req.user.id, req.user.id]
    );
    const activities = db.all(
      `SELECT a.*, aa.created_at AS applied_at
      FROM activity_applications aa
      INNER JOIN activities a ON a.id = aa.activity_id
      WHERE aa.user_id = ?
      ORDER BY datetime(aa.created_at) DESC`,
      [req.user.id]
    );
    res.json({
      browse: browse.map((row) => ({
        id: String(row.id),
        targetType: row.target_type,
        targetId: String(row.target_id),
        title: row.title,
        summary: row.summary,
        time: row.created_at
      })),
      activities: activities.map((row) => ({
        id: String(row.id),
        title: row.title,
        organizer: row.organizer,
        status: row.status,
        time: row.applied_at
      }))
    });
  });

  app.post('/api/user/history/record', requireAuth, (req, res) => {
    const body = req.body || {};
    recordBrowse(db, req.user.id, body.targetType, body.targetId, body.title || '未命名内容', body.summary || '');
    res.json({ success: true });
  });

  app.get('/api/user/stats', requireAuth, (req, res) => {
    const activityTotal = db.get('SELECT COUNT(*) AS count FROM activity_applications WHERE user_id = ?', [req.user.id]).count;
    const activityCompleted = db.get(
      `SELECT COUNT(*) AS count FROM activity_applications aa
      INNER JOIN activities a ON a.id = aa.activity_id
      WHERE aa.user_id = ? AND a.status = 'completed'`,
      [req.user.id]
    ).count;
    const browseTotal = db.get(
      `SELECT COUNT(*) AS count FROM (
        SELECT target_type, target_id
        FROM browse_history
        WHERE user_id = ?
        GROUP BY target_type, target_id
      )`,
      [req.user.id]
    ).count;
    const favoriteTotal = db.get('SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?', [req.user.id]).count;
    res.json({
      totalViews: browseTotal,
      totalCollections: favoriteTotal,
      activityStats: {
        total: activityTotal,
        completed: activityCompleted,
        ongoing: activityTotal - activityCompleted
      },
      browseStats: {
        total: browseTotal,
        today: db.get(`SELECT COUNT(*) AS count FROM browse_history WHERE user_id = ? AND date(created_at) = date('now','localtime')`, [req.user.id]).count,
        week: db.get(`SELECT COUNT(*) AS count FROM browse_history WHERE user_id = ? AND datetime(created_at) >= datetime('now','-7 day')`, [req.user.id]).count
      }
    });
  });

  app.get('/api/info/list', (req, res) => {
    const { search = '', category = '', locationType = '', page = 1, pageSize = 50 } = req.query;
    const conditions = [];
    const params = [];
    const searchCondition = buildSearchConditions(search, ['title', 'content', 'summary', 'source'], params);
    if (searchCondition) {
      conditions.push(searchCondition);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (locationType) {
      conditions.push('location_type = ?');
      params.push(locationType);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Number(pageSize);
    const offset = (Number(page) - 1) * limit;
    const infoWhere = where ? where.replace(/\btitle\b/g, 'i.title').replace(/\bcontent\b/g, 'i.content').replace(/\bsummary\b/g, 'i.summary').replace(/\bsource\b/g, 'i.source').replace(/\bcategory\b/g, 'i.category').replace(/\blocation_type\b/g, 'i.location_type') : '';
    const rows = db.all(`${infoSelect} ${infoWhere} ORDER BY i.is_top DESC, datetime(i.publish_time) DESC, i.id DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
    const total = db.get(`SELECT COUNT(*) AS count FROM infos ${where}`, params).count;
    res.json({ list: rows.map((item) => mapInfoForClient(item, req)), total, page: Number(page), pageSize: limit });
  });

  app.get('/api/info/search', (req, res) => {
    const search = String(req.query.search || req.query.q || '').trim();
    const infoRows = search
      ? db.all(
          `${infoSelect}
          WHERE i.title LIKE ? OR i.content LIKE ? OR i.summary LIKE ? OR i.source LIKE ?
          ORDER BY i.is_top DESC, datetime(i.publish_time) DESC, i.id DESC LIMIT 20`,
          [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
        )
      : [];
    const activityRows = search
      ? db.all(
          `${activitySelect}
          WHERE a.title LIKE ? OR a.content LIKE ? OR a.summary LIKE ? OR a.organizer LIKE ? OR a.location LIKE ?
          ORDER BY a.is_top DESC, datetime(a.publish_time) DESC, a.id DESC LIMIT 20`,
          [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`]
        )
      : [];

    const infos = infoRows.map((item) => mapInfoForClient(item, req));
    const activities = activityRows.map((item) => mapActivityForClient(item, req));
    const list = [
      ...infos.map((item) => ({ ...item, targetType: 'info' })),
      ...activities.map((item) => ({ ...item, targetType: 'activity' }))
    ].sort((a, b) => new Date(b.publishTime || b.startTime || 0) - new Date(a.publishTime || a.startTime || 0));

    res.json({ infos, activities, list, total: list.length, page: 1, pageSize: list.length });
  });

  app.get('/api/info/detail', async (req, res) => {
    const row = db.get(
      `SELECT i.*,
        (SELECT COUNT(*) FROM favorites f WHERE f.target_type = 'info' AND f.target_id = i.id) AS favorite_count,
        (SELECT COUNT(*) FROM browse_history bh WHERE bh.target_type = 'info' AND bh.target_id = i.id) AS view_count,
        CASE
          WHEN ? IS NOT NULL AND EXISTS(
            SELECT 1 FROM favorites f2
            WHERE f2.user_id = ? AND f2.target_type = 'info' AND f2.target_id = i.id
          ) THEN 1
          ELSE 0
        END AS is_collected
      FROM infos i
      WHERE i.id = ?`,
      [req.user ? req.user.id : null, req.user ? req.user.id : null, req.query.id]
    );
    if (!row) {
      return res.status(404).json({ message: '信息不存在' });
    }
    res.json(await mapInfoDetailForClient(row, req, db));
  });

  app.get('/api/publish/list', (req, res) => {
    const rows = db.all(`${activitySelect} ORDER BY a.is_top DESC, datetime(a.publish_time) DESC, a.id DESC`);
    res.json({ list: rows.map((item) => mapActivityForClient(item, req)) });
  });

  app.get('/api/publish/detail', (req, res) => {
    const row = db.get(
      `SELECT a.*,
        (SELECT COUNT(*) FROM favorites f WHERE f.target_type = 'activity' AND f.target_id = a.id) AS favorite_count,
        CASE
          WHEN ? IS NOT NULL AND EXISTS(
            SELECT 1 FROM favorites f2
            WHERE f2.user_id = ? AND f2.target_type = 'activity' AND f2.target_id = a.id
          ) THEN 1
          ELSE 0
        END AS is_collected,
        CASE
          WHEN ? IS NOT NULL AND EXISTS(
            SELECT 1 FROM activity_applications aa
            WHERE aa.user_id = ? AND aa.activity_id = a.id
          ) THEN 1
          ELSE 0
        END AS is_applied
      FROM activities a
      WHERE a.id = ?`,
      [
        req.user ? req.user.id : null,
        req.user ? req.user.id : null,
        req.user ? req.user.id : null,
        req.user ? req.user.id : null,
        req.query.id
      ]
    );
    if (!row) {
      return res.status(404).json({ message: '活动不存在' });
    }
    res.json(mapActivityForClient(row, req));
  });

  app.post('/api/publish/create', requireAuth, (req, res) => {
    const body = req.body || {};
    const now = new Date().toISOString();
    const summary = String(body.summary || body.content || '').slice(0, 60);
    db.run(
      `INSERT INTO activities
      (title, summary, content, start_time, end_time, location, location_type, organizer, images, activity_type, status, publish_time, creator_user_id, apply_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.title,
        summary,
        body.content,
        body.startTime,
        body.endTime,
        body.location,
        body.locationType || '校内',
        body.organizer,
        JSON.stringify(body.images || []),
        body.activityType || '其他',
        body.status || 'upcoming',
        now,
        req.user.id,
        0,
        now,
        now
      ]
    );
    const created = db.get('SELECT * FROM activities ORDER BY id DESC LIMIT 1');
    res.json(mapActivityForClient(created, req));
  });

  app.post('/api/publish/apply', requireAuth, (req, res) => {
    const { activityId } = req.body || {};
    const activity = db.get('SELECT * FROM activities WHERE id = ?', [activityId]);
    if (!activity) {
      return res.status(404).json({ message: '活动不存在' });
    }
    const exists = db.get('SELECT id FROM activity_applications WHERE activity_id = ? AND user_id = ?', [activityId, req.user.id]);
    if (exists) {
      db.run('DELETE FROM activity_applications WHERE id = ?', [exists.id]);
      db.run(
        'UPDATE activities SET apply_count = CASE WHEN apply_count > 0 THEN apply_count - 1 ELSE 0 END, updated_at = ? WHERE id = ?',
        [new Date().toISOString(), activityId]
      );
      createNotification(db, {
        userId: req.user.id,
        type: 'activity',
        title: '活动报名已取消',
        content: `你已取消“${activity.title}”的报名。`,
        releaseId: `activity-cancel-${activityId}-${req.user.id}-${Date.now()}`,
        payload: {
          targetType: 'activity',
          targetId: String(activityId),
          action: 'open-activity-detail'
        }
      });
      const updated = db.get(
        `SELECT a.*,
          (SELECT COUNT(*) FROM favorites f WHERE f.target_type = 'activity' AND f.target_id = a.id) AS favorite_count,
          0 AS is_applied,
          CASE
            WHEN EXISTS(
              SELECT 1 FROM favorites f2
              WHERE f2.user_id = ? AND f2.target_type = 'activity' AND f2.target_id = a.id
            ) THEN 1
            ELSE 0
          END AS is_collected
        FROM activities a
        WHERE a.id = ?`,
        [req.user.id, activityId]
      );
      return res.json({
        ...mapActivityForClient(updated, req),
        action: 'cancel'
      });
    }
    db.run('INSERT INTO activity_applications (activity_id, user_id, created_at) VALUES (?, ?, ?)', [activityId, req.user.id, new Date().toISOString()]);
    db.run('UPDATE activities SET apply_count = apply_count + 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), activityId]);
    createNotification(db, {
      userId: req.user.id,
      type: 'activity',
      title: '活动报名成功',
      content: `你已成功报名“${activity.title}”。`,
      releaseId: `activity-apply-${activityId}-${req.user.id}`,
      payload: {
        targetType: 'activity',
        targetId: String(activityId),
        action: 'open-activity-detail',
        startTime: activity.start_time
      }
    });
    const updated = db.get(
      `SELECT a.*,
        (SELECT COUNT(*) FROM favorites f WHERE f.target_type = 'activity' AND f.target_id = a.id) AS favorite_count,
        1 AS is_applied,
        CASE
          WHEN EXISTS(
            SELECT 1 FROM favorites f2
            WHERE f2.user_id = ? AND f2.target_type = 'activity' AND f2.target_id = a.id
          ) THEN 1
          ELSE 0
        END AS is_collected
      FROM activities a
      WHERE a.id = ?`,
      [req.user.id, activityId]
    );
    res.json({
      ...mapActivityForClient(updated, req),
      action: 'apply'
    });
  });

  app.post('/api/publish/delete', requireAuth, (req, res) => {
    db.run('DELETE FROM activities WHERE id = ?', [req.body.id]);
    res.json({ success: true });
  });

  app.get('/api/publish/applications', requireAuth, (req, res) => {
    const rows = db.all(
      `SELECT a.* FROM activities a
      INNER JOIN activity_applications aa ON aa.activity_id = a.id
      WHERE aa.user_id = ?
      ORDER BY datetime(aa.created_at) DESC`,
      [req.user.id]
    );
    res.json({ list: rows.map((item) => mapActivityForClient(item, req)) });
  });

  app.get('/api/class-group/current', requireAuth, (req, res) => {
    const className = String(req.user.class_name || '').trim();
    if (!className) {
      return res.status(400).json({ message: '请先在个人资料中完善班级信息' });
    }
    ensureClassGroup(db, className);
    const row = db.get('SELECT * FROM class_groups WHERE class_name = ?', [className]);
    if (!row) {
      return res.status(404).json({ message: '暂未找到对应班级群' });
    }
    res.json(getClassGroupWithMembers(db, row));
  });

  app.post('/api/class-group/messages', requireAuth, (req, res) => {
    const className = String(req.user.class_name || '').trim();
    if (!className) {
      return res.status(400).json({ message: '请先在个人资料中完善班级信息' });
    }
    ensureClassGroup(db, className);
    const row = db.get('SELECT * FROM class_groups WHERE class_name = ?', [className]);
    if (!row) {
      return res.status(404).json({ message: '暂未找到对应班级群' });
    }
    const text = String((req.body || {}).text || '').trim();
    if (!text) {
      return res.status(400).json({ message: '消息内容不能为空' });
    }
    const messages = parseJson(row.messages, []);
    messages.push({
      id: Date.now(),
      sender: req.user.name,
      text,
      time: new Date().toISOString(),
      type: 'self'
    });
    db.run('UPDATE class_groups SET messages = ?, updated_at = ? WHERE id = ?', [JSON.stringify(messages.slice(-100)), new Date().toISOString(), row.id]);
    const updated = db.get('SELECT * FROM class_groups WHERE id = ?', [row.id]);
    res.json(getClassGroupWithMembers(db, updated));
  });

  app.get('/api/run/history', requireAuth, (req, res) => {
    const rows = db.all('SELECT * FROM runs WHERE user_id = ? ORDER BY datetime(date) DESC', [req.user.id]);
    res.json({ list: rows.map((row) => ({ id: String(row.id), distance: row.distance, duration: row.duration, calories: row.calories, date: row.date, path: [] })) });
  });

  app.post('/api/run/start', requireAuth, (_req, res) => res.json({ startedAt: new Date().toISOString() }));

  app.post('/api/run/end', requireAuth, (req, res) => {
    const body = req.body || {};
    db.run('INSERT INTO runs (user_id, distance, duration, calories, date, created_at) VALUES (?, ?, ?, ?, ?, ?)', [req.user.id, body.distance, body.duration, body.calories || 0, new Date().toISOString(), new Date().toISOString()]);
    res.json({ success: true });
  });

  app.get('/api/run/ranking', (_req, res) => {
    const rows = db.all(`SELECT u.id AS user_id, u.name, COALESCE(SUM(r.distance), 0) AS distance FROM users u LEFT JOIN runs r ON r.user_id = u.id GROUP BY u.id ORDER BY distance DESC, u.id ASC`);
    res.json({ list: rows.map((row, index) => ({ userId: String(row.user_id), name: row.name, distance: Number(Number(row.distance || 0).toFixed(2)), rank: index + 1 })) });
  });

  app.get('/api/sign/teacher/overview', requireTeacher, (req, res) => {
    const className = getTeacherScopeClassName(req);
    if (!className) {
      return res.json({
        className: '',
        stats: {
          todayBatchCount: 0,
          pendingLeaveCount: 0,
          signedCount: 0,
          unsignedCount: 0
        },
        todayBatches: [],
        pendingLeaveRequests: [],
        recentRecords: []
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const studentCountRow = db.get(`SELECT COUNT(*) AS count FROM users WHERE role = 'user' AND status = 'active' AND TRIM(class_name) = ?`, [className]);
    const studentCount = Number((studentCountRow && studentCountRow.count) || 0);
    const batchRows = db.all(
      `SELECT sb.*,
        (SELECT COUNT(*) FROM sign_records sr WHERE sr.batch_id = sb.id) AS sign_count,
        (SELECT COUNT(*) FROM leave_requests lr WHERE lr.batch_id = sb.id AND lr.status = 'approved') AS approved_leave_count,
        (SELECT COUNT(*) FROM leave_requests lr WHERE lr.batch_id = sb.id AND lr.status = 'pending') AS pending_leave_count
      FROM sign_batches sb
      WHERE sb.class_name = ? AND sb.sign_date = ?
      ORDER BY datetime(sb.start_time) ASC, sb.id ASC`,
      [className, today]
    );
    const pendingLeaveRows = db.all(
      `SELECT lr.*, u.name AS user_name, u.student_id, sb.course_name, sb.teacher, sb.sign_date
      FROM leave_requests lr
      INNER JOIN users u ON u.id = lr.user_id
      INNER JOIN sign_batches sb ON sb.id = lr.batch_id
      WHERE sb.class_name = ? AND lr.status = 'pending'
      ORDER BY datetime(lr.created_at) DESC, lr.id DESC`,
      [className]
    );
    const recentRecordRows = db.all(
      `SELECT sr.*, u.name AS user_name, u.student_id
      FROM sign_records sr
      INNER JOIN users u ON u.id = sr.user_id
      INNER JOIN sign_batches sb ON sb.id = sr.batch_id
      WHERE sb.class_name = ?
      ORDER BY datetime(sr.time) DESC, sr.id DESC
      LIMIT 30`,
      [className]
    );
    const todayBatches = batchRows.map((row) => mapTeacherBatchSummary({ ...row, student_count: studentCount }));

    res.json({
      className,
      teacherName: req.user.name || '',
      stats: {
        todayBatchCount: todayBatches.length,
        pendingLeaveCount: pendingLeaveRows.length,
        signedCount: todayBatches.reduce((sum, item) => sum + item.signCount, 0),
        unsignedCount: todayBatches.reduce((sum, item) => sum + item.unsignedCount, 0)
      },
      todayBatches,
      pendingLeaveRequests: pendingLeaveRows.map((row) => ({
        id: String(row.id),
        userId: String(row.user_id),
        userName: row.user_name,
        studentId: row.student_id,
        batchId: String(row.batch_id),
        courseName: row.course_name,
        teacher: row.teacher,
        signDate: row.sign_date,
        reason: row.reason,
        leaveTime: row.leave_time,
        status: row.status,
        createdAt: row.created_at
      })),
      recentRecords: recentRecordRows.map((row) => ({
        id: String(row.id),
        userId: String(row.user_id),
        userName: row.user_name,
        studentId: row.student_id,
        batchId: row.batch_id ? String(row.batch_id) : '',
        courseName: row.course_name,
        teacher: row.teacher,
        time: row.time,
        status: row.status
      }))
    });
  });

  app.post('/api/sign/teacher/batches', requireTeacher, (req, res) => {
    const className = getTeacherScopeClassName(req);
    if (!className) {
      return res.status(400).json({ message: '请先在个人资料中绑定班级信息' });
    }

    const body = req.body || {};
    const courseName = String(body.courseName || '').trim();
    const signDate = String(body.signDate || '').trim();
    const startTime = String(body.startTime || '').trim();
    const endTime = String(body.endTime || '').trim();
    const lateEndTime = String(body.lateEndTime || '').trim();
    const teacher = String(body.teacher || req.user.name || '').trim();

    if (!courseName || !signDate || !startTime || !endTime || !lateEndTime) {
      return res.status(400).json({ message: '请填写完整的签到批次信息' });
    }

    const now = new Date().toISOString();
    const result = db.run(
      `INSERT INTO sign_batches
      (class_name, course_name, teacher, sign_date, start_time, end_time, late_end_time, status, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [className, courseName, teacher, signDate, startTime, endTime, lateEndTime, 'active', req.user.id, now, now]
    );

    appendClassGroupMessage(db, className, `老师发起了《${courseName}》签到，请同学们按时完成。`);
    const students = db.all(`SELECT id FROM users WHERE role = 'user' AND status = 'active' AND TRIM(class_name) = ?`, [className]);
    createNotificationsForUsers(
      db,
      students.map((item) => item.id),
      {
        type: 'sign',
        title: '新的签到任务',
        content: `《${courseName}》签到已发布，请按时完成。`,
        releaseId: `teacher-batch-${result.lastID}`,
        payload: {
          targetType: 'sign',
          action: 'open-sign-page',
          batchId: String(result.lastID)
        }
      }
    );

    const created = db.get('SELECT * FROM sign_batches WHERE id = ?', [result.lastID]);
    res.json({
      success: true,
      batch: mapTeacherBatchSummary({
        ...created,
        sign_count: 0,
        approved_leave_count: 0,
        pending_leave_count: 0,
        student_count: students.length
      })
    });
  });

  app.post('/api/sign/teacher/leave-requests/:id/review', requireTeacher, (req, res) => {
    const className = getTeacherScopeClassName(req);
    const body = req.body || {};
    const status = String(body.status || '').trim();
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: '审核状态不合法' });
    }

    const current = db.get(
      `SELECT lr.*, u.name AS user_name, sb.course_name, sb.class_name, sb.id AS sign_batch_id
      FROM leave_requests lr
      INNER JOIN users u ON u.id = lr.user_id
      INNER JOIN sign_batches sb ON sb.id = lr.batch_id
      WHERE lr.id = ?`,
      [req.params.id]
    );
    if (!current) {
      return res.status(404).json({ message: '请假申请不存在' });
    }
    if (current.class_name !== className) {
      return res.status(403).json({ message: '只能处理本班请假申请' });
    }

    const comment = String(body.reviewComment || '').trim();
    const now = new Date().toISOString();
    db.run(
      `UPDATE leave_requests
      SET status = ?, review_comment = ?, reviewed_by = ?, reviewed_at = ?
      WHERE id = ?`,
      [status, comment, req.user.id, now, req.params.id]
    );

    appendClassGroupMessage(db, className, `${current.user_name}的《${current.course_name}》请假申请已${status === 'approved' ? '通过' : '驳回'}`);
    createNotification(db, {
      userId: current.user_id,
      type: 'sign',
      title: status === 'approved' ? '请假已通过' : '请假未通过',
      content: comment || `《${current.course_name}》请假申请已${status === 'approved' ? '通过' : '驳回'}。`,
      releaseId: `teacher-leave-review-${req.params.id}-${status}`,
      payload: {
        targetType: 'sign',
        action: 'open-sign-page',
        batchId: String(current.sign_batch_id)
      }
    });

    res.json({ success: true });
  });

  app.get('/api/sign/overview', requireAuth, (req, res) => {
    const className = String(req.user.class_name || '').trim();
    if (!className) {
      return res.json({
        className: '',
        todayBatches: [],
        history: [],
        leaveRequests: [],
        total: 0,
        attendanceRate: 0
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const batchRows = db.all(
      `SELECT *
      FROM sign_batches
      WHERE class_name = ? AND sign_date = ?
      ORDER BY datetime(start_time) ASC, id ASC`,
      [className, today]
    );
    const signRows = db.all('SELECT * FROM sign_records WHERE user_id = ? ORDER BY datetime(time) DESC', [req.user.id]);
    const signMap = new Map(signRows.filter((row) => row.batch_id).map((row) => [String(row.batch_id), row]));
    const leaveRows = db.all(
      `SELECT lr.*, sb.course_name, sb.teacher
      FROM leave_requests lr
      INNER JOIN sign_batches sb ON sb.id = lr.batch_id
      WHERE lr.user_id = ?
      ORDER BY datetime(lr.created_at) DESC, lr.id DESC`,
      [req.user.id]
    );
    const leaveMap = new Map(leaveRows.map((row) => [String(row.batch_id), row]));
    const total = signRows.length;
    const successCount = signRows.filter((row) => ['success', 'late', 'makeup'].includes(row.status)).length;

    res.json({
      className,
      todayBatches: batchRows.map((row) => mapSignBatch(row, signMap.get(String(row.id)), leaveMap.get(String(row.id)))),
      history: signRows.slice(0, 20).map((row) => ({
        id: String(row.id),
        batchId: row.batch_id ? String(row.batch_id) : '',
        courseName: row.course_name,
        teacher: row.teacher,
        time: row.time,
        status: row.status
      })),
      leaveRequests: leaveRows.slice(0, 20).map((row) => ({
        id: String(row.id),
        batchId: String(row.batch_id),
        courseName: row.course_name,
        teacher: row.teacher,
        reason: row.reason,
        leaveTime: row.leave_time,
        status: row.status,
        reviewComment: row.review_comment || '',
        reviewedAt: row.reviewed_at || '',
        createdAt: row.created_at
      })),
      total,
      attendanceRate: total ? Math.round((successCount / total) * 100) : 0
    });
  });

  app.get('/api/sign/history', requireAuth, (req, res) => {
    const rows = db.all('SELECT * FROM sign_records WHERE user_id = ? ORDER BY datetime(time) DESC', [req.user.id]);
    res.json({ list: rows.map((row) => ({ id: String(row.id), batchId: row.batch_id ? String(row.batch_id) : '', courseName: row.course_name, teacher: row.teacher, time: row.time, status: row.status })) });
  });

  app.get('/api/sign/statistics', requireAuth, (req, res) => {
    const row = db.get(`SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ('success','late','makeup') THEN 1 ELSE 0 END) AS successCount FROM sign_records WHERE user_id = ?`, [req.user.id]);
    const total = row.total || 0;
    res.json({ total, attendanceRate: total ? Math.round((row.successCount || 0) / total * 100) : 0 });
  });

  app.post('/api/sign/do', requireAuth, (req, res) => {
    const body = req.body || {};
    const batchId = Number(body.batchId || 0);
    const batch = db.get('SELECT * FROM sign_batches WHERE id = ?', [batchId]);
    const className = String(req.user.class_name || '').trim();
    if (!batch || batch.class_name !== className) {
      return res.status(404).json({ message: '签到批次不存在' });
    }
    const existing = db.get('SELECT id FROM sign_records WHERE user_id = ? AND batch_id = ?', [req.user.id, batchId]);
    if (existing) {
      return res.status(400).json({ message: '该课程已签到，无需重复操作' });
    }
    const leaveApproved = db.get('SELECT id FROM leave_requests WHERE user_id = ? AND batch_id = ? AND status = ?', [req.user.id, batchId, 'approved']);
    if (leaveApproved) {
      return res.status(400).json({ message: '该课程请假已通过，无需签到' });
    }

    const now = new Date();
    const startTime = new Date(batch.start_time);
    const endTime = new Date(batch.end_time);
    const lateEndTime = new Date(batch.late_end_time);
    if (batch.status !== 'active') {
      return res.status(400).json({ message: '当前签到批次未开放' });
    }
    if (now < startTime) {
      return res.status(400).json({ message: '还没到签到时间' });
    }
    if (now > lateEndTime) {
      return res.status(400).json({ message: '已过补签时间，无法签到' });
    }

    const signStatus = now > endTime ? 'makeup' : 'success';
    const nowText = now.toISOString();
    db.run(
      'INSERT INTO sign_records (user_id, batch_id, course_name, teacher, status, time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, batchId, batch.course_name, batch.teacher, signStatus, nowText, nowText]
    );
    appendClassGroupMessage(
      db,
      className,
      `${req.user.name}完成了《${batch.course_name}》签到${signStatus === 'makeup' ? '（补签）' : ''}`
    );
    createNotification(db, {
      userId: req.user.id,
      type: 'sign',
      title: signStatus === 'makeup' ? '补签成功' : '签到成功',
      content: `你已完成 ${batch.course_name} 的${signStatus === 'makeup' ? '补签' : '签到'}。`,
      releaseId: `sign-success-${req.user.id}-${batchId}`,
      payload: {
        targetType: 'sign',
        action: 'open-sign-page',
        batchId: String(batchId),
        courseName: batch.course_name
      }
    });
    res.json({ success: true, status: signStatus });
  });

  app.post('/api/sign/leave', requireAuth, (req, res) => {
    const body = req.body || {};
    const batchId = Number(body.batchId || 0);
    const batch = db.get('SELECT * FROM sign_batches WHERE id = ?', [batchId]);
    const className = String(req.user.class_name || '').trim();
    if (!batch || batch.class_name !== className) {
      return res.status(404).json({ message: '请假对应的课程不存在' });
    }
    const reason = String(body.reason || '').trim();
    if (!reason) {
      return res.status(400).json({ message: '请填写请假原因' });
    }
    const existing = db.get('SELECT id, status FROM leave_requests WHERE user_id = ? AND batch_id = ?', [req.user.id, batchId]);
    if (existing && existing.status === 'pending') {
      return res.status(400).json({ message: '该课程已有待审核请假申请' });
    }
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO leave_requests (user_id, batch_id, reason, leave_time, status, review_comment, reviewed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, batchId, reason, String(body.leaveTime || '').trim(), 'pending', '', '', now]
    );
    appendClassGroupMessage(db, className, `${req.user.name}提交了《${batch.course_name}》的请假申请`);
    createNotification(db, {
      userId: req.user.id,
      type: 'sign',
      title: '请假申请已提交',
      content: `《${batch.course_name}》请假申请已提交，等待老师或管理员处理。`,
      releaseId: `leave-submit-${req.user.id}-${batchId}-${Date.now()}`,
      payload: {
        targetType: 'sign',
        action: 'open-sign-page',
        batchId: String(batchId),
        leaveTime: String(body.leaveTime || '').trim()
      }
    });
    res.json({ success: true, reason, leaveTime: String(body.leaveTime || '').trim() });
  });

  app.get('/api/ai/recommend', (req, res) => {
    const rows = db.all('SELECT * FROM infos ORDER BY is_top DESC, datetime(publish_time) DESC, id DESC LIMIT 4');
    res.json({ recommendations: rows.map((item) => mapInfoForClient(item, req)) });
  });

  app.get('/api/ai/settings', requireAuth, (req, res) => {
    const row = db.get('SELECT ai_settings FROM user_settings WHERE user_id = ?', [req.user.id]);
    const presets = db.all('SELECT * FROM ai_model_presets WHERE is_active = 1 ORDER BY is_default DESC, id ASC');
    const settings = parseUserAiSettings(row && row.ai_settings, db);
    res.json({
      ...settings,
      presets: presets.map(mapPreset)
    });
  });

  app.put('/api/ai/settings', requireAuth, (req, res) => {
    const body = req.body || {};
    const settings = {
      mode: ['preset', 'custom-openai', 'custom-anthropic'].includes(body.mode) ? body.mode : 'preset',
      selectedPresetId: String(body.selectedPresetId || ''),
      customOpenAI: normalizeAiConfig({ ...DEFAULT_USER_AI_SETTINGS.customOpenAI, ...(body.customOpenAI || {}) }),
      customAnthropic: normalizeAiConfig({ ...DEFAULT_USER_AI_SETTINGS.customAnthropic, ...(body.customAnthropic || {}) })
    };
    let error = '';
    if (settings.mode === 'preset') {
      const preset = settings.selectedPresetId
        ? db.get('SELECT id FROM ai_model_presets WHERE id = ? AND is_active = 1', [settings.selectedPresetId])
        : db.get('SELECT id FROM ai_model_presets WHERE is_default = 1 AND is_active = 1 LIMIT 1');
      if (!preset) {
        error = '未找到可用的默认模型配置';
      }
    } else if (settings.mode === 'custom-openai') {
      error = validateAiConfig(settings.customOpenAI);
    } else if (settings.mode === 'custom-anthropic') {
      error = validateAiConfig(settings.customAnthropic);
    }
    if (error) {
      return res.status(400).json({ message: error });
    }
    db.run('UPDATE user_settings SET ai_settings = ?, updated_at = ? WHERE user_id = ?', [
      JSON.stringify(settings),
      new Date().toISOString(),
      req.user.id
    ]);
    res.json({ success: true, settings });
  });

  app.post('/api/ai/validate', requireAuth, async (req, res) => {
    try {
      const result = await validateAiConnection(req.body || {});
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message || 'AI 配置校验失败' });
    }
  });

  app.post('/api/ai/chat', requireAuth, async (req, res) => {
    try {
      const body = req.body || {};
      const row = db.get('SELECT ai_settings FROM user_settings WHERE user_id = ?', [req.user.id]);
      const savedSettings = parseUserAiSettings(row && row.ai_settings, db);
      const config = body.config ? normalizeAiConfig(body.config) : resolveUserAiConfig(savedSettings, db);
      const intent = String(body.intent || 'chat').trim();
      const messages = sanitizeMessages(body.messages || [{ role: 'user', content: body.message || '' }]);
      let finalMessages = messages;
      let relatedInfos = [];

      if (['recommend_activities', 'summarize_notifications', 'extract_info_highlights'].includes(intent)) {
        const context = buildAiIntentContext(db, req.user, intent, infoSelect, activitySelect, req);
        finalMessages = [
          { role: 'system', content: context.systemPrompt },
          { role: 'user', content: context.userPrompt }
        ];
        relatedInfos = context.relatedInfos || [];
      }

      const response = await chatWithAi(config, finalMessages);
      const keyword = String(body.message || (messages[messages.length - 1] && messages[messages.length - 1].content) || '').trim();
      if (!relatedInfos.length && keyword) {
        const matchedInfos = db.all(
          `${infoSelect}
           WHERE i.title LIKE ? OR i.content LIKE ? OR i.summary LIKE ?
           ORDER BY i.is_top DESC, datetime(i.publish_time) DESC, i.id DESC LIMIT 2`,
          [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
        );
        const matchedActivities = db.all(
          `${activitySelect}
           WHERE a.title LIKE ? OR a.content LIKE ? OR a.summary LIKE ?
           ORDER BY a.is_top DESC, datetime(a.publish_time) DESC, a.id DESC LIMIT 2`,
          [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
        );
        relatedInfos = [...matchedInfos.map((item) => mapInfoForClient(item, req)), ...matchedActivities.map((item) => mapActivityForClient(item, req))].slice(0, 4);
      }

      res.json({
        response,
        intent,
        provider: config.provider,
        model: config.model,
        relatedInfos
      });
    } catch (error) {
      res.status(400).json({ message: error.message || 'AI 对话失败' });
    }
  });

  app.post('/api/ai/search', (req, res) => {
    const query = String((req.body || {}).query || '');
    const rows = db.all(`SELECT * FROM infos WHERE title LIKE ? OR content LIKE ? OR summary LIKE ? ORDER BY is_top DESC, datetime(publish_time) DESC, id DESC LIMIT 6`, [`%${query}%`, `%${query}%`, `%${query}%`]);
    res.json({ list: rows.map((item) => mapInfoForClient(item, req)) });
  });

  app.get('/api/ai/history', (_req, res) => res.json({ list: [] }));
};
