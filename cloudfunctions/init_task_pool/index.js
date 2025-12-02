// cloudfunctions/init_task_pool/index.js
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// === 1. 每日任务数据 (Task Pool) ===
const TASKS = [
  {
    title: "摸头杀",
    description: "伸出手宠溺地摸摸 TA 的头。💡异地：视频通话时，伸手“摸”屏幕里的 TA。",
    icon: "💆‍♂️",
    difficulty: 1,
  },
  {
    title: "眼神挑战",
    description: "凑近一点，深情对视 10 秒钟，谁先笑场谁就输啦！(记得拍下憋笑的样子)",
    icon: "👀",
    difficulty: 2,
  },
  {
    title: "合体爱心",
    description: "一人出一只手，默契配合比一个大大的爱心。💡异地：拼屏幕！",
    icon: "🫶",
    difficulty: 2,
  },
  {
    title: "云干杯",
    description: "拿着水杯/饮料碰一下，庆祝今天也是开心的一天！🍻",
    icon: "🍻",
    difficulty: 1,
  },
  {
    title: "影子之吻",
    description: "不要露脸，在阳光或路灯下，拍下你们亲密的影子。",
    icon: "👥",
    difficulty: 2,
  },
  {
    title: "最丑鬼脸",
    description: "抛弃偶像包袱，一起做一个最丑的鬼脸！看谁更豁得出去。",
    icon: "🤪",
    difficulty: 1,
  },
  {
    title: "奥特曼光波",
    description: "一人发射动感光波，另一人假装被击中飞出去！biu biu biu~",
    icon: "⚡",
    difficulty: 3,
  },
  {
    title: "借位魔法",
    description: "利用远近透视，试着把 TA “捧”在手心里，或者把 TA “吃”掉！",
    icon: "🤏",
    difficulty: 4,
  },
  {
    title: "同步震惊",
    description: "一起张大嘴巴，假装看到了外星人，看谁表情最夸张。",
    icon: "😱",
    difficulty: 2,
  },
  {
    title: "发型互换",
    description: "搞怪时刻！试着把你的头发/假发片放到 TA 头上，或者用手给 TA 抓个鸡窝头。",
    icon: "💇",
    difficulty: 3,
  },
  {
    title: "衣柜大作战",
    description: "互换一件上衣穿（如果穿得下的话），看看谁更有反差萌！",
    icon: "👕",
    difficulty: 4,
  },
  {
    title: "霸道壁咚",
    description: "找一面墙，来一个霸气的壁咚！眼神要犀利，不许笑场！",
    icon: "🧱",
    difficulty: 2,
  },
  {
    title: "牙膏画心",
    description: "对着镜子，用牙膏泡沫在镜子上画个爱心，然后两人在心里面合影。",
    icon: "🪞",
    difficulty: 2,
  },
  {
    title: "模仿表情包",
    description: "找一个你们最爱用的表情包（比如那是啥.jpg），神还原它！",
    icon: "🐸",
    difficulty: 2,
  },
  {
    title: "背影杀手",
    description: "背对背坐着或者站着，只拍充满故事感的背影。",
    icon: "🔙",
    difficulty: 1,
  },
  {
    title: "投喂时刻",
    description: "拿着好吃的假装喂给镜头（也就是喂给屏幕对面的 TA）。",
    icon: "🍟",
    difficulty: 1,
  },
  {
    title: "发丝比心",
    description: "女生可以用两撮头发在额头前比个心，男生... 看着办！",
    icon: "💕",
    difficulty: 3,
  },
  {
    title: "暗中观察",
    description: "躲在门后或者被子里，只露出两双眼睛，暗中观察这个世界。",
    icon: "🫣",
    difficulty: 2,
  },
  {
    title: "我是大款",
    description: "戴上墨镜，把所有零钱拿出来扇风，假装自己是亿万富翁。",
    icon: "😎",
    difficulty: 2,
  },
  {
    title: "猫猫狗狗",
    description: "模仿家里宠物（或者云宠物）的睡姿或表情。",
    icon: "🐱",
    difficulty: 2,
  },
  {
    title: "天空合影",
    description: "把手机放在低处仰拍，以蓝天白云为背景，拍出青春感！",
    icon: "☁️",
    difficulty: 3,
  },
  {
    title: "对镜自拍",
    description: "最经典的打卡！找一面镜子，记录今天的 OOTD (今日穿搭)。",
    icon: "🤳",
    difficulty: 1,
  },
  {
    title: "足迹合影",
    description: "低头拍一张两人的鞋子合影，未来的路一起走。",
    icon: "👟",
    difficulty: 1,
  },
  {
    title: "睡前晚安",
    description: "拍一张睡眼惺忪的素颜照/视频截图，互道晚安。",
    icon: "🌙",
    difficulty: 1,
  },
  {
    title: "这是几？",
    description: "对着镜头比出手势数字，另一个人猜猜代表什么意思（比如纪念日）。",
    icon: "✌️",
    difficulty: 1,
  },
  {
    title: "大力士",
    description: "一人假装把另一人背起来/抱起来（注意安全！摆拍即可）。",
    icon: "💪",
    difficulty: 3,
  },
  {
    title: "蒙面大侠",
    description: "用围巾、口罩或衣服把脸蒙起来，只露眼睛，神秘感拉满。",
    icon: "🥷",
    difficulty: 1,
  },
  {
    title: "比比谁脸大",
    description: "脸贴脸怼近镜头，看看谁的脸占的屏幕面积大！",
    icon: "🌝",
    difficulty: 1,
  },
  {
    title: "我在生气",
    description: "一人假装生气叉腰，另一人假装下跪求饶（演技浮夸一点！）。",
    icon: "😤",
    difficulty: 2,
  },
  {
    title: "假装在度假",
    description: "戴上墨镜，拿杯饮料，假装我们在马尔代夫（背景可以是床单）。",
    icon: "🏖️",
    difficulty: 2,
  },
  {
    title: "头顶长草",
    description: "找个花花草草做背景，借位让头顶“长”出一棵树或一朵花。",
    icon: "🌱",
    difficulty: 3,
  },
  {
    title: "眼镜封印",
    description: "如果你有眼镜，反着戴或者挂在头顶；没有就用手圈两个圈。",
    icon: "👓",
    difficulty: 1,
  },
  {
    title: "吃货本色",
    description: "拍下今天吃过最好吃的东西，或者正在大口吃东西的样子。",
    icon: "🍔",
    difficulty: 1,
  },
  {
    title: "沉思者",
    description: "模仿罗丹的雕塑《思想者》，做出深沉思考的样子。",
    icon: "🤔",
    difficulty: 2,
  },
  {
    title: "武林高手",
    description: "摆一个中国功夫的 Pose！白鹤亮翅！",
    icon: "🥋",
    difficulty: 2,
  },
  {
    title: "这就是爱",
    description: "用肢体语言拼出 L-O-V-E 的其中一个字母。",
    icon: "🙆",
    difficulty: 3,
  },
  {
    title: "谁是木头人",
    description: "保持一个高难度动作不动，拍照定格！",
    icon: "🗽",
    difficulty: 2,
  },
  {
    title: "美妆博主",
    description: "拿着口红或眉笔，假装在给对方（或自己）化妆。",
    icon: "💄",
    difficulty: 1,
  },
  {
    title: "我是歌手",
    description: "拿任何东西（遥控器、梳子）当麦克风，深情演唱。",
    icon: "🎤",
    difficulty: 1,
  },
  {
    title: "大佬坐姿",
    description: "翘起二郎腿，手搭凉棚，摆出全场我最拽的姿势。",
    icon: "👑",
    difficulty: 2,
  },
  {
    title: "躲猫猫",
    description: "只露出身体的一部分（比如一只手、一只眼睛），让 AI 猜猜你是谁。",
    icon: "👻",
    difficulty: 2,
  },
  {
    title: "你是我的眼",
    description: "一人从后面捂住另一人的眼睛，猜猜我是谁？",
    icon: "🙈",
    difficulty: 1,
  },
  {
    title: "叠叠乐",
    description: "把下巴搁在对方的头顶/肩膀上，叠罗汉！",
    icon: "🧱",
    difficulty: 2,
  },
  {
    title: "比比谁腿长",
    description: "伸出腿，利用广角镜头，拍出两米大长腿的既视感。",
    icon: "🦵",
    difficulty: 2,
  },
  {
    title: "假装在加班",
    description: "对着电脑/书本做出极其痛苦抓狂的表情。",
    icon: "💻",
    difficulty: 1,
  },
  {
    title: "我是超人",
    description: "一只手握拳向前伸，假装正在飞行！",
    icon: "🦸",
    difficulty: 2,
  },
  {
    title: "反向拥抱",
    description: "试着背对背，手反过来牵手或者拥抱，挑战柔韧性。",
    icon: "🥨",
    difficulty: 4,
  },
  {
    title: "发呆比赛",
    description: "双眼无神，嘴巴微张，看谁看起来更不太聪明的样子。",
    icon: "🤤",
    difficulty: 1,
  },
  {
    title: "我是花朵",
    description: "双手托腮，把脸当成花蕊，笑得像花儿一样。",
    icon: "🌻",
    difficulty: 1,
  },
  {
    title: "这就是街舞",
    description: "摆一个最酷的 Hip-hop 姿势，Swag！",
    icon: "🧢",
    difficulty: 2,
  },
];

