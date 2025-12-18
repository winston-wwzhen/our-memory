const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});
const db = cloud.database();

// 🔥 在这里配置你的初始化数据
const INITIAL_DATA = [
  {
    title: "初雪约定",
    category: "围巾·暖冬系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple1-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple1-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple1-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple1-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple1-F-hd.png",
    downloads: 2450,
    sort_order: 100,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "樱花树下",
    category: "制服·校园系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple2-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple2-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple2-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple2-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple2-F-hd.png",
    downloads: 1890,
    sort_order: 99,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "宅家时光",
    category: "眼镜·居家系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple3-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple3-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple3-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple3-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple3-F-hd.png",
    downloads: 3200,
    sort_order: 98,
    is_vip: true,
    ad_lock: false,
  },
  {
    title: "滑板少年",
    category: "运动·街头系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple4-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple4-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple4-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple4-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple4-F-hd.png",
    downloads: 1560,
    sort_order: 97,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "便利店奇遇",
    category: "卫衣·日常系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple5-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple5-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple5-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple5-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple5-F-hd.png",
    downloads: 4100,
    sort_order: 96,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "复古胶片",
    category: "港风·怀旧系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple6-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple6-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple6-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple6-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple6-F-hd.png",
    downloads: 890,
    sort_order: 95,
    is_vip: true,
    ad_lock: false,
  },
  {
    title: "极地滑雪",
    category: "户外·活力系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple7-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple7-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple7-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple7-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple7-F-hd.png",
    downloads: 2300,
    sort_order: 94,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "图书馆恋人",
    category: "衬衫·斯文系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple8-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple8-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple8-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple8-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple8-F-hd.png",
    downloads: 1750,
    sort_order: 93,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "新年花火",
    category: "唯美·氛围系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple9-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple9-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple9-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple9-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple9-F-hd.png",
    downloads: 3600,
    sort_order: 92,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "森林童话",
    category: "Q版·可爱系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple10-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple10-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple10-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple10-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple10-F-hd.png",
    downloads: 1200,
    sort_order: 91,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "海边假日",
    category: "清凉·度假系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple11-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple11-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple11-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple11-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple11-F-hd.png",
    downloads: 2100,
    sort_order: 90,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "游乐园",
    category: "发箍·可爱系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple12-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple12-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple12-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple12-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple12-F-hd.png",
    downloads: 1450,
    sort_order: 89,
    is_vip: true,
    ad_lock: false,
  },
  {
    title: "黑色酷盖",
    category: "黑白·高冷系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple13-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple13-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple13-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple13-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple13-F-hd.png",
    downloads: 4500,
    sort_order: 88,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "汉服古韵",
    category: "汉服·古风系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple14-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple14-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple14-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple14-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple14-F-hd.png",
    downloads: 1980,
    sort_order: 87,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "萌宠情侣",
    category: "猫咪·治愈系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple15-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple15-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple15-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple15-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple15-F-hd.png",
    downloads: 2800,
    sort_order: 86,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "赛博朋克",
    category: "霓虹·未来系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple16-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple16-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple16-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple16-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple16-F-hd.png",
    downloads: 1100,
    sort_order: 85,
    is_vip: true,
    ad_lock: false,
  },
  {
    title: "像素大战",
    category: "像素·游戏系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple17-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple17-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple17-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple17-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple17-F-hd.png",
    downloads: 980,
    sort_order: 84,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "落日飞车",
    category: "复古·港风系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple18-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple18-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple18-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple18-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple18-F-hd.png",
    downloads: 1340,
    sort_order: 83,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "星空漫步",
    category: "梦幻·唯美系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple19-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple19-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple19-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple19-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple19-F-hd.png",
    downloads: 2150,
    sort_order: 82,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "搞怪日常",
    category: "表情包·沙雕系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple20-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple20-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple20-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple20-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple20-F-hd.png",
    downloads: 3300,
    sort_order: 81,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "纯白之恋",
    category: "婚纱·浪漫系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple21-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple21-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple21-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple21-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple21-F-hd.png",
    downloads: 1600,
    sort_order: 80,
    is_vip: true,
    ad_lock: false,
  },
  {
    title: "咖啡时间",
    category: "休闲·午后系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple22-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple22-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple22-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple22-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple22-F-hd.png",
    downloads: 1400,
    sort_order: 79,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "雨天邂逅",
    category: "雨伞·忧郁系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple23-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple23-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple23-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple23-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple23-F-hd.png",
    downloads: 1050,
    sort_order: 78,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "摇滚不死",
    category: "吉他·乐队系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple24-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple24-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple24-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple24-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple24-F-hd.png",
    downloads: 880,
    sort_order: 77,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "向日葵",
    category: "阳光·田园系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple25-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple25-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple25-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple25-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple25-F-hd.png",
    downloads: 1700,
    sort_order: 76,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "二次元",
    category: "动漫·手绘系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple26-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple26-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple26-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple26-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple26-F-hd.png",
    downloads: 3100,
    sort_order: 75,
    is_vip: true,
    ad_lock: false,
  },
  {
    title: "街角咖啡",
    category: "风衣·都市系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple27-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple27-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple27-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple27-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple27-F-hd.png",
    downloads: 1200,
    sort_order: 74,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "海盗船长",
    category: "Cosplay·奇幻系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple28-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple28-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple28-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple28-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple28-F-hd.png",
    downloads: 950,
    sort_order: 73,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "校园操场",
    category: "运动服·青春系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple29-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple29-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple29-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple29-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple29-F-hd.png",
    downloads: 2400,
    sort_order: 72,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "深夜食堂",
    category: "美食·治愈系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple30-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple30-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple30-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple30-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple30-F-hd.png",
    downloads: 1550,
    sort_order: 71,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "圣诞之夜",
    category: "麋鹿·节日系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple31-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple31-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple31-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple31-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple31-F-hd.png",
    downloads: 3500,
    sort_order: 70,
    is_vip: true,
    ad_lock: false,
  },
  {
    title: "宇航员",
    category: "太空·探索系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple32-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple32-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple32-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple32-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple32-F-hd.png",
    downloads: 1800,
    sort_order: 69,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "花海漫游",
    category: "鲜花·森系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple33-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple33-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple33-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple33-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple33-F-hd.png",
    downloads: 2200,
    sort_order: 68,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "机车情侣",
    category: "头盔·酷飒系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple34-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple34-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple34-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple34-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple34-F-hd.png",
    downloads: 2700,
    sort_order: 67,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "搞怪小鬼",
    category: "涂鸦·鬼马系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple35-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple35-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple35-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple35-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple35-F-hd.png",
    downloads: 1300,
    sort_order: 66,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "海风吹拂",
    category: "蓝白·清新系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple36-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple36-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple36-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple36-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple36-F-hd.png",
    downloads: 1900,
    sort_order: 65,
    is_vip: true,
    ad_lock: false,
  },
  {
    title: "棒球英豪",
    category: "棒球服·运动系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple37-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple37-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple37-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple37-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple37-F-hd.png",
    downloads: 1450,
    sort_order: 64,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "落叶知秋",
    category: "针织·秋日系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple38-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple38-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple38-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple38-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple38-F-hd.png",
    downloads: 1650,
    sort_order: 63,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "电竞高手",
    category: "耳机·电竞系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple39-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple39-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple39-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple39-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple39-F-hd.png",
    downloads: 3100,
    sort_order: 62,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "可爱恐龙",
    category: "睡衣·搞怪系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple40-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple40-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple40-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple40-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple40-F-hd.png",
    downloads: 2300,
    sort_order: 61,
    is_vip: true,
    ad_lock: false,
  },
  {
    title: "游乐园气球",
    category: "粉色·少女心",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple41-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple41-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple41-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple41-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple41-F-hd.png",
    downloads: 1250,
    sort_order: 60,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "黑白剪影",
    category: "极简·艺术系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple42-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple42-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple42-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple42-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple42-F-hd.png",
    downloads: 800,
    sort_order: 59,
    is_vip: false,
    ad_lock: true,
  },
  {
    title: "终极浪漫",
    category: "礼服·典雅系",
    cover_url:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple43-M.jpeg",
    boy_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple43-M.jpeg",
    boy_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple43-M-hd.png",
    girl_img:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple43-F.jpeg",
    girl_img_hd:
      "cloud://test1-3gxkuc1c2093c1a8.7465-test1-3gxkuc1c2093c1a8-1387968548/couple_avatars/couple43-F-hd.png",
    downloads: 9999,
    sort_order: 58,
    is_vip: true,
    ad_lock: false,
  },
];

exports.main = async (event, context) => {
  const result = {
    collectionInit: "",
    added: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // 1. 检查并创建集合 avatar_sets
    // 复用了你 init_db 的逻辑思路
    try {
      await db.createCollection("avatar_sets");
      result.collectionInit = "Created collection avatar_sets";
    } catch (e) {
      // 集合已存在，忽略错误
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
          console.log(`跳过已存在数据: ${item.title}`);
          result.skipped++;
          continue;
        }

        // 插入数据
        await db.collection("avatar_sets").add({
          data: {
            ...item,
            created_at: db.serverDate(),
            updated_at: db.serverDate(),
          },
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
