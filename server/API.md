# 活达校园后端 API 文档

## 1. 后端概览

- 技术栈：`Express 4` + `node:sqlite` + `multer` + 可选 `ali-oss`
- 默认启动地址：`http://127.0.0.1:3000`
- 环境变量文件：`server/.env`
- 数据库文件：`server/data/huoda.sqlite`
- 应用更新配置：`server/data/app-update.json`
- 上传目录：`server/uploads`

### 1.1 核心模块

- `server/src/index.js`：服务入口，注册中间件、登录态解析、路由
- `server/src/public-routes.js`：用户端、教师端、公共接口
- `server/src/admin-routes.js`：后台管理接口
- `server/src/db.js`：SQLite 建表与初始化数据
- `server/src/storage-service.js`：本地文件 / OSS 存储、资源代理、下载链接
- `server/src/ai-client.js`：OpenAI / Anthropic 对接
- `server/src/app-update-store.js`：APP 更新配置读写

### 1.2 默认初始化行为

- 如果数据库为空，会自动创建一个管理员账号：
  - `studentId: admin`
  - `password: admin`
- 执行初始化命令：

```bash
cd server
npm install
npm run db:init
npm run dev
```

## 2. 通用约定

### 2.1 鉴权方式

- 登录成功后返回 `token`
- 之后通过请求头传递：

```http
Authorization: Bearer <token>
```

- 当前项目的 token 不是 JWT，而是 `base64("huoda:<userId>")`
- 登录态中间件会把当前用户挂到 `req.user`

### 2.2 权限分级

- `公开`：无需登录
- `登录用户`：需要有效 token，且账号状态不是 `disabled`
- `教师`：`role` 为 `teacher` 或 `admin`
- `管理员`：`role` 为 `admin`

### 2.3 请求与返回格式

- 默认请求体：`application/json`
- 文件上传有两类：
  - `multipart/form-data`：后台附件、媒体库、安装包上传
  - base64 DataURL：头像、班级群二维码、弹窗图片上传
- 成功返回没有统一包裹层，有些接口直接返回对象，有些返回：
  - `{ success: true }`
  - `{ list: [...] }`
  - `{ token, user }`
- 失败返回通常为：

```json
{ "message": "错误信息" }
```

### 2.4 资源访问

- 业务接口里文件地址大多会转换成：
  - `GET /api/assets/object?path=<assetPath>`
- 下载地址通常形如：
  - `GET /api/assets/object/<downloadName>?path=<assetPath>&download=1&name=<fileName>`
- 当启用 OSS 时，部分下载接口会直接返回 OSS 签名链接

## 3. 主要数据模型

### 3.1 User

```json
{
  "id": 1,
  "studentId": "20240001",
  "name": "张三",
  "role": "user",
  "status": "active",
  "school": "XX大学",
  "department": "计算机学院",
  "class": "计科1班",
  "phone": "13800000000",
  "avatarUrl": "/uploads/user/..."
}
```

### 3.2 UserSettings

```json
{
  "grade": "大一",
  "educationType": "本科",
  "interests": ["讲座", "就业"],
  "futurePlan": "就业",
  "notification": {
    "activity": true,
    "lecture": true,
    "partTime": true,
    "sign": true,
    "system": true,
    "version": true,
    "doNotDisturb": false
  },
  "theme": {
    "darkMode": false,
    "autoRefresh": true
  },
  "aiConfig": {}
}
```

### 3.3 Banner

```json
{
  "id": "1",
  "title": "首页轮播",
  "imageUrl": "/uploads/...",
  "linkUrl": "",
  "linkType": "placeholder",
  "sortOrder": 0,
  "isActive": true
}
```

### 3.4 Info

```json
{
  "id": "1",
  "title": "资讯标题",
  "summary": "摘要",
  "content": "正文",
  "source": "后台发布",
  "sourceUrl": "",
  "attachments": [
    {
      "name": "附件.pdf",
      "path": "/uploads/info-attachments/...",
      "url": "http://127.0.0.1:3000/api/assets/object?path=...",
      "downloadUrl": "http://127.0.0.1:3000/api/assets/object/..."
    }
  ],
  "category": "讲座",
  "locationType": "校内",
  "isTop": false,
  "status": "published",
  "publishTime": "2026-04-19T12:00:00.000Z",
  "favoriteCount": 0,
  "viewCount": 0,
  "isCollected": false,
  "recommendationReason": ""
}
```

