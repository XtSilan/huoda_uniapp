# Huoda Campus Platform

> 一个校园场景的一体化平台仓库：`uni-app` 用户端 + Node.js 服务端 + Vue2 管理后台。  
> 用户端 `huoda_uniapp` 需要在 **HBuilderX** 中编译运行。

[![Node](https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=node.js&logoColor=white)](#环境要求)
[![uni-app](https://img.shields.io/badge/uni--app-Vue2-2ECC71)](#项目结构)
[![HBuilderX](https://img.shields.io/badge/IDE-HBuilderX-2F80ED)](#快速开始)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](#license)

## 目录

- [项目结构](#项目结构)
- [效果预览](#效果预览)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [常用命令](#常用命令)
- [常见问题](#常见问题)
- [License](#license)

## 项目结构

```text
repo-root/
├─ huoda_uniapp/      # 用户端（uni-app，需用 HBuilderX 编译）
├─ server/            # 服务端（Express）
├─ vue2-iview2-admin/ # 管理后台（Vue2 + iView）
└─ README.md
```

## 效果预览

### 用户端（huoda_uniapp）

![用户端-首页=](user_index.png)

### 管理后台（vue2-iview2-admin）

![后台-仪表盘](admin_index.png)

## 技术栈

- 用户端：`uni-app` + `Vue2`
- 服务端：`Node.js` + `Express`
- 管理后台：`Vue2` + `iView` + `Axios`
- 数据库：`SQLite`（本地开发）

## 环境要求

- Node.js `>= 22`（推荐）
- npm `>= 10`（推荐）
- HBuilderX（最新版）

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/XtSilan/huoda_uniapp.git
cd huoda_uniapp
```

### 2. 运行用户端（huoda_uniapp，使用 HBuilderX）

1. 在 HBuilderX 中选择 `文件 -> 打开目录`。
2. 选择 `huoda_uniapp` 目录（不是仓库根目录）。
3. 首次运行前安装依赖：

```bash
cd huoda_uniapp
npm install
```

4. 在 HBuilderX 菜单中点击 `运行`，可选择：
- 运行到浏览器（H5）
- 运行到微信开发者工具（小程序）

### 3. 运行服务端（server）

```bash
cd server
npm install
npm run db:init
npm run dev
```

默认地址：`http://127.0.0.1:3000`

### 4. 运行管理后台（vue2-iview2-admin）

```bash
cd vue2-iview2-admin
npm install
npm run dev
```

默认地址通常为：`http://127.0.0.1:8081/#/login`

## 环境变量

### 用户端 `huoda_uniapp/.env`

```env
VUE_APP_SERVER_ORIGIN=http://127.0.0.1:3000
VUE_APP_BASE_URL=http://127.0.0.1:3000/api
VUE_APP_ADMIN_ORIGIN=http://127.0.0.1:8081
VUE_APP_ADMIN_LOGIN_URL=http://127.0.0.1:8081/#/login
```

### 管理后台 `vue2-iview2-admin/.env`

```env
API_BASE_URL=http://127.0.0.1:3000/api
USER_APP_URL=http://127.0.0.1:8080/#/pages/user/user
```

## 常用命令

### huoda_uniapp

```bash
该命令不可用，前往HbuilderX编译运行
```

### server

```bash
npm run db:init
npm run dev
```

### vue2-iview2-admin

```bash
npm run dev
npm run build
```

## 常见问题

### 1. HBuilderX 无法正常运行用户端

- 确认打开目录是 `huoda_uniapp`。
- 在 `huoda_uniapp` 下先执行 `npm install`。
- 检查本机 Node.js 版本。

### 2. 页面打开了但接口报错

- 确认 `server` 已运行在 `http://127.0.0.1:3000`。
- 检查 `huoda_uniapp/.env` 的 `VUE_APP_BASE_URL`。
- 检查后台 `.env` 的 `API_BASE_URL` 是否与服务端一致。

## License

MIT
