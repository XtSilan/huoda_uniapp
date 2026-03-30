# 活达校园平台

这个仓库现在包含三部分：

- `uni-app` 前台用户端
- `server/` 下的 Express + SQLite 后端
- `vue2-iview2-admin/` 后台管理端

当前项目已经接通统一账号体系。前台用户和后台管理员共用同一套账号表，管理员可从统一登录入口登录后直接跳转到后台。

## 目录结构

```text
huoda_uniapp/
├─ config/                     前台接口与跳转地址配置
├─ pages/                      uni-app 页面
├─ plugins/                    前台插件
├─ services/                   前台接口封装
├─ utils/                      前台请求工具
├─ server/
│  ├─ src/                     后端源码
│  └─ data/                    SQLite 数据库文件目录
├─ vue2-iview2-admin/
│  ├─ src/                     后台源码
│  └─ config/                  后台环境配置
├─ App.vue
├─ main.js
├─ pages.json
└─ package.json
```

## 功能概览

已接通的主要能力：

- 统一登录，用户与管理员共用账号
- 角色权限控制
- 前台首页真实数据流
- 首页轮播图读取与后台轮播图管理
- 资讯列表、详情、搜索、收藏
- 活动发布、活动列表、详情、报名
- 我的资料、个性化设置、收藏、历史、统计、设置
- 校园乐跑记录与排行榜
- 班级签到记录与统计
- 后台用户管理
- 后台轮播图管理
- 后台资讯管理
- 后台活动管理
- 后台数据报表

## 启动方式

### 1. 安装前台依赖

```bash
npm install
```

### 2. 安装后端依赖

```bash
cd server
npm install
cd ..
```

### 3. 安装后台依赖

```bash
cd vue2-iview2-admin
npm install
cd ..
```

### 4. 初始化数据库

```bash
npm run server:init-db
```

初始化后会生成数据库文件：

```text
server/data/huoda.sqlite
```

### 5. 启动后端

```bash
npm run server
```

默认接口地址：

```text
http://localhost:3000/api
```

### 6. 启动 uni-app 前台

```bash
npm run dev:mp-weixin
```

如果你在 HBuilderX 或 uni-app H5 环境里调试，前台 H5 常见地址通常是：

```text
http://localhost:8080
```

### 7. 启动后台管理端

```bash
cd vue2-iview2-admin
npm run dev
```

后台默认地址：

```text
http://localhost:8081/#/login
```

## 默认测试账号

普通用户：

```text
账号：20240001
密码：123456
```

管理员：

```text
账号：admin001
密码：admin123
```

## 统一登录说明

- 前台登录页在 `pages/login/login.vue`
- 登录成功后，如果是普通用户，进入前台首页
- 登录成功后，如果是管理员，在 H5 环境下会直接带登录态跳转到后台
- 管理员也可以从“我的”页进入后台
- 后台支持接收前台传入的登录态，免二次登录

注意：

- 当前“统一登录”是“统一账号 + 登录后按角色分流”
- 前台和后台仍然是两个前端工程，不是物理上合并成一个 Vue 工程

## 地址配置

### 前台配置

文件：

[`config/api.js`](/abs/path/c:/Users/28902/Desktop/活达/huoda_uniapp/config/api.js)

关键配置项：

- `SERVER_ORIGIN`：后端服务地址
- `BASE_URL`：前台 API 基地址
- `ADMIN_ORIGIN`：后台地址
- `ADMIN_LOGIN_URL`：管理员跳转登录地址

### 后台配置

文件：

- [`vue2-iview2-admin/src/config/runtime.js`](/abs/path/c:/Users/28902/Desktop/活达/huoda_uniapp/vue2-iview2-admin/src/config/runtime.js)
- [`vue2-iview2-admin/config/dev.env.js`](/abs/path/c:/Users/28902/Desktop/活达/huoda_uniapp/vue2-iview2-admin/config/dev.env.js)
- [`vue2-iview2-admin/config/prod.env.js`](/abs/path/c:/Users/28902/Desktop/活达/huoda_uniapp/vue2-iview2-admin/config/prod.env.js)

关键配置项：

- `API_BASE_URL`：后台调用的后端 API 地址
- `USER_APP_URL`：后台“返回用户端”的默认地址

如果你要切到局域网 IP 或正式域名，优先修改这些配置文件，不要直接到页面中搜索替换地址。

## 数据库说明

当前项目使用 SQLite，本地数据库文件位于：

```text
server/data/huoda.sqlite
```

你可以使用以下工具打开：

- DBeaver
- DB Browser for SQLite
- DataGrip
- VS Code SQLite 插件

连接参数：

- 数据库类型：`SQLite`
- 数据库文件：`server/data/huoda.sqlite`

不需要额外填写 `host`、`port`、用户名或密码。

### 主要表

- `users`：用户表
- `user_settings`：用户个性化设置
- `banners`：首页轮播图
- `infos`：资讯内容
- `activities`：活动内容
- `activity_applications`：活动报名
- `favorites`：收藏
- `browse_history`：浏览历史
- `runs`：乐跑记录
- `sign_records`：签到记录

## 重要说明

- 如果你之前生成过旧库，建议先删除 `server/data/huoda.sqlite` 后再执行 `npm run server:init-db`
- 前台和后台都依赖 `http://localhost:3000/api`
- 后台默认使用 `8081`，避免与前台 H5 常见的 `8080` 冲突
- 后端当前使用的是轻量 token 方案，不是标准 JWT

## 后续可继续扩展

- 把 SQLite 切换为 MySQL
- 给轮播图、活动、资讯增加图片上传
- 完善意见反馈、邮箱绑定、手机号绑定
- 增加更完整的后台权限粒度
- 增加部署脚本与生产环境配置