### 3.5 Activity

```json
{
  "id": "1",
  "title": "活动标题",
  "summary": "活动摘要",
  "content": "活动正文",
  "startTime": "2026-04-20T09:00:00",
  "endTime": "2026-04-20T11:00:00",
  "location": "图书馆",
  "locationType": "校内",
  "organizer": "学生会",
  "images": ["http://127.0.0.1:3000/api/assets/object?path=..."],
  "activityType": "讲座",
  "isTop": false,
  "status": "upcoming",
  "publishTime": "2026-04-19T12:00:00.000Z",
  "applyCount": 10,
  "favoriteCount": 2,
  "isCollected": false,
  "isApplied": false,
  "recommendationReason": ""
}
```

### 3.6 Notification

```json
{
  "id": "1",
  "type": "system",
  "title": "通知标题",
  "content": "通知内容",
  "payload": {},
  "releaseId": "",
  "isRead": false,
  "createdAt": "2026-04-19T12:00:00.000Z",
  "readAt": ""
}
```

### 3.7 SignBatch / SignOverview

- 教师端批次摘要字段：
  - `id`, `className`, `courseName`, `teacher`, `signDate`
  - `startTime`, `endTime`, `lateEndTime`, `time`, `status`
  - `signCount`, `approvedLeaveCount`, `pendingLeaveCount`, `studentCount`, `unsignedCount`
- 学生端今日批次字段：
  - `id`, `className`, `courseName`, `teacher`, `signDate`
  - `startTime`, `endTime`, `lateEndTime`, `time`, `status`
  - `signStatus`, `actionText`, `canSign`
  - `currentSign`
  - `leaveRequest`

### 3.8 公共字段说明

- 用户端接口里的图片、附件字段通常已经转成可访问 URL
- 后台管理接口更多返回“原始存储路径”，用于后台继续编辑

## 4. 公共与认证接口

### 4.1 系统与资源

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/health` | 公开 | 健康检查，返回 `{ ok: true }` |
| GET | `/api/assets/object` | 公开 | 资源代理，查询参数 `path` 必填 |
| GET | `/api/assets/object/:downloadName` | 公开 | 资源下载代理，支持 `path`、`download=1`、`name` |
| GET | `/api/app/version` | 公开 | 查询 APP 更新信息 |

`GET /api/app/version` 查询参数：

- `platform`：`android` / `ios`，默认 `android`
- `versionName`：当前版本号
- `versionCode`：当前版本码

返回字段：

- `hasUpdate`
- `latestVersion`
- `versionCode`
- `updateType`：`none` / `wgt` / `apk` / `store`
- `force`
- `title`
- `description`
- `wgtUrl`
- `apkUrl`
- `marketUrl`
- `packagePath`
- `packageName`
- `packageSize`
- `releaseId`
- `publishedAt`

### 4.2 登录认证

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 公开 | 登录 |
| POST | `/api/auth/refresh` | 登录用户 | 刷新 token |
| POST | `/api/auth/change-password` | 登录用户 | 修改密码 |

`POST /api/auth/login` 请求体：

```json
{
  "studentId": "admin",
  "password": "admin"
}
```

返回：

```json
{
  "token": "base64-token",
  "user": {}
}
```

`POST /api/auth/change-password` 请求体：

```json
{
  "oldPassword": "old",
  "newPassword": "new"
}
```

## 5. 首页、资讯、活动与用户接口

### 5.1 首页与轮播

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/home/overview` | 公开，可带登录态 | 首页总览 |
| GET | `/api/banners` | 公开 | 轮播列表 |

`GET /api/home/overview` 返回：

- `banners: Banner[]`
- `recommendations: Info[]`
- `hotInfos: Info[]`
- `latestActivities: Activity[]`

