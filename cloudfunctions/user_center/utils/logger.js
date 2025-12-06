const { getTodayStr } = require("./common");

async function addLog(ctx, type, content, extra = {}) {
  const { db, OPENID } = ctx;
  try {
    await db.collection("logs").add({
      data: {
        _openid: OPENID,
        type,
        content,
        originalDate: getTodayStr(),
        createdAt: db.serverDate(),
        ...extra,
      },
    });
  } catch (err) {
    console.error("Log Error:", err);
  }
}

module.exports = { addLog };
