const { addLog } = require("./logger");

async function tryTriggerEgg(
  ctx,
  eggId,
  bonus,
  title,
  desc,
  isRepeatable = false,
  probability = 1.0
) {
  const { db, _, OPENID } = ctx;

  if (probability < 1.0 && Math.random() > probability) return null;

  let shouldTrigger = false;
  let userEggId = null;

  const eggRes = await db
    .collection("user_eggs")
    .where({ _openid: OPENID, egg_id: eggId })
    .get();

  if (eggRes.data.length > 0) {
    if (isRepeatable) {
      shouldTrigger = true;
      userEggId = eggRes.data[0]._id;
    }
  } else {
    shouldTrigger = true;
  }

  if (shouldTrigger) {
    if (userEggId) {
      await db
        .collection("user_eggs")
        .doc(userEggId)
        .update({
          data: { count: _.inc(1), unlocked_at: db.serverDate() },
        });
    } else {
      await db.collection("user_eggs").add({
        data: {
          _openid: OPENID,
          egg_id: eggId,
          count: 1,
          unlocked_at: db.serverDate(),
          is_read: false,
        },
      });
    }
    await addLog(ctx, "egg", `触发彩蛋：${title}`);
    return { title, icon: "🎁", desc, bonus };
  }
  return null;
}

module.exports = { tryTriggerEgg };
