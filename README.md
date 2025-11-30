# 📖 我们的纪念册 (Our Memory)

> **把平淡的日常，画成漫画里的模样。**
>
> **Record your love, paint your life.**

一款集 **AI 绘画**、**恋爱养成**、**双人互动** 于一体的微信小程序。
在这里，你们可以完成每日的趣味打卡，通过腾讯云 AI 将合照变成唯美的二次元画作，共同培育代表爱情的玫瑰，并用它兑换专属的心愿特权。

---

## ✨ 核心功能 (Core Features)

### 1. 📸 每日心动 (Today - AI Camera)
* **每日任务**：基于日期算法的每日挑战（如“摸头杀”、“搞怪鬼脸”），解决“今天拍什么”的烦恼。
* **AI 魔法变身**：上传照片，自动调用 **腾讯云 AI 绘画** 接口，支持 **13+ 种风格**切换（日漫、水彩、3D迪士尼、粘土风、国风等）。
* **智能点评**：AI 会根据图片生成趣味“毒舌”或“高甜”文案，并进行打分（“AI 鉴定”印章）。
* **拍立得生成**：生成的图片会自动封装成拍立得样式，支持保存到手机或上传云端。

### 2. 🎡 恋爱乐园 (Playground - Gamification)
这是一个闭环的“爱情经济系统”：
* **🌹 玫瑰花园 (Garden)**：
    * 通过每日打卡获取“爱意 (Water)”。
    * 二人共同浇灌培育玫瑰，经历 4 个生长阶段，成熟后可“收获”玫瑰存入账户。
* **🎁 心愿工坊 (Coupons)**：
    * 消耗收获的“玫瑰”制作兑换券（如：💆‍♂️揉肩卡、🍽️免洗金牌、🤝和好卡）。
    * 包含完整的兑换、核销、票根留念流程。
* **🎲 命运抉择 (Decision)**：
    * 解决“今天吃什么”、“周末去哪玩”等选择困难症。
    * 趣味翻牌玩法，且能看到伴侣的最后一次选择结果。

### 3. 🎞️ 时光长廊 (Memory Lane)
* **双人时间轴**：将二人的打卡记录按时间串联，区分“ME”和“TA”的视角。
* **里程碑奖励**：记录累计打卡天数，设有 30 天惊喜彩蛋提示。

### 4. 🏠 专属空间 (Mine & Binding)
* **双人绑定**：通过“专属编号”邀请另一半，绑定后头像并列，数据互通（共同养花、查看动态）。
* **恋爱计时器**：自定义纪念日，实时计算相爱天数。
* **单身模式**：未绑定时为“单人篇章”，依然可以完整体验 AI 绘图和个人记录功能。

---

## 🛠️ 技术栈 (Tech Stack)

本项目完全基于 **微信小程序云开发 (WeChat Cloud Development)**，无需自建服务器。

* **前端**：微信小程序原生 (WXML, WXSS, JS)
    * 交互：使用了 CSS3 动画（浮动气泡、呼吸灯、翻转卡片）。
* **后端**：微信云函数 (Node.js)
    * `process_anime`: 处理图片上传、鉴权、调用腾讯云 AI 接口。
    * `user_center`: 核心业务逻辑（用户登录、绑定、花园逻辑、积分扣减）。
    * `get_daily_mission`: 获取每日任务算法。
    * `init_task_pool`: 数据库初始化工具。
* **AI 能力**：腾讯云 AI 绘画 (ImageToImage)。
* **数据库**：云开发 Database (NoSQL)。

---

## 🚀 部署指南 (Deployment)

### 1. 准备工作
* 注册微信小程序账号。
* 开通微信云开发环境（按量付费或套餐均可）。
* 注册腾讯云账号，并开通 **AI 绘画** 服务，获取 `SecretId` 和 `SecretKey`。

### 2. 项目初始化
1.  **克隆项目** 到本地。
2.  使用 **微信开发者工具** 导入项目。
3.  在 `project.config.json` 中修改 `appid` 为你自己的小程序 AppID。
4.  在 `miniprogram/app.js` 中，将 `env: "cloud1-..."` 替换为你的云开发环境 ID。

### 3. 云函数配置
1.  在开发者工具中，右键 `cloudfunctions` 文件夹，选择当前环境。
2.  **配置密钥**：
    * 复制 `cloudfunctions/process_anime/config.example.js` 为 `config.js`。
    * 填入你的腾讯云 `SID` (SecretId), `SKEY` (SecretKey) 和 `REGION`。
3.  **安装依赖**：
    * 在以下文件夹内分别右键 -> "在终端打开" -> 运行 `npm install`：
        * `cloudfunctions/process_anime`
        * `cloudfunctions/user_center`
        * `cloudfunctions/get_daily_mission`
        * `cloudfunctions/init_task_pool`
        * `cloudfunctions/get_memory_lane`
4.  **上传部署**：
    * 右键每个云函数文件夹，选择 **“上传并部署：云端安装依赖”**。

### 4. 数据库初始化
1.  打开云开发控制台 -> 数据库，创建以下集合（Collection）：
    * `users` (用户信息)
    * `logs` (打卡与动态记录)
    * `task_pool` (任务池)
    * `gardens` (花园数据)
    * `coupons` (兑换券)
    * `app_config` (全局配置)
2.  **导入任务数据**：
    * 部署好 `init_task_pool` 云函数后。
    * 在云开发控制台 -> 云函数 -> `init_task_pool` -> 点击“测试”，直接运行该函数。
    * 看到返回 `success: true` 即表示 50+ 条基础任务已写入数据库。
3.  **配置管理员 (VIP)**：
    * 在 `app_config` 集合中添加一条记录，用于解锁 VIP 风格：
      ```json
      {
        "_id": "global_settings",
        "sudo_users": ["你的OpenID"]
      }
      ```

### 5. 体验
* 编译运行小程序，开始你的恋爱记录之旅！

---

## 📂 目录结构 (Structure)

```text
├── cloudfunctions/
│   ├── get_daily_mission/  # 获取每日任务（基于日期算法）
│   ├── get_memory_lane/    # 获取时光轴列表
│   ├── init_task_pool/     # 数据库初始化脚本
│   ├── process_anime/      # AI 绘图核心逻辑 (需配置 Key)
│   └── user_center/        # 用户体系、花园、绑定、积分逻辑
├── miniprogram/
│   ├── components/         # 公共组件 (如云提示弹窗)
│   ├── images/             # 静态资源 (图标、默认图、花朵阶段图)
│   ├── pages/
│   │   ├── index/          # 首页 (拍照、风格选择、AI结果)
│   │   ├── playground/     # 乐园 (养花、功能入口)
│   │   ├── decision/       # 命运抉择 (翻牌游戏)
│   │   ├── coupons/        # 心愿工坊 (兑换券)
│   │   ├── history/        # 时光轴
│   │   └── mine/           # 个人中心 (绑定、倒数日)
│   ├── utils/              # 工具类 (如券模板)
│   └── app.js              # 全局入口
└── project.config.json     # 项目配置