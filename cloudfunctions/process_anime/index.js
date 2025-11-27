// cloudfunctions/process_anime/index.js
const cloud = require("wx-server-sdk");
const tencentcloud = require("tencentcloud-sdk-nodejs");
const AiartClient = tencentcloud.aiart.v20221229.Client;
const config = require("./config");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { imageFileID } = event;
  const wxContext = cloud.getWXContext();

  console.log("⚡ Processing (Tencent Engine) for:", wxContext.OPENID);

  let finalBuffer = null;
  let processStatus = "success";
  let engineUsed = "tencent";

  try {
    if (!imageFileID) throw new Error("Missing imageFileID");

    // 1. 下载原图
    const downloadRes = await cloud.downloadFile({ fileID: imageFileID });
    const originalBuffer = downloadRes.fileContent;
    const base64Img = originalBuffer.toString("base64");

    try {
      // 2. 初始化客户端
      const clientConfig = {
        credential: {
          secretId: config.TENCENT.SID,
          secretKey: config.TENCENT.SKEY,
        },
        region: config.TENCENT.REGION || "ap-shanghai",
        profile: {
          httpProfile: {
            endpoint: "aiart.tencentcloudapi.com",
          },
        },
      };
      const client = new AiartClient(clientConfig);

      console.log("🎨 Calling Tencent AI Art API...");

      // 3. 发起请求：图生图 (ImageToImage)
      const params = {
        InputImage: base64Img,
        Styles: ["201"], // 201: 日系动漫
        RspImgType: "base64",
        // 🔴 删除了报错的 PreCheck 参数
      };

      const result = await client.ImageToImage(params);

      if (!result.ResultImage) {
        throw new Error("腾讯云未返回图片数据");
      }

      // 4. 将结果转回 Buffer
      finalBuffer = Buffer.from(result.ResultImage, "base64");
      console.log("✅ Tencent Generation Success");
    } catch (aiError) {
      console.error("⚠️ AI Failed, fallback to original:", aiError);
      // 降级处理
      finalBuffer = originalBuffer;
      processStatus = "fallback";
      engineUsed = "none";
    }

    // 5. 上传结果
    const fileName = `tencent_${wxContext.OPENID}_${Date.now()}.jpg`;
    const uploadRes = await cloud.uploadFile({
      cloudPath: `daily_moments/${fileName}`,
      fileContent: finalBuffer,
    });

    // 6. 写入日志
    await db.collection("logs").add({
      data: {
        _openid: wxContext.OPENID,
        createdAt: db.serverDate(),
        imageFileID: uploadRes.fileID,
        originalDate: new Date().toLocaleDateString(),
        type: "daily_check_in",
        engine: engineUsed,
        style: processStatus,
        originalFileID: imageFileID,
      },
    });

    return {
      status: 200,
      result: uploadRes.fileID,
      msg:
        processStatus === "fallback"
          ? "AI 休息中，已保存原图"
          : "✨ 变身成功 ✨",
    };
  } catch (err) {
    console.error("💥 System Error:", err);
    return { status: 500, error: err.message };
  }
};
