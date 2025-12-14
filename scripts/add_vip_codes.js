const tcb = require("tcb-admin-node");
let config = {};
try {
  config = require("./config");
} catch (e) {}

tcb.init({
  env: config.envId || "test1-3gxkuc1c2093c1a8",
  secretId: config.secretId,
  secretKey: config.secretKey,
});

const db = tcb.database();
const _ = db.command;

// ==========================================
// 🛠️ 配置区：修改这里来生成不同的码
// ==========================================

const CONFIG = {
  // 模式: 'BATCH' (批量随机) 或 'SINGLE' (单个指定)
  mode: "BATCH",

  // --- 通用配置 ---
  days: 10, // VIP天数
  extra_quota: 5, // 永久胶卷数量，0表示不赠送
  remark: "2025圣诞节", // 备注
  validDays: 30, // 有效期(天)，30天后过期。如果不限时填 null

  // --- 模式 A: BATCH (批量随机码) ---
  batchCount: 3, // 生成数量
  prefix: "LOVE-", // 前缀
  codeLength: 8, // 随机部分长度
  usageLimit: 100, // 每个码可用次数 (1代表一次性码)

  // --- 模式 B: SINGLE (单个活动码) ---
  singleCode: "LOVE2025", // 指定的码
  singleLimit: -1, // -1 代表无限次使用 (适合公用码)
};

// ==========================================

// 生成随机字符串
function generateRandomString(len) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉了容易混淆的 I,1,O,0
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  console.log(`🚀 开始生成兑换码... 模式: ${CONFIG.mode}`);

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
    days: CONFIG.days,
    extra_quota: CONFIG.extra_quota, // 添加永久胶卷配置
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
    // === 生成单个指定码 ===
    codesToAdd.push({
      ...baseData,
      code: CONFIG.singleCode,
      usage_limit: CONFIG.singleLimit,
    });
  } else {
    // === 批量生成随机码 ===
    const generatedSet = new Set();

    while (codesToAdd.length < CONFIG.batchCount) {
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

  // 写入数据库
  console.log(`📋 准备写入 ${codesToAdd.length} 个兑换码...`);

  // 逐个写入数据库
  try {
    let successCount = 0;
    for (const codeData of codesToAdd) {
      await db.collection("vip_codes").add(codeData);
      successCount++;
    }
    console.log(`✅ 成功添加 ${successCount} 个兑换码！`);
    console.log(
      `示例: ${codesToAdd[0].code} (${codesToAdd[0].days}天VIP${
        codesToAdd[0].extra_quota
          ? ` + ${codesToAdd[0].extra_quota}张永久胶卷`
          : ""
      })`
    );
  } catch (err) {
    console.error("❌ 写入失败:", err);
  }
}

main();
