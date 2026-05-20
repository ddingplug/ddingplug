export const CRAFT_ITEMS = [
  { item_key:'shell_brooch', item_name:'조개껍데기 브로치', type:'CRAFT', id:'C-01', price_max:50000, image:'/assets/sea_item/shell_brooch.png' },
  { item_key:'blue_perfume_bottle', item_name:'푸른 향수병', type:'CRAFT', id:'C-02', price_max:150000, image:'/assets/sea_item/blue_perfume_bottle.png' },
  { item_key:'mother_of_pearl_mirror', item_name:'자개 손거울', type:'CRAFT', id:'C-03', price_max:300000, image:'/assets/sea_item/mother_of_pearl_hand_mirror.png' },
  { item_key:'pink_hairpin', item_name:'분홍 헤어핀', type:'CRAFT', id:'C-04', price_max:500000, image:'/assets/sea_item/pink_hairpin.png' },
  { item_key:'mother_of_pearl_fan', item_name:'자개 부채', type:'CRAFT', id:'C-05', price_max:700000, image:'/assets/sea_item/mother_of_pearl_fan.png' },
  { item_key:'black_pearl_watch', item_name:'흑진주 시계', type:'CRAFT', id:'C-06', price_max:1000000, image:'/assets/sea_item/black_pearl_watch.png' },
];

export const COOKING_ITEMS = [
  { item_key:'tomato_spaghetti', item_name:'토마토 스파게티', type:'FOOD', id:'F-01', price_max:864, image:'/assets/cook_item/spaghetti_and_meatballs.png' },
  { item_key:'onion_ring', item_name:'어니언 링', type:'FOOD', id:'F-02', price_max:1026, image:'/assets/cook_item/onion_rings.png' },
  { item_key:'garlic_cake', item_name:'갈릭 케이크', type:'FOOD', id:'F-03', price_max:756, image:'/assets/cook_item/carrot_cake.png' },
  { item_key:'pork_tomato_stew', item_name:'삼겹살 토마토 찌개', type:'FOOD', id:'F-04', price_max:2039, image:'/assets/cook_item/tomato_soup_pot.png' },
  { item_key:'three_color_icecream', item_name:'삼색 아이스크림', type:'FOOD', id:'F-05', price_max:3022, image:'/assets/cook_item/multi_ice_cream2.png' },
  { item_key:'garlic_lamb_hotdog', item_name:'마늘 양갈비 핫도그', type:'FOOD', id:'F-06', price_max:1713, image:'/assets/cook_item/mayonaisse_hotdog.png' },
  { item_key:'sweet_cereal', item_name:'달콤 시리얼', type:'FOOD', id:'F-07', price_max:2578, image:'/assets/cook_item/cornflakes.png' },
  { item_key:'roast_chicken_pie', item_name:'로스트 치킨 파이', type:'FOOD', id:'F-08', price_max:2134, image:'/assets/cook_item/apple_pie.png' },
  { item_key:'sweet_chicken_burger', item_name:'스윗 치킨 햄버거', type:'FOOD', id:'F-09', price_max:3234, image:'/assets/cook_item/hamburger_food.png' },
  { item_key:'tomato_pineapple_pizza', item_name:'토마토 파인애플 피자', type:'FOOD', id:'F-10', price_max:3077, image:'/assets/cook_item/meat_pizza_slice.png' },
  { item_key:'onion_soup', item_name:'양파 수프', type:'FOOD', id:'F-11', price_max:3797, image:'/assets/cook_item/curry_soup.png' },
  { item_key:'herb_pork_steam', item_name:'허브 삼겹살 찜', type:'FOOD', id:'F-12', price_max:2982, image:'/assets/cook_item/chili_pot.png' },
  { item_key:'tomato_lasagna', item_name:'토마토 라자냐', type:'FOOD', id:'F-13', price_max:4177, image:'/assets/cook_item/tomato_lasagne.png' },
  { item_key:'deep_cream_pane', item_name:'딥 크림 빠네', type:'FOOD', id:'F-14', price_max:3837, image:'/assets/cook_item/filled_kaiser.png' },
  { item_key:'triple_beef_skewer', item_name:'트리플 소갈비 꼬치', type:'FOOD', id:'F-15', price_max:4307, image:'/assets/cook_item/cook_shashlik.png' },
];

export const ALL_PRICE_ITEMS = [
  ...CRAFT_ITEMS.map(x=>({...x,category:'craft',update_cycle:'daily'})),
  ...COOKING_ITEMS.map(x=>({...x,category:'cooking',update_cycle:'every_3_days'})),
];
