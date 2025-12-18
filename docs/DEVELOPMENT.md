# 开发指南

## 项目结构

```
OurMemory/
├── miniprogram/                 # 小程序前端代码
│   ├── pages/                  # 页面文件
│   │   ├── today/              # 今日页面
│   │   ├── fun/                # 乐园页面
│   │   ├── memories/           # 时光轴页面
│   │   ├── mine/               # 我的页面
│   │   ├── avatar/             # 头像选择页面
│   │   ├── postcard/           # 明信片页面
│   │   ├── capsule/            # 时光胶囊页面
│   │   └── quiz/               # 问答页面
│   ├── components/             # 自定义组件
│   │   ├── photo-canvas/       # 照片画布组件
│   │   ├── style-selector/     # 风格选择器
│   │   ├── pet-card/          # 宠物卡片组件
│   │   └── capsule-item/      # 胶囊项组件
│   ├── utils/                  # 工具函数
│   │   ├── util.js            # 通用工具
│   │   ├── request.js         # 网络请求封装
│   │   └── storage.js         # 本地存储封装
│   ├── images/                 # 图片资源
│   ├── app.js                  # 小程序入口
│   ├── app.json               # 小程序配置
│   └── app.wxss               # 全局样式
├── cloudfunctions/             # 云函数
│   ├── get_daily_mission/      # 获取每日任务
│   ├── get_memory_lane/        # 获取时间线
│   ├── user_center/           # 用户中心
│   ├── process_anime/         # AI图像处理
│   └── init_*/                # 初始化函数
├── docs/                      # 项目文档
└── project.config.json        # 项目配置
```

## 开发环境搭建

### 1. 安装依赖
```bash
# 安装云函数依赖
cd cloudfunctions/user_center
npm install

cd ../process_anime
npm install
```

### 2. 配置开发环境
1. 打开微信开发者工具
2. 导入项目，选择项目根目录
3. 填写AppID（测试号或正式号）
4. 开启云开发功能
5. 创建云环境（开发环境和生产环境）

### 3. 环境配置
在 `miniprogram/app.js` 中配置环境：
```javascript
// 开发环境
env: 'dev-xxxxx'

// 生产环境
env: 'prod-xxxxx'
```

## 云函数开发

### 创建新云函数
1. 在 `cloudfunctions` 目录下创建新文件夹
2. 初始化npm项目：`npm init -y`
3. 安装依赖：`npm install wx-server-sdk`
4. 编写入口函数 `index.js`
5. 部署云函数

### 云函数模板
```javascript
// cloudfunctions/example/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { OPENID } = wxContext

  try {
    // 业务逻辑
    return {
      code: 0,
      data: result
    }
  } catch (error) {
    return {
      code: -1,
      error: error.message
    }
  }
}
```

## 数据库设计

### 集合命名规范
- 使用小写字母和下划线
- 复数形式：`users`, `capsules`, `posts`
- 功能分组：`quiz_pool`, `quiz_rounds`

### 索引建议
```javascript
// users集合索引
db.collection('users').createIndex({
  "_openid": 1
})

// logs集合复合索引
db.collection('logs').createIndex({
  "_openid": 1,
  "date": -1
})
```

## 前端开发规范

### 页面结构
```javascript
// pages/example/example.js
Page({
  data: {
    // 页面数据
  },

  onLoad(options) {
    // 页面加载
  },

  onShow() {
    // 页面显示
  },

  // 事件处理函数
  handleTap() {
    // 处理点击事件
  }
})
```

### 组件开发
```javascript
// components/example/index.js
Component({
  properties: {
    // 组件属性
    title: String,
    count: {
      type: Number,
      value: 0
    }
  },

  data: {
    // 内部数据
  },

  methods: {
    // 组件方法
  }
})
```

## 调试技巧

### 1. 云函数调试
```javascript
// 使用try-catch捕获错误
try {
  const result = await db.collection('users').get()
  console.log(result)
} catch (error) {
  console.error('数据库查询失败:', error)
}
```

### 2. 前端调试
- 使用 `console.log` 输出调试信息
- 使用微信开发者工具的调试面板
- 查看Network面板监控网络请求

### 3. 真机调试
- 使用真机扫码调试
- 开启vConsole查看日志
- 注意真机与开发环境的差异

## 性能优化

### 1. 图片优化
- 使用webp格式
- 实现懒加载
- 压缩图片大小

### 2. 数据加载
- 分页加载
- 使用缓存
- 优化数据库查询

### 3. 代码包优化
- 分包加载
- 按需引入组件
- 清理无用代码

## 发布流程

### 1. 测试
- 本地测试
- 真机测试
- 体验版测试

### 2. 提交审核
1. 在开发者工具上传代码
2. 填写版本信息
3. 提交微信审核

### 3. 发布
- 审核通过后发布全量
- 或分阶段发布

## 常见问题

### Q: 云函数调用失败？
A: 检查环境配置、云函数是否部署、网络权限

### Q: 数据库权限问题？
A: 配置正确的数据库权限，使用自定义安全规则

### Q: 小程序包体积过大？
A: 使用分包加载、压缩图片、清理无用资源

## 更新日志

### v2.0.0 (2024-01-01)
- 新增明信片系统
- 优化宠物互动体验
- 修复已知bug

### v1.9.0 (2023-12-15)
- 新增情侣头像功能
- 改进AI处理速度
- 优化用户体验