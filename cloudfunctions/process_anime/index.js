// cloudfunctions/process_anime/index.js
const cloud = require("wx-server-sdk");
const tencentcloud = require("tencentcloud-sdk-nodejs");
const AiartClient = tencentcloud.aiart.v20221229.Client;
const config = require("./config");
const Jimp = require("jimp"); // 引入图像处理库

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const TEST_CONFIG = {
  WHITELIST: [],
  // 是否开启测试拦截 (上线时可改为 false)
  ENABLE: true,
};

// 🟢 配置中心 (修复版)
const NORMAL_FREE_LIMIT = 1; // 普通用户
const VIP_DAILY_LIMIT = 3; // VIP用户
const REG_DAY_LIMIT = 10; // 首日特权
const DAILY_AD_LIMIT = 1;

// 🎨 风格配置表 (后端做最终校验)
const STYLE_CONFIG = {
  125: { isVip: false, name: "国风工笔" },
  201: { isVip: false, name: "日漫风" },
  121: { isVip: false, name: "黏土" },
  129: { isVip: false, name: "美式复古" },
  210: { isVip: false, name: "2.5D动画" },
  134: { isVip: false, name: "厚涂手绘" },
  127: { isVip: false, name: "瓷器" },
  133: { isVip: true, name: "莫奈花园" },
  126: { isVip: true, name: "玉石" },
  130: { isVip: true, name: "蒸汽朋克" },
  132: { isVip: true, name: "素描" },
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


// 🛡️ 图片安全校验
async function checkImageSafety(fileID) {
  if (!fileID) return true;
  try {
    const res = await cloud.downloadFile({ fileID: fileID });
    const buffer = res.fileContent;
    const checkRes = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: "image/png", // 简单处理
        value: buffer,
      },
    });
    return checkRes.errCode === 0;
  } catch (err) {
    console.error("图片校验失败:", err);
    // 忽略大图片错误，交由AI处理（或前端压缩）
    if (err.errCode === 45002) return true;
    return false;
  }
}

// 🖼️ 添加水印功能函数
async function addWatermark(originalBuffer, cloudInstance) {
  try {
    // 1. 读取原图
    const image = await Jimp.read(originalBuffer);

    // 2. 动态获取小程序码 (跳转到首页)
    // 也可以将二维码先上传到云存储，然后通过 cloud.downloadFile 下载来提高性能
    console.log("开始添加水印")
    const wxacodeResult = await cloudInstance.openapi.wxacode.getUnlimited({
      scene: "source=ai_share",
      page: "pages/index/index", // 扫码进入首页
      width: 280,
      check_path: false, // 开发/调试阶段建议设为 false
    });

    if (wxacodeResult.errCode) {
      console.error("小程序码生成失败", wxacodeResult);
      return originalBuffer; // 失败则返回原图
    }

    const qrImage = await Jimp.read(wxacodeResult.buffer);

    // 3. 计算尺寸：让二维码宽度占原图宽度的 18%
    const targetQrWidth = image.bitmap.width * 0.10;
    qrImage.resize(targetQrWidth, Jimp.AUTO);

    // 4. 计算位置：右下角，留有 20px 边距
    const margin_x = 8;
    const margin_y = 5
    const x = image.bitmap.width - qrImage.bitmap.width - margin_x;
    const y = image.bitmap.height - qrImage.bitmap.height - margin_y;

    // 5. 合成图片 (透明度 90%)
    qrImage.opacity(0.7);
    image.composite(qrImage, x, y);

    // 6. 导出 Buffer (JPEG 格式)
    return await image.getBufferAsync(Jimp.MIME_JPEG);
  } catch (err) {
    console.error("水印添加失败:", err);
    return originalBuffer; // 发生错误返回原图，保证主流程不中断
  }
}

