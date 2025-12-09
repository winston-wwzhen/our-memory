const tcb = require("tcb-admin-node");

// 🟢 配置您的云开发环境 ID
const ENV_ID = "your-env-id-xxxxxx";

// 初始化
tcb.init({
  env: ENV_ID,
  // 如果在本地运行报错提示需要凭证，请去腾讯云控制台获取 SecretId 和 SecretKey
  // secretId: "您的SecretId",
  // secretKey: "您的SecretKey"
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
  days: 7, // VIP天数
  remark: "2025情人节活动", // 备注
  validDays: 30, // 有效期(天)，30天后过期。如果不限时填 null

  // --- 模式 A: BATCH (批量随机码) ---
  batchCount: 3, // 生成数量
  prefix: "VIP-", // 前缀
  codeLength: 8, // 随机部分长度
  usageLimit: 1, // 每个码可用次数 (1代表一次性码)

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

  // 批量写入 (云开发限制每次最多 1000 条，这里简单处理)
  try {
    const res = await db.collection("vip_codes").add(codesToAdd);
    console.log(`✅ 成功添加 ${res.ids.length} 个兑换码！`);
    console.log(`示例: ${codesToAdd[0].code} (${codesToAdd[0].days}天VIP)`);
  } catch (err) {
    console.error("❌ 写入失败:", err);
  }
}

main();
