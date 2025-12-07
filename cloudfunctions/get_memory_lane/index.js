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
    // 1. 获取用户信息
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

    // 2. 确定“当前绑定时间”
    let bindStartTime = new Date(0);
    let bindDateStr = "";

    if (hasPartner) {
      const bindLogRes = await db
        .collection("logs")
        .where({
          type: "bind",
          _openid: _.in(targetIDs),
        })
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (bindLogRes.data.length > 0) {
        bindStartTime = bindLogRes.data[0].createdAt;
        // 将 UTC 时间转换为北京时间日期字符串 YYYY-MM-DD
        const beijingTime = new Date(bindStartTime.getTime() + 8 * 3600000);
        bindDateStr = beijingTime.toISOString().split("T")[0];
      }
    }

    // 3. 🟢 [核心修改] 聚合查询：同时获取打卡和绑定记录
    const listRes = await db
      .collection("logs")
      .aggregate()
      .match({
        _openid: _.in(targetIDs),
        // 同时查询打卡和绑定事件
        type: _.in(["daily_check_in", "bind"]),
      })
      .sort({ createdAt: -1 })
      .group({
        _id: "$originalDate",
        date: { $first: "$originalDate" },
        photos: {
          $push: {
            _id: "$_id",
            imageFileID: "$imageFileID",
            style: "$style",
            evaluation: "$evaluation",
            createdAt: "$createdAt",
            ownerId: "$_openid",
            type: "$type", // 🟢 记录类型
            content: "$content",
          },
        },
      })
      .sort({ date: -1 })
      .skip(page * pageSize)
      .limit(pageSize)
      .end();

    // 处理数据
    const processedData = listRes.list.map((dayItem) => {
      // 检查这一天是否有绑定事件
      const bindEvent = dayItem.photos.find((p) => p.type === "bind");
      const isBindDay = !!bindEvent;

      // 筛选出真正的照片（过滤掉绑定日志）
      const realPhotos = dayItem.photos.filter(
        (p) => p.type === "daily_check_in"
      );

      // 确定当天的归属权（优先取照片发布者，如果没有照片则取绑定事件发布者）
      let mainOwner = myOpenID;
      if (realPhotos.length > 0) {
        mainOwner = realPhotos[0].ownerId;
      } else if (bindEvent) {
        mainOwner = bindEvent.ownerId;
      }

      // 判断是否为“当前绑定关系”之后的记录
      // 简单字符串比较：如果记录日期 >= 绑定日期，则视为 PostBind
      let isPostBind = false;
      if (hasPartner && bindDateStr) {
        isPostBind = dayItem.date >= bindDateStr;
      }

      return {
        _id: dayItem._id,
        originalDate: dayItem.date,
        isMine: mainOwner === myOpenID,
        isBindDay: isBindDay, // 🟢 标记绑定日
        isPostBind: isPostBind, // 🟢 标记是否为二人世界时期
        photos: realPhotos.map((p) => ({
          ...p,
          isMine: p.ownerId === myOpenID,
        })),
      };
    });

    // 4. 统计有效打卡天数 (逻辑不变)
    let validDays = 0;
    if (hasPartner) {
      const countRes = await db
        .collection("logs")
        .aggregate()
        .match({
          _openid: _.in(targetIDs),
          type: "daily_check_in",
          createdAt: _.gt(bindStartTime),
        })
        .group({ _id: "$originalDate" })
        .count("total")
        .end();

      if (countRes.list.length > 0) {
        validDays = countRes.list[0].total;
      }
    }

    return {
      status: 200,
      data: processedData,
      totalDays: validDays,
      hasMore: processedData.length === pageSize,
      hasPartner: hasPartner,
    };
  } catch (err) {
    console.error(err);
    return { status: 500, error: err };
  }
};
