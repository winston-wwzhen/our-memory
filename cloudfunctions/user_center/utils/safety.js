const LOCAL_BLACKLIST_REGEX = /杀人|放火|炸弹|自杀|共党|法轮|色情|裸聊|招嫖/i;

async function checkTextSafety(ctx, content) {
  if (!content) return true;
  const { cloud, OPENID } = ctx;

  if (LOCAL_BLACKLIST_REGEX.test(content)) {
    console.warn(`🛡️ [本地拦截] 敏感词: ${content}`);
    return false;
  }

  try {
    const res = await cloud.openapi.security.msgSecCheck({
      content: content,
      version: 2,
      scene: 2,
      openid: OPENID,
    });
    return res.errCode === 0 && res.result && res.result.suggest === "pass";
  } catch (err) {
    console.error("🛡️ [微信安全接口错误]:", err);
    return false; // 接口失败时默认拦截，确保安全
  }
}

async function checkImageSafety(ctx, fileID) {
  if (!fileID) return true;
  const { cloud } = ctx;
  try {
    const res = await cloud.downloadFile({ fileID });
    const checkRes = await cloud.openapi.security.imgSecCheck({
      media: {
        contentType: "image/png",
        value: res.fileContent,
      },
    });
    return checkRes.errCode === 0;
  } catch (err) {
    console.error("图片校验失败:", err);
    return false;
  }
}

module.exports = { checkTextSafety, checkImageSafety };
