// cloudfunctions/get_daily_mission/index.js
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * [Helper] 计算今天是今年的第几天 (极客算法)
 * 用于确保两人看到同一任务
 */
function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff =
    now -
    start +
    (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

exports.main = async (event, context) => {
  try {
    // 1. 获取任务总数
    const countResult = await db.collection("task_pool").count();
    const total = countResult.total;

    if (total === 0) {
      return { status: 404, msg: "任务池空空如也，快去添加！" };
    }

    // 2. 核心算法：基于日期的确定性随机
    // 今天是第几天 % 总任务数 = 今天的任务索引
    const dayIndex = getDayOfYear();
    const taskIndex = dayIndex % total;

    // 3. 查询该索引对应的任务
    // skip(n).limit(1) 是标准的数据库分页查询写法
    const tasks = await db
      .collection("task_pool")
      .skip(taskIndex)
      .limit(1)
      .get();

    if (tasks.data.length > 0) {
      return {
        status: 200,
        task: tasks.data[0], // 返回找到的那个任务
        dateStr: new Date().toLocaleDateString(), // 顺便返回今天日期
      };
    } else {
      throw new Error("Task indexing failed.");
    }
  } catch (err) {
    console.error(err);
    return { status: 500, error: err.message };
  }
};
