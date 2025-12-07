// cloudfunctions/init_task_pool/index.js
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 1. 每日任务
const TASKS = [
  {
    title: "摸头杀",
    description: "伸出手宠溺地摸摸 TA 的头。",
    icon: "💆‍♂️",
    difficulty: 1,
  },
  {
    title: "眼神挑战",
    description: "深情对视 10 秒钟，不许笑！",
    icon: "👀",
    difficulty: 2,
  },
  {
    title: "合体爱心",
    description: "一人出一只手，默契配合比一个大大的爱心。",
    icon: "🫶",
    difficulty: 2,
  },
  {
    title: "云干杯",
    description: "拿着水杯碰一下，庆祝今天！",
    icon: "🍻",
    difficulty: 1,
  },
  {
    title: "影子之吻",
    description: "拍下你们亲密的影子。",
    icon: "👥",
    difficulty: 2,
  },
  {
    title: "最丑鬼脸",
    description: "一起做个最丑的鬼脸！",
    icon: "🤪",
    difficulty: 1,
  },
  {
    title: "奥特曼光波",
    description: "发射动感光波，击中 TA！",
    icon: "⚡",
    difficulty: 3,
  },
  {
    title: "借位魔法",
    description: "利用透视把 TA 捧在手心。",
    icon: "🤏",
    difficulty: 4,
  },
  {
    title: "同步震惊",
    description: "假装看到了外星人。",
    icon: "😱",
    difficulty: 2,
  },
  {
    title: "发型互换",
    description: "搞怪时刻！互换发型。",
    icon: "💇",
    difficulty: 3,
  },
  {
    title: "衣柜大作战",
    description: "互换一件上衣穿！",
    icon: "👕",
    difficulty: 4,
  },
  {
    title: "霸道壁咚",
    description: "来一个霸气的壁咚！",
    icon: "🧱",
    difficulty: 2,
  },
  {
    title: "牙膏画心",
    description: "用牙膏在镜子上画爱心合影。",
    icon: "🪞",
    difficulty: 2,
  },
  {
    title: "模仿表情包",
    description: "神还原一个表情包。",
    icon: "🐸",
    difficulty: 2,
  },
  {
    title: "背影杀手",
    description: "拍一张充满故事感的背影。",
    icon: "🔙",
    difficulty: 1,
  },
  {
    title: "投喂时刻",
    description: "假装喂食给镜头（TA）。",
    icon: "🍟",
    difficulty: 1,
  },
  {
    title: "发丝比心",
    description: "用头发比个心。",
    icon: "💕",
    difficulty: 3,
  },
  {
    title: "暗中观察",
    description: "只露出两双眼睛。",
    icon: "🫣",
    difficulty: 2,
  },
  {
    title: "我是大款",
    description: "拿零钱扇风，假装亿万富翁。",
    icon: "😎",
    difficulty: 2,
  },
  {
    title: "猫猫狗狗",
    description: "模仿宠物的睡姿。",
    icon: "🐱",
    difficulty: 2,
  },
  {
    title: "天空合影",
    description: "以蓝天为背景仰拍。",
    icon: "☁️",
    difficulty: 3,
  },
  {
    title: "对镜自拍",
    description: "记录今天的 OOTD。",
    icon: "🤳",
    difficulty: 1,
  },
  {
    title: "足迹合影",
    description: "拍下两人的鞋子。",
    icon: "👟",
    difficulty: 1,
  },
  {
    title: "睡前晚安",
    description: "拍一张睡眼惺忪的素颜照。",
    icon: "🌙",
    difficulty: 1,
  },
  {
    title: "这是几？",
    description: "比出手势数字让对方猜。",
    icon: "✌️",
    difficulty: 1,
  },
  {
    title: "大力士",
    description: "假装把对方抱起来。",
    icon: "💪",
    difficulty: 3,
  },
  {
    title: "蒙面大侠",
    description: "把脸蒙起来只露眼睛。",
    icon: "🥷",
    difficulty: 1,
  },
  {
    title: "比比谁脸大",
    description: "怼近镜头比脸大。",
    icon: "🌝",
    difficulty: 1,
  },
  {
    title: "我在生气",
    description: "一人生气，一人求饶。",
    icon: "😤",
    difficulty: 2,
  },
  {
    title: "假装在度假",
    description: "假装在马尔代夫。",
    icon: "🏖️",
    difficulty: 2,
  },
  {
    title: "头顶长草",
    description: "借位让头顶长树。",
    icon: "🌱",
    difficulty: 3,
  },
  { title: "眼镜封印", description: "眼镜反着戴。", icon: "👓", difficulty: 1 },
  {
    title: "吃货本色",
    description: "拍下大口吃东西的样子。",
    icon: "🍔",
    difficulty: 1,
  },
  {
    title: "沉思者",
    description: "模仿雕塑《思想者》。",
    icon: "🤔",
    difficulty: 2,
  },
  {
    title: "武林高手",
    description: "摆一个功夫 Pose。",
    icon: "🥋",
    difficulty: 2,
  },
  {
    title: "这就是爱",
    description: "用身体拼出 LOVE。",
    icon: "🙆",
    difficulty: 3,
  },
  {
    title: "谁是木头人",
    description: "保持高难度动作不动。",
    icon: "🗽",
    difficulty: 2,
  },
  {
    title: "美妆博主",
    description: "假装给对方化妆。",
    icon: "💄",
    difficulty: 1,
  },
  {
    title: "我是歌手",
    description: "拿遥控器当麦克风。",
    icon: "🎤",
    difficulty: 1,
  },
  {
    title: "大佬坐姿",
    description: "摆出最拽的坐姿。",
    icon: "👑",
    difficulty: 2,
  },
  {
    title: "躲猫猫",
    description: "只露身体一部分。",
    icon: "👻",
    difficulty: 2,
  },
  {
    title: "你是我的眼",
    description: "捂住对方眼睛猜猜我是谁。",
    icon: "🙈",
    difficulty: 1,
  },
  {
    title: "叠叠乐",
    description: "下巴搁在对方肩膀上。",
    icon: "🧱",
    difficulty: 2,
  },
  {
    title: "比比谁腿长",
    description: "利用广角拍大长腿。",
    icon: "🦵",
    difficulty: 2,
  },
  {
    title: "假装在加班",
    description: "做出痛苦抓狂的表情。",
    icon: "💻",
    difficulty: 1,
  },
  {
    title: "我是超人",
    description: "握拳向前假装飞行。",
    icon: "🦸",
    difficulty: 2,
  },
  {
    title: "反向拥抱",
    description: "背对背反向拥抱。",
    icon: "🥨",
    difficulty: 4,
  },
  {
    title: "发呆比赛",
    description: "看谁眼神更呆滞。",
    icon: "🤤",
    difficulty: 1,
  },
  { title: "我是花朵", description: "双手托腮笑。", icon: "🌻", difficulty: 1 },
  {
    title: "这就是街舞",
    description: "摆一个最酷的 Hip-hop 姿势，Swag！",
    icon: "🧢",
    difficulty: 2,
  },
];