### 5.2 用户资料

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/user/profile` | 登录用户 | 获取当前用户 |
| PUT | `/api/user/profile` | 登录用户 | 更新当前用户资料 |
| POST | `/api/user/avatar/upload` | 登录用户 | 上传头像 |

`PUT /api/user/profile` 请求体字段：

- `name`
- `school`
- `department`
- `class`
- `phone`
- `avatarUrl`

`POST /api/user/avatar/upload` 请求体：

```json
{
  "fileName": "avatar.png",
  "content": "data:image/png;base64,...."
}
```

返回：

```json
{
  "path": "/uploads/user/...",
  "url": "http://127.0.0.1:3000/api/assets/object?path=..."
}
```

### 5.3 用户设置与通知

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/user/settings` | 登录用户 | 获取个人设置 |
| PUT | `/api/user/settings` | 登录用户 | 更新个人设置 |
| GET | `/api/user/notifications` | 登录用户 | 获取通知列表 |
| POST | `/api/user/notifications/:id/read` | 登录用户 | 标记单条通知已读 |
| POST | `/api/user/notifications/read-all` | 登录用户 | 批量已读 |
| GET | `/api/user/popup-announcement` | 登录用户 | 获取当前待确认弹窗 |
| POST | `/api/user/popup-announcement/:id/ack` | 登录用户 | 确认弹窗 |

`GET /api/user/notifications` 查询参数：

- `type`：`system` / `activity` / `sign` / `version`
- `status`：`all` / `read` / `unread`

返回：

- `list: Notification[]`
- `unreadCount`
- `unreadBadgeCount`
- `preferences`
- `filters`

`PUT /api/user/settings` 支持字段：

- `grade`
- `educationType`
- `interests`
- `futurePlan`
- `notification`
- `theme`
- `aiConfig`

### 5.4 收藏、历史与统计

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/user/collections` | 登录用户 | 我的收藏 |
| POST | `/api/user/collections/toggle` | 登录用户 | 收藏 / 取消收藏 |
| GET | `/api/user/history` | 登录用户 | 浏览历史与已报名活动 |
| POST | `/api/user/history/record` | 登录用户 | 手动记录浏览 |
| GET | `/api/user/stats` | 登录用户 | 用户统计 |

`POST /api/user/collections/toggle` 请求体：

```json
{
  "targetType": "info",
  "targetId": 1
}
```

返回：

```json
{
  "collected": true
}
```

`GET /api/user/history` 返回：

- `browse`
- `activities`

`GET /api/user/stats` 返回：

- `totalViews`
- `totalCollections`
- `activityStats`
- `browseStats`

### 5.5 资讯接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/info/list` | 公开 | 资讯分页列表 |
| GET | `/api/info/search` | 公开 | 综合搜索资讯与活动 |
| GET | `/api/info/detail` | 公开，可带登录态 | 资讯详情 |

`GET /api/info/list` 查询参数：

- `search`
- `category`
- `locationType`
- `page`
- `pageSize`

返回：

- `list: Info[]`
- `total`
- `page`
- `pageSize`

`GET /api/info/search` 查询参数：

- `search` 或 `q`

返回：

- `infos: Info[]`
- `activities: Activity[]`
- `list`：混合结果，额外带 `targetType`
- `total`
- `page`
- `pageSize`

`GET /api/info/detail` 查询参数：

- `id`

返回：`Info`，且 `attachments` 中会补充 `downloadUrl`

