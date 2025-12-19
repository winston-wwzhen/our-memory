const tcb = require("tcb-admin-node");
let config = {};
try {
  // 尝试读取本地配置文件 (如果有 secretId/Key 配置在这里)
  config = require("./config");
} catch (e) {}

// 🚀 核心配置：默认环境 ID
// 从 miniprogram/envList.js 中获取的 PROD 环境 ID
const PROD_ENV_ID = "cloud1-0g4462vv9d9954a5"; 

tcb.init({
  // 优先使用 config.js 中的配置，否则使用默认的 PROD ID
  env: config.envId || PROD_ENV_ID,
  secretId: config.secretId,
  secretKey: config.secretKey,
});

const db = tcb.database();

async function addMarketingCode() {
  const CODE = "XMAS2025";
  console.log(`🚀 开始生成营销口令: ${CODE} 到环境: ${tcb.parseContext().env}`);

  try {
    // 1. 检查是否存在
    const check = await db.collection("vip_codes").where({ code: CODE }).get();
    if (check.data.length > 0) {
      console.error(`❌ 口令 ${CODE} 已存在，请先在数据库中删除或修改代码更换口令`);
      return;
    }

    // 2. 插入新口令
    const res = await db.collection("vip_codes").add({
      code: CODE,
      
      // --- 核心配置 (根据运营计划设定) ---
      days: 14,             // 🎁 会员时长：14天 (2周)
      extra_quota: 12,      // 📸 赠送胶卷：12张 (永久额度)
      bonus_water: 520,     // 💧 赠送爱意：520g (代码已配合修改生效)
      remark: "v1.3.0 上线突击营销码",
      // --------------------------------
      
      usage_limit: 200,     // ⚡️ 限量：前200人有效 (控制资源消耗风险)
      used_count: 0,
      used_users: [],
      is_active: true,
      
      valid_from: new Date(),
      // 有效期到 2025年1月5日 (覆盖元旦)
      valid_until: new Date("2025-01-05T23:59:59+08:00"), 
      
      created_at: new Date(),
      updated_at: new Date()
    });

    console.log(`✅ 营销口令生成成功！`);
    console.log(`ID: ${res.id || res._id}`); // 兼容不同版本的返回字段
    console.log(`配置详情: 14天VIP + 12张胶卷 + 520g爱意 + 限量200份`);

  } catch (err) {
    console.error("❌ 执行失败:", err);
    console.log("提示：如果是本地执行，请确保已安装依赖: npm install tcb-admin-node");
    console.log("并且已登录云开发 CLI 或配置了 config.js");
  }
}

addMarketingCode();
