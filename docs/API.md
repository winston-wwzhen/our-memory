# API 文档

## 云函数接口

### 1. get_daily_mission

获取每日拍照任务

**请求参数**
```json
{
  "openid": "string"
}
```

**返回数据**
```json
{
  "code": 0,
  "data": {
    "mission": "string",  // 任务描述
    "taskId": "string"    // 任务ID
  }
}
```

### 2. get_memory_lane

获取用户照片时间线

**请求参数**
```json
{
  "openid": "string",
  "limit": 10,          // 可选，分页大小
  "offset": 0           // 可选，偏移量
}
```

**返回数据**
```json
{
  "code": 0,
  "data": {
    "memories": [
      {
        "date": "2024-01-01",
        "photoUrl": "string",
        "style": "string",
        "score": 85,
        "partnerDate": "2024-01-01"  // 伴侣加入日期
      }
    ],
    "hasMore": true
  }
}
```

### 3. user_center

用户相关操作主入口

#### 3.1 签到
**请求参数**
```json
{
  "action": "checkIn",
  "openid": "string"
}
```

**返回数据**
```json
{
  "code": 0,
  "data": {
    "energy": 100,        // 获得的爱心能量
    "continuousDays": 7,  // 连续签到天数
    "quote": "每日情话"
  }
}
```

#### 3.2 宠物互动
**请求参数**
```json
{
  "action": "feedPet",
  "openid": "string",
  "foodId": "string"
}
```

**返回数据**
```json
{
  "code": 0,
  "data": {
    "pet": {
      "mood": 100,        // 心情值
      "energy": 80,       // 体力值
      "loveEnergy": 50    // 爱心能量
    }
  }
}
```

#### 3.3 发送时光胶囊
**请求参数**
```json
{
  "action": "sendCapsule",
  "openid": "string",
  "message": "string",
  "openDate": "2024-12-31"  // 开启日期
}
```

#### 3.4 开始问答
**请求参数**
```json
{
  "action": "startQuiz",
  "openid": "string"
}
```

**返回数据**
```json
{
  "code": 0,
  "data": {
    "roundId": "string",
    "question": "今天你想和TA做什么？",
    "options": ["看电影", "散步", "做饭", "旅行"]
  }
}
```

### 4. process_anime

AI图像处理服务

**请求参数**
```json
{
  "openid": "string",
  "imageUrl": "string",     // 图片URL
  "style": "国风工笔",      // 风格类型
  "vip": false             // 是否VIP
}
```

**返回数据**
```json
{
  "code": 0,
  "data": {
    "processedUrl": "string",  // 处理后图片URL
    "score": 92,              // 浪漫指数
    "processingTime": 3000    // 处理时间(毫秒)
  }
}
```

## 数据库字段说明

### users 集合
```json
{
  "_openid": "string",         // 用户唯一标识
  "partnerId": "string",       // 伴侣ID
  "bindDate": "2024-01-01",    // 绑定日期
  "avatar": "string",          // 头像URL
  "nickname": "string",        // 昵称
  "vip": {
    "level": 0,                // VIP等级
    "expireDate": "2024-12-31" // 到期日期
  },
  "stats": {
    "totalPhotos": 100,        // 总照片数
    "continuousDays": 7,       // 连续天数
    "loveEnergy": 500          // 爱心能量
  }
}
```

### pets 集合
```json
{
  "_openid": "string",         // 主人ID
  "name": "string",            // 宠物名字
  "type": "cat",               // 宠物类型
  "mood": 100,                 // 心情值(0-100)
  "energy": 80,                // 体力值(0-100)
  "loveEnergy": 50,            // 爱心能量
  "travel": {
    "destination": "巴黎",      // 当前目的地
    "returnDate": "2024-01-02", // 返回日期
    "progress": 0.3            // 旅行进度
  },
  "lastFeed": "2024-01-01T10:00:00"
}
```

### capsules 集合
```json
{
  "_id": "string",
  "senderId": "string",        // 发送者ID
  "receiverId": "string",      // 接收者ID
  "message": "string",         // 消息内容
  "createDate": "2024-01-01",  // 创建日期
  "openDate": "2024-02-14",    // 开启日期
  "isOpened": false,           // 是否已开启
  "type": "love"               // 胶囊类型
}
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1001 | 参数错误 |
| 1002 | 用户不存在 |
| 1003 | 未绑定伴侣 |
| 1004 | 爱心能量不足 |
| 1005 | VIP权限不足 |
| 1006 | 今日已签到 |
| 1007 | 宠物状态异常 |
| 1008 | 胶囊存储已满 |
| 2001 | AI处理失败 |
| 2002 | 图片格式不支持 |
| 3001 | 数据库错误 |
| 3002 | 网络超时 |