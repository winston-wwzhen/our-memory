// cloudfunctions/admin_tool/index.js
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 生成随机字符串
function genCode(len) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let res = "";
  for (let i = 0; i < len; i++)
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  return res;
}

exports.main = async (event, context) => {
  const { count = 10, days = 7, prefix = "VIP-" } = event;

  const tasks = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const code = prefix + genCode(8);
    tasks.push({
      code: code,
      days: days,
      remark: "批量生成",
      is_active: true,
      usage_limit: 1, // 默认一次性
      used_count: 0,
      used_users: [],
      created_at: now,
    });
  }

  // 批量插入
  try {
    await db.collection("vip_codes").add({ data: tasks });
    return {
      status: 200,
      msg: `成功生成 ${count} 个码`,
      sample: tasks[0].code,
    };
  } catch (e) {
    return { status: 500, msg: e.message };
  }
};