### 5.6 活动发布与报名

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/publish/list` | 公开 | 活动列表 |
| GET | `/api/publish/detail` | 公开，可带登录态 | 活动详情 |
| POST | `/api/publish/create` | 登录用户 | 用户创建活动 |
| POST | `/api/publish/apply` | 登录用户 | 报名 / 取消报名 |
| POST | `/api/publish/delete` | 登录用户 | 删除活动 |
| GET | `/api/publish/applications` | 登录用户 | 我报名的活动 |

`POST /api/publish/create` 请求体字段：

- `title`
- `content`
- `startTime`
- `endTime`
- `location`
- `locationType`
- `organizer`
- `images`
- `activityType`
- `status`
- `summary` 可不传，后端默认取正文前 60 字

返回：创建后的 `Activity`

`POST /api/publish/apply` 请求体：

```json
{
  "activityId": 1
}
```

返回：更新后的 `Activity`，并额外带：

- `action: "apply"` 或 `action: "cancel"`

`POST /api/publish/delete` 请求体：

```json
{
  "id": 1
}
```

返回：

```json
{ "success": true }
```

## 6. 班级群、跑步、签到与 AI 接口

### 6.1 班级群

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/class-group/current` | 登录用户 | 获取当前班级群 |
| POST | `/api/class-group/messages` | 登录用户 | 在当前班级群发消息 |

`POST /api/class-group/messages` 请求体：

```json
{
  "text": "大家好"
}
```

返回：完整班级群对象，包含：

- `className`
- `groupName`
- `announcement`
- `qrCode`
- `memberCount`
- `classmates`
- `messages`

### 6.2 跑步

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/run/history` | 登录用户 | 我的跑步记录 |
| POST | `/api/run/start` | 登录用户 | 开始跑步，返回开始时间 |
| POST | `/api/run/end` | 登录用户 | 结束跑步并保存记录 |
| GET | `/api/run/ranking` | 公开 | 跑步排行榜 |

`POST /api/run/end` 请求体：

```json
{
  "distance": 3.5,
  "duration": 1500,
  "calories": 220
}
```

### 6.3 学生签到

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/sign/overview` | 登录用户 | 签到首页 |
| GET | `/api/sign/history` | 登录用户 | 签到历史 |
| GET | `/api/sign/statistics` | 登录用户 | 签到统计 |
| POST | `/api/sign/do` | 登录用户 | 执行签到 / 补签 |
| POST | `/api/sign/leave` | 登录用户 | 提交请假 |

`POST /api/sign/do` 请求体：

```json
{
  "batchId": 1
}
```

返回：

```json
{
  "success": true,
  "status": "success"
}
```

`status` 可能值：

- `success`
- `makeup`

`POST /api/sign/leave` 请求体：

```json
{
  "batchId": 1,
  "reason": "身体不适",
  "leaveTime": "2026-04-19 09:00"
}
```

### 6.4 教师签到

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/sign/teacher/overview` | 教师 | 教师签到总览 |
| POST | `/api/sign/teacher/batches` | 教师 | 新建本班签到批次 |
| POST | `/api/sign/teacher/leave-requests/:id/review` | 教师 | 审核本班请假 |

`POST /api/sign/teacher/batches` 请求体：

- `courseName`
- `signDate`
- `startTime`
- `endTime`
- `lateEndTime`
- `teacher`，可不传，默认当前教师姓名

返回：

- `success`
- `batch`

`POST /api/sign/teacher/leave-requests/:id/review` 请求体：

```json
{
  "status": "approved",
  "reviewComment": "同意"
}
```

### 6.5 AI 助手

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/ai/recommend` | 公开 | AI 推荐资讯 |
| GET | `/api/ai/settings` | 登录用户 | 获取当前 AI 设置与预设模型 |
| PUT | `/api/ai/settings` | 登录用户 | 保存 AI 设置 |
| POST | `/api/ai/validate` | 登录用户 | 校验 AI 配置连通性 |
| POST | `/api/ai/chat` | 登录用户 | AI 对话 |
| POST | `/api/ai/search` | 公开 | AI 搜索资讯 |
| GET | `/api/ai/history` | 公开 | 目前固定返回空数组 |

`GET /api/ai/settings` 返回：

- `mode`：`preset` / `custom-openai` / `custom-anthropic`
- `selectedPresetId`
- `customOpenAI`
- `customAnthropic`
- `presets`

`PUT /api/ai/settings` 请求体示例：

```json
{
  "mode": "preset",
  "selectedPresetId": "1",
  "customOpenAI": {},
  "customAnthropic": {}
}
```

`POST /api/ai/validate` 请求体：直接传 AI 配置对象，例如：

