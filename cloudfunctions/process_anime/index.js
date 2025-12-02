// cloudfunctions/process_anime/index.js
const cloud = require("wx-server-sdk");
const tencentcloud = require("tencentcloud-sdk-nodejs");
const AiartClient = tencentcloud.aiart.v20221229.Client;
const config = require("./config");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const TEST_CONFIG = {
  WHITELIST: ["oLvaA10VxUftuv5nwuzJ5b8AWDyY"],
  // 是否开启测试拦截 (上线时可改为 false)
  ENABLE: true,
};

// 🟢 配置中心 (修复版)
const NORMAL_FREE_LIMIT = 1;  // 普通用户
const VIP_DAILY_LIMIT = 3;    // VIP用户
const REG_DAY_LIMIT = 10;     // 首日特权
const DAILY_AD_LIMIT = 1;

// 🎨 风格配置表 (后端做最终校验)
const STYLE_CONFIG = {
  201: { isVip: false, name: "日漫风" },
  210: { isVip: false, name: "2.5D动画" },
  121: { isVip: false, name: "黏土" },
  125: { isVip: true, name: "国风工笔" },
  127: { isVip: false, name: "瓷器" },
  129: { isVip: true, name: "美式复古" },
  130: { isVip: false, name: "蒸汽朋克" },
  132: { isVip: false, name: "素描" },
  133: { isVip: true, name: "莫奈花园" },
  134: { isVip: false, name: "厚涂手绘" },
  126: { isVip: true, name: "玉石" },
};

// ============================================================
// 🤖 AI 毒舌/高甜文案库
// ============================================================
const AI_COMMENTS = [
  "含糖量过高，AI 处理器已过热报警！🔥",
  "根据 AI 测算，你们的默契度超过了 99.9% 的人类。📈",
  "今日份心动已送达，请查收。📩",
  "救命，我的核心代码都要被你们甜化了。🍬",
  "这就是传说中的“撕漫男/女主角”吗？😍",
  "虽然是二次元，但这溢出屏幕的爱意是真的。❤️",
  "建议这张照片打印出来，贴在结婚证上（误）。👰",
  "全宇宙最配的 CP 出现了，不接受反驳。🚀",
  "看到这张图，我在云端都忍不住露出了姨母笑。😊",
  "这就是爱情最好的模样吧。🌹",
  "此时无声胜有声，眼神拉丝了喂！👀",
  "这氛围感绝了，建议原地拍偶像剧。🎬",
  "颜值爆表！二次元都快装不下你们的好看了。✨",
  "Error 404: 找不到任何瑕疵。💎",
  "不但长得好看，还这么会拍，建议原地出道。🌟",
  "这张脸是真实存在的吗？女娲炫技作品！🎨",
  "这构图，这神态，摄影师可以加鸡腿了。🍗",
  "原来长得好看的人，变成漫画会更好看。😲",
  "这是什么神仙颜值，我的 GPU 都在颤抖。⚡",
  "你的可爱超标了，请立即停止散发魅力！🚨",
  "气质这一块，你们拿捏得死死的。🤏",
  "Distinct style, absolute perfection. (AI 忍不住飙英文了)",
  "这张图的含金量还在上升... 📈",
  "这就上手了？建议下次离镜头再近一点！👀",
  "虽然是摆拍，但这波狗粮我先干为敬。🍋",
  "啧啧啧，这画面太美，建议设为传家宝。🖼️",
  "不仅恩爱，还有点... 那个大病（划掉）可爱。🤪",
  "鉴定完毕：这是两个有趣的灵魂在碰撞。💥",
  "虽然表情很从心，但这就是真实的快乐呀~ 😂",
  "这鬼脸做得，AI 差点识别成外星生物... 👽",
  "为了完成任务也是拼了，给你们点个赞！👍",
  "注意形象！偶像包袱掉了一地啦！🎒",
  "这张照片自带 BGM，我已经听到笑声了。🎵",
  "正在尝试理解这种名为“恋爱”的复杂算法... 🤔",
  "人类的感情真是奇妙，连像素点都在跳舞。💃",
  "本 AI 阅图无数，这张可以排进年度前十。🏆",
  "正在上传至《人类高质量恋爱样本库》... 📂",
  "分析结果：多巴胺浓度 100%，肾上腺素 80%。🧪",
  "警告：画面过于耀眼，请佩戴墨镜观看。😎",
  "这就是碳基生物的浪漫吗？硅基生物表示羡慕。🤖",
  "别拍了别拍了，我和我的服务器都酸了。🍋",
  "系统检测到一股名为“幸福”的电波。📡",
  "晚安，愿你们梦里也有二次元的星空。🌙",
  "又是被你们治愈的一天。✨",
  "平凡的日常，因为有你而闪闪发光。🌟",
  "记录下这一刻，以后老了拿出来嘲笑对方。👴👵",
];

function getBeijingDateStr() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().split("T")[0];
}

function generateEvaluation(taskTitle) {
  let score;
  if (Math.random() < 0.2) {
    score = Math.floor(Math.random() * 2) + 99;
  } else {
    score = Math.floor(Math.random() * (98 - 85 + 1)) + 85;
  }
  let comment = AI_COMMENTS[Math.floor(Math.random() * AI_COMMENTS.length)];

  if (taskTitle) {
    if (taskTitle.includes("鬼脸") || taskTitle.includes("丑")) {
      const funnyComments = [
        "虽然很用力在扮丑，但还是掩盖不住可爱啊！🤪",
        "这鬼脸... AI 差点报警了哈哈哈哈！👮‍♂️",
        "毫无偶像包袱，这才是真爱！💖",
      ];
      comment = funnyComments[Math.floor(Math.random() * funnyComments.length)];
    } else if (taskTitle.includes("吻") || taskTitle.includes("亲")) {
      const kissComments = [
        "警告：画面过于亲密，AI 害羞地捂住了眼睛。🙈",
        "亲亲的时候眼睛要闭上哦~ (AI 偷看中) 👀",
        "这一口下去，甜度爆表了！🍬",
      ];
      comment = kissComments[Math.floor(Math.random() * kissComments.length)];
    }
  }
  return { score, comment };
}

