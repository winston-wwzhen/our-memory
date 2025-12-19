const tcb = require("tcb-admin-node");
let config = {};
try {
  config = require("./config");
} catch (e) {}

// 🚀 核心配置：默认环境 ID
// 从 miniprogram/envList.js 中获取的 PROD 环境 ID
// const PROD_ENV_ID = "cloud1-0g4462vv9d9954a5";

tcb.init({
  // 优先使用 config.js 中的配置，否则使用默认的 PROD ID
  env: config.envId,
  secretId: config.secretId,
  secretKey: config.secretKey,
});

const db = tcb.database();

async function addMarketingCode() {
  const CODE = "TESTXMAS2025";

  try {
    // 1. 检查是否存在
    const check = await db.collection("vip_codes").where({ code: CODE }).get();
    if (check.data.length > 0) {
      console.error(
        `❌ 口令 ${CODE} 已存在，请先在数据库中删除或修改代码更换口令`
      );
      return;
    }

    // 2. 插入新口令

    // 计算过期时间
    let validUntil = null;
    validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 14);

    const res = await db.collection("vip_codes").add({
      code: CODE,

      // --- 核心配置 (根据运营计划设定) ---
      days: 14, // 🎁 会员时长：14天 (2周)
      extra_quota: 5, // 📸 赠送胶卷：12张 (永久额度)
      bonus_water: 520, // 💧 赠送爱意：520g (代码已配合修改生效)
      rose: 1, // 🌹 赠送玫瑰：1朵

      remark: "v1.3.0 上线突击营销码",
      // --------------------------------

      usage_limit: 200, // ⚡️ 限量：前200人有效 (控制资源消耗风险)
      used_count: 0,
      used_users: [],
      is_active: true,

      valid_from: new Date(),
      valid_until: validUntil,

      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log(`✅ 营销口令生成成功！`);
    console.log(`ID: ${res.id || res._id}`); // 兼容不同版本的返回字段
    console.log(`配置详情: 14天VIP + 5张胶卷 + 520g爱意 + 1玫瑰  限量200份`);
  } catch (err) {
    console.error("❌ 执行失败:", err);
    console.log(
      "提示：如果是本地执行，请确保已安装依赖: npm install tcb-admin-node"
    );
    console.log("并且已登录云开发 CLI 或配置了 config.js");
  }
}

addMarketingCode();
