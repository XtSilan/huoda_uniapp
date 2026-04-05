# 活达校园平台

当前仓库的结构：

- `huoda_uniapp/`：`uni-app` 用户端
- `server/`：`Express + SQLite` 服务端
- `vue2-iview2-admin/`：`Vue2` 管理后台

用户端、服务端、管理后台共用同一套业务数据与账号体系，其中管理员可从用户端登录后直接跳转到后台。

## 目录结构

```text
repo-root/
├─ huoda_uniapp/               用户端项目
│  ├─ components/
│  ├─ config/
│  ├─ custom-tab-bar/
│  ├─ pages/
│  ├─ plugins/
│  ├─ services/
│  ├─ static/
│  ├─ utils/
│  ├─ .env
│  ├─ App.vue
│  ├─ main.js
│  ├─ manifest.json
│  ├─ package.json
│  └─ pages.json
├─ server/                     服务端项目
│  ├─ src/
│  ├─ data/
│  └─ uploads/
├─ vue2-iview2-admin/          管理后台项目
│  ├─ src/
│  ├─ config/
│  └─ package.json
├─ .gitignore
└─ README.md
```

## 技术栈

### 用户端

- `uni-app`
- `Vue 2`
- `@dcloudio/uni-ui`

### 服务端

- `Express`
- `node:sqlite`
- `multer`
- `cors`

### 管理后台

- `Vue 2`
- `iView`
- `Webpack 2`
- `Axios`
- `ECharts`

## 功能概览

### 用户端

- 登录、记住密码、统一会话
- 首页资讯流、轮播图、弹窗公告
- 资讯列表、详情、搜索、收藏、评论
- 活动发布、活动详情、报名与记录
- 乐跑记录、排行榜、目标查看
- 班级签到、补签、请假、统计
- 班级群消息展示
- 个人资料、通知、历史、收藏、统计、个性化设置
- AI 对话、搜索、推荐、配置
- 管理员跳转后台

### 管理后台

- 仪表盘统计
- 用户管理
- 轮播图管理
- 资讯管理
- 活动管理
- 班级群与二维码管理
- 签到批次与请假审批
- 通知发布
- AI 模型预设管理
- App 更新包上传与配置
- 首页弹窗公告管理
- 数据报表

### 服务端

- 用户端与后台统一 API
- 认证与角色权限控制
- SQLite 数据初始化与种子数据
- 上传文件管理
- 通知、收藏、浏览历史、活动报名、签到等业务存储

## 运行环境

- Node.js `>= 22`
- npm `>= 10`

说明：

- 服务端依赖 `node:sqlite`
- SQLite 数据库文件位于 `server/data/huoda.sqlite`

## 安装依赖

### 用户端

```bash
cd huoda_uniapp
npm install
```

### 服务端

```bash
cd server
npm install
```

服务端使用 `dotenv` 依赖。

### 管理后台

```bash
cd vue2-iview2-admin
npm install
```

## 快速启动

### 1. 初始化数据库

```bash
cd server
npm run db:init
```

初始化完成后会生成：

```text
server/data/huoda.sqlite
```

### 2. 启动服务端

```bash
cd server
npm run dev
```

默认地址：

```text
http://127.0.0.1:3000
http://127.0.0.1:3000/api
```

### 3. 启动用户端

H5 调试：

```bash
cd huoda_uniapp
npm run dev:h5
```

微信小程序调试：

```bash
cd huoda_uniapp
npm run dev:mp-weixin
```

### 4. 启动管理后台

```bash
cd vue2-iview2-admin
npm run dev
```

默认地址：

```text
http://127.0.0.1:8081/#/login
```

## 常用命令

### 用户端

```bash
cd huoda_uniapp
npm run dev:h5
npm run build:h5
npm run dev:mp-weixin
npm run build:mp-weixin
npm run server
npm run server:init-db
```

说明：

- `npm run server` 和 `npm run server:init-db` 会转调根目录下的 `server/`

### 服务端

```bash
cd server
npm run dev
npm run db:init
```

### 管理后台