// 2. 彩蛋配置
const EGG_CONFIGS = [
  {
    _id: "gardener",
    title: "辛勤园丁",
    desc: "成功培育并收获了第一朵玫瑰 🌹",
    icon: "🌹",
    type: "collection",
    bonus: 150,
    is_hidden: false,
    repeatable: false,
  },
  {
    _id: "talkative",
    title: "话痨",
    desc: "在留言板累计发布 10 条留言",
    icon: "💬",
    type: "interaction",
    bonus: 100,
    is_hidden: false,
    repeatable: false,
  },
  {
    _id: "decision_king",
    title: "命运主宰",
    desc: "累计使用决定转盘 20 次",
    icon: "🎲",
    type: "interaction",
    bonus: 88,
    is_hidden: false,
    repeatable: false,
  },
  {
    _id: "long_love",
    title: "长长久久",
    desc: "与 TA 关联天数达到 99 天",
    icon: "♾️",
    type: "collection",
    bonus: 520,
    is_hidden: false,
    repeatable: false,
  },
  {
    _id: "night_owl",
    title: "夜猫子",
    desc: "深夜 0-4 点还没睡，是在想 TA 吗？",
    icon: "🦉",
    type: "interaction",
    bonus: 66,
    is_hidden: true,
    repeatable: false,
  },
  {
    _id: "early_bird",
    title: "早安吻",
    desc: "在清晨 5:00 - 8:00 完成打卡",
    icon: "☀️",
    type: "interaction",
    bonus: 50,
    is_hidden: true,
    repeatable: false,
  },
  {
    _id: "lucky_star",
    title: "天选之子",
    desc: "获得了一张评分 99+ 的完美 AI 照片",
    icon: "✨",
    type: "collection",
    bonus: 200,
    is_hidden: true,
    repeatable: false,
  },
  {
    _id: "blue_melancholy",
    title: "蓝色忧郁",
    desc: "在留言板贴了一张蓝色的便签",
    icon: "💙",
    type: "interaction",
    bonus: 20,
    is_hidden: true,
    repeatable: false,
  },
  {
    _id: "rich_spender",
    title: "挥金如土",
    desc: "兑换了一张价值超过 100 玫瑰的特权券",
    icon: "💰",
    type: "collection",
    bonus: 188,
    is_hidden: true,
    repeatable: false,
  },
  {
    _id: "peace_dove",
    title: "和平鸽",
    desc: "使用了“和好卡”或“原谅卡”",
    icon: "🕊️",
    type: "collection",
    bonus: 500,
    is_hidden: true,
    repeatable: false,
  },
  {
    _id: "lucky_goddess",
    title: "幸运女神",
    desc: "偶遇了幸运女神，获得额外奖励！",
    icon: "🧚‍♀️",
    type: "interaction",
    bonus: 20,
    is_hidden: true,
    repeatable: true,
  },
  {
    _id: "time_traveler",
    title: "时间领主",
    desc: "埋下了一个封印期超过 1 年的时光胶囊",
    icon: "🕰️",
    type: "collection",
    bonus: 365,
    is_hidden: true,
    repeatable: false,
  },
  {
    _id: "moonlight_box",
    title: "月光宝盒",
    desc: "在深夜埋藏了时光胶囊，那是心底的秘密",
    icon: "🌙",
    type: "interaction",
    bonus: 66,
    is_hidden: true,
    repeatable: false,
  },
  {
    _id: "worth_the_wait",
    title: "守得云开",
    desc: "成功开启了第一个时光胶囊，等待是值得的",
    icon: "🗝️",
    type: "collection",
    bonus: 100,
    is_hidden: false,
    repeatable: false,
  },
  {
    _id: "soul_mate",
    title: "灵魂伴侣",
    desc: "在默契问答中选择了相同的答案",
    icon: "💞",
    type: "interaction",
    bonus: 20,
    is_hidden: true,
    repeatable: true,
  },
];

