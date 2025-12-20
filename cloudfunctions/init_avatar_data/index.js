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
    sort_order: 1,
    is_vip: false,
    downloads: 15,
  },
  {
    title: "圣诞麋鹿",
    category: "圣诞节",
    sort_order: 2,
    is_vip: false,
    downloads: 3,
  },
  {
    title: "冬日礼物",
    category: "冬日温馨",
    sort_order: 3,
    is_vip: true, // VIP
    downloads: 22,
  },
  {
    title: "打雪仗",
    category: "冬日温馨",
    sort_order: 20,
    is_vip: false,
    downloads: 10,
  },
  {
    title: "冬日暖光",
    category: "冬日温馨",
    sort_order: 4,
    is_vip: false,
    downloads: 3,
  },
  {
    title: "隔窗相望",
    category: "冬日温馨",
    sort_order: 40,
    is_vip: true, // VIP
    downloads: 106,
  },
  {
    title: "可爱麋鹿",
    category: "圣诞节",
    sort_order: 12,
    is_vip: false,
    downloads: 33,
  },
  {
    title: "吃饼干",
    category: "可可爱爱",
    sort_order: 42,
    is_vip: false,
    downloads: 170,
  },
  {
    title: "我的礼物",
    category: "可可爱爱",
    sort_order: 137,
    is_vip: false,
    downloads: 36,
  },
  {
    title: "小笨蛋",
    category: "可可爱爱",
    sort_order: 36,
    is_vip: false,
    downloads: 19,
  },

  // 11-20
  {
    title: "滚雪球",
    category: "可可爱爱",
    sort_order: 35,
    is_vip: true,
    downloads: 115,
  },
  {
    title: "睡梦仙境",
    category: "可可爱爱",
    sort_order: 44,
    is_vip: true,
    downloads: 145,
  },
  {
    title: "有一点倔强",
    category: "简约",
    sort_order: 15,
    is_vip: false,
    downloads: 40,
  },
  {
    title: "一起干杯",
    category: "可可爱爱",
    sort_order: 52,
    is_vip: false,
    downloads: 190,
  },
  {
    title: "麋鹿发卡",
    category: "简约",
    sort_order: 69,
    is_vip: false,
    downloads: 206,
  },
  {
    title: "send gift",
    category: "简约",
    sort_order: 1,
    is_vip: false,
    downloads: 1,
  },
  {
    title: "听音乐",
    category: "简约",
    sort_order: 14,
    is_vip: false,
    downloads: 62,
  },
  {
    title: "下雪啦",
    category: "迪士尼",
    sort_order: 48,
    is_vip: false,
    downloads: 140,
  },
  {
    title: "圣诞麋鹿2",
    category: "圣诞节",
    sort_order: 18,
    is_vip: false,
    downloads: 21,
  },
  {
    title: "温暖假日",
    category: "迪士尼",
    sort_order: 48,
    is_vip: true, 
    downloads: 330,
  },

  // 21-30
  {
    title: "kiss kiss",
    category: "迪士尼",
    sort_order: 49,
    is_vip: false,
    downloads: 400,
  },
  {
    title: "烟花烂漫",
    category: "彩绘风",
    sort_order: 14,
    is_vip: false,
    downloads: 14,
  },
  {
    title: "红色围巾",
    category: "彩绘风",
    sort_order: 16,
    is_vip: false, 
    downloads: 10,
  },
  {
    title: "2026新年好",
    category: "新年2026",
    sort_order: 22,
    is_vip: false,
    downloads: 80,
  },
  {
    title: "国漫龙凤",
    category: "国漫风",
    sort_order: 11,
    is_vip: false,
    downloads: 10,
  },
  {
    title: "月下幻影",
    category: "国漫风",
    sort_order: 10,
    is_vip: false,
    downloads: 3,
  },
  {
    title: "圣诞礼物",
    category: "圣诞节",
    sort_order: 13,
    is_vip: false,
    downloads: 60,
  },
  {
    title: "烟花之下",
    category: "冬日温暖",
    sort_order: 38,
    is_vip: false,
    downloads: 95,
  },
  {
    title: "我掐",
    category: "简约风",
    sort_order: 37,
    is_vip: false,
    downloads: 80,
  },
  {
    title: "圣诞卡通",
    category: "圣诞节",
    sort_order: 16,
    is_vip: false, 
    downloads: 15,
  },

  // 31-40
  {
    title: "圣诞奇遇",
    category: "迪士尼",
    sort_order: 175,
    is_vip: true,
    downloads: 500,
  },
  {
    title: "真心实意",
    category: "像素风",
    sort_order: 14,
    is_vip: false,
    downloads: 18,
  },
  {
    title: "冬日篝火",
    category: "像素风",
    sort_order: 33,
    is_vip: true,
    downloads: 210,
  },
  {
    title: "传声筒",
    category: "像素风",
    sort_order: 82,
    is_vip: false,
    downloads: 300,
  },
  {
    title: "魔法球",
    category: "迪士尼",
    sort_order: 31,
    is_vip: false,
    downloads: 100,
  },
  {
    title: "堆雪人",
    category: "迪士尼",
    sort_order: 30,
    is_vip: false, // VIP
    downloads: 100,
  },
  {
    title: "一起吃面",
    category: "迪士尼",
    sort_order: 29,
    is_vip: false,
    downloads: 15,
  },
  {
    title: "飞屋环游",
    category: "经典",
    sort_order: 128,
    is_vip: true,
    downloads: 650,
  },
  {
    title: "水晶鞋",
    category: "经典",
    sort_order: 47,
    is_vip: true,
    downloads: 310,
  },
  {
    title: "太空漫游",
    category: "经典",
    sort_order: 36,
    is_vip: true,
    downloads: 200,
  },

  // 41-50
  {
    title: "阿拉丁",
    category: "经典",
    sort_order: 35,
    is_vip: false,
    downloads: 150,
  },
  {
    title: "一朵玫瑰",
    category: "经典",
    sort_order: 24,
    is_vip: false,
    downloads: 80,
  },
  {
    title: "大白哦",
    category: "经典",
    sort_order: 103,
    is_vip: true,
    downloads: 299,
  },
  {
    title: "幸福门",
    category: "经典",
    sort_order: 102,
    is_vip: true,
    downloads: 180,
  },
  {
    title: "music",
    category: "经典",
    sort_order: 41,
    is_vip: false,
    downloads: 20,
  },
  {
    title: "魔法幻影",
    category: "迪士尼",
    sort_order: 12,
    is_vip: false, 
    downloads: 20,
  },
  {
    title: "冰与火",
    category: "经典",
    sort_order: 89,
    is_vip: false,
    downloads: 66,
  },
  {
    title: "雨中打伞",
    category: "经典",
    sort_order: 118,
    is_vip: true,
    downloads: 210,
  }
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
