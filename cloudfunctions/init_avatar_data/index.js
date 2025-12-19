const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

// 基础云存储路径，方便后续统一修改
const CLOUD_BASE =
  "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars";

const INITIAL_DATA = [
  // 1-10
  {
    title: "初雪约定",
    category: "围巾·暖冬系",
    sort_order: 165,
    is_vip: false,
    downloads: 2450,
  },
  {
    title: "樱花树下",
    category: "制服·校园系",
    sort_order: 164,
    is_vip: false,
    downloads: 1890,
  },
  {
    title: "宅家时光",
    category: "眼镜·居家系",
    sort_order: 163,
    is_vip: true, // VIP
    downloads: 3200,
  },
  {
    title: "滑板少年",
    category: "运动·街头系",
    sort_order: 162,
    is_vip: false,
    downloads: 1560,
  },
  {
    title: "便利店奇遇",
    category: "卫衣·日常系",
    sort_order: 161,
    is_vip: false,
    downloads: 4100,
  },
  {
    title: "复古胶片",
    category: "港风·怀旧系",
    sort_order: 160,
    is_vip: true, // VIP
    downloads: 890,
  },
  {
    title: "极地滑雪",
    category: "户外·活力系",
    sort_order: 159,
    is_vip: false,
    downloads: 2300,
  },
  {
    title: "图书馆恋人",
    category: "衬衫·斯文系",
    sort_order: 158,
    is_vip: false,
    downloads: 1750,
  },
  {
    title: "新年花火",
    category: "唯美·氛围系",
    sort_order: 157,
    is_vip: false,
    downloads: 3600,
  },
  {
    title: "森林童话",
    category: "Q版·可爱系",
    sort_order: 156,
    is_vip: true, // VIP
    downloads: 1200,
  },

  // 11-20
  {
    title: "海边假日",
    category: "清凉·度假系",
    sort_order: 155,
    is_vip: false,
    downloads: 2100,
  },
  {
    title: "游乐园",
    category: "发箍·可爱系",
    sort_order: 154,
    is_vip: false,
    downloads: 1450,
  },
  {
    title: "黑色酷盖",
    category: "黑白·高冷系",
    sort_order: 153,
    is_vip: true, // VIP
    downloads: 4500,
  },
  {
    title: "汉服古韵",
    category: "汉服·古风系",
    sort_order: 152,
    is_vip: false,
    downloads: 1980,
  },
  {
    title: "萌宠情侣",
    category: "猫咪·治愈系",
    sort_order: 151,
    is_vip: false,
    downloads: 2800,
  },
  {
    title: "赛博朋克",
    category: "霓虹·未来系",
    sort_order: 150,
    is_vip: true, // VIP
    downloads: 1100,
  },
  {
    title: "像素大战",
    category: "像素·游戏系",
    sort_order: 149,
    is_vip: false,
    downloads: 980,
  },
  {
    title: "落日飞车",
    category: "复古·港风系",
    sort_order: 148,
    is_vip: false,
    downloads: 1340,
  },
  {
    title: "星空漫步",
    category: "梦幻·唯美系",
    sort_order: 147,
    is_vip: false,
    downloads: 2150,
  },
  {
    title: "搞怪日常",
    category: "表情包·沙雕系",
    sort_order: 146,
    is_vip: true, // VIP
    downloads: 3300,
  },

  // 21-30
  {
    title: "纯白之恋",
    category: "婚纱·浪漫系",
    sort_order: 145,
    is_vip: false,
    downloads: 1600,
  },
  {
    title: "咖啡时间",
    category: "休闲·午后系",
    sort_order: 144,
    is_vip: false,
    downloads: 1400,
  },
  {
    title: "雨天邂逅",
    category: "雨伞·忧郁系",
    sort_order: 143,
    is_vip: true, // VIP
    downloads: 1050,
  },
  {
    title: "摇滚不死",
    category: "吉他·乐队系",
    sort_order: 142,
    is_vip: false,
    downloads: 880,
  },
  {
    title: "向日葵",
    category: "阳光·田园系",
    sort_order: 141,
    is_vip: false,
    downloads: 1700,
  },
  {
    title: "二次元",
    category: "动漫·手绘系",
    sort_order: 140,
    is_vip: true, // VIP
    downloads: 3100,
  },
  {
    title: "街角咖啡",
    category: "风衣·都市系",
    sort_order: 139,
    is_vip: false,
    downloads: 1200,
  },
  {
    title: "海盗船长",
    category: "Cosplay·奇幻系",
    sort_order: 138,
    is_vip: false,
    downloads: 950,
  },
  {
    title: "校园操场",
    category: "运动服·青春系",
    sort_order: 137,
    is_vip: false,
    downloads: 2400,
  },
  {
    title: "深夜食堂",
    category: "美食·治愈系",
    sort_order: 136,
    is_vip: true, // VIP
    downloads: 1550,
  },

  // 31-40
  {
    title: "圣诞之夜",
    category: "麋鹿·节日系",
    sort_order: 135,
    is_vip: false,
    downloads: 3500,
  },
  {
    title: "宇航员",
    category: "太空·探索系",
    sort_order: 134,
    is_vip: false,
    downloads: 1800,
  },
  {
    title: "花海漫游",
    category: "鲜花·森系",
    sort_order: 133,
    is_vip: true, // VIP
    downloads: 2200,
  },
  {
    title: "机车情侣",
    category: "头盔·酷飒系",
    sort_order: 132,
    is_vip: false,
    downloads: 2700,
  },
  {
    title: "搞怪小鬼",
    category: "涂鸦·鬼马系",
    sort_order: 131,
    is_vip: false,
    downloads: 1300,
  },
  {
    title: "海风吹拂",
    category: "蓝白·清新系",
    sort_order: 130,
    is_vip: true, // VIP
    downloads: 1900,
  },
  {
    title: "棒球英豪",
    category: "棒球服·运动系",
    sort_order: 129,
    is_vip: false,
    downloads: 1450,
  },
  {
    title: "落叶知秋",
    category: "针织·秋日系",
    sort_order: 128,
    is_vip: false,
    downloads: 1650,
  },
  {
    title: "电竞高手",
    category: "耳机·电竞系",
    sort_order: 127,
    is_vip: false,
    downloads: 3100,
  },
  {
    title: "可爱恐龙",
    category: "睡衣·搞怪系",
    sort_order: 126,
    is_vip: true, // VIP
    downloads: 2300,
  },

  // 41-50
  {
    title: "游乐园气球",
    category: "粉色·少女心",
    sort_order: 125,
    is_vip: false,
    downloads: 1250,
  },
  {
    title: "黑白剪影",
    category: "极简·艺术系",
    sort_order: 124,
    is_vip: false,
    downloads: 800,
  },
  {
    title: "终极浪漫",
    category: "礼服·典雅系",
    sort_order: 123,
    is_vip: true, // VIP
    downloads: 9999,
  },
  {
    title: "橘子汽水",
    category: "夏日·清爽系",
    sort_order: 122,
    is_vip: false,
    downloads: 1800,
  },
  {
    title: "迷雾森林",
    category: "探险·神秘系",
    sort_order: 121,
    is_vip: false,
    downloads: 920,
  },
  {
    title: "慵懒午后",
    category: "睡衣·居家系",
    sort_order: 120,
    is_vip: true, // VIP
    downloads: 2600,
  },
  {
    title: "街头涂鸦",
    category: "嘻哈·潮流系",
    sort_order: 119,
    is_vip: false,
    downloads: 1450,
  },
  {
    title: "星际穿越",
    category: "科幻·未来系",
    sort_order: 118,
    is_vip: false,
    downloads: 2100,
  },
  {
    title: "魔法学院",
    category: "巫师·奇幻系",
    sort_order: 117,
    is_vip: true, // VIP
    downloads: 3400,
  },
  {
    title: "昭和时代",
    category: "复古·胶片系",
    sort_order: 116,
    is_vip: false,
    downloads: 1200,
  },

  // 51-60
  {
    title: "柴犬恋人",
    category: "萌宠·日系",
    sort_order: 115,
    is_vip: false,
    downloads: 2900,
  },
  {
    title: "蓝调时刻",
    category: "忧郁·情绪系",
    sort_order: 114,
    is_vip: true, // VIP
    downloads: 1560,
  },
  {
    title: "游园惊梦",
    category: "戏曲·国风系",
    sort_order: 113,
    is_vip: false,
    downloads: 880,
  },
  {
    title: "像素世界",
    category: "8bit·怀旧系",
    sort_order: 112,
    is_vip: false,
    downloads: 1300,
  },
  {
    title: "蒸汽波",
    category: "故障·艺术系",
    sort_order: 111,
    is_vip: false,
    downloads: 940,
  },
  {
    title: "荒野大镖客",
    category: "西部·牛仔系",
    sort_order: 110,
    is_vip: true, // VIP
    downloads: 2100,
  },
  {
    title: "宫廷舞会",
    category: "欧式·华丽系",
    sort_order: 109,
    is_vip: false,
    downloads: 1750,
  },
  {
    title: "极简线条",
    category: "抽象·设计系",
    sort_order: 108,
    is_vip: false,
    downloads: 1100,
  },
  {
    title: "奶油蛋糕",
    category: "甜美·食物系",
    sort_order: 107,
    is_vip: true, // VIP
    downloads: 3800,
  },
  {
    title: "功夫熊猫",
    category: "国潮·武侠系",
    sort_order: 106,
    is_vip: false,
    downloads: 2400,
  },

  // 61-65
  {
    title: "赛博杀手",
    category: "机械·冷酷系",
    sort_order: 105,
    is_vip: false,
    downloads: 1600,
  },
  {
    title: "幼儿园",
    category: "稚嫩·童年系",
    sort_order: 104,
    is_vip: false,
    downloads: 4200,
  },
  {
    title: "暮光之城",
    category: "吸血鬼·暗黑系",
    sort_order: 103,
    is_vip: true, // VIP
    downloads: 2800,
  },
  {
    title: "深海伙伴",
    category: "卡通·搞怪系",
    sort_order: 102,
    is_vip: false,
    downloads: 3100,
  },
  {
    title: "机械战警",
    category: "科技·硬核系",
    sort_order: 101,
    is_vip: false,
    downloads: 1900,
  },
].map((item, index) => {
  // 自动根据索引 (index + 1) 生成 cloud 路径
  const i = index + 1;
  return {
    ...item,
    cover_url: `${CLOUD_BASE}/${i}.jpeg`,
    boy_img: `${CLOUD_BASE}/couple${i}-M.jpeg`,
    boy_img_hd: `${CLOUD_BASE}/couple${i}-M-hd.png`,
    girl_img: `${CLOUD_BASE}/couple${i}-F.jpeg`,
    girl_img_hd: `${CLOUD_BASE}/couple${i}-F-hd.png`,
    // 如果不是 VIP，则开启广告锁
    ad_lock: !item.is_vip,
  };
});

