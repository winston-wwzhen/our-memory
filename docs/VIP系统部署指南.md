# OurMemory VIP系统部署指南

## 更新日期
2025-12-14

## 概述
OurMemory小程序VIP系统已正式上线，本指南将详细介绍系统的部署、配置和管理方法。

## 一、系统架构

### 1.1 整体架构图
```
┌─────────────────────────────────────────────────────────────┐
│                     OurMemory VIP系统                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   前端UI     │◄──►│  云函数层     │◄──►│   数据库层    │   │
│  │             │    │              │    │              │   │
│  │ 我的页面     │    │ user_center  │    │   users      │   │
│  │ VIP展示     │    │              │    │   vip_codes  │   │
│  │ 兑换码输入   │    │ process_anime│    │  app_config  │   │
│  │ 权益说明     │    │              │    │              │   │
│  └─────────────┘    └──────────────┘    └──────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 VIP体系架构
```
                    VIP权限体系
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
    普通用户            正式VIP            管理员
      │                  │                  │
      ├─ 基础权限          ├─ 时长限制          ├─ 永久权限
      ├─ 每日1次          ├─ 每日3次          ├─ 无限次数
      └─ 可通过兑换获得    └─ 可延长期限        └─ 可授权他人
```

## 二、兑换码系统

### 2.1 兑换码类型
1. **一次性兑换码**：仅限一个用户使用
2. **多人共享码**：可设置使用次数限制
3. **限时兑换码**：设置有效期，过期自动失效
4. **VIP时长码**：提供指定天数的VIP权益
5. **永久次数码**：提供永久免费的额外次数

### 2.2 生成兑换码

#### 2.2.1 批量生成随机码
```bash
# 进入项目根目录
cd /path/to/OurMemory

# 使用默认配置生成10个兑换码
node scripts/add_vip_codes.js

# 生成指定数量的兑换码
node scripts/add_vip_codes.js --count 50

# 自定义配置
node scripts/add_vip_codes.js --count 100 --days 30 --quota 10 --prefix "VIP2025-"
```

#### 2.2.2 生成特定兑换码
```bash
# 生成指定内容的兑换码（适合活动使用）
node scripts/add_vip_codes.js --mode SINGLE --code "NEWYEAR2025" --days 15 --quota 20 --usage_limit -1

# 生成无限制使用的公用兑换码
node scripts/add_vip_codes.js --mode SINGLE --code "PUBLIC2025" --days 7 --usage_limit -1
```

#### 2.2.3 脚本配置说明
编辑 `scripts/add_vip_codes.js` 中的 CONFIG 对象：

```javascript
const CONFIG = {
  // 模式: 'BATCH' (批量随机) 或 'SINGLE' (单个指定)
  mode: "BATCH",

  // 通用配置
  days: 10,                   // VIP天数
  extra_quota: 5,             // 永久胶卷数量
  remark: "2025年VIP兑换码",   // 备注
  validDays: 365,             // 有效期(天)，null表示永不过期

  // 批量生成配置
  batchCount: 10,             // 生成数量
  prefix: "LOVE-",            // 前缀
  codeLength: 8,              // 随机部分长度
  usageLimit: 100,            // 每个码可用次数

  // 单个兑换码配置
  singleCode: "VIP2025",      // 指定的码
  singleLimit: 1,             // -1代表无限次使用
};
```

### 2.3 兑换码管理

#### 2.3.1 查看兑换码列表
```javascript
// 在云开发控制台执行
// 查看所有有效的兑换码
db.collection('vip_codes').where({
  is_active: true
}).get()

// 查看指定前缀的兑换码
db.collection('vip_codes').where({
  code: db.command.startsWith('VIP2025-')
}).get()
```

#### 2.3.2 查看使用情况
```javascript
// 统计兑换码使用情况
db.collection('vip_codes').orderBy('used_count', 'desc').limit(10).get()

// 查看即将过期的兑换码
db.collection('vip_codes').where({
  valid_until: db.command.lt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
}).get()
```

#### 2.3.3 管理兑换码状态
```javascript
// 禁用兑换码
db.collection('vip_codes').doc('document_id').update({
  is_active: false,
  updated_at: new Date()
})

// 更新兑换码有效期
db.collection('vip_codes').where({
  code: 'SOME_CODE'
}).update({
  valid_until: new Date('2025-12-31'),
  updated_at: new Date()
})
```

## 三、用户VIP管理

### 3.1 VIP获取方式
| 获取方式 | VIP时长 | 额外次数 | 说明 |
|---------|---------|---------|------|
| 兑换码 | 可配置 | 可配置 | 主要获取方式 |
| 邀请奖励 | 1天 | 无 | 新用户注册后获得 |
| 伴侣绑定 | 7天 | 无 | 双方各获得 |
| 管理员授权 | 可配置 | 可配置 | 特殊情况 |

### 3.2 查看用户VIP状态
```javascript
// 查询指定用户
db.collection('users').doc('user_openid').get()

