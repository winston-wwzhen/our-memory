const tcb = require("tcb-admin-node");
let config = {};
try {
  config = require("./config");
} catch (e) {
  console.error("❌ 无法加载配置文件，请确保 config.js 存在");
  process.exit(1);
}

tcb.init({
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
  // 是否真的执行删除操作（设为 true 才会真正删除）
  executeDelete: false,

  // 是否将试用VIP设为立即过期
  expireTrialVips: false,

  // 试用VIP的标识（通常在 remark 字段中）
  trialRemarkPatterns: ["试用", "trial", "test", "内测", "beta"],
};

// ==========================================

/**
 * 查询 app_config 中的 sudo_users 配置
 */
async function checkSudoUsers() {
  console.log("\n🔍 查询 app_config 集合中的 sudo_users 配置...");

  try {
    const result = await db.collection("app_config")
      .where({
        key: "sudo_users"
      })
      .get();

    if (result.data.length > 0) {
      console.log("✅ 找到 sudo_users 配置:");
      result.data.forEach(item => {
        console.log(`  - ID: ${item._id}`);
        console.log(`  - 值: ${JSON.stringify(item.value)}`);
        console.log(`  - 更新时间: ${item.updated_at}`);
      });
      return result.data;
    } else {
      console.log("❌ 未找到 sudo_users 配置");
      return [];
    }
  } catch (err) {
    console.error("❌ 查询失败:", err);
    return [];
  }
}

/**
 * 删除 sudo_users 配置
 */
async function deleteSudoUsers() {
  if (!CONFIG.executeDelete) {
    console.log("\n⚠️ executeDelete 为 false，跳过删除操作");
    return;
  }

  console.log("\n🗑️ 开始删除 sudo_users 配置...");

  try {
    const result = await db.collection("app_config")
      .where({
        key: "sudo_users"
      })
      .remove();

    console.log(`✅ 成功删除 ${result.removed} 条 sudo_users 配置`);
  } catch (err) {
    console.error("❌ 删除失败:", err);
  }
}

/**
 * 统计未过期的VIP用户
 */
async function countActiveVipUsers() {
  console.log("\n📊 统计未过期的VIP用户...");

  const now = new Date();

  try {
    // 统计所有未过期的VIP用户
    const result = await db.collection("users")
      .where({
        vip_expire_date: _.gt(now)
      })
      .count();

    console.log(`✅ 当前共有 ${result.total} 个VIP用户未过期`);

    // 获取详细信息（前10个）
    const details = await db.collection("users")
      .where({
        vip_expire_date: _.gt(now)
      })
      .orderBy("vip_expire_date", "desc")
      .limit(10)
      .get();

    if (details.data.length > 0) {
      console.log("\n最近的VIP用户示例:");
      details.data.forEach(user => {
        const expireDate = new Date(user.vip_expire_date);
        console.log(`  - ${user.nick_name || user.openid} (过期: ${expireDate.toLocaleString()})`);
        if (user.vip_source) {
          console.log(`    来源: ${user.vip_source}`);
        }
      });
    }

    return result.total;
  } catch (err) {
    console.error("❌ 统计失败:", err);
    return 0;
  }
}

/**
 * 统计试用VIP用户
 */
async function countTrialVipUsers() {
  console.log("\n📊 统计试用VIP用户...");

  const now = new Date();

  try {
    // 构建查询条件
    const orConditions = CONFIG.trialRemarkPatterns.map(pattern => ({
      vip_source: new RegExp(pattern, "i")
    }));

    const result = await db.collection("users")
      .where(_.or([
        ...orConditions,
        {
          vip_expire_date: _.gt(now),
          vip_source: _.exists(false)
        }
      ]))
      .count();

    console.log(`✅ 当前共有 ${result.total} 个试用VIP用户未过期`);

    // 获取详细信息
    const details = await db.collection("users")
      .where(_.or([
        ...orConditions,
        {
          vip_expire_date: _.gt(now),
          vip_source: _.exists(false)
        }
      ]))
      .limit(20)
      .get();

    if (details.data.length > 0) {
      console.log("\n试用VIP用户示例:");
      details.data.forEach(user => {
        const expireDate = new Date(user.vip_expire_date);
        console.log(`  - ${user.nick_name || user.openid} (过期: ${expireDate.toLocaleString()}, 来源: ${user.vip_source || '未知'})`);
      });
    }

    return result.total;
  } catch (err) {
    console.error("❌ 统计失败:", err);
    return 0;
  }
}

/**
 * 将试用VIP设为立即过期
 */
async function expireTrialVips() {
  if (!CONFIG.expireTrialVips) {
    console.log("\n⚠️ expireTrialVips 为 false，跳过过期操作");
    return;
  }

  console.log("\n⏰ 开始将试用VIP设为立即过期...");

  const now = new Date();

  try {
    // 构建查询条件
    const orConditions = CONFIG.trialRemarkPatterns.map(pattern => ({
      vip_source: new RegExp(pattern, "i")
    }));

    // 先查询数量
    const countResult = await db.collection("users")
      .where(_.or([
        ...orConditions,
        {
          vip_expire_date: _.gt(now),
          vip_source: _.exists(false)
        }
      ]))
      .count();

    console.log(`📝 找到 ${countResult.total} 个试用VIP用户需要处理`);

    if (countResult.total === 0) {
      console.log("✅ 没有需要处理的试用VIP用户");
      return;
    }

    // 确认操作
    if (!CONFIG.executeDelete) {
      console.log("⚠️ executeDelete 为 false，仅模拟操作，不实际更新");
      return;
    }

    // 分批更新（每次最多1000条）
    const batchSize = 1000;
    let processed = 0;

    while (processed < countResult.total) {
      const batch = await db.collection("users")
        .where(_.or([
          ...orConditions,
          {
            vip_expire_date: _.gt(now),
            vip_source: _.exists(false)
          }
        ]))
        .skip(processed)
        .limit(batchSize)
        .get();

      // 更新这批数据
      for (const user of batch.data) {
        await db.collection("users")
          .doc(user._id)
          .update({
            vip_expire_date: new Date(),
            updated_at: new Date()
          });
      }

      processed += batch.data.length;
      console.log(`✅ 已处理 ${processed}/${countResult.total} 个用户`);
    }

    console.log("✅ 所有试用VIP用户已设为立即过期");
  } catch (err) {
    console.error("❌ 操作失败:", err);
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
🛠️ Beta数据清理工具

用法: node cleanup_beta_data.js [选项]

选项:
  --help          显示帮助信息
  --dry-run       仅查看，不执行删除（默认）
  --execute       执行删除操作
  --expire-trial  将试用VIP设为立即过期

示例:
  node cleanup_beta_data.js --dry-run          # 仅查看数据
  node cleanup_beta_data.js --execute          # 执行删除 sudo_users
  node cleanup_beta_data.js --expire-trial     # 过期试用VIP
  node cleanup_beta_data.js --execute --expire-trial  # 执行所有操作
`);
}

// ==========================================
// 主函数
// ==========================================
async function main() {
  console.log("🚀 Beta数据清理工具");
  console.log(`⏰ 执行时间: ${new Date().toLocaleString()}`);

  // 解析命令行参数
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  if (args.includes("--execute")) {
    CONFIG.executeDelete = true;
    console.log("✅ 已启用执行模式");
  } else {
    console.log("⚠️ 当前为模拟模式，不会实际删除数据");
  }

  if (args.includes("--expire-trial")) {
    CONFIG.expireTrialVips = true;
    console.log("✅ 已启用试用VIP过期");
  }

  console.log("\n========================================");

  // 1. 检查 sudo_users
  const sudoUsers = await checkSudoUsers();

  // 2. 删除 sudo_users
  if (sudoUsers.length > 0) {
    await deleteSudoUsers();
  }

  // 3. 统计未过期的VIP用户
  const activeVipCount = await countActiveVipUsers();

  // 4. 统计试用VIP用户
  const trialVipCount = await countTrialVipUsers();

  // 5. 过期试用VIP
  await expireTrialVips();

  console.log("\n========================================");
  console.log("✅ 所有操作完成");

  if (!CONFIG.executeDelete) {
    console.log("\n⚠️ 提示：本次运行为模拟模式，未实际修改数据");
    console.log("如需实际执行，请使用 --execute 参数");
  }
}

// 错误处理
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ 未处理的Promise拒绝:", reason);
  process.exit(1);
});

main();