```bash
cd vue2-iview2-admin
npm run dev
npm run build
```

## 默认账号

数据库初始化后会自动创建管理员账号：

```text
账号：admin
密码：admin
```

## 环境变量

各级目录下的 `.env` 文件

### 用户端环境变量

位置：

- `huoda_uniapp/.env`

当前变量：

```env
VUE_APP_SERVER_ORIGIN=http://127.0.0.1:3000
VUE_APP_BASE_URL=http://127.0.0.1:3000/api
VUE_APP_ADMIN_ORIGIN=http://127.0.0.1:8081
VUE_APP_ADMIN_LOGIN_URL=http://127.0.0.1:8081/#/login
```

读取位置：

- `huoda_uniapp/config/api.js`


### 管理后台环境变量

位置：

- `vue2-iview2-admin/.env`

当前变量：

```env
API_BASE_URL=http://127.0.0.1:3000/api
USER_APP_URL=http://127.0.0.1:8080/#/pages/user/user
```

读取位置：

- `vue2-iview2-admin/config/load-env.js`
- `vue2-iview2-admin/config/dev.env.js`
- `vue2-iview2-admin/config/prod.env.js`
- `vue2-iview2-admin/src/config/runtime.js`

### 服务端相关变量

- `server/.env`

当前示例变量：

```env
PORT=3000
PUBLIC_HOST=127.0.0.1
```

说明：

- `PORT`：服务启动端口，默认 `3000`
- `PUBLIC_HOST`：服务日志展示主机名，默认 `127.0.0.1`
- `HOST`：管理后台开发服务显示地址使用的主机名，默认 `127.0.0.1`

### Linux 下复制与修改示例

如果你在 Linux 服务器上部署或调试，可以直接用下面这些命令处理环境变量文件。

使用编辑器手动修改：

```bash
nano server/.env
nano huoda_uniapp/.env
nano vue2-iview2-admin/.env
```


使用 `sed` 直接替换变量值：

```bash
sed -i 's#^PORT=.*#PORT=3001#' server/.env
sed -i 's#^PUBLIC_HOST=.*#PUBLIC_HOST=0.0.0.0#' server/.env
sed -i 's#^VUE_APP_BASE_URL=.*#VUE_APP_BASE_URL=https://api.example.com/api#' huoda_uniapp/.env
sed -i 's#^API_BASE_URL=.*#API_BASE_URL=https://api.example.com/api#' vue2-iview2-admin/.env
```

查看修改结果：

```bash
cat server/.env
cat huoda_uniapp/.env
cat vue2-iview2-admin/.env
```


## 登录与角色说明

- 用户端登录页位于 `huoda_uniapp/pages/login/login.vue`
- 普通用户登录后进入用户端首页
- `admin` 角色在 H5 环境下会带登录态跳转到后台
- 后台支持接收来自用户端的 `token`、用户信息和返回地址
- 后台退出登录后可返回用户端

当前角色分为：

- `user`：普通用户
- `teacher`：教师
- `admin`：管理员

## 主要 API 模块

用户端 API 配置位于 `huoda_uniapp/config/api.js`，按模块划分为：

- `auth`：登录、刷新 token
- `user`：资料、头像、通知、首页弹窗
- `app`：版本更新
- `classGroup`：班级群信息与消息
- `info`：资讯列表、详情、搜索、收藏、评论
- `run`：乐跑开始、结束、历史、排行、目标
- `sign`：签到概览、签到、请假、教师签到管理
- `publish`：活动发布、详情、列表、报名
- `ai`：AI 设置、校验、聊天、搜索、推荐、历史

## 数据存储

数据库文件：

```text
server/data/huoda.sqlite
```

主要数据表：

- `users`
- `user_settings`
- `banners`
- `infos`
- `activities`
- `activity_applications`
- `favorites`
- `browse_history`
- `runs`
- `sign_batches`
- `sign_records`
- `leave_requests`
- `class_groups`
- `notifications`
- `ai_model_presets`
- `popup_announcements`

## 关键目录说明

### 用户端