// 查询所有VIP用户
db.collection('users').where({
  vip_expire_date: db.command.gt(new Date())
}).get()

// 查询即将过期的VIP用户（7天内）
db.collection('users').where({
  vip_expire_date: db.command.gt(new Date()),
  vip_expire_date: db.command.lt(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
}).get()
```

### 3.3 手动调整VIP
```javascript
// 延长VIP时间
db.collection('users').doc('user_openid').update({
  vip_expire_date: new Date('2025-12-31'),
  updated_at: new Date()
})

// 增加永久次数
db.collection('users').doc('user_openid').update({
  permanent_film_quota: db.command.inc(10), // 增加10次
  updated_at: new Date()
})

// 综合授权VIP
const grantVipToUser = async (openid, days = 30, extraQuota = 0) => {
  const user = await db.collection('users').doc(openid).get();
  const currentExpire = user.data.vip_expire_date || new Date();
  const newExpire = currentExpire > new Date()
    ? new Date(currentExpire.getTime() + days * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await db.collection('users').doc(openid).update({
    vip_expire_date: newExpire,
    permanent_film_quota: db.command.inc(extraQuota),
    updated_at: new Date()
  });
};
```

## 四、系统配置

### 4.1 业务规则配置
编辑 `miniprogram/utils/business_rules.json`：

```json
{
  "NORMAL_FREE_LIMIT": 1,        // 普通用户每日免费次数
  "VIP_DAILY_LIMIT": 3,          // VIP用户每日免费次数
  "REG_DAY_LIMIT": 10,           // 注册日额外次数
  "VIP_SYSTEM_ENABLED": true     // VIP系统总开关
}
```

### 4.2 云端配置
通过 `app_config` 集合管理动态配置：

```javascript
// VIP兑换功能开关
{
  "_id": "vip_exchange_enabled",
  "key": "vip_exchange_enabled",
  "value": true,
  "description": "VIP兑换功能总开关"
}

// VIP默认时长
{
  "_id": "vip_default_days",
  "key": "vip_default_days",
  "value": 30,
  "description": "默认VIP天数"
}

// 新人礼包配置
{
  "_id": "newbie_gift",
  "key": "newbie_gift",
  "value": {
    "days": 7,
    "quota": 5,
    "enabled": true
  },
  "description": "新用户礼包"
}
```

### 4.3 测试环境配置
```javascript
// cloudfunctions/process_anime/index.js
const TEST_CONFIG = {
  WHITELIST: [],      // 测试白名单
  ENABLE: false,      // 生产环境必须设为false
};
```

## 五、运营活动指南

### 5.1 节日活动
```bash
# 春节活动 - 生成1000个15天VIP兑换码
node scripts/add_vip_codes.js \
  --prefix "CJ2025-" \
  --count 1000 \
  --days 15 \
  --quota 10 \
  --remark "春节特别礼包"

# 情人节活动 - 生成500个7天情侣兑换码
node scripts/add_vip_codes.js \
  --mode SINGLE \
  --code "LOVE2025" \
  --days 7 \
  --quota 7 \
  --usage_limit -1 \
  --remark "情人节特供"
```

### 5.2 推广活动
```bash
# 新用户专享 - 每日限量100份
node scripts/add_vip_codes.js \
  --prefix "NEWBIE-" \
  --count 100 \
  --days 3 \
  --quota 3 \
  --usage_limit 1 \
  --valid_days 7 \
  --remark "新用户专享"
```

### 5.3 运营数据统计
```javascript
// 每日兑换统计
db.collection('vip_codes').aggregate()
  .group({
    _id: {
      year: { $year: '$created_at' },
      month: { $month: '$created_at' },
      day: { $dayOfMonth: '$created_at' }
    },
    totalCodes: { $sum: 1 },
    totalUsed: { $sum: '$used_count' }
  })
  .sort({ _id: -1 })
  .limit(30)
  .end()

// VIP用户增长趋势
db.collection('users').aggregate()
  .group({
    _id: {
      year: { $year: '$vip_expire_date' },
      month: { $month: '$vip_expire_date' }
    },
    count: { $sum: 1 }
  })
  .sort({ _id: 1 })
  .end()
```

## 六、常见问题解决

### 6.1 兑换码相关问题

#### Q: 用户反馈兑换码无效
A: 检查清单：
1. 兑换码格式是否正确（区分大小写）
2. 兑换码是否存在（检查数据库）
3. 是否已过期（检查valid_until字段）
4. 使用次数是否已达上限（检查used_count >= usage_limit）
5. 是否处于激活状态（检查is_active字段）

#### Q: 兑换码使用成功但VIP未生效
A: 排查步骤：
1. 检查用户vip_expire_date字段
2. 验证时间计算是否正确
3. 让用户重启小程序清除缓存
4. 检查云函数日志是否有错误

### 6.2 用户VIP状态异常

#### Q: VIP用户显示为普通用户
A: 解决方案：
```javascript
// 1. 检查数据库中的过期时间
const user = await db.collection('users').doc(openid).get();
console.log('VIP过期时间:', user.data.vip_expire_date);

// 2. 如果是时区问题，重新设置
await db.collection('users').doc(openid).update({
  vip_expire_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
});
```

### 6.3 次数计算问题

#### Q: 用户反馈次数计算错误
A: 检查要点：
1. last_free_reset_time是否正确
2. 时区设置是否一致
3. VIP状态判断是否准确
4. 永久次数和每日次数的消费顺序

## 七、安全注意事项

### 7.1 兑换码安全
1. **生成安全**：使用足够长的随机字符串，避免可预测性
2. **分发安全**：通过官方渠道发放，避免泄露
3. **使用监控**：定期检查异常使用模式
4. **过期管理**：及时清理过期兑换码

### 7.2 管理员安全
1. **权限最小化**：仅授予必要的权限
2. **操作日志**：记录所有敏感操作
3. **定期审计**：检查管理员操作记录
4. **备份恢复**：定期备份重要数据

## 八、定期维护任务

### 8.1 日常维护
- [ ] 检查兑换码使用情况
- [ ] 监控VIP用户增长
- [ ] 查看系统错误日志
- [ ] 处理用户反馈问题

### 8.2 周度维护
- [ ] 清理过期兑换码
- [ ] 生成运营数据报告
- [ ] 更新活动配置
- [ ] 检查系统性能

### 8.3 月度维护
- [ ] 分析VIP转化率
- [ ] 评估活动效果
- [ ] 优化业务规则
- [ ] 制定下月活动计划

## 九、数据清理脚本

### 9.1 清理过期数据
运行数据清理脚本：
```bash
# 查看当前数据状态
node scripts/cleanup_beta_data.js --dry-run

# 执行清理（需要谨慎）
node scripts/cleanup_beta_data.js --execute

# 同时过期试用VIP
node scripts/cleanup_beta_data.js --execute --expire-trial
```

### 9.2 定期备份
```javascript
// 定期备份VIP相关数据
const backupVIPData = async () => {
  // 备份用户VIP数据
  const users = await db.collection('users')
    .where({ vip_expire_date: db.command.gt(new Date()) })
    .get();

  // 备份兑换码数据
  const codes = await db.collection('vip_codes').get();

  // 保存到备份集合
  await db.collection('backup_users').add({
    data: users,
    timestamp: new Date()
  });

  await db.collection('backup_codes').add({
    data: codes,
    timestamp: new Date()
  });
};
```

## 十、VIP权益说明

### 10.1 VIP用户权益
成为VIP用户即可享受以下权益：

1. **每日免费拍照次数**
   - 普通用户：每日1次免费拍照
   - VIP用户：每日3次免费拍照
   - 次数每日0点自动重置

2. **永久额外次数**
   - 可通过兑换码获得永久免费的拍照次数
   - 永久次数不会每日重置
   - 优先消耗永久次数，再消耗每日次数

3. **专属功能权限**
   - VIP专属标识展示
   - 优先体验新功能
   - 专属客服支持

### 10.2 权益使用规则

1. **次数计算顺序**
   ```
   优先级：永久次数 > 每日免费次数
   示例：
   - 用户有5次永久次数，今日有3次VIP次数
   - 拍照时先消耗永久次数，用完后才消耗每日次数
   ```

2. **次数重置规则**
   ```
   每日次数重置时间：每天0点（北京时间）
   重置条件：
   - VIP用户：重置为3次
   - 普通用户：重置为1次
   - 永久次数：不受重置影响
   ```

3. **VIP过期处理**
   ```
   VIP过期后：
   - 每日次数限制降为1次
   - 永久次数继续有效
   - VIP标识自动隐藏
   ```

### 10.3 获取VIP的方式

1. **兑换码激活**
   - 输入有效兑换码激活VIP
   - 可获得指定时长的VIP权限
   - 部分兑换码包含永久次数

2. **邀请好友奖励**
   - 成功邀请新用户注册
   - 获得VIP时长和永久次数奖励

3. **活动赠送**
   - 参与平台活动获得
   - 特定节日的福利赠送

## 十一、联系方式

如遇到技术问题，请联系：
- 技术支持：[技术团队邮箱]
- 运营支持：[运营团队邮箱]
- 紧急联系：[紧急联系电话]

---

## 更新日志

- 2025-12-14: 初始版本发布
- 待更新: 持续优化中

---

*感谢您使用OurMemory VIP系统！*