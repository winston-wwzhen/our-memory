const tcb = require("tcb-admin-node");
let config = {};
try {
  config = require("./config");
} catch (e) {}

tcb.init({
  // ✅ 你的环境 ID
  env: config.envId || "test1-3gxkuc1c2093c1a8",
  secretId: config.secretId,
  secretKey: config.secretKey,
});

const db = tcb.database();
const _ = db.command;

// ==========================================
// 🛠️ 配置区
// ==========================================

const CONFIG = {
  // 模式: 'BATCH' (批量随机) 或 'SINGLE' (单个指定)
  mode: "BATCH",

  // --- 🎁 权益配置 ---
  days: 30, // VIP 天数
  quota: 10, // 永久胶卷数量

  // --- ⚙️ 通用属性 ---
  remark: "圣诞福利",
  validDays: 30, // 30天后过期

  // --- 模式 A: BATCH (批量随机码) ---
  batchCount: 5, // 生成数量
  prefix: "LOVE-", // 前缀
  codeLength: 8, // 随机长度
  usageLimit: 50, // 限制次数

  // --- 模式 B: SINGLE (单个通用码) ---
  singleCode: "WELCOME2025",
  singleLimit: 1000,
};

// ==========================================

function generateRandomString(len) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  console.log(`🚀 开始生成兑换码...`);
  console.log(`环境: ${tcb.config.env}`);
  console.log(`权益: VIP ${CONFIG.days}天 + 胶卷 ${CONFIG.quota}张`);

  const codesToAdd = [];
  const now = new Date();

  // 计算过期时间
  let validUntil = null;
  if (CONFIG.validDays) {
    validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + CONFIG.validDays);
  }

  // 基础数据模板
  const baseData = {
    days: CONFIG.days || 0,
    quota: CONFIG.quota || 0,
    remark: CONFIG.remark,
    is_active: true,
    used_count: 0,
    used_users: [],
    valid_from: now,
    valid_until: validUntil,
    created_at: now,
    updated_at: now,
  };

  if (CONFIG.mode === "SINGLE") {
    codesToAdd.push({
      ...baseData,
      code: CONFIG.singleCode.trim().toUpperCase(),
      usage_limit: CONFIG.singleLimit,
    });
  } else {
    const generatedSet = new Set();
    let attempts = 0;
    const maxAttempts = CONFIG.batchCount * 10;

    while (codesToAdd.length < CONFIG.batchCount && attempts < maxAttempts) {
      attempts++;
      const randStr = generateRandomString(CONFIG.codeLength);
      const fullCode = (CONFIG.prefix + randStr).toUpperCase();

      if (!generatedSet.has(fullCode)) {
        generatedSet.add(fullCode);
        codesToAdd.push({
          ...baseData,
          code: fullCode,
          usage_limit: CONFIG.usageLimit,
        });
      }
    }
  }

  console.log(`📋 准备逐条写入 ${codesToAdd.length} 个兑换码...`);

  if (codesToAdd.length === 0) {
    console.log("⚠️ 没有生成任何码。");
    return;
  }

  // 🟢 [核心修改] 改为循环逐条插入，确保每条都是独立文档
  let successCount = 0;
  for (const item of codesToAdd) {
    try {
      // 这里的 .add(item) 会创建一条独立的记录
      await db.collection("vip_codes").add(item);
      console.log(
        `   ✅ [${successCount + 1}/${codesToAdd.length}] 写入成功: ${
          item.code
        }`
      );
      successCount++;
    } catch (err) {
      console.error(`   ❌ 写入失败 (${item.code}):`, err.message);
    }
  }

  console.log(`----------------------------------------`);
  console.log(`🎉 全部完成！成功生成 ${successCount} 个独立兑换码。`);
  if (codesToAdd.length > 0) {
    console.log(`示例码: ${codesToAdd[0].code}`);
    console.log(`(现在可以直接去小程序使用了)`);
  }
  console.log(`----------------------------------------`);
}

main();
