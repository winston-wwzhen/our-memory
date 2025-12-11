/**
 * 📊 我们的纪念册 - 终极运营数据日报 (Ultimate Edition)
 * 运行方式: node scripts/daily_stats_ultimate.js
 * * 包含功能:
 * 1. [存量] 大盘概览 (总用户/VIP/情侣数)
 * 2. [存量] 经济系统监控 (水滴/玫瑰总产出与存量)
 * 3. [流量] 用户生命周期 (萌新/成长/忠实分布)
 * 4. [流量] 行为漏斗 (登录->打卡->浇水转化率)
 * 5. [质量] 情侣活跃健康度 (双向奔赴/单相思/双死)
 * 6. [增长] 拉新排行榜
 */

const tcb = require("tcb-admin-node");
const fs = require("fs");

// 🟢 加载配置
let config = {};
try {
  config = require("./config");
} catch (e) {}

const ENV_ID = config.envId || "your-env-id";

tcb.init({
  env: ENV_ID,
  secretId: config.secretId,
  secretKey: config.secretKey,
});

const db = tcb.database();
const _ = db.command;

// 工具函数
function getTodayStart() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function getTodayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// 通用全量拉取
async function fetchAll(collectionName, where = {}, fieldObj = {}) {
  const countResult = await db.collection(collectionName).where(where).count();
  const total = countResult.total;
  const BATCH_SIZE = 100;
  const tasks = [];

  for (let i = 0; i < total; i += BATCH_SIZE) {
    tasks.push(
      db
        .collection(collectionName)
        .where(where)
        .skip(i)
        .limit(BATCH_SIZE)
        .field(fieldObj)
        .get()
    );
  }
  return (await Promise.all(tasks)).reduce(
    (acc, cur) => acc.concat(cur.data),
    []
  );
}

