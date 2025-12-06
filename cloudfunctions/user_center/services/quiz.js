const { addLog } = require("../utils/logger");
const { tryTriggerEgg } = require("../utils/eggs");

async function handle(action, event, ctx) {
  const { OPENID, db, _, CONFIG, cloud } = ctx;
  const app = cloud.getWXContext(); // 有时候需要 APPID

  switch (action) {
    case "get_quiz_home": {
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];
      const partnerId = me.partner_id;
      if (!partnerId) return { status: 403, msg: "请先绑定伴侣" };

      const historyRes = await db
        .collection("quiz_rounds")
        .where({ owners: _.all([OPENID, partnerId]), is_finished: true })
        .orderBy("round_seq", "desc")
        .get();
      const activeRes = await db
        .collection("quiz_rounds")
        .where({ owners: _.all([OPENID, partnerId]), is_finished: false })
        .limit(1)
        .get();

      let currentRound = null;
      if (activeRes.data.length > 0) {
        const r = activeRes.data[0];
        const isUserA = OPENID < partnerId;
        const myProgress = isUserA ? r.answers_a.length : r.answers_b.length;
        const partnerProgress = isUserA
          ? r.answers_b.length
          : r.answers_a.length;
        currentRound = {
          _id: r._id,
          round_seq: r.round_seq,
          my_progress: myProgress,
          partner_progress: partnerProgress,
          total: CONFIG.QUESTIONS_PER_ROUND,
          status: "playing",
        };
        if (myProgress === CONFIG.QUESTIONS_PER_ROUND)
          currentRound.status = "waiting_partner";
      }
      return { status: 200, history: historyRes.data, currentRound };
    }

    case "start_new_round": {
      const userRes = await db
        .collection("users")
        .where({ _openid: OPENID })
        .get();
      const me = userRes.data[0];
      const partnerId = me.partner_id;
      if (!partnerId) return { status: 403 };

      const activeCount = await db
        .collection("quiz_rounds")
        .where({ owners: _.all([OPENID, partnerId]), is_finished: false })
        .count();
      if (activeCount.total > 0) return { status: 400, msg: "还有未完成的" };

      const maxRoundRes = await db
        .collection("quiz_rounds")
        .where({ owners: _.all([OPENID, partnerId]) })
        .orderBy("round_seq", "desc")
        .limit(1)
        .get();
      const nextSeq =
        (maxRoundRes.data.length > 0 ? maxRoundRes.data[0].round_seq : 0) + 1;

      const allQuizRes = await db
        .collection("quiz_pool")
        .where({ type: "choice" })
        .limit(100)
        .get();
      const pool = allQuizRes.data;
      // 洗牌算法
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }

      const selectedQuestions = pool
        .slice(0, CONFIG.QUESTIONS_PER_ROUND)
        .map((q) => ({
          _id: q._id,
          title: q.title,
          options: q.options,
          is_person: q.is_person || false,
        }));

      const isUserA = OPENID < partnerId;
      const owners = isUserA ? [OPENID, partnerId] : [partnerId, OPENID];

      await db.collection("quiz_rounds").add({
        data: {
          owners,
          round_seq: nextSeq,
          questions: selectedQuestions,
          answers_a: [],
          answers_b: [],
          is_finished: false,
          score: 0,
          createdAt: db.serverDate(),
        },
      });
      return { status: 200, msg: "已开启" };
    }

    case "get_round_detail": {
      const { roundId } = event;
      const roundRes = await db.collection("quiz_rounds").doc(roundId).get();
      const round = roundRes.data;
      const isUserA = OPENID < round.owners.find((id) => id !== OPENID);
      const myAnswers = isUserA ? round.answers_a : round.answers_b;

      if (round.is_finished)
        return { status: 200, mode: "result", round, isUserA };
      if (myAnswers.length >= CONFIG.QUESTIONS_PER_ROUND)
        return { status: 200, mode: "waiting", progress: myAnswers.length };

      const question = round.questions[myAnswers.length];
      return {
        status: 200,
        mode: "answering",
        question,
        index: myAnswers.length + 1,
        total: CONFIG.QUESTIONS_PER_ROUND,
      };
    }

    case "submit_round_answer": {
      const { roundId, answer } = event;
      if (!roundId || answer === undefined) return { status: 400 };

      const roundRes = await db.collection("quiz_rounds").doc(roundId).get();
      const round = roundRes.data;
      const partnerId = round.owners.find((id) => id !== OPENID);
      const isUserA = OPENID < partnerId;
      const field = isUserA ? "answers_a" : "answers_b";

      if ((round[field] || []).length < CONFIG.QUESTIONS_PER_ROUND) {
        await db
          .collection("quiz_rounds")
          .doc(roundId)
          .update({ data: { [field]: _.push(answer) } });
      }

      // 检查是否结束
      const newRound = (await db.collection("quiz_rounds").doc(roundId).get())
        .data;
      const lenA = newRound.answers_a.length;
      const lenB = newRound.answers_b.length;
      let isRoundFinished = false;
      let triggerEgg = null;

      if (
        lenA >= CONFIG.QUESTIONS_PER_ROUND &&
        lenB >= CONFIG.QUESTIONS_PER_ROUND
      ) {
        if (!newRound.is_finished) {
          let score = 0;
          for (let i = 0; i < CONFIG.QUESTIONS_PER_ROUND; i++) {
            const valA = newRound.answers_a[i];
            const valB = newRound.answers_b[i];
            const q = newRound.questions[i];
            if (q && q.is_person) {
              if (
                (valA === 0 && valB === 1) ||
                (valA === 1 && valB === 0) ||
                (valA > 1 && valA === valB)
              )
                score += 10;
            } else {
              if (valA === valB) score += 10;
            }
          }
          await db
            .collection("quiz_rounds")
            .doc(roundId)
            .update({
              data: { is_finished: true, score, finishedAt: db.serverDate() },
            });
          await addLog(ctx, "quiz_round", `问答得分:${score}`);

          if (score === 100) {
            triggerEgg = await tryTriggerEgg(
              ctx,
              "soul_mate",
              100,
              "灵魂伴侣",
              "默契问答满分！",
              true
            );
          }
        }
        isRoundFinished = true;
      }
      return { status: 200, msg: "ok", isRoundFinished, triggerEgg };
    }
  }
}

module.exports = { handle };
