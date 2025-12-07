// cloudfunctions/get_memory_lane/index.js
const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenID = wxContext.OPENID;

  const { page = 0, pageSize = 20 } = event;

  try {
    // 1. 获取用户信息，确定查询范围 (我 + 伴侣)
    const userRes = await db
      .collection("users")
      .where({ _openid: myOpenID })
      .get();

    let targetIDs = [myOpenID];
    let hasPartner = false;
    let partnerID = null;

    if (userRes.data.length > 0) {
      const userData = userRes.data[0];
      if (userData.partner_id) {
        partnerID = userData.partner_id;
        targetIDs.push(partnerID);
        hasPartner = true;
      }
    }

    // 2. 确定统计的“起始时间” (解决解绑后重置问题)
    let bindStartTime = new Date(0); // 默认从远古时期开始
    if (hasPartner) {
      // 查询最近一次“绑定成功”的日志时间
      const bindLogRes = await db
        .collection("logs")
        .where({
          type: "bind",
          // 绑定日志可能是由我发的，也可能是对方发的
          _openid: _.in(targetIDs),
        })
        .orderBy("createdAt", "desc") // 倒序，取最近的一次
        .limit(1)
        .get();

      if (bindLogRes.data.length > 0) {
        bindStartTime = bindLogRes.data[0].createdAt;
        console.log("Found bind time:", bindStartTime);
      }
    }

    // 3. 构造基础查询条件 (用于列表展示)
    // 列表依然展示所有的历史（包含绑定前的），或者你可以选择也只展示绑定后的
    // 这里保持原有逻辑：展示所有记录，但Banner统计只算绑定后的
    const listQuery = {
      _openid: _.in(targetIDs),
      type: "daily_check_in",
    };

    // 4. 【核心修复】使用聚合查询统计“有效打卡天数”
    // 规则：绑定时间之后 + 按 originalDate 去重
    let validDays = 0;
    if (hasPartner) {
      const countRes = await db
        .collection("logs")
        .aggregate()
        .match({
          _openid: _.in(targetIDs),
          type: "daily_check_in",
          createdAt: _.gt(bindStartTime), // 必须是绑定之后产生的
        })
        .group({
          _id: "$originalDate", // 按日期字符串分组 (实现去重: 2人同1天打卡只算1天)
        })
        .count("total") // 统计分组数
        .end();

      if (countRes.list.length > 0) {
        validDays = countRes.list[0].total;
      }
    }

    // 5. 分页查询列表数据 (按需返回)
    // 如果你想让列表也只显示绑定后的，可以在 listQuery 加 createdAt: _.gt(bindStartTime)
    // 但通常保留历史记录比较温情，这里只过滤统计数用于解锁奖励
    const listRes = await db
      .collection("logs")
      .where(listQuery)
      .orderBy("createdAt", "desc")
      .skip(page * pageSize)
      .limit(pageSize)
      .get();

    const processedData = listRes.data.map((log) => {
      return {
        ...log,
        isMine: log._openid === myOpenID,
      };
    });

    return {
      status: 200,
      data: processedData,
      totalDays: validDays, // 🟢 返回去重、限时后的真实天数
      hasMore: processedData.length === pageSize,
      hasPartner: hasPartner,
    };
  } catch (err) {
    console.error(err);
    return { status: 500, error: err };
  }
};