exports.main = async (event, context) => {
  const result = {
    collectionInit: "",
    added: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // 1. 检查并创建集合 avatar_sets
    try {
      await db.createCollection("avatar_sets");
      result.collectionInit = "Created collection avatar_sets";
    } catch (e) {
      result.collectionInit = "Collection avatar_sets already exists";
    }

    // 2. 遍历并插入数据
    for (const item of INITIAL_DATA) {
      try {
        // 查重：根据 title 判断是否已存在
        const checkRes = await db
          .collection("avatar_sets")
          .where({
            title: item.title,
          })
          .count();

        if (checkRes.total > 0) {
          // 如果已存在，我们选择【更新】它，以确保 cloud 路径和 VIP 状态是最新的
          const existRes = await db
            .collection("avatar_sets")
            .where({ title: item.title })
            .get();
          const docId = existRes.data[0]._id;

          await db
            .collection("avatar_sets")
            .doc(docId)
            .update({
              data: {
                cover_url: item.cover_url,
                boy_img: item.boy_img,
                boy_img_hd: item.boy_img_hd,
                girl_img: item.girl_img,
                girl_img_hd: item.girl_img_hd,
                is_vip: item.is_vip,
                ad_lock: item.ad_lock,
                sort_order: item.sort_order,
                updated_at: db.serverDate(),
              },
            });

          console.log(`更新已存在数据: ${item.title}`);
          result.skipped++; // 虽更新了但算在 skipped 里以便区分新增
        } else {
          // 插入新数据
          await db.collection("avatar_sets").add({
            data: {
              ...item,
              created_at: db.serverDate(),
              updated_at: db.serverDate(),
            },
          });
          console.log(`新增数据成功: ${item.title}`);
          result.added++;
        }
      } catch (err) {
        console.error(`插入数据失败: ${item.title}`, err);
        result.errors.push({ title: item.title, msg: err.errMsg });
      }
    }

    return {
      success: true,
      msg: `初始化完成。新增: ${result.added}, 更新/跳过: ${result.skipped}`,
      details: result,
    };
  } catch (err) {
    console.error("Script execution error", err);
    return {
      success: false,
      msg: "脚本执行出错",
      error: err,
    };
  }
};