```json
{
  "provider": "openai",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-xxx",
  "model": "gpt-4.1-mini"
}
```

`POST /api/ai/chat` 请求体支持：

- `intent`：默认 `chat`
- `message`
- `messages`
- `config`：可覆盖当前用户已保存的模型配置

特殊 `intent`：

- `recommend_activities`
- `summarize_notifications`
- `extract_info_highlights`

返回：

- `response`
- `intent`
- `provider`
- `model`
- `relatedInfos`

`POST /api/ai/search` 请求体：

```json
{
  "query": "奖学金"
}
```

## 7. 管理后台接口

### 7.1 存储管理

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/admin/storage` | 管理员 | 获取存储配置 |
| PUT | `/api/admin/storage` | 管理员 | 保存存储配置 |
| POST | `/api/admin/storage/validate` | 管理员 | 校验 OSS 配置 |
| GET | `/api/admin/storage/progress` | 管理员 | 获取存储切换任务进度 |
| POST | `/api/admin/storage/switch` | 管理员 | 本地与 OSS 切换 |

`PUT /api/admin/storage` 主要字段：

```json
{
  "oss": {
    "region": "oss-cn-hangzhou",
    "bucket": "bucket-name",
    "accessKeyId": "",
    "accessKeySecret": "",
    "endpoint": "",
    "cname": false,
    "secure": true,
    "authorizationV4": true,
    "objectPrefix": "huoda"
  }
}
```

说明：

- 这个接口主要用于保存 OSS 连接参数
- 真正切换当前存储提供方要调用 `POST /api/admin/storage/switch`

`POST /api/admin/storage/switch` 请求体：

```json
{
  "target": "oss",
  "confirmText": "我同意"
}
```

### 7.2 仪表盘与用户

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/admin/dashboard` | 管理员 | 后台首页统计 |
| GET | `/api/admin/users` | 管理员 | 用户列表 |
| PUT | `/api/admin/users/:id` | 管理员 | 编辑用户 |
| DELETE | `/api/admin/users/:id` | 管理员 | 删除用户 |
| POST | `/api/admin/students` | 管理员 | 新建学生或教师账号 |

`GET /api/admin/users` 查询参数：

- `keyword`
- `role`
- `status`
- `department`

`PUT /api/admin/users/:id` 支持字段：

- `role`：`user` / `teacher` / `admin`
- `status`
- `name`
- `department`
- `className`

`POST /api/admin/students` 请求体：

- `studentId`
- `password`
- `name`
- `role`：仅允许 `user` / `teacher`
- `className`
- `school`
- `department`
- `phone`

### 7.3 Banner 管理

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/admin/banners` | 管理员 | Banner 列表 |
| POST | `/api/admin/banners` | 管理员 | 新建 Banner |
| PUT | `/api/admin/banners/:id` | 管理员 | 编辑 Banner |
| DELETE | `/api/admin/banners/:id` | 管理员 | 删除 Banner |

请求体字段：

- `title`
- `imageUrl`
- `linkUrl`
- `linkType`
- `sortOrder`
- `isActive`

### 7.4 资讯管理

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/admin/infos` | 管理员 | 资讯列表 |
| POST | `/api/admin/infos` | 管理员 | 新建资讯 |
| PUT | `/api/admin/infos/:id` | 管理员 | 编辑资讯 |
| DELETE | `/api/admin/infos/:id` | 管理员 | 删除资讯 |
| POST | `/api/admin/info-attachments/upload` | 管理员 | 上传资讯附件 |

资讯请求体字段：

- `title`
- `summary`
- `content`
- `source`
- `sourceUrl`
- `isTop`
- `category`
- `locationType`
- `status`
- `attachments`

`POST /api/admin/info-attachments/upload`

- 请求类型：`multipart/form-data`
- 字段：`file`
- 文件大小限制：约 `1GB`

返回：

- `name`
- `path`
- `url`
- `mimeType`
- `size`

