const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

// 🔥 在这里配置你的初始化数据
const INITIAL_DATA = [
  {
    title: "经典漫步",
    category: "红围巾·黑发男", 
    cover_url: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple1-M.jpeg?sign=dd53e9bc20d6f60d4717ed0a8aba45a4&t=1766043941", 
    boy_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple1-M.jpeg?sign=dd53e9bc20d6f60d4717ed0a8aba45a4&t=1766043941", 
    boy_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple1-M-hd.png?sign=14f989ab7096bdebc288876f48fd26fc&t=1766043929",
    girl_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple1-F.jpeg?sign=a2425d9bce1d5dfac21d3f22f777533d&t=1766043838",
    girl_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple1-F-hd.png?sign=938bc3ba2ac76b9a7e4b95dfa6daa34b&t=1766043914",
    downloads: 1204, // 初始伪造热度
    sort_order: 100, // 排序权重，越大越靠前
    is_vip: false,   // 是否 VIP 专属
    ad_lock: true    // 是否需要看广告解锁高清
  },
  {
    title: "经典漫步",
    category: "红围巾·黑发男",
    boy_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple2-M.jpeg?sign=b8590543703c6ddb3cc1b6fead1ad1b6&t=1766044035",
    boy_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple2-M-hd.png?sign=f25354bb852a7cdf97e41d74e1adda32&t=1766044025",
    girl_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple2-F.jpeg?sign=7810dac70ff0b2ec9362d2c4a1322f1f&t=1766044017",
    girl_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple2-F-hd.png?sign=d91da0db1d636b944be2a4320542c356&t=1766043983",
    downloads: 856,
    sort_order: 90,
    is_vip: false,
    ad_lock: true
  },
  {
    title: "宅家吸猫",
    category: "眼镜·居家系",
    boy_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple3-M.jpeg?sign=24b63649b4a13759801d7753ae4636b9&t=1766044070",
    boy_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple3-M-hd.png?sign=94423ba8c324a2cb036d95aff9245cb5&t=1766044060",
    girl_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple3-F.jpeg?sign=ee61d1233a4734365b4b1a85ba38faa0&t=1766044052",
    girl_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple3-F-hd.png?sign=8ac7d804f527df4865f8b8268747d828&t=1766044044",
    downloads: 520,
    sort_order: 80,
    is_vip: true, // VIP 资源
    ad_lock: false
  },
  {
    title: "雪地打闹",
    category: "运动·活力系",
    boy_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple4-M.jpeg?sign=65f3a35bb07514272b0e620a85971614&t=1766044111",
    boy_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple4-M-hd.png?sign=c2117f3585ed7f784484a45919ec09ab&t=1766044104",
    girl_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple4-F.jpeg?sign=5ca12e5ddc9fc03129f99097822284a4&t=1766044093",
    girl_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple4-F-hd.png?sign=aa2e07b03d51e9f6009438f8bb407467&t=1766044081",
    downloads: 2300,
    sort_order: 95,
    is_vip: false,
    ad_lock: true
  },
  {
    title: "深夜便利店",
    category: "卫衣·街头系",
    boy_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple5-M.jpeg?sign=8b6ee92394005ec2b19c7bc11f8ceedc&t=1766044150",
    boy_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple5-M-hd.png?sign=469e7d32f696a35da35c86e7dea835ab&t=1766044140",
    girl_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple5-F.jpeg?sign=717d17d363a405f65d2c036ac9b79244&t=1766044128",
    girl_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple5-F-hd.png?sign=216d44eeff82216df420e144b322c1d9&t=1766044120",
    downloads: 3344,
    sort_order: 110, // 热门置顶
    is_vip: false,
    ad_lock: true
  },
  {
    title: "复古车站",
    category: "风衣·怀旧系",
    boy_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple6-M.jpeg?sign=884b24f4d3e6224f961aecc148ee3040&t=1766044204",
    boy_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple6-M-hd.png?sign=ce5181301f4f2eb3360bcc3f5c76e8c2&t=1766044178",
    girl_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple6-F.jpeg?sign=b9d4982a6a0be99209177147dc3ca193&t=1766044169",
    girl_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple6-F-hd.png?sign=d7337eeb25d943ee73d97261cb5d0ec5&t=1766044161",
    downloads: 3344,
    sort_order: 110, // 热门置顶
    is_vip: false,
    ad_lock: true
  },
  {
    title: "滑雪场",
    category: "护目镜·户外系",
    boy_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple7-M.jpeg?sign=f6362d111f0d6535d013f9077f4a6ffc&t=1766044243",
    boy_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple7-M-hd.png?sign=344872b92073c7f4c48c17e4bec6a8ec&t=1766044233",
    girl_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple7-F.jpeg?sign=e4216f0421616290b12d9f4ab606c062&t=1766044225",
    girl_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple7-F-hd.png?sign=697bd066c41ae5c57bb501dcff6bfcb9&t=1766044217",
    downloads: 3344,
    sort_order: 110, // 热门置顶
    is_vip: false,
    ad_lock: true
  },
  {
    title: "图书馆之恋",
    category: "衬衫·斯文系",
    boy_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple8-M.jpeg?sign=0c54fe6cf103b3013de94e1084916243&t=1766044283",
    boy_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple8-M-hd.png?sign=acf5343e0c9538eb5042e0574585fdee&t=1766044273",
    girl_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple8-F.jpeg?sign=a559b4a867950eedce57a35d7f8cf1ed&t=1766044262",
    girl_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple8-F-hd.png?sign=f07f34a51699dc0183845f38f98e4faf&t=1766044252",
    downloads: 3344,
    sort_order: 110, // 热门置顶
    is_vip: false,
    ad_lock: true
  },
  {
    title: "新年烟花",
    category: "侧颜·氛围系",
    boy_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple9-M.jpeg?sign=198fc280c43c15383c956b169295c7fb&t=1766044325",
    boy_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple9-M-hd.png?sign=35be54700e0f6dc169d9a4c1df955571&t=1766044311",
    girl_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple9-F.jpeg?sign=635ebbc1f60a8d3f52c0bad6b264fa0b&t=1766044301",
    girl_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple9-F-hd.png?sign=32932f10b8a5a6c3692beab54fef1fad&t=1766044293",
    downloads: 3344,
    sort_order: 110, // 热门置顶
    is_vip: false,
    ad_lock: true
  },
  {
    title: "森林奇遇",
    category: "正太/萝莉·童真系",
    boy_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple10-M.jpeg?sign=c98b01295392783b3ea1de00e18ac576&t=1766044375",
    boy_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple10-M-hd.png?sign=8bb962a77645ffdbd605d32ce4b7f047&t=1766044362",
    girl_img: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple10-F.jpeg?sign=5ca50e3dac3ec816869450c699e61689&t=1766044350",
    girl_img_hd: "https://7465-test1-3gxkuc1c2093c1a8-1387968548.tcb.qcloud.la/couple_avatars/couple10-F-hd.png?sign=2a40efd7ceca7b7c3b1598f1c72bcb23&t=1766044334",
    downloads: 3344,
    sort_order: 110, // 热门置顶
    is_vip: false,
    ad_lock: true
  }
];

