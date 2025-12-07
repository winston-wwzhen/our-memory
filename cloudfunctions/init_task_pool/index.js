// cloudfunctions/init_task_pool/index.js
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 1. 每日任务 (保持不变)
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

// 2. 彩蛋配置 (保持不变)
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

// 3. 默契问答题库 (QUIZ POOL) - 🟢 核心修正：标记 is_person
// 规则：前两个选项必须是 [我, TA] 才能使用 is_person 逻辑
const QUIZ_POOL = [
  {
    title: "如果只有一碗面，你会怎么分？",
    options: [
      "我吃面，TA喝汤",
      "我喝汤，TA吃面",
      "一人一半",
      "都不吃，去吃别的",
    ],
    type: "choice",
    is_person: true,
  },
  { title: "第一次约会，TA穿了什么颜色的衣服？", options: [], type: "text" },
  {
    title: "如果中了一千万，第一件事做什么？",
    options: ["买房/买车", "环游世界", "存起来/理财", "辞职！"],
    type: "choice",
  },
  {
    title: "谁更爱吃醋？",
    options: ["我", "TA", "差不多", "都不爱吃"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁做家务比较多？",
    options: ["我", "TA", "轮流做", "扫地机器人做"],
    type: "choice",
    is_person: true,
  },
  { title: "最想一起去旅游的城市是？", options: [], type: "text" },
  {
    title: "吵架后一般谁先低头？",
    options: ["我", "TA", "看情况", "冷战到底"],
    type: "choice",
    is_person: true,
  },
  {
    title: "如果可以养一只宠物，选什么？",
    options: ["猫", "狗", "兔子/仓鼠", "不养"],
    type: "choice",
  },
  {
    title: "火锅必点的一道菜是？",
    options: ["毛肚/鸭肠", "肥牛/羊肉", "虾滑/丸子", "蔬菜拼盘"],
    type: "choice",
  },
  {
    title: "谁的睡相更差？",
    options: ["我", "TA", "都挺好", "半斤八两"],
    type: "choice",
    is_person: true,
  },
  {
    title: "最喜欢对方身体的哪个部位？",
    options: ["眼睛/鼻子", "手/腿", "腹肌/身材", "全部"],
    type: "choice",
  },
  {
    title: "周末更喜欢怎么过？",
    options: ["宅家追剧", "出门逛街/探店", "户外运动", "朋友聚会"],
    type: "choice",
  },
  {
    title: "谁更喜欢赖床？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更路痴？",
    options: ["我", "TA", "都是活地图", "都是路痴"],
    type: "choice",
    is_person: true,
  },
  {
    title: "两人谁的异性缘更好？",
    options: ["我", "TA", "差不多", "没关注过"],
    type: "choice",
    is_person: true,
  },
  { title: "最受不了对方的一个缺点是？", options: [], type: "text" },
  { title: "如果互换身体一天，最想做的事是？", options: [], type: "text" },
  {
    title: "谁更会花钱？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "更喜欢哪种约会方式？",
    options: ["看电影吃饭", "户外爬山", "逛博物馆/看展", "在家躺着"],
    type: "choice",
  },
  {
    title: "谁更粘人？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  { title: "如果有时光机，想回到几岁？", options: [], type: "text" },
  {
    title: "谁的厨艺更好？",
    options: ["我", "TA", "都是黑暗料理", "点外卖最强"],
    type: "choice",
    is_person: true,
  },
  {
    title: "更喜欢猫还是狗？",
    options: ["猫派", "狗派", "都喜欢", "都不喜欢"],
    type: "choice",
  },
  {
    title: "谁更爱哭？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更爱玩游戏？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "最喜欢的季节是？",
    options: ["春", "夏", "秋", "冬"],
    type: "choice",
  },
  {
    title: "谁更怕虫子？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "如果只能带一样东西去荒岛，带什么？",
    options: ["手机", "刀/火种", "爱人", "很多食物"],
    type: "choice",
  },
  {
    title: "谁的酒量更好？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "更喜欢咸口还是甜口？",
    options: ["咸党", "甜党", "辣党", "都行"],
    type: "choice",
  },
  {
    title: "谁更爱拍照？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更会砍价？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "更喜欢早睡早起还是熬夜？",
    options: ["早睡早起", "熬夜修仙"],
    type: "choice",
  },
  {
    title: "谁更爱干净？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "如果吵架了，希望对方怎么哄？",
    options: ["抱抱", "买好吃的", "讲道理", "冷静一会"],
    type: "choice",
  },
  {
    title: "谁更喜欢制造浪漫？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁的记性更好？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  { title: "最喜欢对方穿什么风格的衣服？", options: [], type: "text" },
  {
    title: "谁更爱八卦？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  { title: "更喜欢听谁的歌？", options: [], type: "text" },
  {
    title: "谁更喜欢做计划？",
    options: ["我", "TA", "随遇而安"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更喜欢吃零食？",
    options: ["我", "TA"],
    type: "choice",
    is_person: true,
  },
  {
    title: "谁更害怕看恐怖片？",
    options: ["我", "TA"],
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