async function getSudoUsers() {
  try {
    const res = await db.collection("app_config").doc("global_settings").get();
    return res.data.sudo_users || [];
  } catch (err) {
    console.error("读取全局配置失败:", err);
    return [];
  }
}

exports.main = async (event, context) => {
  const { imageFileID, taskTitle, styleId = "201" } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const todayStr = getBeijingDateStr();

  let remainingAttempts = 0;
  const SUDO_USERS = await getSudoUsers();
  
  // 获取用户信息判断额度和身份
  const userRes = await db.collection("users").where({ _openid: openid }).get();
  
  if (userRes.data.length === 0) {
      return { status: 404, msg: "用户未注册" };
  }
  
  const user = userRes.data[0];
  const isPermanentVip = SUDO_USERS.includes(openid);
  const isTrialVip = user.vip_expire_date && new Date(user.vip_expire_date) > new Date();
  const isVip = isPermanentVip || isTrialVip;

  // 判断是否为测试账号
  const isTestUser =
    TEST_CONFIG.ENABLE && TEST_CONFIG.WHITELIST.includes(openid);

  // 🛡️ 风格鉴权 (体验VIP也可解锁)
  const targetStyle = STYLE_CONFIG[styleId] ? styleId : "201"; 
  if (STYLE_CONFIG[targetStyle].isVip && !isVip) {
    return {
      status: 403,
      msg: `【${STYLE_CONFIG[targetStyle].name}】是 VIP 专属风格，请升级或选择其他风格~`,
    };
  }

  // 🆕 1. 频次检查 (修复版逻辑)
  if (!isPermanentVip) {
      // 计算注册天数判断是否首日
      let registerDays = 1;
      if (user.createdAt) {
        const created = new Date(user.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now - created);
        registerDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      
      // 确定今日基础限额 (逻辑修复)
      let baseLimit = NORMAL_FREE_LIMIT; // 默认为 1
      if (isVip) {
          // 只有 VIP 身份才能享受 10 或 3
          baseLimit = registerDays <= 1 ? REG_DAY_LIMIT : VIP_DAILY_LIMIT;
      }

      const stats = user.daily_usage || { date: "", count: 0, ad_count: 0 };
      const isToday = stats.date === todayStr;

      const currentUsed = isToday ? stats.count || 0 : 0;
      const adRewards = isToday ? stats.ad_count || 0 : 0;

      // 总额度 = 基础限额 + 广告奖励
      const totalLimit = baseLimit + adRewards;

      if (currentUsed >= totalLimit) {
        const canWatchAd = adRewards < DAILY_AD_LIMIT;

        return {
          status: 403,
          msg: canWatchAd
            ? `次数用尽！看个广告复活吧~`
            : `今日次数已耗尽 (${totalLimit}/${totalLimit})，去Fun乐园玩耍吧~`,
          requireAd: canWatchAd, 
          redirectFun: !canWatchAd, 
        };
      }

      const updateData = isToday
        ? { "daily_usage.count": _.inc(1) }
        : { daily_usage: { date: todayStr, count: 1, ad_count: 0 } };

      await db
        .collection("users")
        .where({ _openid: openid })
        .update({ data: updateData });

      remainingAttempts = Math.max(0, totalLimit - (currentUsed + 1));
  } else {
    remainingAttempts = 999;
  }

  let finalBuffer = null;

  try {
    if (!imageFileID) throw new Error("Missing imageFileID");

    const downloadRes = await cloud.downloadFile({ fileID: imageFileID });
    if (isTestUser) {
      console.log(`🧪 [测试模式] 用户 ${openid} 跳过 AI API 调用`);
      finalBuffer = downloadRes.fileContent;
    } else {
      const base64Img = downloadRes.fileContent.toString("base64");

      const clientConfig = {
        credential: {
          secretId: config.TENCENT.SID,
          secretKey: config.TENCENT.SKEY,
        },
        region: config.TENCENT.REGION || "ap-shanghai",
        profile: { httpProfile: { endpoint: "aiart.tencentcloudapi.com" } },
      };
      const client = new AiartClient(clientConfig);

      const params = {
        InputImage: base64Img,
        Styles: [targetStyle],
        RspImgType: "base64",
      };
      const result = await client.ImageToImage(params);
      if (!result.ResultImage) throw new Error("腾讯云未返回图片数据");

      finalBuffer = Buffer.from(result.ResultImage, "base64");
    }
  } catch (aiError) {
    console.error("⚠️ AI Failed:", aiError);
    if (!isPermanentVip) {
      await db
        .collection("users")
        .where({ _openid: openid })
        .update({
          data: { "daily_usage.count": _.inc(-1) },
        });
    }
    return {
      status: 500,
      msg: "AI 绘图失败，请换张图片重试",
      error: aiError.message,
    };
  }

  const fileName = `tencent_${openid}_${Date.now()}.jpg`;
  const uploadRes = await cloud.uploadFile({
    cloudPath: `daily_moments/${fileName}`,
    fileContent: finalBuffer,
  });

  const evaluation = generateEvaluation(taskTitle);

  return {
    status: 200,
    result: uploadRes.fileID,
    msg: "✨ 变身成功 ✨",
    remaining: remainingAttempts,
    evaluation: evaluation,
  };
};