// 3. 默契问答题库 (QUIZ POOL)
// 规则：前两个选项必须是 [我, TA] 才能使用 is_person 逻辑
const QUIZ_POOL = [
  // === 第一部分：饮食口味 (25题) ===
  {
    title: "豆腐脑吃甜的还是咸的？",
    options: ["甜党", "咸党", "辣党", "不吃豆腐脑"],
    type: "choice",
  },
  {
    title: "吃火锅必点的荤菜是？",
    options: ["毛肚/千层肚", "肥牛/羊肉", "虾滑/丸子", "鸭肠/黄喉"],
    type: "choice",
  },
  {
    title: "喝奶茶通常选几分糖？",
    options: ["全糖/七分", "半糖/五分", "微糖/三分", "无糖"],
    type: "choice",
  },
  {
    title: "谁更爱吃零食？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更挑食？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "早餐更倾向于吃什么？",
    options: ["中式(豆浆油条)", "西式(面包牛奶)", "简单(粥/麦片)", "经常不吃"],
    type: "choice",
  },
  {
    title: "吃薯条沾不沾番茄酱？",
    options: ["必须沾", "原味最好", "沾冰淇淋", "看心情"],
    type: "choice",
  },
  {
    title: "对待香菜的态度是？",
    options: ["超爱吃", "绝对不吃", "不仅吃还生吃", "无所谓"],
    type: "choice",
  },
  {
    title: "谁更能吃辣？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "夏天最喜欢的水果？",
    options: ["西瓜", "葡萄/提子", "桃子", "芒果/榴莲"],
    type: "choice",
  },
  {
    title: "谁做饭比较好吃？",
    options: ["我", "TA", "都不做饭", "半斤八两"],
    type: "choice",
    is_person: true,
  },
  {
    title: "吃西瓜喜欢怎么吃？",
    options: ["切块用叉子", "切片拿着吃", "用勺子挖", "榨汁喝"],
    type: "choice",
  },
  {
    title: "更喜欢喝哪种饮料？",
    options: ["碳酸饮料", "茶/咖啡", "果汁", "白开水"],
    type: "choice",
  },
  {
    title: "谁更喜欢吃夜宵？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "吃鸡蛋喜欢什么熟度？",
    options: ["全熟", "溏心/半熟", "生的", "不吃蛋黄"],
    type: "choice",
  },
  {
    title: "最讨厌的蔬菜是？",
    options: ["苦瓜", "胡萝卜", "洋葱/蒜", "没有特别讨厌的"],
    type: "choice",
  },
  {
    title: "吃面条喜欢喝汤吗？",
    options: ["喝光光", "喝一点", "只吃面", "看汤好不好喝"],
    type: "choice",
  },
  {
    title: "谁更喜欢尝试新餐厅？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "更喜欢哪种口味的菜？",
    options: ["酸甜口", "麻辣口", "咸鲜口", "清淡口"],
    type: "choice",
  },
  {
    title: "谁更爱吃甜食？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "吃汤圆喜欢什么馅？",
    options: ["黑芝麻", "花生", "肉馅", "水果/其他"],
    type: "choice",
  },
  {
    title: "吃牛排通常点几分熟？",
    options: ["全熟", "七分熟", "五分熟", "三分熟"],
    type: "choice",
  },
  {
    title: "谁更爱喝水？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "吃饺子蘸什么？",
    options: ["醋", "酱油", "辣椒油", "不蘸料"],
    type: "choice",
  },
  {
    title: "谁更爱吃海鲜？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },

  // === 第二部分：生活习惯 (25题) ===
  {
    title: "谁更喜欢赖床？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更爱干净/整洁？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "洗澡通常需要多久？",
    options: ["10分钟内", "10-20分钟", "20-40分钟", "40分钟以上"],
    type: "choice",
  },
  {
    title: "谁更常熬夜？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "睡觉习惯什么姿势？",
    options: ["平躺", "侧卧", "趴着", "卷成一团"],
    type: "choice",
  },
  {
    title: "谁的呼噜声更大？",
    options: ["我", "TA", "都不打呼", "差不多"],
    type: "choice",
    is_person: true,
  },
  {
    title: "出门准备谁花的时间更久？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢做家务？",
    options: ["我", "TA", "都不喜欢", "轮流做"],
    type: "choice",
    is_person: true,
  },
  {
    title: "挤牙膏是从哪里开始挤？",
    options: ["底部", "中间", "头部", "随意乱挤"],
    type: "choice",
  },
  {
    title: "谁更丢三落四？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "冬天睡觉穿袜子吗？",
    options: ["穿", "不穿", "偶尔穿", "穿一半脱掉"],
    type: "choice",
  },
  {
    title: "谁更怕冷？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更怕热？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "上厕所玩手机吗？",
    options: ["必须带手机", "偶尔带", "专心上厕所", "带书看"],
    type: "choice",
  },
  {
    title: "谁更喜欢网购？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "快递到了谁拆得更快？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢宅在家里？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢断舍离？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "睡觉必须关全黑吗？",
    options: ["全黑", "留小夜灯", "开着灯也能睡", "看手机睡着"],
    type: "choice",
  },
  {
    title: "谁更喜欢定闹钟？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁起床气比较大？",
    options: ["我", "TA", "都没有", "都有"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢叠被子？",
    options: ["我", "TA", "都不叠", "看心情"],
    type: "choice",
    is_person: true,
  },
  {
    title: "洗完头会马上吹干吗？",
    options: ["立刻吹干", "包一会儿再吹", "自然干", "不洗头"],
    type: "choice",
  },
  {
    title: "谁更喜欢喷香水？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更爱照镜子？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },

  // === 第三部分：恋爱三观 (30题) ===
  {
    title: "谁更爱吃醋？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "吵架后一般谁先低头？",
    options: ["我", "TA", "看情况", "冷战到底"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更粘人？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更注重仪式感？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁记得的纪念日更多？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢秀恩爱？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "恋爱中谁更主动？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "如果前任联系你，你会？",
    options: ["告诉现任", "直接拉黑", "礼貌回复", "假装没看见"],
    type: "choice",
  },
  {
    title: "谁更喜欢制造惊喜？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "约会迟到谁更久？",
    options: ["我", "TA", "都很准时", "都迟到"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更会撒娇？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更爱说甜言蜜语？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "能接受异地恋吗？",
    options: ["能，真爱无敌", "不能，太痛苦", "看情况", "已经在异地"],
    type: "choice",
  },
  {
    title: "谁更容易缺乏安全感？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢肢体接触（抱抱亲亲）？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "手机密码会告诉对方吗？",
    options: ["会，随便看", "不会，隐私", "说了也记不住", "录了指纹"],
    type: "choice",
  },
  {
    title: "吵架时更倾向于？",
    options: ["立刻解决", "冷静一会", "大吵一架", "离家出走"],
    type: "choice",
  },
  {
    title: "谁更听对方的话？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更在意对方的过去？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢查岗？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁的控制欲更强？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "更喜欢哪种约会？",
    options: ["逛街吃饭", "户外游玩", "宅家看片", "旅行"],
    type: "choice",
  },
  {
    title: "谁更喜欢给对方买东西？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更会哄人？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢唠叨？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢分享日常？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "能接受对方有异性闺蜜/兄弟吗？",
    options: ["完全不能", "能，相信TA", "看熟悉程度", "我也要有"],
    type: "choice",
  },
  {
    title: "谁更喜欢记录生活（拍照/日记）？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更早动心？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁表白的？",
    options: ["我", "TA", "自然而然", "朋友撮合"],
    type: "choice",
    is_person: true,
  },

  // === 第四部分：性格特征 (25题) ===
  {
    title: "谁更外向/社牛？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更理性？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更乐观？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁脾气更急？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁泪点更低？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁笑点更低？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更胆小（怕鬼/虫）？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更有主见？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更细心？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更爱面子？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更有耐心？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更固执？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更幽默？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更有强迫症？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更拖延？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更自律？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更自信？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更容易焦虑？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "遇到困难谁更冷静？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更会照顾人？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更天真/孩子气？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更记仇？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢交朋友？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更好说话/耳根软？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更有正义感？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },

  // === 第五部分：脑洞假设 (25题) ===
  {
    title: "如果中了一千万，第一件事做什么？",
    options: ["买房/买车", "环游世界", "存起来/理财", "辞职"],
    type: "choice",
  },
  {
    title: "如果有超能力，最想要什么？",
    options: ["隐身", "飞行", "读心术", "瞬间移动"],
    type: "choice",
  },
  {
    title: "如果世界末日，最后想吃什么？",
    options: ["火锅", "妈妈做的菜", "爱人做的菜", "满汉全席"],
    type: "choice",
  },
  {
    title: "如果能穿越，想去哪里？",
    options: ["回到过去", "去往未来", "平行宇宙", "留在现在"],
    type: "choice",
  },
  {
    title: "如果变成动物，你会是？",
    options: ["猫", "狗", "鸟", "树懒"],
    type: "choice",
  },
  {
    title: "如果流落荒岛只能带一样，带什么？",
    options: ["爱人", "手机+wifi", "无限食物", "瑞士军刀"],
    type: "choice",
  },
  {
    title: "如果对方变成丧尸，你会？",
    options: ["养起来", "大义灭亲", "让TA咬我", "逃跑"],
    type: "choice",
  },
  {
    title: "如果有下辈子，还想遇见吗？",
    options: ["必须的", "换个身份", "不想了", "看缘分"],
    type: "choice",
  },
  {
    title: "如果能互换身体一天，最想做？",
    options: ["照镜子欣赏", "去澡堂", "帮对方工作", "睡觉"],
    type: "choice",
  },
  {
    title: "如果你是透明人，会做什么？",
    options: ["恶作剧", "偷听秘密", "免费旅游", "睡觉"],
    type: "choice",
  },
  {
    title: "如果必须整容，整哪里？",
    options: ["眼睛", "鼻子", "脸型", "都不整"],
    type: "choice",
  },
  {
    title: "如果能预知未来，想知道什么？",
    options: ["什么时候死", "彩票号码", "世界格局", "不想知道"],
    type: "choice",
  },
  {
    title: "如果只能保留一种感官，保留什么？",
    options: ["视觉", "听觉", "触觉", "味觉"],
    type: "choice",
  },
  {
    title: "如果外星人邀请你去太空，去吗？",
    options: ["立刻去", "带上家人去", "不敢去", "不去，地球好"],
    type: "choice",
  },
  {
    title: "如果能长生不老，愿意吗？",
    options: ["愿意", "不愿意", "如果有钱就愿意", "如果有爱人就愿意"],
    type: "choice",
  },
  {
    title: "如果能删除一段记忆，删什么？",
    options: ["出糗的瞬间", "前任的回忆", "痛苦的经历", "不删，都是宝贵"],
    type: "choice",
  },
  {
    title: "如果对方失忆了，你会？",
    options: ["重新追TA", "帮TA恢复", "离开", "骗TA说欠我钱"],
    type: "choice",
  },
  {
    title: "如果能跟偶像约会，会抛弃现任吗？",
    options: ["想都不用想", "犹豫一下", "带现任一起去", "不会"],
    type: "choice",
  },
  {
    title: "如果捡到神灯，第一个愿望？",
    options: ["暴富", "健康", "再来三个愿望", "世界和平"],
    type: "choice",
  },
  {
    title: "如果能改变性别一天，想体验？",
    options: ["站着嘘嘘", "穿裙子", "被异性追", "没什么想体验"],
    type: "choice",
  },
  {
    title: "如果家里着火，先救什么（除人外）？",
    options: ["手机/电脑", "证件/钱", "宠物", "相册/纪念品"],
    type: "choice",
  },
  {
    title: "如果能拥有一项精通技能，选什么？",
    options: ["外语", "乐器", "编程", "厨艺"],
    type: "choice",
  },
  {
    title: "如果能回到过去改变一件事，改什么？",
    options: ["买比特币", "好好读书", "不认识某人", "不改"],
    type: "choice",
  },
  {
    title: "如果世界上没有手机，你会？",
    options: ["疯掉", "看书/运动", "找人聊天", "睡觉"],
    type: "choice",
  },
  {
    title: "如果能复活一个历史人物，选谁？",
    options: ["秦始皇", "爱因斯坦", "乔布斯", "玛丽莲梦露"],
    type: "choice",
  },

  // === 第六部分：休闲娱乐 (25题) ===
  {
    title: "谁更爱玩游戏？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "玩游戏时，谁更菜？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "周末更喜欢怎么过？",
    options: ["宅家追剧", "出门逛街/探店", "户外运动", "朋友聚会"],
    type: "choice",
  },
  {
    title: "看电影喜欢什么类型？",
    options: ["喜剧/爱情", "悬疑/恐怖", "科幻/动作", "动画/动漫"],
    type: "choice",
  },
  {
    title: "谁更爱听音乐？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "喜欢听谁的歌？",
    options: ["周杰伦", "陈奕迅", "林俊杰", "K-POP/欧美"],
    type: "choice",
  },
  {
    title: "谁唱歌更好听？",
    options: ["我", "TA", "都是歌神", "都是要命"],
    type: "choice",
    is_person: true,
  },
  {
    title: "旅行更喜欢去哪里？",
    options: ["海边度假", "历史古迹", "繁华都市", "山川湖泊"],
    type: "choice",
  },
  {
    title: "旅行时谁负责做攻略？",
    options: ["我", "TA", "一起做", "不做，走到哪算哪"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更爱拍照？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁拍照技术更好？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "更喜欢看书还是看视频？",
    options: ["看书", "看视频/短视频", "都不看", "都看"],
    type: "choice",
  },
  {
    title: "谁更爱刷抖音/短视频？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更关注娱乐圈八卦？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "运动更喜欢哪种？",
    options: ["跑步/健身房", "球类运动", "游泳", "躺着不动"],
    type: "choice",
  },
  {
    title: "谁酒量更好？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "喜欢去酒吧还是KTV？",
    options: ["酒吧", "KTV", "网吧", "回家吧"],
    type: "choice",
  },
  {
    title: "谁更喜欢养宠物？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "更喜欢猫还是狗？",
    options: ["猫", "狗", "都喜欢", "都不喜欢"],
    type: "choice",
  },
  {
    title: "谁打字速度更快？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢逛街买衣服？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "喜欢游乐园的什么项目？",
    options: ["过山车/跳楼机", "旋转木马", "鬼屋", "看表演"],
    type: "choice",
  },
  {
    title: "谁更喜欢看体育比赛？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更会抓娃娃？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "无聊时更倾向于？",
    options: ["找人聊天", "发呆", "吃东西", "玩手机"],
    type: "choice",
  },

  // === 第七部分：职场与理财 (20题) ===
  {
    title: "谁更会花钱？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更会省钱/砍价？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁的存款更多？",
    options: ["我", "TA", "差不多", "都是月光"],
    type: "choice",
    is_person: true,
  },
  {
    title: "工资卡愿意上交吗？",
    options: ["愿意", "不愿意", "各管各的", "设立公共基金"],
    type: "choice",
  },
  {
    title: "谁工作更忙？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更有事业心？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "买东西更看重什么？",
    options: ["价格", "质量", "品牌", "颜值"],
    type: "choice",
  },
  {
    title: "借钱给朋友的态度？",
    options: ["大方借", "看关系", "绝对不借", "问另一半"],
    type: "choice",
  },
  {
    title: "对于奢侈品的态度？",
    options: ["喜欢且买", "喜欢但不买", "无感", "智商税"],
    type: "choice",
  },
  {
    title: "谁更经常点外卖？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢存钱？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "对于彩票的态度？",
    options: ["经常买", "偶尔买", "从不买", "中过奖"],
    type: "choice",
  },
  {
    title: "谁更擅长理财？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "工作受委屈了会怎么做？",
    options: ["跟对象吐槽", "忍着", "辞职", "发朋友圈"],
    type: "choice",
  },
  {
    title: "谁更想早点退休？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "买房更看重什么？",
    options: ["地段", "户型", "价格", "学区"],
    type: "choice",
  },
  {
    title: "谁更喜欢使用信用卡/花呗？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "对于AA制的看法？",
    options: ["支持", "反对", "偶尔可以", "看情况"],
    type: "choice",
  },
  {
    title: "更喜欢大城市还是小城市？",
    options: ["北上广深", "二线城市", "小县城", "农村"],
    type: "choice",
  },
  {
    title: "谁更经常冲动消费？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },

  // === 第八部分：未来与审美 (25题) ===
  {
    title: "谁的穿衣品味更好？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "喜欢对方穿什么风格？",
    options: ["休闲运动", "正装/职业", "日系/可爱", "性感/酷"],
    type: "choice",
  },
  {
    title: "谁更在意发型？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁觉得长胖了？",
    options: ["我", "TA", "都胖了", "都瘦了"],
    type: "choice",
    is_person: true,
  },
  {
    title: "最喜欢对方哪个部位？",
    options: ["眼睛", "手", "身材", "笑容"],
    type: "choice",
  },
  {
    title: "以后想生几个孩子？",
    options: ["一个", "两个", "三个及以上", "丁克"],
    type: "choice",
  },
  {
    title: "孩子跟谁姓？",
    options: ["爸爸", "妈妈", "复姓", "都可以"],
    type: "choice",
  },
  {
    title: "更喜欢男孩还是女孩？",
    options: ["男孩", "女孩", "都喜欢", "只要健康"],
    type: "choice",
  },
  {
    title: "谁更适合带孩子？",
    options: ["我", "TA", "都不适合", "长辈带"],
    type: "choice",
    is_person: true,
  },
  {
    title: "以后想养什么宠物？",
    options: ["猫", "狗", "都养", "不养"],
    type: "choice",
  },
  {
    title: "老了想去哪里养老？",
    options: ["城市", "农村", "海边", "国外"],
    type: "choice",
  },
  {
    title: "谁更想举办盛大婚礼？",
    options: ["我", "TA", "旅行结婚", "简单领证"],
    type: "choice",
    is_person: true,
  },
  {
    title: "家里装修谁说了算？",
    options: ["我", "TA", "商量着来", "设计师"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢过节？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁记得父母生日？",
    options: ["我", "TA", "都记得", "都不记得"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更孝顺？",
    options: ["我", "TA", "都孝顺", "不论这个"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢社交？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁的朋友更多？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更注重隐私？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更想尝试极限运动？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢看书？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更会说话？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢改变？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更念旧？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更爱对方？",
    options: ["我", "TA", "一样爱", "不知道"],
    type: "choice",
    is_person: true,
  },
];

exports.main = async (event, context) => {
  try {
    const initTasks = async () => {
      const count = await db.collection("task_pool").count();
      if (count.total === 0) {
        const res = await db.collection("task_pool").add({ data: TASKS });
        return `Task: 插入 ${res.inserted} 条`;
      }
      return `Task: 已存在 ${count.total} 条`;
    };

    const initEggs = async () => {
      let count = 0;
      for (const egg of EGG_CONFIGS) {
        const { _id, ...eggData } = egg;
        await db.collection("egg_configs").doc(_id).set({ data: eggData });
        count++;
      }
      return `Egg: 更新 ${count} 个`;
    };

    const initQuiz = async () => {
      // 🟢 强制刷新题库，确保 is_person 标记生效
      await db
        .collection("quiz_pool")
        .where({ _id: _.exists(true) })
        .remove();
      const res = await db.collection("quiz_pool").add({ data: QUIZ_POOL });
      return `Quiz: 重置并插入 ${res.inserted} 条`;
    };

    const [taskMsg, eggMsg, quizMsg] = await Promise.all([
      initTasks(),
      initEggs(),
      initQuiz(),
    ]);

    return {
      success: true,
      msg: `${taskMsg} | ${eggMsg} | ${quizMsg}`,
    };
  } catch (err) {
    return {
      success: false,
      msg: "初始化失败",
      error: err,
    };
  }
};
