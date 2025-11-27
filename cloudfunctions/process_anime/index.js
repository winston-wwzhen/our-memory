// cloudfunctions/process_anime/index.js
const cloud = require("wx-server-sdk");
const tencentcloud = require("tencentcloud-sdk-nodejs");
const AiartClient = tencentcloud.aiart.v20221229.Client;
const config = require("./config");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const DAILY_LIMIT = 3;
// 👑 白名单
const SUDO_USERS = [];

function getBeijingDateStr() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().split("T")[0];
}

exports.main = async (event, context) => {
  const { imageFileID } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const todayStr = getBeijingDateStr();

  // 1. 定义剩余次数变量
  let remainingAttempts = 0;
  const isVip = SUDO_USERS.includes(openid);

  // ==========================================
  // 🚧 频次限制 & 计数
  // ==========================================
  if (!isVip) {
    const userRes = await db
      .collection("users")
      .where({ _openid: openid })
      .get();

    if (userRes.data.length > 0) {
      const user = userRes.data[0];
      const stats = user.daily_usage || { date: "", count: 0 };

      // 如果是新的一天，当前已用是 0，否则是 stats.count
      let currentUsed = stats.date === todayStr ? stats.count : 0;

      // 检查是否超限
      if (currentUsed >= DAILY_LIMIT) {
        return { status: 403, msg: `今日免费次数已用完，明日再来！` };
      }

      // 准备更新
      const updateData =
        stats.date === todayStr
          ? { "daily_usage.count": _.inc(1) }
          : { daily_usage: { date: todayStr, count: 1 } };

      await db
        .collection("users")
        .where({ _openid: openid })
        .update({ data: updateData });

      // ✅ 计算剩余次数 (总限制 - (已用 + 本次1次))
      remainingAttempts = Math.max(0, DAILY_LIMIT - (currentUsed + 1));
    }
  } else {
    remainingAttempts = 999; // VIP 显示无限
  }

  // ... (中间的 AI 调用逻辑保持不变，为了节省篇幅省略，请保留原本的腾讯云调用代码) ...
  // ... 务必保留 try-catch 和 腾讯云 API 调用部分 ...

  // 为了完整性，这里简写中间逻辑，请确保你保留了原有的 AI 代码
  let finalBuffer = null;
  let processStatus = "success";
  let engineUsed = "tencent";

  try {
    // ... 这里是你原有的下载原图、调用腾讯云、上传云存储的代码 ...
    // 假设这些代码没变
    const downloadRes = await cloud.downloadFile({ fileID: imageFileID });
    const originalBuffer = downloadRes.fileContent;
    const base64Img = originalBuffer.toString("base64");

    // ... 腾讯云调用 ...
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
      Styles: ["201"],
      RspImgType: "base64",
    };
    const result = await client.ImageToImage(params);
    if (!result.ResultImage) throw new Error("腾讯云未返回图片数据");
    finalBuffer = Buffer.from(result.ResultImage, "base64");
    // ...
  } catch (err) {
    console.error(err);
    // 降级逻辑...
    // 如果降级了，需要从云存储重新下载原图赋给 finalBuffer，或者你在前面已处理好
    const downloadRes = await cloud.downloadFile({ fileID: imageFileID });
    finalBuffer = downloadRes.fileContent;
    processStatus = "fallback";
  }

  // 上传最终图
  const fileName = `tencent_${openid}_${Date.now()}.jpg`;
  const uploadRes = await cloud.uploadFile({
    cloudPath: `daily_moments/${fileName}`,
    fileContent: finalBuffer,
  });

  return {
    status: 200,
    result: uploadRes.fileID,
    msg:
      processStatus === "fallback"
        ? "AI 休息中，已保存原图"
        : "✨ 变身成功，请确认 ✨",
    remaining: remainingAttempts, // 👈 ✅ 重点：返回剩余次数
  };
};
