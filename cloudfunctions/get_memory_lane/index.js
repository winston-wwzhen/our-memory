// cloudfunctions/get_memory_lane/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenID = wxContext.OPENID;
  
  const { page = 0, pageSize = 20 } = event;

  try {
    // 1. 确定查询范围 (我 + 伴侣)
    const userRes = await db.collection('users').where({ _openid: myOpenID }).get();
    let targetIDs = [myOpenID]; 
    if (userRes.data.length > 0) {
      const userData = userRes.data[0];
      if (userData.partner_id) {
        targetIDs.push(userData.partner_id); 
      }
    }

    // 🔴 核心修复：构造严格的查询条件
    const query = {
      _openid: _.in(targetIDs),
      // 只查询类型为 'daily_check_in' 的记录，过滤掉 water/harvest 等
      type: 'daily_check_in'
    };

    // 3. 查询符合条件的总记录数 (修正显示的“已珍藏天数”)
    const countResult = await db.collection('logs').where(query).count();
    const totalDays = countResult.total;

    // 4. 分页查询列表
    const result = await db.collection('logs')
      .where(query)
      .orderBy('createdAt', 'desc') // 按时间倒序
      .skip(page * pageSize) 
      .limit(pageSize)       
      .get();

    const processedData = result.data.map(log => {
      return {
        ...log,
        isMine: log._openid === myOpenID 
      };
    });

    return {
      status: 200,
      data: processedData,
      totalDays: totalDays,
      hasMore: processedData.length === pageSize 
    };

  } catch (err) {
    console.error(err);
    return { status: 500, error: err };
  }
};