### 7.5 媒体库

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/admin/media-library` | 管理员 | 媒体库列表 |
| GET | `/api/admin/media-library/direct-url` | 管理员 | 获取直链 |
| POST | `/api/admin/media-library/upload` | 管理员 | 上传媒体文件 |
| POST | `/api/admin/media-library/rename` | 管理员 | 重命名媒体文件 |
| POST | `/api/admin/media-library/delete` | 管理员 | 删除媒体文件 |

`GET /api/admin/media-library` 查询参数：

- `keyword`

`GET /api/admin/media-library/direct-url` 查询参数：

- `path`
- `expires`，默认 `3600`

`POST /api/admin/media-library/upload`

- 请求类型：`multipart/form-data`
- 字段：`file`
- 文件大小限制：约 `1GB`

`POST /api/admin/media-library/rename` 请求体：

```json
{
  "path": "/uploads/media-library/old.png",
  "newName": "new.png"
}
```

`POST /api/admin/media-library/delete` 请求体：

```json
{
  "path": "/uploads/media-library/file.png"
}
```

### 7.6 活动管理

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/admin/activities` | 管理员 | 活动列表 |
| POST | `/api/admin/activities` | 管理员 | 新建活动 |
| PUT | `/api/admin/activities/:id` | 管理员 | 编辑活动 |
| DELETE | `/api/admin/activities/:id` | 管理员 | 删除活动 |

请求体字段：

- `title`
- `summary`
- `content`
- `startTime`
- `endTime`
- `location`
- `locationType`
- `organizer`
- `images`
- `activityType`
- `isTop`
- `status`
- `applyCount`

### 7.7 班级群管理

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/admin/class-groups` | 管理员 | 班级群列表 |
| POST | `/api/admin/class-groups` | 管理员 | 新建班级群 |
| PUT | `/api/admin/class-groups/:id` | 管理员 | 编辑班级群 |
| DELETE | `/api/admin/class-groups/:id` | 管理员 | 删除班级群 |
| GET | `/api/admin/class-groups/:id/students` | 管理员 | 获取班级学生和候选学生 |
| POST | `/api/admin/class-groups/:id/students` | 管理员 | 添加学生到班级群 |
| DELETE | `/api/admin/class-groups/:id/students/:userId` | 管理员 | 把学生移出班级群 |
| POST | `/api/admin/class-groups/upload` | 管理员 | 上传班级群二维码 |

班级群请求体字段：

- `className`
- `groupName`
- `announcement`
- `qrCode`
- `messages`

`POST /api/admin/class-groups/:id/students` 请求体：

```json
{
  "userId": 12
}
```

`POST /api/admin/class-groups/upload` 请求体：

```json
{
  "fileName": "qr.png",
  "content": "data:image/png;base64,...."
}
```

### 7.8 签到批次与请假审核

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/admin/sign-batches` | 管理员 | 全量签到批次 |
| POST | `/api/admin/sign-batches` | 管理员 | 新建签到批次 |
| PUT | `/api/admin/sign-batches/:id` | 管理员 | 编辑签到批次 |
| GET | `/api/admin/leave-requests` | 管理员 | 全量请假申请 |
| POST | `/api/admin/leave-requests/:id/review` | 管理员 | 审核请假 |

`POST /api/admin/sign-batches` 请求体：

- `className`
- `courseName`
- `teacher`
- `signDate`
- `startTime`
- `endTime`
- `lateEndTime`
- `status`

`POST /api/admin/leave-requests/:id/review` 请求体：

```json
{
  "status": "approved",
  "reviewComment": "已同意"
}
```

