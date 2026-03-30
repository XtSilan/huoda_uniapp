# 活达 uni-app 项目

一个面向校园场景的 `uni-app` 应用，当前仓库包含前端小程序代码，支持信息浏览、活动发布、校园跑、签到、AI 助手和个人中心等页面模块。

## 技术栈

- `uni-app`
- `Vue 2`
- 微信小程序平台构建
- `@dcloudio/uni-ui`

## 功能模块

- 登录页
- 首页
- 信息页
- 校园跑
- 班级签到
- 群聊页
- 活动发布与创建
- AI 助手
- 个人中心
- 个人资料、设置、收藏、历史、统计、个性化设置

## 项目结构

```text
unapp/
├─ config/               # 接口与项目配置
├─ pages/                # 页面目录
├─ plugins/              # 插件扩展
├─ services/             # 业务接口封装
├─ static/               # 静态资源
├─ utils/                # 工具函数
├─ App.vue               # 应用根组件
├─ main.js               # 应用入口
├─ manifest.json         # uni-app 配置
├─ pages.json            # 页面与 tabBar 配置
└─ package.json          # 依赖与脚本
```

## 安装依赖

```bash
npm install
```

## 本地运行

启动微信小程序开发模式：

```bash
npm run dev:mp-weixin
```

构建微信小程序：

```bash
npm run build:mp-weixin
```

如果你使用 HBuilderX，也可以直接导入项目后运行到微信开发者工具。

## 接口配置

当前接口基础地址定义在 `config/api.js`：

```js
http://localhost:3000/api
```

如后端地址有变化，请同步修改该文件。

## 说明

- `unpackage/` 为 uni-app 构建产物目录，通常不提交到 Git。
- `node_modules/` 为本地依赖目录，通常不提交到 Git。
- 仓库当前主要是前端代码，若需要联调，请确保本地后端服务已启动。

## License

如有需要可按团队要求补充许可证信息。
