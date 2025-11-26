// cloudfunctions/process_anime/index.js
const cloud = require("wx-server-sdk");
const axios = require("axios");
const qs = require("querystring");

const config = require("./config");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database(); // 初始化数据库

// 获取 Token (逻辑不变)
async function getAccessToken() {
  const url = "https://aip.baidubce.com/oauth/2.0/token";
  const params = {
    grant_type: "client_credentials",
    client_id: config.BAIDU.AK,
    client_secret: config.BAIDU.SK,
  };
  const res = await axios.post(url, null, { params });
  return res.data.access_token;
}

exports.main = async (event, context) => {
  const { imageBase64 } = event;
  const wxContext = cloud.getWXContext(); // 获取当前用户信息(OPENID)

  console.log("⚡ Processing for user:", wxContext.OPENID);

  try {
    // 1. 调用百度 AI
    const token = await getAccessToken();
    const requestUrl = `https://aip.baidubce.com/rest/2.0/image-process/v1/selfie_anime?access_token=${token}`;
    const payload = qs.stringify({ image: imageBase64, type: "anime" });

    const aiRes = await axios.post(requestUrl, payload, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!aiRes.data.image) throw new Error("AI Processing Failed");

    // 2. 【关键】将返回的 Base64 转回二进制 Buffer
    const buffer = Buffer.from(aiRes.data.image, "base64");

    // 3. 【关键】上传到云存储 (Cloud Storage)
    // 命名规则：anime_用户ID_时间戳.jpg
    const fileName = `anime_${wxContext.OPENID}_${Date.now()}.jpg`;
    const uploadRes = await cloud.uploadFile({
      cloudPath: `daily_moments/${fileName}`,
      fileContent: buffer,
    });

    const fileID = uploadRes.fileID; // 拿到永久文件ID (cloud://...)

    // 4. 【关键】写入数据库 (Database)
    // 记录：谁，什么时间，照片在哪
    await db.collection("logs").add({
      data: {
        _openid: wxContext.OPENID, // 自动标记是谁
        createdAt: db.serverDate(), // 服务器时间
        imageFileID: fileID, // 动漫图地址
        originalDate: new Date().toLocaleDateString(), // 方便日历查询的日期字符串
        type: "daily_check_in",
      },
    });

    // 5. 返回 fileID 给前端 (而不是巨大的 Base64)
    return {
      status: 200,
      result: fileID,
    };
  } catch (err) {
    console.error("💥 Error:", err);
    return { status: 500, error: err.message };
  }
};
