const cloud = require('wx-server-sdk');
const Replicate = require('replicate');
const axios = require('axios');
const config = require('./config'); // 读取配置文件

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 初始化 Replicate
const replicate = new Replicate({
  auth: config.REPLICATE.TOKEN,
});

exports.main = async (event, context) => {
  const { imageBase64 } = event;
  const wxContext = cloud.getWXContext();
  
  // 准备容器
  let finalBuffer = null;
  let processStatus = 'success'; 
  let statusMsg = '✨ Magic Moment ✨';
  let engineUsed = 'replicate';

  console.log('⚡ Processing for user:', wxContext.OPENID);

  try {
    // === 尝试 1: Replicate AI 动漫化处理 ===
    try {
      if (!imageBase64) throw new Error('No image data');

      // 1. 准备 Data URI
      const dataUri = `data:image/jpeg;base64,${imageBase64}`;

      console.log('⚡ Calling Replicate API...');
      
      // 2. 调用模型 (Face to Many)
      // video_game 风格通常比较好看，也可以尝试 '3d' 或 'clay'
      const output = await replicate.run(
        "fofr/face-to-many:a07f252abbbd4328919455e96f9b819db3616b0480317dd042071143890f8450",
        {
          input: {
            image: dataUri,
            style: "video_game", 
            prompt: "anime style, romantic atmosphere, soft lighting, highly detailed",
            negative_prompt: "ugly, broken, distorted, low quality",
            denoising_strength: 0.65 
          }
        }
      );

      // Replicate 返回的是图片 URL 数组
      if (!output || output.length === 0) throw new Error('AI Generation Failed');

      const aiImageUrl = output[0];
      console.log('✅ Replicate Success URL:', aiImageUrl);

      // 3. 下载 AI 生成的图片 (转为 Buffer)
      // 因为 Replicate 的链接是临时的，必须转存到自己的云存储
      const response = await axios.get(aiImageUrl, { responseType: 'arraybuffer' });
      finalBuffer = Buffer.from(response.data, 'binary');

    } catch (aiError) {
      // === 降级处理: AI 失败，使用原图 ===
      console.error('⚠️ AI Failed, switching to fallback mode:', aiError.message);
      
      // 将原始 Base64 转回 Buffer
      finalBuffer = Buffer.from(imageBase64, 'base64');
      processStatus = 'fallback';
      statusMsg = 'AI 休息中，已保存原图';
      engineUsed = 'none';
    }

    // === 步骤 2: 上传到云存储 ===
    // 命名规则：引擎名_用户ID_时间戳.jpg
    const fileName = `${engineUsed}_${wxContext.OPENID}_${Date.now()}.jpg`;
    
    const uploadRes = await cloud.uploadFile({
      cloudPath: `daily_moments/${fileName}`,
      fileContent: finalBuffer,
    });
    
    const fileID = uploadRes.fileID;

    // === 步骤 3: 写入数据库 ===
    await db.collection('logs').add({
      data: {
        _openid: wxContext.OPENID,
        createdAt: db.serverDate(),
        imageFileID: fileID,
        originalDate: new Date().toLocaleDateString(),
        type: 'daily_check_in',
        engine: engineUsed,
        style: processStatus
      }
    });

    // === 步骤 4: 返回结果 ===
    return {
      status: 200,
      result: fileID,
      msg: statusMsg,
      isFallback: processStatus === 'fallback'
    };

  } catch (err) {
    console.error('💥 System Error:', err);
    return { status: 500, error: err.message };
  }
};