exports.main = async (event, context) => {
  const { imageFileID, taskTitle, styleId = "201" } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const todayStr = getBeijingDateStr();

  let remainingAttempts = 0;

  // 获取用户信息判断额度和身份
  const userRes = await db.collection("users").where({ _openid: openid }).get();

  if (userRes.data.length === 0) {
    return { status: 404, msg: "用户未注册" };
  }

  const user = userRes.data[0];
  const isVip =
    user.vip_expire_date && new Date(user.vip_expire_date) > new Date();

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

  let deductedType = "none"; // 'daily' or 'extra'

  // 计算总的每日限额，用于下面的判断
  let baseLimit = NORMAL_FREE_LIMIT;
  if (isVip) {
    // 重新计算注册天数，保持逻辑一致
    let registerDays = 1;
    if (user.createdAt) {
      const created = new Date(user.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - created);
      registerDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    baseLimit = registerDays <= 1 ? REG_DAY_LIMIT : VIP_DAILY_LIMIT;
  }
  const stats = user.daily_usage || { date: "", count: 0, ad_count: 0 };
  const isToday = stats.date === todayStr;
  const adRewards = isToday ? stats.ad_count || 0 : 0;
  const totalDailyLimit = baseLimit + adRewards;

  {
    const currentUsed = isToday ? stats.count || 0 : 0;
    const extraQuota = user.extra_quota || 0;

    if (isToday && currentUsed < totalDailyLimit) {
      // 1. 扣除今日额度
      const res = await db
        .collection("users")
        .where({
          _openid: openid,
          "daily_usage.date": todayStr,
          "daily_usage.count": _.lt(totalDailyLimit),
        })
        .update({
          data: { "daily_usage.count": _.inc(1) },
        });
      if (res.stats.updated > 0) deductedType = "daily";
    } else if (!isToday) {
      // 跨天重置并扣除 1 次
      await db
        .collection("users")
        .where({ _openid: openid })
        .update({
          data: {
            daily_usage: {
              date: todayStr,
              count: 1,
              ad_count: 0,
              msg_count: 0,
            },
          },
        });
      deductedType = "daily";
    }

    // 2. 如果今日额度扣除失败（已满），尝试扣除永久额度
    if (deductedType === "none" && extraQuota > 0) {
      const res = await db
        .collection("users")
        .where({
          _openid: openid,
          extra_quota: _.gt(0),
        })
        .update({
          data: { extra_quota: _.inc(-1) },
        });
      if (res.stats.updated > 0) deductedType = "extra";
    }

    // 3. 如果都没扣成功，拦截
    if (deductedType === "none") {
      const canWatchAd = adRewards < DAILY_AD_LIMIT;
      return {
        status: 403,
        msg: canWatchAd
          ? `今日次数用尽！看个广告复活吧~`
          : `次数耗尽！邀请好友可获得更多额度哦~`,
        requireAd: canWatchAd,
        redirectFun: !canWatchAd,
      };
    }

    // 计算剩余展示 (仅供参考)
    if (deductedType === "daily") {
      remainingAttempts =
        Math.max(0, totalDailyLimit - ((isToday ? stats.count : 0) + 1)) +
        (user.extra_quota || 0);
    } else {
      remainingAttempts = (user.extra_quota || 0) - 1;
    }
  }

  let finalBuffer = null;

  try {
    if (!imageFileID) throw new Error("Missing imageFileID");

    const downloadRes = await cloud.downloadFile({ fileID: imageFileID });

    // 🛡️ AI绘图前的图片安全校验
    const isImgSafe = await checkImageSafety(imageFileID);
    if (!isImgSafe) {
      // ⚠️ 校验失败回滚额度
      {
        if (deductedType === "daily") {
          await db
            .collection("users")
            .where({ _openid: openid })
            .update({ data: { "daily_usage.count": _.inc(-1) } });
        } else if (deductedType === "extra") {
          await db
            .collection("users")
            .where({ _openid: openid })
            .update({ data: { extra_quota: _.inc(1) } });
        }
      }
      return { status: 403, msg: "图片包含敏感内容，请更换一张" };
    }

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

    // ✨✨✨ 新增：添加水印 ✨✨✨
    if (finalBuffer) {
      console.log("正在为图片添加水印...");
      finalBuffer = await addWatermark(finalBuffer, cloud);
    }
  } catch (aiError) {
    console.error("⚠️ AI Failed:", aiError);
    // ⚠️ AI 生成失败回滚额度
    {
      if (deductedType === "daily") {
        await db
          .collection("users")
          .where({ _openid: openid })
          .update({
            data: { "daily_usage.count": _.inc(-1) },
          });
      } else if (deductedType === "extra") {
        await db
          .collection("users")
          .where({ _openid: openid })
          .update({
            data: { extra_quota: _.inc(1) },
          });
      }
    }
    return { status: 500, msg: "AI 绘图失败，请重试", error: aiError.message };
  }

  const fileName = `tencent_${openid}_${Date.now()}.jpg`;
  const uploadRes = await cloud.uploadFile({
    cloudPath: `daily_moments/${fileName}`,
    fileContent: finalBuffer,
  });

  const evaluation = generateEvaluation(taskTitle);
  let triggerEgg = null;

  // ✨ 新增彩蛋逻辑：✨ 天选之子 (评分 > 99)
  if (evaluation.score >= 99) {
    try {
      // 检查是否已经获得过
      const eggId = "lucky_star";
      const eggRes = await db
        .collection("user_eggs")
        .where({ _openid: openid, egg_id: eggId })
        .count();

      if (eggRes.total === 0) {
        // 写入彩蛋记录
        await db.collection("user_eggs").add({
          data: {
            _openid: openid,
            egg_id: eggId,
            count: 1,
            unlocked_at: db.serverDate(),
            is_read: false,
          },
        });

        // 发放奖励 (需要加到 users 表)
        await db
          .collection("users")
          .where({ _openid: openid })
          .update({
            data: { water_count: _.inc(200) }, // 假设奖励 200 水滴
          });

        triggerEgg = {
          title: "天选之子",
          icon: "✨",
          desc: "获得了一张评分99+的完美照片",
          bonus: 200,
        };
      }
    } catch (e) {
      console.error("彩蛋触发失败", e);
    }
  }
  return {
    status: 200,
    result: uploadRes.fileID,
    msg: "✨ 变身成功 ✨",
    remaining: remainingAttempts,
    evaluation: evaluation,
    deductedType,
    triggerEgg, // 记得返回彩蛋数据
  };
};