exports.main = async (event, context) => {
  const result = {
    collectionInit: '',
    added: 0,
    skipped: 0,
    errors: []
  };

  try {
    // 1. 检查并创建集合 avatar_sets
    // 复用了你 init_db 的逻辑思路
    try {
      await db.createCollection('avatar_sets');
      result.collectionInit = 'Created collection avatar_sets';
    } catch (e) {
      // 集合已存在，忽略错误
      result.collectionInit = 'Collection avatar_sets already exists';
    }

    // 2. 遍历并插入数据
    for (const item of INITIAL_DATA) {
      try {
        // 查重：根据 title 判断是否已存在
        const checkRes = await db.collection('avatar_sets').where({
          title: item.title
        }).count();

        if (checkRes.total > 0) {
          console.log(`跳过已存在数据: ${item.title}`);
          result.skipped++;
          continue;
        }

        // 插入数据
        await db.collection('avatar_sets').add({
          data: {
            ...item,
            created_at: db.serverDate(),
            updated_at: db.serverDate()
          }
        });
        console.log(`新增数据成功: ${item.title}`);
        result.added++;

      } catch (err) {
        console.error(`插入数据失败: ${item.title}`, err);
        result.errors.push({ title: item.title, msg: err.errMsg });
      }
    }

    return {
      success: true,
      msg: `初始化完成。新增: ${result.added}, 跳过: ${result.skipped}`,
      details: result
    };

  } catch (err) {
    console.error("Script execution error", err);
    return {
      success: false,
      msg: '脚本执行出错',
      error: err
    };
  }
};