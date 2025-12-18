# 部署指南

## 环境准备

### 1. 云开发环境
- 开发环境：`dev-xxxxx`
- 测试环境：`test-xxxxx`
- 生产环境：`prod-xxxxx`

### 2. 资源清单
- 云函数：10个
- 数据库集合：15个
- 云存储：图片资源
- AI服务：腾讯云图像处理

## 云函数部署

### 1. 批量部署脚本
```bash
# deploy.sh
#!/bin/bash

# 需要部署的云函数列表
functions=("get_daily_mission" "get_memory_lane" "user_center" "process_anime")

# 遍历部署
for func in "${functions[@]}"; do
    echo "正在部署 $func..."
    cd cloudfunctions/$func
    npm install
    cd ../..
    npx tcb fn deploy --functions $func
    echo "$func 部署完成"
done
```

### 2. 单独部署
```bash
# 部署单个云函数
cd cloudfunctions/user_center
npm install
cd ../..
npx tcb fn deploy --functions user_center
```

## 数据库初始化

### 1. 执行初始化函数
```javascript
// 初始化所有数据
const cloud = require('wx-server-sdk')
cloud.init()

// 依次执行初始化函数
await cloud.callFunction({
  name: 'init_db'
})

await cloud.callFunction({
  name: 'init_app_config'
})

await cloud.callFunction({
  name: 'init_avatar_data'
})
```

### 2. 数据迁移
```bash
# 执行数据迁移
npx tcb fn invoke --function migrate_legacy_data
```

## 小程序发布

### 1. 开发环境部署
1. 配置开发环境ID
2. 上传代码至开发版
3. 生成体验版二维码

### 2. 生产环境部署
1. 切换环境配置
```javascript
// miniprogram/app.js
wx.cloud.init({
  env: 'prod-xxxxx',  // 生产环境
  traceUser: true
})
```

2. 全量编译
3. 上传代码
4. 提交审核

## CI/CD 配置

### 1. GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy Mini Program

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'

      - name: Install dependencies
        run: |
          cd cloudfunctions/user_center
          npm install
          cd ../process_anime
          npm install

      - name: Deploy cloud functions
        run: |
          npm install -g @cloudbase/cli
          tcb login --apiKey ${{ secrets.TCB_API_KEY }}
          bash deploy.sh
```

### 2. 微信小程序CI
```json
{
  "setting": {
    "urlCheck": true,
    "es6": true,
    "postcss": true,
    "minified": true
  },
  "projectname": "OurMemory",
  "description": "情侣纪念册小程序",
  "packOptions": {
    "ignoreUploadUnusedFiles": true
  }
}
```

## 监控与日志

### 1. 云函数监控
- 执行次数
- 平均耗时
- 错误率
- 并发数

### 2. 数据库监控
- 请求次数
- 查询耗时
- 存储空间
- 索引使用率

### 3. 日志配置
```javascript
// cloudfunctions/user_center/index.js
const logger = require('log4js').getLogger()

logger.info('用户签到', {
  openid: event.openid,
  timestamp: new Date()
})
```

## 回滚方案

### 1. 代码回滚
```bash
# 回滚到上一个版本
git reset --hard HEAD~1
git push -f origin main
```

### 2. 数据库回滚
```bash
# 使用备份恢复
npx tcb db restore --backup-id xxxxx
```

### 3. 快速回滚流程
1. 停止流量入口
2. 切换到备用环境
3. 回滚代码
4. 恢复数据
5. 验证功能
6. 恢复流量

## 安全配置

### 1. 数据库权限
```json
{
  "read": "auth.uid == resource._openid || auth.uid == resource.partnerId",
  "write": "auth.uid == resource._openid"
}
```

### 2. 云函数权限
```javascript
// 限制调用频率
const rateLimit = require('function-rate-limit')
const limiter = rateLimit(100, 60000) // 每分钟100次

exports.main = limiter(async (event, context) => {
  // 云函数逻辑
})
```

### 3. 敏感信息管理
- 使用环境变量存储密钥
- 定期更换API密钥
- 实施访问控制

## 性能优化

### 1. 云函数优化
- 使用内存缓存
- 优化数据库查询
- 减少冷启动

### 2. 数据库优化
- 创建合适索引
- 使用聚合查询
- 定期清理过期数据

### 3. CDN配置
```javascript
// 配置CDN加速
const cdnUrl = 'https://cdn.example.com'
```

## 故障处理

### 1. 常见故障
- 云函数超时
- 数据库连接失败
- AI服务异常
- 网络波动

### 2. 应急预案
- 启用备用服务
- 降级非核心功能
- 发布故障公告
- 快速定位问题

### 3. 故障排查清单
- [ ] 检查云函数状态
- [ ] 查看错误日志
- [ ] 验证数据库连接
- [ ] 测试网络连通性
- [ ] 确认服务配额

## 维护计划

### 日常维护
- 每日检查系统状态
- 监控资源使用情况
- 备份重要数据

### 定期维护
- 每周更新依赖包
- 每月清理过期数据
- 每季度安全审计

### 版本发布
- 每月发布新版本
- 遵循语义化版本
- 完整的变更日志