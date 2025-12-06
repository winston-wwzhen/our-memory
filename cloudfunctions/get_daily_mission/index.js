// cloudfunctions/get_daily_mission/index.js
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * [Helper] 获取标准北京时间日期字符串 (YYYY-MM-DD)
 * 解决云函数时区可能为 UTC 的问题
 */
function getBeijingDateStr() {
  const now = new Date();
  // UTC 时间 + 8小时
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const beijingTime = new Date(utc + 8 * 3600000);
  return beijingTime.toISOString().split("T")[0];
}

exports.main = async (event, context) => {
  try {
    const todayStr = getBeijingDateStr();

    // 1. 🔒 优先查询：今日任务是否已“固化”
    // 直接查 daily_picks 表，如果有，直接返回，确保所有人一致
    try {
      const todayPick = await db.collection("daily_picks").doc(todayStr).get();
      if (todayPick.data) {
        return {
          status: 200,
          task: todayPick.data.task,
          dateStr: todayStr,
        };
      }
    } catch (e) {
      // 如果报错（通常是 Document not found），说明今天是第一次生成，继续往下走
    }

    // 2. 🎲 生成逻辑：如果今日未选定，从池子中抽取
    const countResult = await db.collection("task_pool").count();
    const total = countResult.total;

    if (total === 0) {
      return { status: 404, msg: "任务池空空如也，快去添加！" };
    }

    // 保持基于日期的伪随机算法，作为初始选取的策略
    // (这样即使不存库，大部分时间也是稳定的；存库是为了防变动)
    // 使用时间戳天数作为种子
    const daySeed = Math.floor(
      (new Date().getTime() + 8 * 3600000) / (1000 * 60 * 60 * 24)
    );
    const taskIndex = daySeed % total;

    const tasks = await db
      .collection("task_pool")
      .skip(taskIndex)
      .limit(1)
      .get();

    if (tasks.data.length > 0) {
      const selectedTask = tasks.data[0];

      // 3. 💾 固化结果：尝试写入 daily_picks
      // 使用 todayStr 作为 _id，利用数据库的主键唯一性防止并发写入不同任务
      try {
        await db.collection("daily_picks").add({
          data: {
            _id: todayStr, // 🔑 关键：强制 ID 为日期
            task: selectedTask,
            createdAt: db.serverDate(),
          },
        });

        // 写入成功，返回该任务
        return {
          status: 200,
          task: selectedTask,
          dateStr: todayStr,
        };
      } catch (writeErr) {
        // 4. ⚔️ 并发处理：如果写入失败（说明有别人抢先写入了）
        // 此时重新读取数据库里已存在的那个任务，确保一致性
        console.warn("并发写入冲突，转为读取已存任务:", writeErr);
        const existPick = await db
          .collection("daily_picks")
          .doc(todayStr)
          .get();
        return {
          status: 200,
          task: existPick.data.task,
          dateStr: todayStr,
        };
      }
    } else {
      throw new Error("Task indexing failed.");
    }
  } catch (err) {
    console.error(err);
    return { status: 500, error: err.message };
  }
};