async function main() {
  console.log(`\n🚀 [我们的纪念册] 终极运营日报 - ${getTodayStr()}`);
  console.log("=================================================");

  try {
    const todayStart = getTodayStart();
    const todayStr = getTodayStr();
    const now = new Date();

    // ----------------------------------------------------
    // 1. 数据准备 (并行拉取三张表)
    // ----------------------------------------------------
    console.log("⏳ 正在全方位扫描数据 (Users, Gardens, Logs)...");

    const [allUsers, allGardens, todayLogs] = await Promise.all([
      // 1. 用户表: 需要统计总量、VIP、经济、生命周期、拉新
      fetchAll(
        "users",
        {},
        {
          _id: true,
          _openid: true,
          partner_id: true,
          nickName: true,
          avatarUrl: true,
          last_login_date: true,
          createdAt: true,
          vip_expire_date: true,
          water_count: true,
          rose_balance: true,
          invite_count: true,
        }
      ),
      // 2. 花园表: 只需要统计总产出 (轻量)
      fetchAll("gardens", {}, { harvest_total: true }),
      // 3. 日志表: 只需要今天的记录 (用于漏斗)
      fetchAll(
        "logs",
        { createdAt: _.gte(todayStart) },
        { type: true, _openid: true }
      ),
    ]);

    // ----------------------------------------------------
    // 2. 深度计算逻辑
    // ----------------------------------------------------

    // --- A. 宏观基础指标 (Total Stats) ---
    const totalUsers = allUsers.length;
    let vipCount = 0;
    let boundCount = 0; // 绑定人数

    // 经济存量
    let totalWater = 0;
    let totalRoseInBag = 0;

    // --- B. 生命周期与活跃 (LifeCycle & Active) ---
    let lifeCycle = { new: 0, growing: 0, loyal: 0 }; // <7天, 7-30天, >30天
    let activeUsers = []; // 今日活跃 openid 列表
    let churnUsers = 0; // >7天未登录

    // --- C. 情侣健康度辅助Map ---
    const userMap = {};

    allUsers.forEach((u) => {
      userMap[u._openid] = u; // 建立索引

      // 1. VIP 统计
      if (u.vip_expire_date && new Date(u.vip_expire_date) > now) vipCount++;

      // 2. 绑定统计
      if (u.partner_id) boundCount++;

      // 3. 经济累计
      totalWater += u.water_count || 0;
      totalRoseInBag += u.rose_balance || 0;

      // 4. 活跃与流失
      if (u.last_login_date === todayStr) {
        activeUsers.push(u._openid);
      }
      if (u.last_login_date) {
        const lastDate = new Date(u.last_login_date);
        const daysSinceLogin = Math.ceil(Math.abs(now - lastDate) / 86400000);
        if (daysSinceLogin > 7) churnUsers++;
      }

      // 5. 生命周期
      if (u.createdAt) {
        const regDate = new Date(u.createdAt);
        const daysSinceReg = Math.ceil((now - regDate) / 86400000);
        if (daysSinceReg <= 7) lifeCycle.new++;
        else if (daysSinceReg <= 30) lifeCycle.growing++;
        else lifeCycle.loyal++;
      }
    });

    // --- D. 经济产出 (Production) ---
    let totalHarvestedRoses = 0;
    allGardens.forEach((g) => {
      totalHarvestedRoses += g.harvest_total || 0;
    });

    // --- E. 行为漏斗 (Funnel) ---
    const countUniqueUsersByLogType = (type) => {
      const users = new Set(
        todayLogs.filter((l) => l.type === type).map((l) => l._openid)
      );
      return users.size;
    };
    const dau = activeUsers.length;
    const statsCheckIn = countUniqueUsersByLogType("daily_check_in");
    const statsWater = countUniqueUsersByLogType("water");

    // --- F. 情侣健康度 (Couple Health) ---
    let coupleStats = {
      totalPairs: 0,
      sweetDouble: 0,
      lonelySupport: 0,
      sleeping: 0,
    };
    const processedPairs = new Set();

    allUsers.forEach((u) => {
      if (u.partner_id && userMap[u.partner_id]) {
        const pairKey = [u._openid, u.partner_id].sort().join("-");
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey);
          coupleStats.totalPairs++;
          const meActive = u.last_login_date === todayStr;
          const partnerActive =
            userMap[u.partner_id].last_login_date === todayStr;

          if (meActive && partnerActive) coupleStats.sweetDouble++;
          else if (meActive || partnerActive) coupleStats.lonelySupport++;
          else coupleStats.sleeping++;
        }
      }
    });

    // --- G. 拉新排行 (Growth) ---
    const topInviters = allUsers
      .filter((u) => u.invite_count > 0)
      .sort((a, b) => b.invite_count - a.invite_count)
      .slice(0, 5)
      .map((u) => ({ name: u.nickName, count: u.invite_count }));

    // ----------------------------------------------------
    // 3. 生成综合报告
    // ----------------------------------------------------

    console.log(`\n📊 [Part 1: 全局大盘概览]`);
    console.log(`- 总用户数: \t${totalUsers}`);
    console.log(
      `- 有效VIP数: \t${vipCount} (占比 ${(totalUsers
        ? (vipCount / totalUsers) * 100
        : 0
      ).toFixed(1)}%)`
    );
    console.log(
      `- 情侣对数: \t${coupleStats.totalPairs} 对 (覆盖 ${(totalUsers
        ? ((coupleStats.totalPairs * 2) / totalUsers) * 100
        : 0
      ).toFixed(1)}% 用户)`
    );
    console.log(`- 沉默流失: \t${churnUsers} 人 (>7天未登录)`);

    console.log(`\n💰 [Part 2: 经济系统监控]`);
    console.log(`- 💧 全服水滴存量: \t${totalWater} g`);
    console.log(`- 🌹 用户持有玫瑰: \t${totalRoseInBag} 朵`);
    console.log(
      `- 🌾 历史产出玫瑰: \t${totalHarvestedRoses} 朵 (平均每人产出 ${(totalUsers
        ? totalHarvestedRoses / totalUsers
        : 0
      ).toFixed(1)} 朵)`
    );

    console.log(`\n👥 [Part 3: 用户分层 (生命周期)]`);
    console.log(`- 🌱 萌新 (注册<7天): \t${lifeCycle.new} 人`);
    console.log(`- 🌿 成长 (注册1月内): \t${lifeCycle.growing} 人`);
    console.log(`- 🌳 忠实 (注册>1月): \t${lifeCycle.loyal} 人`);

    console.log(
      `\n❤️ [Part 4: 今日情侣活跃度] (基于 ${coupleStats.totalPairs} 对情侣)`
    );
    if (coupleStats.totalPairs > 0) {
      const p = (num) =>
        ((num / coupleStats.totalPairs) * 100).toFixed(1) + "%";
      console.log(
        `- 🔥 双向奔赴 (双活): \t${coupleStats.sweetDouble} 对 (${p(
          coupleStats.sweetDouble
        )})`
      );
      console.log(
        `- 💔 独自守护 (单活): \t${coupleStats.lonelySupport} 对 (${p(
          coupleStats.lonelySupport
        )}) -> 重点召回对象`
      );
      console.log(
        `- 💤 双双隐退 (全死): \t${coupleStats.sleeping} 对 (${p(
          coupleStats.sleeping
        )})`
      );
    }

    console.log(`\n🌪️ [Part 5: 今日行为漏斗] (DAU: ${dau})`);
    if (dau > 0) {
      const rate = (num) => ((num / dau) * 100).toFixed(1) + "%";
      console.log(`  Step 1: 登录 App   \t| ${dau}`);
      console.log(
        `  Step 2: 每日打卡   \t| ${statsCheckIn} (${rate(statsCheckIn)})`
      );
      console.log(
        `  Step 3: 花园浇水   \t| ${statsWater} (${rate(statsWater)})`
      );
    } else {
      console.log("  (今日暂无活跃用户)");
    }

    console.log(`\n🏆 [Part 6: 拉新达人榜]`);
    if (topInviters.length > 0) {
      topInviters.forEach((u, i) =>
        console.log(`  ${i + 1}. ${u.name || "无名氏"}: 邀请 ${u.count} 人`)
      );
    } else {
      console.log("  (暂无数据)");
    }

    console.log("\n=================================================");
  } catch (err) {
    console.error("❌ 统计失败:", err);
  }
}

main();
