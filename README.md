<p align="center">
  <img width="200" src="./miniprogram/images/our-memory-logo-placeholder.png" alt="Logo">
</p>

<h1 align="center">我们的纪念册 (Our Memory)</h1>

<p align="center">
  <a href="https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html">
    <img src="https://img.shields.io/badge/WeChat-MiniProgram-green" alt="WeChat">
  </a>
  <a href="https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html">
    <img src="https://img.shields.io/badge/CloudBase-Serverless-blue" alt="CloudBase">
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/License-MIT-orange" alt="License">
  </a>
</p>

<p align="center">
  <strong>💖 一个集萌宠养成、恋爱清单、实用工具于一体的私密二人空间</strong><br>
  <i>不仅是记录，更是连接。从日活运营的角度打造的高粘性情侣小程序。</i>
</p>

## 📖 项目简介 (Introduction)

**“我们的纪念册”** 不仅仅是一个照片存储工具，它是一套完整的情侣/密友互动解决方案。基于微信小程序原生开发，采用 **微信云开发 (WeChat CloudBase)** 架构，无需自建服务器，低成本、高并发。

本项目深度融合了**用户留存（Retention）**与**互动（Engagement）**机制，通过虚拟宠物、每日任务、互动问答等功能，让用户不仅仅是在“存照片”，而是在“玩生活”。

## ✨ 核心功能亮点 (Features)

基于最新的代码迭代，本项目包含以下核心模块：

### 1. 🐣 情感维系系统 (Engagement)
* **云端萌宠 (Virtual Pet)**: `pages/pet`
    * 内置宠物养成系统，支持喂食、心情交互、旅行。
    * *运营价值*：通过“喂食”机制极大提升用户的**DAU（日活）**和回访率。
* **默契问答 (Couple Quiz)**: `pages/quiz`
    * 两人同答一题，测试默契度。
    * *运营价值*：增强用户互动深度，制造话题。
* **时光胶囊 (Time Capsule)**: `pages/capsule`
    * 写给未来的信，设定开启时间。
    * *运营价值*：锁定用户长远留存预期。

### 2. 💌 互动权益体系 (Incentive)
* **恋爱兑换券 (Love Coupons)**: `pages/coupons`
    * 自定义兑换券（如“按摩券”、“洗碗券”），支持核销状态管理。
    * *运营价值*：将线下互动数字化，增加打开频次。
* **每日任务 (Daily Missions)**: `cloudfunctions/get_daily_mission`
    * 完成任务获取积分/道具。

### 3. 🛠 实用生活工具 (Utility)
* **小决定 (Decision Maker)**: `pages/decision`
    * 解决“今天吃什么”、“去哪玩”的千古难题。
* **旅行足迹 (Travel Map)**: `pages/travel_map`
    * 可视化记录两人的旅行打卡地，点亮中国地图。
* **纪念日提醒 (Anniversary)**: `pages/index`
    * 首页置顶重要纪念日倒数/正数。

### 4. 📸 影像与记录 (Memory)
* **云相册**: 支持分类管理，利用云存储CDN加速。
* **留言板 (Message Board)**: `pages/message_board`
    * 类似拍立得风格的留言互动区。

---

## 🏗 技术栈 (Tech Stack)

* **前端**: 微信小程序原生 (WXML, WXSS, JavaScript)
* **后端**: 微信云开发 (Cloud Functions) - Node.js
* **数据库**: 云数据库 (NoSQL JSON Database)
* **存储**: 云存储 (COS)
* **AI能力**: 集成基础图像处理能力 (`cloudfunctions/process_anime`)

---

## 🚀 快速部署 (Quick Start)

作为一套 Serverless 架构的项目，你可以在10分钟内完成部署。

### 1. 准备工作
* 注册微信小程序账号。
* 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。

### 2. 导入项目
1.  打开微信开发者工具，导入本项目根目录。
2.  修改 `project.config.json` 中的 `appid` 为你自己的 AppID。

### 3. 环境配置 (Environment Setup)
1.  点击开发者工具上的 **“云开发”** 按钮，开通云开发环境。
2.  复制你的 **环境ID (Env ID)**。
3.  打开 `miniprogram/envList.js` (如果不存在请创建)，配置你的环境ID：
    ```javascript
    const envList = [{"envId":"你的环境ID","alias":"prod"}]
    const isMac = false
    module.exports = {
      envList,
      isMac
    }
    ```

### 4. 部署云函数 (Deploy Backend)
本项目核心逻辑依赖云函数，请务必执行以下操作：
1.  在开发者工具文件列表中，右键点击 `cloudfunctions` 文件夹。
2.  选择当前环境。
3.  **核心步骤**：依次右键点击以下文件夹，选择 **“上传并部署：云端安装依赖”**：
    * `init_app_config` (初始化配置)
    * `init_db` (数据库初始化)
    * `user_center` (用户中心核心业务)
    * `get_daily_mission` (任务系统)
    * `get_memory_lane` (回忆轴)
    * `process_anime` (图像处理)
    * *以及其他所有云函数文件夹...*

### 5. 数据库初始化 (Database Init)
为了让小程序跑起来，你需要初始化数据库集合：
1.  在云函数部署完成后，在开发者工具的控制台或通过新建一个测试页面，调用一次 `init_db` 云函数。
2.  或者手动在云开发控制台创建以下集合（Collection）：
    * `users` (用户信息)
    * `pets` (宠物数据)
    * `coupons` (兑换券)
    * `capsules` (胶囊)
    * `memories` (相册)
    * `posts` (留言板)

---

## 📂 目录结构说明 (Directory Structure)

```text
our-memory/
├── cloudfunctions/        # 云函数（后端业务逻辑）
│   ├── user_center/       # 用户体系、宠物、胶囊等核心服务
│   ├── process_anime/     # 图片处理服务
│   ├── init_db/           # 数据库初始化脚本
│   └── ...
├── miniprogram/           # 小程序前端代码
│   ├── components/        # 公用组件 (Modal, Cards等)
│   ├── images/            # 静态资源
│   ├── pages/             # 页面文件
│   │   ├── index/         # 首页（纪念日、状态）
│   │   ├── pet/           # 萌宠养成页面
│   │   ├── coupons/       # 恋爱兑换券
│   │   ├── travel_map/    # 旅行地图
│   │   ├── decision/      # 小决定工具
│   │   └── ...
│   ├── app.json           # 全局配置
│   └── envList.js         # 环境配置
└── project.config.json    # 项目配置文件