// === 2. 彩蛋配置数据 (Egg Configs) ===
const EGG_CONFIGS = [
  // 🟢 基础成就类 (Collection)
  {
    _id: "first_blood",
    title: "初露锋芒",
    desc: "开启纪念册的第一天，故事开始啦！",
    icon: "🌱",
    type: "collection",
    bonus: 50,
    is_hidden: false,
    repeatable: false
  },
  {
    _id: "gardener",
    title: "辛勤园丁",
    desc: "成功培育并收获了第一朵玫瑰 🌹",
    icon: "🌹",
    type: "collection",
    bonus: 150,
    is_hidden: false,
    repeatable: false
  },
  {
    _id: "talkative",
    title: "话痨",
    desc: "在留言板累计发布 10 条留言",
    icon: "💬",
    type: "interaction",
    bonus: 100,
    is_hidden: false,
    repeatable: false
  },
  {
    _id: "decision_king",
    title: "命运主宰",
    desc: "累计使用决定转盘 20 次",
    icon: "🎲",
    type: "interaction",
    bonus: 88,
    is_hidden: false,
    repeatable: false
  },
  {
    _id: "long_love",
    title: "长长久久",
    desc: "与 TA 关联天数达到 99 天",
    icon: "♾️",
    type: "collection",
    bonus: 520,
    is_hidden: false,
    repeatable: false
  },

  // 🔵 隐藏惊喜类 (Hidden)
  {
    _id: "night_owl",
    title: "夜猫子",
    desc: "深夜 0-4 点还没睡，是在想 TA 吗？",
    icon: "🦉",
    type: "interaction",
    bonus: 66,
    is_hidden: true,
    repeatable: false
  },
  {
    _id: "early_bird",
    title: "早安吻",
    desc: "在清晨 5:00 - 8:00 完成打卡",
    icon: "☀️",
    type: "interaction",
    bonus: 50,
    is_hidden: true,
    repeatable: false
  },
  {
    _id: "lucky_star",
    title: "天选之子",
    desc: "获得了一张评分 99+ 的完美 AI 照片",
    icon: "✨",
    type: "collection",
    bonus: 200,
    is_hidden: true,
    repeatable: false
  },
  {
    _id: "blue_melancholy",
    title: "蓝色忧郁",
    desc: "在留言板贴了一张蓝色的便签",
    icon: "💙",
    type: "interaction",
    bonus: 20,
    is_hidden: true,
    repeatable: false
  },
  {
    _id: "rich_spender",
    title: "挥金如土",
    desc: "兑换了一张价值超过 100 玫瑰的特权券",
    icon: "💰",
    type: "collection",
    bonus: 188,
    is_hidden: true,
    repeatable: false
  },
  {
    _id: "peace_dove",
    title: "和平鸽",
    desc: "使用了“和好卡”或“原谅卡”",
    icon: "🕊️",
    type: "collection",
    bonus: 500, 
    is_hidden: true,
    repeatable: false
  },

  // 🔴 可重复触发类 (Repeatable - Lucky Event)
  {
    _id: "lucky_goddess",
    title: "幸运女神",
    desc: "偶遇了幸运女神，获得额外奖励！",
    icon: "🧚‍♀️",
    type: "interaction",
    bonus: 20,
    is_hidden: true,
    repeatable: true,  // 🌟 可重复触发
  },

  const EGG_CONFIGS = [
    // 🟢 基础成就类
    {
      _id: "first_blood",
      title: "初露锋芒",
      desc: "开启纪念册的第一天，故事开始啦！",
      icon: "🌱",
      type: "collection",
      bonus: 50,
      is_hidden: false,
      repeatable: false
    },
    {
      _id: "gardener",
      title: "辛勤园丁",
      desc: "成功培育并收获了第一朵玫瑰 🌹",
      icon: "🌹",
      type: "collection",
      bonus: 150,
      is_hidden: false,
      repeatable: false
    },
    {
      _id: "talkative",
      title: "话痨",
      desc: "在留言板累计发布 10 条留言",
      icon: "💬",
      type: "interaction",
      bonus: 100,
      is_hidden: false,
      repeatable: false
    },
    {
      _id: "decision_king",
      title: "命运主宰",
      desc: "累计使用决定转盘 20 次",
      icon: "🎲",
      type: "interaction",
      bonus: 88,
      is_hidden: false,
      repeatable: false
    },
    {
      _id: "long_love",
      title: "长长久久",
      desc: "与 TA 关联天数达到 99 天",
      icon: "♾️",
      type: "collection",
      bonus: 520,
      is_hidden: false,
      repeatable: false
    },
  
    // 🔵 隐藏惊喜类
    {
      _id: "night_owl",
      title: "夜猫子",
      desc: "深夜 0-4 点还没睡，是在想 TA 吗？",
      icon: "🦉",
      type: "interaction",
      bonus: 66,
      is_hidden: true,
      repeatable: false
    },
    {
      _id: "early_bird",
      title: "早安吻",
      desc: "在清晨 5:00 - 8:00 完成打卡",
      icon: "☀️",
      type: "interaction",
      bonus: 50,
      is_hidden: true,
      repeatable: false
    },
    {
      _id: "lucky_star",
      title: "天选之子",
      desc: "获得了一张评分 99+ 的完美 AI 照片",
      icon: "✨",
      type: "collection",
      bonus: 200,
      is_hidden: true,
      repeatable: false
    },
    {
      _id: "blue_melancholy",
      title: "蓝色忧郁",
      desc: "在留言板贴了一张蓝色的便签",
      icon: "💙",
      type: "interaction",
      bonus: 20,
      is_hidden: true,
      repeatable: false
    },
    {
      _id: "rich_spender",
      title: "挥金如土",
      desc: "兑换了一张价值超过 100 玫瑰的特权券",
      icon: "💰",
      type: "collection",
      bonus: 188,
      is_hidden: true,
      repeatable: false
    },
    {
      _id: "peace_dove",
      title: "和平鸽",
      desc: "使用了“和好卡”或“原谅卡”",
      icon: "🕊️",
      type: "collection",
      bonus: 500, 
      is_hidden: true,
      repeatable: false
    },
  
    // 🔴 可重复触发类
    {
      _id: "lucky_goddess",
      title: "幸运女神",
      desc: "偶遇了幸运女神，获得额外奖励！",
      icon: "🧚‍♀️",
      type: "interaction",
      bonus: 20,
      is_hidden: true,
      repeatable: true 
    },
  
    // 🟣 时光胶囊专属彩蛋 (🆕 新增)
    {
      _id: "time_traveler",
      title: "时间领主",
      desc: "埋下了一个封印期超过 1 年的时光胶囊",
      icon: "🕰️",
      type: "collection",
      bonus: 365, // 奖励与天数呼应
      is_hidden: true,
      repeatable: false
    },
    {
      _id: "moonlight_box",
      title: "月光宝盒",
      desc: "在深夜埋藏了时光胶囊，那是心底的秘密",
      icon: "🌙",
      type: "interaction",
      bonus: 66,
      is_hidden: true,
      repeatable: false
    },
    {
      _id: "worth_the_wait",
      title: "守得云开",
      desc: "成功开启了第一个时光胶囊，等待是值得的",
      icon: "🗝️",
      type: "collection",
      bonus: 100,
      is_hidden: false, // 不隐藏，鼓励大家去开
      repeatable: false
    }
];

exports.main = async (event, context) => {
  try {
    const initTasks = async () => {
        const count = await db.collection("task_pool").count();
        if (count.total === 0) {
            const res = await db.collection("task_pool").add({ data: TASKS });
            return `Task: 插入 ${res.inserted} 条`;
        }
        return `Task: 已存在 ${count.total} 条，跳过插入`;
    };

    const initEggs = async () => {
        let count = 0;
        for (const egg of EGG_CONFIGS) {
            // 使用 set 确保配置更新（例如新增 repeatable 字段）
            await db.collection("egg_configs").doc(egg._id).set({
                data: egg
            });
            count++;
        }
        return `Egg: 更新/插入 ${count} 个彩蛋配置`;
    };

    const [taskMsg, eggMsg] = await Promise.all([initTasks(), initEggs()]);

    return {
      success: true,
      msg: `${taskMsg} | ${eggMsg}`,
    };
  } catch (err) {
    return {
      success: false,
      msg: "初始化失败",
      error: err,
    };
  }
};