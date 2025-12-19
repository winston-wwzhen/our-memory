<p align="center">
  <img width="200" src="./miniprogram/images/default-avatar.png" alt="Logo">
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
  <strong>💖 一个集萌宠养成、情侣资源、实用工具于一体的私密二人空间</strong><br>
  <i>不仅是记录，更是连接。从日活运营的角度打造的高粘性情侣小程序。</i>
</p>

## 📖 项目简介 (Introduction)

**“我们的纪念册”** 不仅仅是一个照片存储工具，它是一套完整的情侣/密友互动解决方案。基于微信小程序原生开发，采用 **微信云开发 (WeChat CloudBase)** 架构，无需自建服务器，低成本、高并发。

本项目深度融合了**用户留存（Retention）**与**互动（Engagement）**机制，通过虚拟宠物、每日任务、精选情头等高频功能，让用户不仅仅是在“存照片”，而是在“玩生活”。

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

### 2. 🎨 资源与个性化 (Resources)
* **情侣头像库 (Matching Avatars)**: `pages/avatar_list`
    * 海量精选情侣头像，支持预览与保存。
    * *运营价值*：**高频刚需功能**。头像的定期更新是吸引用户反复打开小程序的天然钩子（Hook），极易在社交圈产生传播。

### 3. 💌 互动权益体系 (Incentive)
* **恋爱兑换券 (Love Coupons)**: `pages/coupons`
    * 自定义兑换券（如“按摩券”、“洗碗券”），支持核销状态管理。
    * *运营价值*：将线下互动数字化，增加打开频次。
* **每日任务 (Daily Missions)**: `cloudfunctions/get_daily_mission`
    * 完成任务获取积分/道具。

### 4. 🛠 实用工具与记录 (Utility & Memory)
* **旅行足迹 (Travel Map)**: `pages/travel_map`
    * 可视化记录两人的旅行打卡地，点亮中国地图。
* **纪念日提醒 (Anniversary)**: `pages/index`
    * 首页置顶重要纪念日倒数/正数。
* **云相册 & 留言板**: `pages/message_board`
    * 影像记录与拍立得风格的留言互动区。

---

## 🏗 技术栈 (Tech Stack)

* **前端**: 微信小程序原生 (WXML, WXSS, JavaScript)
* **后端**: 微信云开发 (Cloud Functions) - Node.js
* **数据库**: 云数据库 (NoSQL JSON Database)
* **存储**: 云存储 (COS)
* **AI能力**: 集成基础图像处理能力 (`cloudfunctions/process_anime`)

---

## 💾 数据库集合说明 (Database Schema)

本项目使用云开发数据库（NoSQL），以下是完整的集合清单及其用途：

### 1. 👤 用户与系统 (User & System)
| 集合名称 | 描述 | 关键字段示例 |
| :--- | :--- | :--- |
| **`users`** | **核心用户表**。存储用户基础信息、绑定关系、资产余额、VIP状态及每日限额。 | `_openid`, `partner_id`, `water_count` (爱意), `rose_balance` (玫瑰), `vip_expire_date`, `extra_quota` (永久额度) |
| **`vip_codes`** | **兑换码配置表**。用于存储VIP或资源兑换码。 | `code`, `days`, `usage_limit`, `used_users`, `is_active` |
| **`app_config`** | **全局配置表**。用于控制全局开关（如审核模式、维护状态）。 | `key`, `value` (e.g., `SHOW_VIP_EXCHANGE`) |
| **`logs`** | **日志与时光轴表**。存储所有关键操作日志，也是**相册/时光轴**的数据源。 | `type` ('daily_check_in', 'bind'), `imageFileID`, `content`, `style` (AI风格) |

### 2. 🐣 宠物与旅行 (Pet & Travel)
| 集合名称 | 描述 | 关键字段示例 |
| :--- | :--- | :--- |
| **`pets`** | **宠物状态表**。存储宠物的各项属性、所属关系。 | `owners` (数组), `mood_value`, `energy_level`, `food_inventory`, `state` ('idle'/'traveling') |
| **`destinations`** | **目的地配置表**。定义旅行地点的属性（静态数据）。 | `id`, `name`, `min_travel_time`, `food_consumption`, `possible_rewards` |
| **`travel_records`** | **旅行记录表**。记录每一次旅行的详细数据。 | `pet_id`, `destination_id`, `start_time`, `actual_return_time`, `rewards_summary` |
| **`postcards`** | **明信片/特产表**。存储用户在旅行中获得的纪念品。 | `owners`, `travel_id`, `image_url`, `composition` (合成参数) |
| **`gardens`** | **(旧) 花园表**。旧版本遗留数据，目前用于迁移脚本。 | *Legacy Data* |

