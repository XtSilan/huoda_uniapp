# 活达 uni-app 项目

这个仓库现在包含两部分：

- `uni-app` 前端
- `server/` 下的本地后端服务与 SQLite 数据库

## 目录结构

```text
huoda_uniapp/
├─ config/                # 前端接口配置
├─ pages/                 # uni-app 页面
├─ plugins/               # Vue 插件
├─ services/              # 前端业务接口封装
├─ utils/                 # 前端请求工具
├─ server/
│  ├─ src/                # Express + SQLite 后端
│  └─ data/               # 自动生成的数据库文件目录
├─ App.vue
├─ main.js
├─ pages.json
└─ package.json
```

## 启动方式

### 1. 安装前端依赖

```bash
npm install
```

### 2. 安装后端依赖

```bash
cd server
npm install
```

### 3. 初始化数据库

```bash
cd ..
npm run server:init-db
```

初始化后会生成数据库文件：

```text
server/data/huoda.sqlite
```

### 4. 启动后端

```bash
npm run server
```

默认地址：

```text
http://localhost:3000/api
```

### 5. 启动 uni-app 前端

```bash
npm run dev:mp-weixin
```

## 默认测试账号

```text
学号: 20240001
密码: 123456
```

## 数据库怎么连接

当前项目使用的是 SQLite，本地直接连接数据库文件即可：

```text
server/data/huoda.sqlite
```

你可以用下面这些工具打开：

- DBeaver
- DB Browser for SQLite
- DataGrip
- VS Code SQLite 插件

### 连接参数

- 数据库类型：`SQLite`
- 数据库文件：`server/data/huoda.sqlite`

不需要 host、port、用户名、密码。

## 主要表

- `users` 用户表
- `infos` 资讯表
- `activities` 活动表
- `activity_applications` 活动报名表
- `runs` 乐跑记录表
- `sign_records` 签到记录表

## 已接通的前后端功能

- 登录
- 用户资料读取与保存
- 首页资讯/推荐/活动
- 资讯列表与详情
- AI 问答
- 活动发布、列表、详情、报名、删除
- 乐跑历史、保存、排行榜
- 签到历史、统计、签到、请假

## 如果你要换成 MySQL

目前这套接口层已经固定好了，后面只需要把 `server/src/db.js` 从 SQLite 改成 MySQL 驱动和 SQL 即可，前端不用改接口调用方式。