### 7.9 版本更新与弹窗公告

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/admin/app-updates` | 管理员 | 获取 Android / iOS 更新配置 |
| POST | `/api/admin/app-updates/upload` | 管理员 | 上传 `.wgt` 或 `.apk` |
| PUT | `/api/admin/app-updates/:platform` | 管理员 | 保存平台更新配置 |
| GET | `/api/admin/popup-announcement` | 管理员 | 获取当前弹窗公告 |
| POST | `/api/admin/popup-announcement/upload` | 管理员 | 上传弹窗图片 |
| PUT | `/api/admin/popup-announcement` | 管理员 | 保存弹窗公告 |
| POST | `/api/admin/popup-announcement/deactivate` | 管理员 | 停用弹窗公告 |

`POST /api/admin/app-updates/upload`

- 请求类型：`multipart/form-data`
- 字段：`file`
- 可选字段：`updateType`
- 文件大小限制：约 `300MB`
- 支持格式：`.wgt`、`.apk`

返回字段：

- `updateType`
- `packageName`
- `packageSize`
- `packagePath`
- `packageUrl`
- `releaseId`
- `latestVersion`，仅 WGT
- `versionCode`，仅 WGT
- `extractedDir`，仅 WGT
- `manifestPath`，仅 WGT

`PUT /api/admin/app-updates/:platform`

- `:platform` 为 `android` 或 `ios`
- 请求体核心字段：
  - `latestVersion`
  - `versionCode`
  - `updateType`
  - `force`
  - `title`
  - `description`
  - `wgtUrl`
  - `apkUrl`
  - `packagePath`
  - `packageName`
  - `packageSize`
  - `releaseId`
  - `extractedDir`
  - `manifestPath`
  - `marketUrl`

`updateType` 可选值：

- `none`
- `wgt`
- `apk`
- `store`

`PUT /api/admin/popup-announcement` 请求体：

- `title`
- `content`
- `imageUrl`
- `buttonText`
- `isActive`

### 7.10 通知、报表、AI 模型

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/admin/notifications` | 管理员 | 通知列表 |
| POST | `/api/admin/notifications` | 管理员 | 批量发通知 |
| GET | `/api/admin/reports` | 管理员 | 报表统计 |
| GET | `/api/admin/ai-models` | 管理员 | AI 预设模型列表 |
| POST | `/api/admin/ai-models` | 管理员 | 新建 AI 预设模型 |
| PUT | `/api/admin/ai-models/:id` | 管理员 | 编辑 AI 预设模型 |
| DELETE | `/api/admin/ai-models/:id` | 管理员 | 删除 AI 预设模型 |

`POST /api/admin/notifications` 请求体：

- `type`：`system` / `activity` / `sign` / `version`
- `title`
- `content`
- `targetScope`：`all` / `specific`
- `releaseId`
- `targetType`
- `targetId`
- `userIds`，当 `targetScope=specific` 时必填

`GET /api/admin/reports` 返回：

- `usersByRole`
- `infosByCategory`
- `activitiesByType`
- `runTrend`

AI 模型请求体字段：

- `name`
- `provider`：`openai` / `anthropic`
- `baseUrl`
- `apiKey`
- `model`
- `temperature`
- `topP`
- `maxTokens`
- `presencePenalty`
- `frequencyPenalty`
- `systemPrompt`
- `isDefault`
- `isActive`

## 8. 主要数据表

后端当前主要表如下：

- `users`
- `user_settings`
- `banners`
- `infos`
- `activities`
- `activity_applications`
- `favorites`
- `browse_history`
- `runs`
- `sign_records`
- `sign_batches`
- `leave_requests`
- `class_groups`
- `ai_model_presets`
- `notifications`
- `popup_announcements`
- `popup_announcement_reads`
- `storage_settings`

## 9. 实现备注与风险

这部分不是接口定义，但在联调和后续改造时需要注意：

- 密码当前明文保存在 `users.password`，没有做哈希
- token 只是可逆的 base64 字符串，不是带签名的 JWT
- 错误返回没有统一错误码体系，主要依赖 `message`
- 文件访问同时支持本地与 OSS，两者切换时会改写数据库中的资源路径
- 一些业务写接口校验较宽松，例如 `POST /api/publish/delete` 只要求登录，不校验创建者身份

## 10. 联调示例

### 10.1 登录

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"studentId\":\"admin\",\"password\":\"admin\"}"
```

### 10.2 带 token 获取个人资料

```bash
curl http://127.0.0.1:3000/api/user/profile \
  -H "Authorization: Bearer <token>"
```

### 10.3 获取资讯列表

```bash
curl "http://127.0.0.1:3000/api/info/list?page=1&pageSize=10"
```