### 3. 💌 社交与互动 (Social & Interaction)
| 集合名称 | 描述 | 关键字段示例 |
| :--- | :--- | :--- |
| **`capsules`** | **时光胶囊表**。存储埋藏的胶囊信息。 | `to_openid`, `openDate`, `content`, `status` (0:未开启, 1:已开启) |
| **`messages`** | **留言板表**。存储便签墙的消息。 | `content`, `color`, `rotate`, `isLiked` |
| **`coupons`** | **恋爱兑换券表**。存储用户持有或使用的权益券。 | `templateId`, `title`, `cost`, `status` (0:未使用, 1:核销中, 2:已使用) |
| **`quiz_rounds`** | **问答对局表**。存储每一轮默契问答的进度和结果。 | `owners`, `round_seq`, `questions`, `answers_a`, `answers_b`, `is_finished` |
| **`daily_picks`** | **每日任务快照表**。用于固定当天的每日任务，确保所有人看到的一样。 | `_id` (日期字符串), `task` |

### 4. 🎨 内容与资源库 (Content Libraries)
| 集合名称 | 描述 | 关键字段示例 |
| :--- | :--- | :--- |
| **`avatar_sets`** | **情侣头像库**。存储成套的情侣头像数据。 | `title`, `category`, `boy_img`, `girl_img`, `downloads`, `is_vip` |
| **`task_pool`** | **任务题库**。每日任务的备选池。 | `title`, `description`, `difficulty`, `icon` |
| **`quiz_pool`** | **问答题库**。默契问答的题目池。 | `title`, `options`, `type`, `is_person` (是否区分人物) |
| **`egg_configs`** | **彩蛋配置表**。定义成就/彩蛋的触发条件和奖励。 | `_id` (彩蛋ID), `title`, `bonus`, `type` |
| **`user_eggs`** | **用户成就记录表**。记录用户已触发的彩蛋。 | `_openid`, `egg_id`, `unlocked_at` |

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
    * `init_avatar_data` (头像数据初始化) <span style="color:red"><sup>IMPORTANT</sup></span>
    * `init_destinations` (旅行地点初始化)
    * `init_task_pool` (任务/问答/彩蛋池初始化)
    * `user_center` (用户中心核心业务)
    * `get_daily_mission` (任务系统)
    * *以及其他所有云函数文件夹...*

### 5. 数据库初始化 (Database Init)
为了让小程序跑起来，你需要初始化数据库集合：
1.  在云函数部署完成后，建议先调用一次 `init_db` 云函数创建所有基础表。
2.  **数据导入**：务必依次调用以下云函数以加载初始数据：
    * `init_avatar_data` (加载情头数据)
    * `init_destinations` (加载旅行地点)
    * `init_task_pool` (加载任务、问答和彩蛋配置)

---

## 📂 目录结构说明 (Directory Structure)

```text
our-memory/
├── cloudfunctions/        # 云函数
│   ├── init_db/           # 数据库结构初始化
│   ├── init_avatar_data/  # 头像数据初始化
│   ├── init_destinations/ # 旅行地点初始化
│   ├── init_task_pool/    # 任务/问答/彩蛋池初始化
│   ├── user_center/       # 核心业务逻辑 (Auth, Pet, Market, etc.)
│   └── ...
├── miniprogram/           # 小程序前端
│   ├── pages/             
│   │   ├── index/         # 首页
│   │   ├── pet/           # 萌宠养成
│   │   ├── avatar_list/   # [NEW] 情侣头像列表
│   │   ├── avatar_detail/ # [NEW] 头像详情页
│   │   ├── coupons/       # 恋爱兑换券
│   │   ├── travel_map/    # 旅行地图
│   │   └── ...
│   └── envList.js         # 环境配置
└── project.config.json    # 项目配置文件
