// cloudfunctions/process_anime/index.js
const cloud = require('wx-server-sdk');
const tencentcloud = require("tencentcloud-sdk-nodejs");
const AiartClient = tencentcloud.aiart.v20221229.Client;
const config = require('./config');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const DAILY_LIMIT = 3;
// 👑 白名单
const SUDO_USERS = [
  'oLvaA10cMDUGkrFaNAXTVbTBa19s', 
];

function getBeijingDateStr() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().split('T')[0]; 
}

exports.main = async (event, context) => {
  const { imageFileID } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const todayStr = getBeijingDateStr();
  
  let remainingAttempts = 0; 
  const isVip = SUDO_USERS.includes(openid);

  // 1. 频次检查
  if (!isVip) {
    const userRes = await db.collection('users').where({ _openid: openid }).get();
    if (userRes.data.length > 0) {
      const user = userRes.data[0];
      const stats = user.daily_usage || { date: '', count: 0 };
      let currentUsed = (stats.date === todayStr) ? stats.count : 0;

      if (currentUsed >= DAILY_LIMIT) {
        return { status: 403, msg: `今日次数已用完，明日再来！` };
      }
      // 先不扣次数，等 AI 成功了再扣 (或者保持先扣逻辑防止并发刷接口，这里保持先扣)
      const updateData = (stats.date === todayStr) 
        ? { 'daily_usage.count': _.inc(1) }
        : { 'daily_usage': { date: todayStr, count: 1 } };
      await db.collection('users').where({ _openid: openid }).update({ data: updateData });
      
      remainingAttempts = Math.max(0, DAILY_LIMIT - (currentUsed + 1));
    }
  } else {
    remainingAttempts = 999; 
  }

  let finalBuffer = null;

  try {
    if (!imageFileID) throw new Error('Missing imageFileID');

    // 下载原图
    const downloadRes = await cloud.downloadFile({ fileID: imageFileID });
    const base64Img = downloadRes.fileContent.toString('base64');

    // 调用腾讯云 AI
    const clientConfig = {
      credential: { secretId: config.TENCENT.SID, secretKey: config.TENCENT.SKEY },
      region: config.TENCENT.REGION || "ap-shanghai",
      profile: { httpProfile: { endpoint: "aiart.tencentcloudapi.com" } },
    };
    const client = new AiartClient(clientConfig);
    
    const params = {
      InputImage: base64Img,
      Styles: ["201"], // 日系动漫
      RspImgType: "base64",
    };

    const result = await client.ImageToImage(params);
    if (!result.ResultImage) throw new Error("腾讯云未返回图片数据");
    
    finalBuffer = Buffer.from(result.ResultImage, 'base64');
    console.log('✅ Tencent Generation Success');

  } catch (aiError) {
    console.error('⚠️ AI Failed:', aiError);
    
    // 🛑 安全修改：AI 失败直接报错，不再降级保存原图
    // 这样可以防止违规图片绕过检测被存下来
    return {
      status: 500,
      msg: 'AI 绘图失败，请换张图片重试', // 可能是内容违规或图片不清晰
      error: aiError.message
    };
  }

  // 上传结果图
  const fileName = `tencent_${openid}_${Date.now()}.jpg`;
  const uploadRes = await cloud.uploadFile({
    cloudPath: `daily_moments/${fileName}`,
    fileContent: finalBuffer,
  });

  return {
    status: 200,
    result: uploadRes.fileID,
    msg: '✨ 变身成功，请确认 ✨',
    remaining: remainingAttempts 
  };
};