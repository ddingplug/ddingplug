/* ════════════════════════════════════════
   config.js — 띵타이쿤 통합 설정
   해양 / 채광 / 재배 계산기 공통 데이터
   수치 변경은 이 파일만 수정하세요.
════════════════════════════════════════ */

export const UNITS = {
  SET_SIZE:     64,
  SETS_PER_BOX: 54,
  BOX_SIZE:     3456,
};

/* ════════════════════════════════════════
   🌊 해양
════════════════════════════════════════ */

export const OCEAN = {
  STAMINA_PER_USE: 15,
};

export const SEAFOOD_TYPES = {
  oyster:  { name: '굴',   color: '#3d6fd4' },
  conch:   { name: '소라', color: '#c89c00' },
  octopus: { name: '문어', color: '#7c52c8' },
  seaweed: { name: '미역', color: '#d94f3d' },
  urchin:  { name: '성게', color: '#3a9e68' },
};

export const OCEAN_SKILLS = {
  FURNACE:      { reductionPct: [0, 10, 20, 30, 50, 70] },
  CRAFT_BONUS:  { bonusPct: [0, 5, 7, 10, 15, 20, 30, 40, 50] },
  ALCH_BONUS:   { bonusPct: [0, 5, 7, 9, 12, 15, 20, 25, 30] },
  DEEP_HARVEST: { pct: [0, 5, 7, 10, 15, 20] },
  STAR_BONUS:   { pct: [0, 1, 3, 5, 7, 10, 15] },
  CLAM_BONUS:   { pct: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
};

export const OCEAN_ENGRAVING = {
  CLAM_SEARCH:  { pct: [0, 1, 3, 5] },
  SEAFOOD_LUCK: {
    drops: [null,{pct:25,count:1},{pct:50,count:1},{pct:75,count:1},{pct:100,count:1}],
  },
  FISHER_ROULETTE: {
    dicePct:[0,1,2,3,4,5], normalMult:5, goldenMult:10, goldenPct:10,
  },
  SPIRIT_WHALE: {
    appearPct: [0, 1, 2, 3, 4, 5],
    drops: {
      shell_1: { label:'깨진 조개껍데기 1개', pct:29, type:'shell', count:1 },
      shell_2: { label:'깨진 조개껍데기 2개', pct:15, type:'shell', count:2 },
      shell_3: { label:'깨진 조개껍데기 3개', pct:10, type:'shell', count:3 },
      shell_4: { label:'깨진 조개껍데기 4개', pct: 5, type:'shell', count:4 },
      brooch:  { label:'조개껍데기 브로치',   pct:15, type:'craft', pearlKey:'yellow' },
      perfume: { label:'푸른 향수병',         pct:10, type:'craft', pearlKey:'blue'   },
      mirror:  { label:'자개 손거울',         pct: 7, type:'craft', pearlKey:'cyan'   },
      hairpin: { label:'분홍 헤어핀',         pct: 5, type:'craft', pearlKey:'pink'   },
      fan:     { label:'자개 부채',           pct: 3, type:'craft', pearlKey:'purple' },
      watch:   { label:'흑진주 시계',         pct: 1, type:'craft', pearlKey:'black'  },
    },
  },
};

export const ROD = [
  {seafoodDrop:2, clamPct:0 },{seafoodDrop:2, clamPct:1 },{seafoodDrop:2, clamPct:1 },
  {seafoodDrop:3, clamPct:2 },{seafoodDrop:3, clamPct:2 },{seafoodDrop:3, clamPct:2 },
  {seafoodDrop:4, clamPct:3 },{seafoodDrop:4, clamPct:3 },{seafoodDrop:4, clamPct:3 },
  {seafoodDrop:5, clamPct:5 },{seafoodDrop:5, clamPct:5 },{seafoodDrop:5, clamPct:7 },
  {seafoodDrop:6, clamPct:7 },{seafoodDrop:6, clamPct:9 },{seafoodDrop:7, clamPct:9 },
  {seafoodDrop:10,clamPct:15},
];

export const CLAM = {
  dropPct: 50,
  contents: {
    shell:  { name:'깨진 조개껍데기', pct:70 },
    yellow: { name:'노란빛 진주',     pct:12 },
    blue:   { name:'푸른빛 진주',     pct: 7 },
    cyan:   { name:'청록빛 진주',     pct: 5 },
    pink:   { name:'분홍빛 진주',     pct: 3 },
    purple: { name:'보라빛 진주',     pct: 2 },
    black:  { name:'흑진주',          pct: 1 },
  },
};

export const CRAFTS = {
  BROOCH:  { name:'조개껍데기 브로치', emoji:'📿', pearlKey:'yellow', priceMax:50000,   materials:{shell:1,yellow:1,metal_scrap:1,spider_web:4} },
  PERFUME: { name:'푸른 향수병',       emoji:'🧴', pearlKey:'blue',   priceMax:150000,  materials:{shell:2,blue:1,resin_scrap:1,plastic_scrap:1,bucket:8} },
  MIRROR:  { name:'자개 손거울',       emoji:'🪞', pearlKey:'cyan',   priceMax:300000,  materials:{shell:3,cyan:1,alloy_scrap:2,plastic_scrap:2,glass:16} },
  HAIRPIN: { name:'분홍 헤어핀',       emoji:'📌', pearlKey:'pink',   priceMax:500000,  materials:{shell:4,pink:1,resin_scrap:3,fiber_scrap:3,bamboo:64,pink_petal:16} },
  FAN:     { name:'자개 부채',         emoji:'🪭', pearlKey:'purple', priceMax:700000,  materials:{shell:5,purple:1,alloy_scrap:5,resin_scrap:5,stick:64,amethyst:16} },
  WATCH:   { name:'흑진주 시계',       emoji:'⌚', pearlKey:'black',  priceMax:1000000, materials:{shell:7,black:1,metal_scrap:7,alloy_scrap:7,fiber_scrap:7,obsidian:16,clock:8} },
};

export const ALCHEMY = {

  /* ── 1차: 정수 → 2개 생산 ── */
  essence_guardian1: { name:'수호의 정수 ★',   tier:1, type:'essence', seafood:'oyster',  output:2, craftTimeSec:5,  color:'#3d6fd4', reversible:true,
    materials:{ oyster1:2, clay:2 } },
  essence_wave1:     { name:'파동의 정수 ★',   tier:1, type:'essence', seafood:'conch',   output:2, craftTimeSec:5,  color:'#c89c00', reversible:true,
    materials:{ conch1:2, sand:4 } },
  essence_chaos1:    { name:'혼란의 정수 ★',   tier:1, type:'essence', seafood:'octopus', output:2, craftTimeSec:5,  color:'#7c52c8', reversible:true,
    materials:{ octopus1:2, dirt:8 } },
  essence_life1:     { name:'생명의 정수 ★',   tier:1, type:'essence', seafood:'seaweed', output:2, craftTimeSec:5,  color:'#d94f3d', reversible:true,
    materials:{ seaweed1:2, gravel:4 } },
  essence_corrosion1:{ name:'부식의 정수 ★',   tier:1, type:'essence', seafood:'urchin',  output:2, craftTimeSec:5,  color:'#3a9e68', reversible:true,
    materials:{ urchin1:2, granite:2 } },

  /* ── 1차: 핵 → 1개 생산 ── */
  core_guard:     { name:'물결 수호의 핵 ★',  tier:1, type:'compound', output:1, craftTimeSec:10, color:'#3d6fd4', reversible:false,
    materials:{ essence_guardian1:1, essence_wave1:1, shrimp:1 } },
  core_wave:      { name:'파동 오염의 핵 ★',  tier:1, type:'compound', output:1, craftTimeSec:10, color:'#c89c00', reversible:false,
    materials:{ essence_wave1:1, essence_chaos1:1, sea_bream:1 } },
  core_chaos:     { name:'질서 파괴의 핵 ★',  tier:1, type:'compound', output:1, craftTimeSec:10, color:'#7c52c8', reversible:false,
    materials:{ essence_chaos1:1, essence_life1:1, herring:1 } },
  core_life:      { name:'활력 붕괴의 핵 ★',  tier:1, type:'compound', output:1, craftTimeSec:10, color:'#d94f3d', reversible:false,
    materials:{ essence_life1:1, essence_corrosion1:1, goldfish:1 } },
  core_corrosion: { name:'침식 방어의 핵 ★',  tier:1, type:'compound', output:1, craftTimeSec:10, color:'#3a9e68', reversible:false,
    materials:{ essence_corrosion1:1, essence_guardian1:1, bass:1 } },

  /* ── 2차: 에센스 → 2개 생산 ── */
  essence_guardian2: { name:'수호 에센스 ★★',  tier:2, type:'essence', seafood:'oyster',  output:2, craftTimeSec:5,  color:'#3d6fd4', reversible:true,
    materials:{ oyster2:2, seaweed_item:6, oak_leaf:6 } },
  essence_wave2:     { name:'파동 에센스 ★★',  tier:2, type:'essence', seafood:'conch',   output:2, craftTimeSec:5,  color:'#c89c00', reversible:true,
    materials:{ conch2:2, seaweed_item:6, spruce_leaf:6 } },
  essence_chaos2:    { name:'혼란 에센스 ★★',  tier:2, type:'essence', seafood:'octopus', output:2, craftTimeSec:5,  color:'#7c52c8', reversible:true,
    materials:{ octopus2:2, seaweed_item:6, birch_leaf:6 } },
  essence_life2:     { name:'생명 에센스 ★★',  tier:2, type:'essence', seafood:'seaweed', output:2, craftTimeSec:5,  color:'#d94f3d', reversible:true,
    materials:{ seaweed2:2, seaweed_item:6, cherry_leaf:6 } },
  essence_corrosion2:{ name:'부식 에센스 ★★',  tier:2, type:'essence', seafood:'urchin',  output:2, craftTimeSec:5,  color:'#3a9e68', reversible:true,
    materials:{ urchin2:2, seaweed_item:6, dark_oak_leaf:6 } },

  /* ── 2차: 결정 → 1개 생산 ── */
  crystal_vitality: { name:'활기 보존의 결정 ★★', tier:2, type:'compound', output:1, craftTimeSec:10, color:'#3d6fd4', reversible:false,
    materials:{ essence_guardian2:1, essence_life2:1, kelp:8, lapis_block:1 } },
  crystal_erosion:  { name:'파도 침식의 결정 ★★', tier:2, type:'compound', output:1, craftTimeSec:10, color:'#c89c00', reversible:false,
    materials:{ essence_wave2:1, essence_corrosion2:1, kelp:8, redstone_block:1 } },
  crystal_defense:  { name:'방어 오염의 결정 ★★', tier:2, type:'compound', output:1, craftTimeSec:10, color:'#7c52c8', reversible:false,
    materials:{ essence_chaos2:1, essence_guardian2:1, kelp:8, iron_ingot:3 } },
  crystal_torrent:  { name:'격류 재생의 결정 ★★', tier:2, type:'compound', output:1, craftTimeSec:10, color:'#d94f3d', reversible:false,
    materials:{ essence_life2:1, essence_wave2:1, kelp:8, gold_ingot:2 } },
  crystal_poison:   { name:'맹독 혼란의 결정 ★★', tier:2, type:'compound', output:1, craftTimeSec:10, color:'#3a9e68', reversible:false,
    materials:{ essence_corrosion2:1, essence_chaos2:1, kelp:8, diamond:1 } },

  /* ── 3차: 엘릭서 → 1개 생산 ── */
  elixir_guardian: { name:'수호의 엘릭서 ★★★', tier:3, type:'essence', seafood:'oyster',  output:1, craftTimeSec:10, color:'#3d6fd4', reversible:true,
    materials:{ oyster3:1, firn:2, glass_bottle:3, netherrack:8 } },
  elixir_wave:     { name:'파동의 엘릭서 ★★★', tier:3, type:'essence', seafood:'conch',   output:1, craftTimeSec:10, color:'#c89c00', reversible:true,
    materials:{ conch3:1, firn:2, glass_bottle:3, magma:4 } },
  elixir_chaos:    { name:'혼란의 엘릭서 ★★★', tier:3, type:'essence', seafood:'octopus', output:1, craftTimeSec:10, color:'#7c52c8', reversible:true,
    materials:{ octopus3:1, firn:2, glass_bottle:3, soul_soil:4 } },
  elixir_life:     { name:'생명의 엘릭서 ★★★', tier:3, type:'essence', seafood:'seaweed', output:1, craftTimeSec:10, color:'#d94f3d', reversible:true,
    materials:{ seaweed3:1, firn:2, glass_bottle:3, crimson_stem:4 } },
  elixir_corrosion:{ name:'부식의 엘릭서 ★★★', tier:3, type:'essence', seafood:'urchin',  output:1, craftTimeSec:10, color:'#3a9e68', reversible:true,
    materials:{ urchin3:1, firn:2, glass_bottle:3, warped_stem:4 } },

  /* ── 3차: 영약 → 1개 생산 ── */
  potion_immortal: { name:'불멸 재생의 영약 ★★★', tier:3, type:'compound', output:1, craftTimeSec:20, color:'#3d6fd4', reversible:false,
    materials:{ elixir_guardian:1, elixir_life:1, kelp:12, glowberry:4, coral_dead_tube:2 } },
  potion_barrier:  { name:'파동 장벽의 영약 ★★★', tier:3, type:'compound', output:1, craftTimeSec:20, color:'#c89c00', reversible:false,
    materials:{ elixir_wave:1, elixir_guardian:1, kelp:12, glowberry:4, coral_dead_brain:2 } },
  potion_corrupt:  { name:'타락 침식의 영약 ★★★', tier:3, type:'compound', output:1, craftTimeSec:20, color:'#7c52c8', reversible:false,
    materials:{ elixir_chaos:1, elixir_corrosion:1, kelp:12, glowberry:4, coral_dead_bubble:2 } },
  potion_frenzy:   { name:'생명 광란의 영약 ★★★', tier:3, type:'compound', output:1, craftTimeSec:20, color:'#d94f3d', reversible:false,
    materials:{ elixir_life:1, elixir_chaos:1, kelp:12, glowberry:4, coral_dead_fire:2 } },
  potion_venom:    { name:'맹독 파동의 영약 ★★★', tier:3, type:'compound', output:1, craftTimeSec:20, color:'#3a9e68', reversible:false,
    materials:{ elixir_corrosion:1, elixir_wave:1, kelp:12, glowberry:4, coral_dead_horn:2 } },
};

export const PRECISION_ALCHEMY = {
  DILUTED_EXTRACT: { name:'추출된 희석액',         tier:0, price:18444, craftTimeSec:60,
    materials:{ core_corrosion:3, crystal_defense:2, potion_corrupt:1 } },
  AQUTIS:      { name:'영생의 아쿠티스 ★',    tier:1, price:5159,  craftTimeSec:30,
    materials:{ core_guard:1, core_chaos:1, core_life:1 } },
  KRAKEN:      { name:'크라켄의 광란체 ★',    tier:1, price:5234,  craftTimeSec:30,
    materials:{ core_chaos:1, core_life:1, core_wave:1 } },
  LEVIATHAN:   { name:'리바이던의 깃털 ★',    tier:1, price:5393,  craftTimeSec:30,
    materials:{ core_corrosion:1, core_wave:1, core_guard:1 } },
  WAVE_CORE:   { name:'해구 파동의 코어 ★★',  tier:2, price:11131, craftTimeSec:30,
    materials:{ crystal_vitality:1, crystal_erosion:1, crystal_torrent:1 } },
  DEEP_VIAL:   { name:'침묵의 심해 비약 ★★',  tier:2, price:11242, craftTimeSec:30,
    materials:{ crystal_erosion:1, crystal_torrent:1, crystal_poison:1 } },
  SEA_WING:    { name:'청해룡의 날개 ★★',     tier:2, price:11399, craftTimeSec:30,
    materials:{ crystal_defense:1, crystal_poison:1, crystal_vitality:1 } },
  AQUA_PULSE:  { name:'아쿠아 펄스 파편 ★★★', tier:3, price:21833, craftTimeSec:60,
    materials:{ potion_immortal:1, potion_barrier:1, potion_venom:1 } },
  NAUTILUS:    { name:'나우틸러스의 손 ★★★',  tier:3, price:22088, craftTimeSec:60,
    materials:{ potion_barrier:1, potion_frenzy:1, potion_immortal:1 } },
  ABYSS_SPINE: { name:'무저의 척추 ★★★',      tier:3, price:22227, craftTimeSec:60,
    materials:{ potion_corrupt:1, potion_venom:1, potion_frenzy:1 } },
};

export const VANILLA_META = {
  shrimp:    { name:'깐 새우',     group:'fish',    priceUnit:'per_set' },
  sea_bream: { name:'도미 회',     group:'fish',    priceUnit:'per_set' },
  herring:   { name:'청어 회',     group:'fish',    priceUnit:'per_set' },
  goldfish:  { name:'금붕어 회',   group:'fish',    priceUnit:'per_set' },
  bass:      { name:'농어 회',     group:'fish',    priceUnit:'per_set' },
  firn:         { name:'불우렁쉥이', group:'ocean',   priceUnit:'per_set' },
  seaweed_item: { name:'해초',       group:'ocean',   priceUnit:'per_set' },
  kelp:         { name:'켈프',       group:'ocean',   priceUnit:'per_set' },
  glass_bottle: { name:'유리병',     group:'ocean',   priceUnit:'per_set' },
  glowberry:    { name:'발광 열매',  group:'ocean',   priceUnit:'per_set' },
  oak_leaf:      { name:'참나무 잎',     group:'leaf',    priceUnit:'per_set' },
  spruce_leaf:   { name:'가문비나무 잎', group:'leaf',    priceUnit:'per_set' },
  birch_leaf:    { name:'자작나무 잎',   group:'leaf',    priceUnit:'per_set' },
  cherry_leaf:   { name:'벚나무 잎',     group:'leaf',    priceUnit:'per_set' },
  dark_oak_leaf: { name:'짙은참나무 잎', group:'leaf',    priceUnit:'per_set' },
  clay:          { name:'점토',          group:'mineral', priceUnit:'per_set' },
  sand:          { name:'모래',          group:'mineral', priceUnit:'per_set' },
  dirt:          { name:'흙',            group:'mineral', priceUnit:'per_set' },
  gravel:        { name:'자갈',          group:'mineral', priceUnit:'per_set' },
  granite:       { name:'화강암',        group:'mineral', priceUnit:'per_set' },
  lapis_block:   { name:'청금석 블록',   group:'mineral', priceUnit:'per_set' },
  redstone_block:{ name:'레드스톤 블록', group:'mineral', priceUnit:'per_set' },
  iron_ingot:    { name:'철 주괴',       priceLabel:'철 블록',     group:'mineral', priceUnit:'per_set', blockToCraft:9 },
  gold_ingot:    { name:'금 주괴',       priceLabel:'금 블록',     group:'mineral', priceUnit:'per_set', blockToCraft:9 },
  diamond:       { name:'다이아몬드',    priceLabel:'다이아 블록', group:'mineral', priceUnit:'per_set', blockToCraft:9 },
  netherrack:    { name:'네더랙',        group:'nether',  priceUnit:'per_set' },
  magma:         { name:'마그마 블록',   group:'nether',  priceUnit:'per_set' },
  soul_soil:     { name:'영혼 흙',       group:'nether',  priceUnit:'per_set' },
  crimson_stem:  { name:'진홍빛 자루',   group:'nether',  priceUnit:'per_set' },
  warped_stem:   { name:'뒤틀린 자루',   group:'nether',  priceUnit:'per_set' },
  coral_dead_tube:  { name:'죽은 관 산호 블록',  group:'coral', priceUnit:'per_set' },
  coral_dead_brain: { name:'죽은 사방산호 블록', group:'coral', priceUnit:'per_set' },
  coral_dead_bubble:{ name:'죽은 거품 산호 블록',group:'coral', priceUnit:'per_set' },
  coral_dead_fire:  { name:'죽은 불 산호 블록',  group:'coral', priceUnit:'per_set' },
  coral_dead_horn:  { name:'죽은 뇌 산호 블록',  group:'coral', priceUnit:'per_set' },
};

/* ── 해양 기본 시세 ── */
export const OCEAN_DEFAULT_PRICES = {
  seafood: { tier1:500, tier2:1600, tier3:2700 },
  vanilla: {
    shrimp:159, sea_bream:258, herring:154, goldfish:149, bass:85,
    firn:81, seaweed_item:21, kelp:0, glass_bottle:39, glowberry:21,
    oak_leaf:55, spruce_leaf:55, birch_leaf:55, cherry_leaf:55, dark_oak_leaf:55,
    clay:69, sand:62, dirt:12, gravel:39, granite:55,
    lapis_block:1001, redstone_block:498,
    iron_ingot:1347, gold_ingot:1989, diamond:3090,
    netherrack:12, magma:70, soul_soil:83, crimson_stem:102, warped_stem:102,
    coral_dead_tube:157, coral_dead_brain:157, coral_dead_bubble:157,
    coral_dead_fire:157, coral_dead_horn:157,
  },
};


/* ════════════════════════════════════════
   ⛏️ 채광
════════════════════════════════════════ */

export const MINING = {
  STAMINA_PER_USE: 10,
};

export const MINING_SKILLS = {
  FURNACE:    { reductionPct: [0, 10, 30, 40, 60, 80] },
  INGOT_SELL: { bonusPct: [0, 5, 7, 10, 20, 30, 50] },
  GEM_SELL:   { bonusPct: [0, 5, 7, 10, 20, 30, 50] },
  COBYTIME:   { dropPct: [0, 1, 1.5, 2, 2.5, 3, 4, 5] },
  SPARKLE: {
    drops: [null, {pct:3,count:1}, {pct:7,count:1}, {pct:10,count:2}],
  },
  LUCKY_HIT: {
    drops: [
      null,
      {pct:1,count:1}, {pct:2,count:2},  {pct:3,count:3},
      {pct:4,count:4}, {pct:5,count:6},  {pct:6,count:8},
      {pct:7,count:10},{pct:8,count:12}, {pct:10,count:16},{pct:15,count:20},
    ],
  },
  FIRE_PICK: { dropPct: [0,1,2,3,4,5,6,7,8,9,15] },
  PRECIOUS:  { bonusPct: [0,5,7,10,15,20,30] },
};

export const MINING_ENGRAVING = {
  ORE_LUCK:       { extraOrePct:      [0,25,50,75,100] },
  RELIC_SEARCH:   { extraArtifactPct: [0,1,3,5] },
  COBBY_SUMMON:   { extraCobbyPct:    [0,1,3,5] },
  GEM_COBBY:      { gemConvertPct:    [0,5,10,20,30,50] },
  MINE_CART: {
    cartPct:   [0,0.5,1,1.5,2,3],
    minRelics: 1,
    maxRelics: 3,
  },
  MINER_ROULETTE: {
    dicePct:    [0,1,2,3,4,5],
    normalMult: 6,
    goldenMult: 12,
    goldenPct:  10,
  },
};

export const PICKAXE = [
  {oresPerUse: 1, artifactPct: 0, cobbyPct: 0},
  {oresPerUse: 2, artifactPct: 0, cobbyPct: 0},
  {oresPerUse: 3, artifactPct: 1, cobbyPct: 1},
  {oresPerUse: 3, artifactPct: 1, cobbyPct: 1},
  {oresPerUse: 3, artifactPct: 1, cobbyPct: 2},
  {oresPerUse: 4, artifactPct: 2, cobbyPct: 2},
  {oresPerUse: 4, artifactPct: 2, cobbyPct: 3},
  {oresPerUse: 4, artifactPct: 2, cobbyPct: 3},
  {oresPerUse: 5, artifactPct: 3, cobbyPct: 4},
  {oresPerUse: 5, artifactPct: 3, cobbyPct: 5},
  {oresPerUse: 5, artifactPct: 3, cobbyPct: 6},
  {oresPerUse: 6, artifactPct: 5, cobbyPct: 7},
  {oresPerUse: 6, artifactPct: 5, cobbyPct: 8},
  {oresPerUse: 7, artifactPct: 5, cobbyPct:10},
  {oresPerUse: 7, artifactPct: 5, cobbyPct:13},
  {oresPerUse:12, artifactPct:10, cobbyPct:15},
];

export const ARTIFACT = {
  tiers: [
    {points:100, pct:40},
    {points:200, pct:25},
    {points:300, pct:20},
    {points:500, pct:10},
    {points:1000,pct: 5},
  ],
  get avgPoints() {
    return this.tiers.reduce((s,t) => s + t.points * t.pct / 100, 0);
  },
};

export const INGOT_RECIPES = {
  CORUM:  { ores_per_ingot:16, torch_per_ingot:2, craft_time_sec:20 },
  RIFTON: { ores_per_ingot:16, torch_per_ingot:4, craft_time_sec:25 },
  SERENT: { ores_per_ingot:16, torch_per_ingot:8, craft_time_sec:30 },
};

export const MINING_RECIPES = {
  LS1: {
    ingot_corum:1, ingot_rifton:0, ingot_serent:0,
    vanilla:{ cobblestone:2, copper:8, redstone:3 },
    craft_time_sec:60,
  },
  LS2: {
    ingot_corum:0, ingot_rifton:2, ingot_serent:0,
    vanilla:{ deepslate_cobblestone:2, iron:5, lapis:5, diamond:3 },
    craft_time_sec:120,
  },
  LS3: {
    ingot_corum:0, ingot_rifton:0, ingot_serent:3,
    vanilla:{ copper:30, amethyst:20, iron:7, gold:7, diamond:5 },
    craft_time_sec:300,
  },
  ABIL: {
    ingot_corum:1, ingot_rifton:1, ingot_serent:1,
    vanilla:{},
    craft_time_sec:120,
  },
  TOPAZ_BOX: {
    ingot_corum:20, ingot_rifton:0, ingot_serent:0,
    vanilla:{ topaz:3, redstone:64, lapis:64, gold:10, diorite:64 },
    doc:1, craft_time_sec:3600,
  },
  SAPPHIRE_STATUE: {
    ingot_corum:0, ingot_rifton:20, ingot_serent:0,
    vanilla:{ sapphire:3, redstone:64, lapis:64, gold:10, tuff:64 },
    doc:1, craft_time_sec:3600,
  },
  PLATINUM_CROWN: {
    ingot_corum:0, ingot_rifton:0, ingot_serent:20,
    vanilla:{ platinum:3, redstone:64, lapis:64, gold:10, andesite:64 },
    doc:1, craft_time_sec:3600,
  },
};

export const PRECIOUS = {
  APPRAISAL: {
    LOW:   { pct:60, label:'낮은 품질' },
    GOOD:  { pct:30, label:'우수'      },
    ROYAL: { pct:10, label:'황실인증'  },
  },
  ITEMS: {
    TOPAZ_BOX:       { name:'토파즈 보석함',   recipe:'TOPAZ_BOX',       ingotType:'corum',  prices:{ LOW:324500, GOOD:454300, ROYAL:649000 } },
    SAPPHIRE_STATUE: { name:'사파이어 조각상', recipe:'SAPPHIRE_STATUE', ingotType:'rifton', prices:{ LOW:327250, GOOD:458150, ROYAL:654500 } },
    PLATINUM_CROWN:  { name:'플레티넘 왕관',   recipe:'PLATINUM_CROWN',  ingotType:'serent', prices:{ LOW:330000, GOOD:462000, ROYAL:660000 } },
  },
  DOC_PRICE: 10000,
};

export const TORCH = { craft_time_sec: 7 };

export const MARKET_FEE = 0.05;

/* ── 채광 기본 시세 ── */
export const MINING_DEFAULT_PRICES = {
  ingot:  { corum:5708, rifton:5845, serent:5901 },
  gem:    { corum:7000, rifton:7500, serent:8000  },
  ls1:14688, ls2:39623, ls3:72647, abil:17032,
  vanilla: {
    cobblestone:1266, deepslate_cobblestone:317,
    copper:170, iron:1347, gold:1989, diamond:3090,
    redstone:501, lapis:1001, amethyst:142,
  },
  precious: { topaz:85154, sapphire:82923, platinum:88470 },
  stone:    { diorite:62, tuff:20, andesite:54 },
  charcoal:474, wood:15, skillPulse:474, artifactPt:7043,
};


/* ════════════════════════════════════════
   🌾 재배
════════════════════════════════════════ */

export const FARMING = {
  STAMINA_PER_USE: 7,
  CROPS_PER_BASE:  8,
  HARVEST_RANGE: {
    tomato: { min:1, max:3 },
    onion:  { min:1, max:2 },
    garlic: { min:1, max:4 },
  },
  KING_CROP_BASE_PCT: 0.02,
  KING_CROP_MULT:     7,
};

export const FARMING_SKILLS = {
  FURNACE:      { reductionPct: [0,10,30,40,60,80] },
  MONEY_BONUS:  { bonusPct: [0,1,2,3,4,5,6,10,15,30,50] },
  FULL_POT:     { bonusPct: [0,1,2,3,4,7] },
  NATURE_GIFT: {
    drops: [
      null,
      {pct:1,count:1},{pct:2,count:1},{pct:3,count:1},{pct:4,count:1},
      {pct:5,count:2},{pct:6,count:2},{pct:7,count:3},{pct:8,count:4},
      {pct:9,count:5},{pct:10,count:8},
    ],
  },
  FIRE_HOE: {
    drops: [
      null,
      {pct:1,count:1},{pct:2,count:1},{pct:3,count:2},{pct:4,count:2},
      {pct:5,count:2},{pct:6,count:3},{pct:7,count:3},{pct:8,count:5},
      {pct:9,count:5},{pct:15,count:7},
    ],
  },
  HARVEST_BONUS: {
    drops: [
      null,
      {pct:1,count:1},{pct:2,count:1},{pct:3,count:1},{pct:4,count:1},
      {pct:5,count:2},{pct:7,count:2},{pct:10,count:3},
    ],
  },
  SEED_DROP: { pct: [0,1,2,3,4,5,6,7,10,20,30] },
  KING_CROP: { pct: [0.02,0.5,1,3,5] },
};

export const FARMING_ENGRAVING = {
  SEED_LUCK: {
    drops: [null,{pct:25,count:2},{pct:50,count:2},{pct:75,count:2},{pct:100,count:2}],
  },
  CROP_BOX:        { pct:[0,1,2,3,4,5], avgSeeds:25.5 },
  FARMER_ROULETTE: { dicePct:[0,1,2,3,4,5], normalMult:6, goldenMult:12, goldenPct:10 },
};

export const HOE = [
  {seedDrop:1},{seedDrop:2},{seedDrop:3},{seedDrop:3},{seedDrop:3},
  {seedDrop:4},{seedDrop:4},{seedDrop:4},{seedDrop:5},{seedDrop:5},
  {seedDrop:6},{seedDrop:8},{seedDrop:8},{seedDrop:10},{seedDrop:10},{seedDrop:15},
];

export const BASES = {
  tomato: { name:'토마토 베이스', color:'#d94f3d', seedType:'tomato' },
  onion:  { name:'양파 베이스',   color:'#c89c00', seedType:'onion'  },
  garlic: { name:'마늘 베이스',   color:'#9ab0c8', seedType:'garlic' },
};

export const CROPS = {
  pumpkin:    { name:'호박 묶음',        color:'#e07b2a' },
  potato:     { name:'감자 묶음',        color:'#c8a060' },
  carrot:     { name:'당근 묶음',        color:'#e67e22' },
  beet:       { name:'비트 묶음',        color:'#9e3a5a' },
  watermelon: { name:'수박 묶음',        color:'#3a9e68' },
  sweetfruit: { name:'달콤한 열매 묶음', color:'#d94f3d' },
  hay:        { name:'건초더미',          color:'#c8a020' },
  sugar:      { name:'설탕 큐브 묶음',   color:'#9090a0' },
};

export const MILKY_PRICES = { salt:2, egg:3, milk:3, oil:4 };

export const PROCESSED_RECIPES = {
  cooking_salt: { name:'요리용 소금', color:'#a0b8c8', ingredients:{ salt:16 } },
  butter:       { name:'버터 조각',   color:'#f0c040', ingredients:{ milk:8, salt:4, oil:4 } },
  cheese:       { name:'치즈 조각',   color:'#d4a820', ingredients:{ milk:8, salt:8 } },
  flour:        { name:'밀가루 반죽', color:'#e8d0a0', ingredients:{ wheat:12, egg:4 } },
};

export const OTHER_META = {
  cooking_salt:   { name:'요리용 소금',     color:'#7090a8', isProcessed:true },
  butter:         { name:'버터 조각',        color:'#c8980c', isProcessed:true },
  cheese:         { name:'치즈 조각',        color:'#b89010', isProcessed:true },
  flour:          { name:'밀가루 반죽',      color:'#c0a870', isProcessed:true },
  coconut:        { name:'코코넛',           color:'#8b6914' },
  pineapple:      { name:'파인애플',         color:'#c8a000' },
  steak:          { name:'스테이크',         color:'#8b4513' },
  pork:           { name:'익힌 돼지고기',    color:'#c07050' },
  pork_belly:     { name:'익힌 삼겹살',      color:'#c06040' },
  pork_front:     { name:'익힌 앞다리살',    color:'#b86050' },
  lamb:           { name:'익힌 양고기',      color:'#a07860' },
  lamb_rib:       { name:'익힌 양 갈비살',   color:'#987060' },
  lamb_leg:       { name:'익힌 양 다리살',   color:'#906858' },
  chicken:        { name:'익힌 닭고기',      color:'#c89050' },
  chicken_leg:    { name:'익힌 닭 다리살',   color:'#c08040' },
  chicken_breast: { name:'익힌 닭 가슴살',   color:'#c09060' },
  beef_sirloin:   { name:'익힌 소 등심',     color:'#a04030' },
  beef_rib:       { name:'익힌 소 갈비살',   color:'#983828' },
};

export const FARMING_RECIPES = {
  /* ── 커먼 ── */
  TOMATO_SPAGHETTI: {
    name:'토마토 스파게티', grade:'common', currentPrice:375,
    priceMin:259, priceMax:864, craftTimeSec:60,
    materials:{ base:{tomato:1}, crops:{pumpkin:1}, milky:{}, other:{} },
  },
  ONION_RING: {
    name:'어니언 링', grade:'common', currentPrice:758,
    priceMin:307, priceMax:1026, craftTimeSec:60,
    materials:{ base:{onion:1}, crops:{potato:1}, milky:{}, other:{} },
  },
  GARLIC_CAKE: {
    name:'갈릭 케이크', grade:'common', currentPrice:462,
    priceMin:226, priceMax:756, craftTimeSec:60,
    materials:{ base:{garlic:1}, crops:{carrot:1}, milky:{}, other:{} },
  },
  /* ── 노멀 ── */
  PORK_TOMATO_STEW: {
    name:'삼겹살 토마토 찌개', grade:'normal', currentPrice:787,
    priceMin:611, priceMax:2039, craftTimeSec:120,
    materials:{ base:{tomato:2}, crops:{beet:1}, milky:{}, other:{cooking_salt:1,pork:1,pork_belly:1} },
  },
  TRI_ICECREAM: {
    name:'삼색 아이스크림', grade:'normal', currentPrice:1008,
    priceMin:906, priceMax:3022, craftTimeSec:120,
    materials:{ base:{onion:2}, crops:{watermelon:1,sugar:1}, milky:{milk:1}, other:{coconut:1} },
  },
  GARLIC_LAMB_HOTDOG: {
    name:'마늘 양갈비 핫도그', grade:'normal', currentPrice:1620,
    priceMin:513, priceMax:1713, craftTimeSec:120,
    materials:{ base:{garlic:2}, crops:{potato:1}, milky:{oil:1}, other:{lamb:1,lamb_rib:1} },
  },
  SWEET_CEREAL: {
    name:'달콤 시리얼', grade:'normal', currentPrice:809,
    priceMin:773, priceMax:2578, craftTimeSec:120,
    materials:{ base:{tomato:2}, crops:{sweetfruit:1}, milky:{oil:1}, other:{pineapple:1,flour:1} },
  },
  ROAST_CHICKEN_PIE: {
    name:'로스트 치킨 파이', grade:'normal', currentPrice:1401,
    priceMin:640, priceMax:2134, craftTimeSec:120,
    materials:{ base:{garlic:2}, crops:{carrot:1}, milky:{}, other:{butter:1,chicken:1,chicken_leg:1} },
  },
  /* ── 레어 ── */
  SWEET_CHICKEN_BURGER: {
    name:'스윗 치킨 햄버거', grade:'rare', currentPrice:2601,
    priceMin:970, priceMax:3234, craftTimeSec:180,
    materials:{ base:{tomato:1,onion:1}, crops:{beet:1,sweetfruit:1}, milky:{}, other:{chicken_breast:1,chicken_leg:1} },
  },
  TOMATO_PINEAPPLE_PIZZA: {
    name:'토마토 파인애플 피자', grade:'rare', currentPrice:955,
    priceMin:922, priceMax:3077, craftTimeSec:180,
    materials:{ base:{tomato:2,garlic:1}, crops:{}, milky:{}, other:{pineapple:1,cheese:1,steak:1,beef_sirloin:1} },
  },
  ONION_SOUP: {
    name:'양파 수프', grade:'rare', currentPrice:1436,
    priceMin:1139, priceMax:3797, craftTimeSec:180,
    materials:{ base:{onion:2,garlic:1}, crops:{potato:1}, milky:{}, other:{coconut:1,butter:1,pork_front:1} },
  },
  HERB_PORK_BELLY_STEAM: {
    name:'허브 삼겹살 찜', grade:'rare', currentPrice:1304,
    priceMin:894, priceMax:2982, craftTimeSec:180,
    materials:{ base:{garlic:2,onion:1}, crops:{pumpkin:1,potato:1}, milky:{}, other:{pork:1,pork_belly:1} },
  },
  /* ── 에픽 ── */
  TOMATO_LASAGNA: {
    name:'토마토 라자냐', grade:'epic', currentPrice:3786,
    priceMin:1253, priceMax:4177, craftTimeSec:300,
    materials:{ base:{tomato:1,onion:1,garlic:1}, crops:{carrot:1,pumpkin:1}, milky:{}, other:{flour:1,lamb_leg:1} },
  },
  DEEP_CREAM_PANE: {
    name:'딥 크림 빠네', grade:'epic', currentPrice:3234,
    priceMin:1151, priceMax:3837, craftTimeSec:300,
    materials:{ base:{tomato:1,onion:1,garlic:1}, crops:{watermelon:1,potato:1}, milky:{milk:1}, other:{cheese:1} },
  },
  TRIPLE_BEEF_RIB_SKEWER: {
    name:'트리플 소갈비 꼬치', grade:'epic', currentPrice:1914,
    priceMin:1291, priceMax:4307, craftTimeSec:300,
    materials:{ base:{tomato:1,onion:1,garlic:1}, crops:{carrot:1,beet:1,sugar:1}, milky:{}, other:{beef_rib:1} },
  },
};

export const GRADE_COLOR = {
  common: { label:'커먼', color:'#8a7060', bg:'#f7f3ee' },
  normal: { label:'노멀', color:'#3a9e68', bg:'#edf8f2' },
  rare:   { label:'레어', color:'#3d6fd4', bg:'#eef3fd' },
  epic:   { label:'에픽', color:'#d94f3d', bg:'#fef0ee' },
};

/* ── 재배 기본 시세 ── */
export const FARMING_DEFAULT_PRICES = {
  seeds: { tomato:230, onion:233, garlic:232 },
  crops: {
    pumpkin:509, potato:366, carrot:321,
    beet:684, watermelon:603, sweetfruit:662,
    sugar:710, hay:269,
  },
  other: {
    coconut:540, pineapple:540, steak:138,
    pork:131, pork_belly:132, pork_front:143,
    lamb:145, lamb_rib:76, lamb_leg:432,
    chicken:65, chicken_leg:474, chicken_breast:201,
    beef_sirloin:121, beef_rib:574,
  },
};