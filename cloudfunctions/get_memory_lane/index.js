// cloudfunctions/get_memory_lane/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command; // 引入数据库操作符 (Command)

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const myOpenID = wxContext.OPENID;
  
  try {
    // 1. 先查询用户信息，获取 partner_id
    const userRes = await db.collection('users')
      .where({ _openid: myOpenID })
      .get();

    let targetIDs = [myOpenID]; // 默认查看列表：只有我自己

    // 如果找到了用户，并且有伴侣
    if (userRes.data.length > 0) {
      const userData = userRes.data[0];
      if (userData.partner_id) {
        targetIDs.push(userData.partner_id); // 把 TA 加入查看列表
        console.log('🔗 Found partner:', userData.partner_id);
      }
    }

    // 2. 核心查询：使用 _.in 操作符
    // 意思就是：找出 _openid 在 [我, TA] 这个数组里的所有记录
    const result = await db.collection('logs')
      .where({
        _openid: _.in(targetIDs) 
      })
      .orderBy('createdAt', 'desc') // 按时间倒序
      .limit(20) // 分页限制
      .get();

    // 3. (可选优化) 标记每条记录是谁发的，方便前端区分
    const processedData = result.data.map(log => {
      return {
        ...log,
        isMine: log._openid === myOpenID // 增加一个字段，告诉前端这图是不是我发的
      };
    });

    return {
      status: 200,
      data: processedData
    };

  } catch (err) {
    console.error(err);
    return { status: 500, error: err };
  }
};