- `huoda_uniapp/pages/index`：首页
- `huoda_uniapp/pages/info`：资讯页
- `huoda_uniapp/pages/feature/run`：乐跑模块
- `huoda_uniapp/pages/feature/sign`：签到模块
- `huoda_uniapp/pages/feature/publish`：活动模块
- `huoda_uniapp/pages/feature/ai`：AI 模块
- `huoda_uniapp/pages/user`：个人中心与设置

### 服务端

- `server/src/index.js`：服务入口
- `server/src/db.js`：数据库初始化与种子数据
- `server/src/public-routes.js`：用户端 API
- `server/src/admin-routes.js`：后台 API

### 管理后台

- `vue2-iview2-admin/src/pages/Home.vue`：后台主布局
- `vue2-iview2-admin/src/config/runtime.js`：后台运行时地址配置

## 注意事项

- 执行数据库初始化会重建数据库
- 数据库重建后默认管理员账号恢复为 `admin / admin`
- 用户端与管理后台是两个独立前端工程，共享同一个服务端
- WGT 解压目录现在跟随新的用户端目录结构，写入 `huoda_uniapp/unpackage/release/apk/`

## OSS 对象存储补充说明

当前版本已经支持阿里云 OSS，并在管理后台新增“对象存储配置”页面，支持：

- 保存 OSS 配置
- 测试 OSS 连通性
- 一键从本地转入 OSS
- 一键从 OSS 切回本地
- 二次确认后执行真实同步

说明：

- OSS 配置不通过 `.env` 维护，而是保存在数据库表 `storage_settings`
- 服务端已新增 `ali-oss` 依赖，部署后请在 `server/` 目录重新执行一次 `npm install`
- 用户端和后台访问资源时统一通过后端代理接口 `/api/assets/object?path=...`

### 需要准备的 OSS 配置项

在后台“对象存储配置”页中需要填写这些字段：

- `Region`
- `Bucket`
- `AccessKeyId`
- `AccessKeySecret`
- `Endpoint`：可选，留空时使用 SDK 默认地域 endpoint
- `CNAME`：如果 `Endpoint` 使用的是自定义域名，需要勾选
- `objectPrefix`：对象前缀，可选，建议使用 `huoda`
- `secure`：是否启用 HTTPS
- `authorizationV4`：是否启用 V4 签名

建议使用专用 RAM 用户，并至少授予以下 OSS 权限：

- `oss:PutObject`
- `oss:GetObject`
- `oss:DeleteObject`
- `oss:ListObjects`

### 存储切换规则

本地模式：

- 数据库资源路径保存为 `/uploads/...`
- 文件实际存放在 `server/uploads/`

OSS 模式：

- 数据库资源路径保存为 `oss://uploads/...`
- 文件上传后会自动同步到 OSS

切换逻辑：

- 转入 OSS：把 `server/uploads/` 下已有资源上传到 OSS，然后批量把数据库路径改成 `oss://...`
- 切回本地：从 OSS 下载资源到 `server/uploads/`，然后批量把数据库路径改回 `/uploads/...`
- 历史手工填写的第三方 `http/https` 资源地址不会被强制改写

当前跟随切换的资源范围：

- 用户头像
- 资讯附件
- 班级群二维码
- 弹窗公告图片
- App 更新包

### 推荐接入步骤

1. 在阿里云创建 OSS Bucket
2. 创建专用 RAM 用户并授权
3. 部署最新代码后进入 `server/` 执行 `npm install`
4. 启动服务端和管理后台
5. 进入后台“对象存储配置”
6. 填写 OSS 参数并先点击“测试 OSS”
7. 测试通过后点击“一键转入 OSS”
8. 检查头像、附件、二维码、弹窗图片、更新包下载是否正常
9. 如需回退，点击“切回本地”

### 新增相关文件

- `server/src/storage-service.js`
- `server/src/admin-routes.js`
- `server/src/public-routes.js`
- `server/src/db.js`
- `vue2-iview2-admin/src/pages/nav2/StorageSettings.vue`
- `vue2-iview2-admin/src/common/asset.js`
- `huoda_uniapp/utils/assets.js`
