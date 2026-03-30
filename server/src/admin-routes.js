const {
  requireAdmin,
  mapUser,
  mapBanner,
  mapInfo,
  mapActivity
} = require('./shared');

module.exports = function registerAdminRoutes(app, db) {
  app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
    res.json({
      cards: {
        userCount: db.get('SELECT COUNT(*) AS count FROM users').count,
        infoCount: db.get('SELECT COUNT(*) AS count FROM infos').count,
        activityCount: db.get('SELECT COUNT(*) AS count FROM activities').count,
        bannerCount: db.get('SELECT COUNT(*) AS count FROM banners').count
      },
      latestUsers: db.all('SELECT * FROM users ORDER BY datetime(created_at) DESC LIMIT 5').map(mapUser),
      latestInfos: db.all('SELECT * FROM infos ORDER BY datetime(created_at) DESC LIMIT 5').map(mapInfo),
      latestActivities: db.all('SELECT * FROM activities ORDER BY datetime(created_at) DESC LIMIT 5').map(mapActivity)
    });
  });

  app.get('/api/admin/users', requireAdmin, (_req, res) => {
    const rows = db.all(
      `SELECT u.*, us.interests, us.future_plan
      FROM users u
      LEFT JOIN user_settings us ON us.user_id = u.id
      ORDER BY u.id ASC`
    );
    res.json({
      list: rows.map((row) => ({
        ...mapUser(row),
        interests: JSON.parse(row.interests || '[]'),
        futurePlan: row.future_plan || '',
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at
      }))
    });
  });

  app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
    const current = db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const body = req.body || {};
    db.run(
      `UPDATE users SET role = ?, status = ?, name = ?, department = ?, class_name = ?, updated_at = ? WHERE id = ?`,
      [
        body.role || current.role,
        body.status || current.status,
        body.name || current.name,
        body.department || current.department,
        body.className || current.class_name,
        new Date().toISOString(),
        req.params.id
      ]
    );
    res.json({ success: true });
  });

  app.get('/api/admin/banners', requireAdmin, (_req, res) => {
    const rows = db.all('SELECT * FROM banners ORDER BY sort_order ASC, id ASC');
    res.json({ list: rows.map(mapBanner) });
  });

  app.post('/api/admin/banners', requireAdmin, (req, res) => {
    const body = req.body || {};
    db.run(
      `INSERT INTO banners (title, image_url, link_url, link_type, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [body.title, body.imageUrl, body.linkUrl || '', body.linkType || 'placeholder', body.sortOrder || 0, body.isActive ? 1 : 0, new Date().toISOString(), new Date().toISOString()]
    );
    res.json({ success: true });
  });

  app.put('/api/admin/banners/:id', requireAdmin, (req, res) => {
    const body = req.body || {};
    db.run(
      `UPDATE banners SET title = ?, image_url = ?, link_url = ?, link_type = ?, sort_order = ?, is_active = ?, updated_at = ? WHERE id = ?`,
      [body.title, body.imageUrl, body.linkUrl || '', body.linkType || 'placeholder', body.sortOrder || 0, body.isActive ? 1 : 0, new Date().toISOString(), req.params.id]
    );
    res.json({ success: true });
  });

  app.delete('/api/admin/banners/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM banners WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  app.get('/api/admin/infos', requireAdmin, (_req, res) => {
    const rows = db.all('SELECT * FROM infos ORDER BY datetime(created_at) DESC');
    res.json({ list: rows.map(mapInfo) });
  });

  app.post('/api/admin/infos', requireAdmin, (req, res) => {
    const body = req.body || {};
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO infos (title, summary, content, source, category, location_type, status, publish_time, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [body.title, body.summary || '', body.content, body.source || '后台发布', body.category || '资讯', body.locationType || '校内', body.status || 'published', now, now, now]
    );
    res.json({ success: true });
  });

  app.put('/api/admin/infos/:id', requireAdmin, (req, res) => {
    const body = req.body || {};
    db.run(
      `UPDATE infos SET title = ?, summary = ?, content = ?, source = ?, category = ?, location_type = ?, status = ?, updated_at = ? WHERE id = ?`,
      [body.title, body.summary || '', body.content, body.source || '后台发布', body.category || '资讯', body.locationType || '校内', body.status || 'published', new Date().toISOString(), req.params.id]
    );
    res.json({ success: true });
  });

  app.delete('/api/admin/infos/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM infos WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  app.get('/api/admin/activities', requireAdmin, (_req, res) => {
    const rows = db.all('SELECT * FROM activities ORDER BY datetime(created_at) DESC');
    res.json({ list: rows.map(mapActivity) });
  });

  app.post('/api/admin/activities', requireAdmin, (req, res) => {
    const body = req.body || {};
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO activities
      (title, summary, content, start_time, end_time, location, location_type, organizer, images, activity_type, status, publish_time, creator_user_id, apply_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [body.title, body.summary || '', body.content, body.startTime, body.endTime, body.location, body.locationType || '校内', body.organizer || '后台发布', JSON.stringify(body.images || []), body.activityType || '其他', body.status || 'upcoming', now, req.user.id, body.applyCount || 0, now, now]
    );
    res.json({ success: true });
  });

  app.put('/api/admin/activities/:id', requireAdmin, (req, res) => {
    const body = req.body || {};
    db.run(
      `UPDATE activities SET
      title = ?, summary = ?, content = ?, start_time = ?, end_time = ?, location = ?, location_type = ?, organizer = ?, images = ?, activity_type = ?, status = ?, apply_count = ?, updated_at = ?
      WHERE id = ?`,
      [body.title, body.summary || '', body.content, body.startTime, body.endTime, body.location, body.locationType || '校内', body.organizer || '后台发布', JSON.stringify(body.images || []), body.activityType || '其他', body.status || 'upcoming', body.applyCount || 0, new Date().toISOString(), req.params.id]
    );
    res.json({ success: true });
  });

  app.delete('/api/admin/activities/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM activities WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  });

  app.get('/api/admin/reports', requireAdmin, (_req, res) => {
    res.json({
      usersByRole: db.all('SELECT role AS name, COUNT(*) AS value FROM users GROUP BY role'),
      infosByCategory: db.all('SELECT category AS name, COUNT(*) AS value FROM infos GROUP BY category'),
      activitiesByType: db.all('SELECT activity_type AS name, COUNT(*) AS value FROM activities GROUP BY activity_type'),
      runTrend: db.all(`SELECT substr(date, 1, 10) AS name, ROUND(SUM(distance), 2) AS value FROM runs GROUP BY substr(date, 1, 10) ORDER BY name DESC LIMIT 7`).reverse()
    });
  });
};
