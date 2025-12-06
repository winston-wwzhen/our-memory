const RANDOM_NAMES = [
  "予你星河",
  "满眼星辰",
  "温柔本身",
  "限定温柔",
  "捕获月亮",
  "追光者",
  "心动嘉宾",
  "贩卖快乐",
  "三餐四季",
  "白茶清欢",
  "星河滚烫",
  "人间理想",
];

function getRandomName() {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
}

function getTodayStr() {
  const now = new Date();
  const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return beijingTime.toISOString().split("T")[0];
}

module.exports = { getRandomName, getTodayStr };
