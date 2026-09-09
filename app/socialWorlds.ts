export const socialRelations = ["current", "upstream", "barrier", "alternative", "remote", "unverified"] as const;
export const constraintHardness = ["absolute", "statutory", "gate", "priced", "structural"] as const;

export type SocialRelation = typeof socialRelations[number];
export type ConstraintHardness = typeof constraintHardness[number];

export type ConstraintSource = {
  id: string;
  title: string;
  authority: string;
  url: string;
};

export type HardConstraint = {
  id: string;
  label: string;
  hardness: ConstraintHardness;
  description: string;
  sourceIDs: string[];
};

export type SocialWorld = {
  id: number;
  label: string;
  prototype: string;
  description: string;
  defaultViscosity: number;
  defaultInertia: number;
  constraints: HardConstraint[];
};

export const constraintSources: ConstraintSource[] = [
  { id: "npc", title: "国家法律法规数据库", authority: "全国人大常委会", url: "https://flk.npc.gov.cn/" },
  { id: "gov-policy", title: "国务院政策文件库", authority: "中国政府网", url: "https://www.gov.cn/zhengce/zhengceku/" },
  { id: "gov-service", title: "国家政务服务平台", authority: "国务院办公厅", url: "https://gjzwfw.www.gov.cn/" },
  { id: "stats", title: "国家数据", authority: "国家统计局", url: "https://data.stats.gov.cn/" },
  { id: "education", title: "教育政策", authority: "中华人民共和国教育部", url: "https://www.moe.gov.cn/jyb_xxgk/xxgk/zhengce/" },
  { id: "health", title: "卫生健康政策", authority: "国家卫生健康委员会", url: "https://www.nhc.gov.cn/wjw/zcwj/list.shtml" },
  { id: "human-resources", title: "就业与社会保障政策", authority: "人力资源社会保障部", url: "https://www.mohrss.gov.cn/xxgk2020/fdzdgknr/zcfg/" },
  { id: "natural-resources", title: "自然资源政策", authority: "自然资源部", url: "https://www.mnr.gov.cn/gk/zc/" },
  { id: "market-regulation", title: "市场监管政策", authority: "国家市场监督管理总局", url: "https://www.samr.gov.cn/zw/zfxxgk/" },
  { id: "ndrc", title: "发展改革政策", authority: "国家发展和改革委员会", url: "https://www.ndrc.gov.cn/xxgk/zcfb/" },
  { id: "central-bank", title: "货币政策与金融法规", authority: "中国人民银行", url: "https://www.pbc.gov.cn/tiaofasi/144941/144951/index.html" },
  { id: "tax", title: "税费政策", authority: "国家税务总局", url: "https://www.chinatax.gov.cn/chinatax/n810341/index.html" },
  { id: "immigration", title: "出入境政策", authority: "国家移民管理局", url: "https://www.nia.gov.cn/" },
  { id: "forex", title: "外汇管理政策", authority: "国家外汇管理局", url: "https://www.safe.gov.cn/safe/whfg/index.html" },
  { id: "commerce", title: "商务政策", authority: "中华人民共和国商务部", url: "https://www.mofcom.gov.cn/zcfb/index.html" },
  { id: "wto", title: "WTO Trade Topics", authority: "World Trade Organization", url: "https://www.wto.org/english/tratop_e/tratop_e.htm" },
  { id: "imf", title: "IMF Data", authority: "International Monetary Fund", url: "https://www.imf.org/en/Data" },
  { id: "unfccc", title: "Climate Rules and Decisions", authority: "United Nations Climate Change", url: "https://unfccc.int/" },
];

export const socialWorlds: SocialWorld[] = [
  {
    id: 1, label: "生计与信息荒原", prototype: "被掏空的底层农村", description: "劳动首先用于维持生存，信息、现金与可迁移资产难以积累。", defaultViscosity: 92, defaultInertia: 8,
    constraints: [
      { id: "w1-cashflow", label: "生存现金流", hardness: "absolute", description: "食品、住房、医疗与照护支出构成不可暂停的底线。", sourceIDs: ["stats", "health"] },
      { id: "w1-information", label: "信息可达性", hardness: "structural", description: "高质量教育、招聘、市场与政策信息存在空间和网络落差。", sourceIDs: ["education", "stats"] },
      { id: "w1-land", label: "土地与迁移边界", hardness: "statutory", description: "土地权利、户籍、居住与迁移成本限制退出路径。", sourceIDs: ["npc", "natural-resources"] },
    ],
  },
  {
    id: 2, label: "基础公共资源薄层", prototype: "乡镇与贫困县", description: "公共服务和产业密度不足，个人努力常被基础设施缺口耗散。", defaultViscosity: 84, defaultInertia: 16,
    constraints: [
      { id: "w2-public-service", label: "教育医疗容量", hardness: "structural", description: "学校、医院、照护与专业服务的供给半径和质量有限。", sourceIDs: ["education", "health"] },
      { id: "w2-industry", label: "产业与岗位密度", hardness: "structural", description: "本地产业单薄使技能缺少买方，工资上限由少量岗位决定。", sourceIDs: ["stats", "human-resources"] },
      { id: "w2-fiscal", label: "地方财政能力", hardness: "priced", description: "财政收入与转移支付约束公共投资、编制和服务稳定性。", sourceIDs: ["gov-policy", "stats"] },
    ],
  },
  {
    id: 3, label: "熟人关系网络", prototype: "关系网错综复杂的县城", description: "正式规则与人情网络并行，声誉、关系和地方身份决定交易成本。", defaultViscosity: 76, defaultInertia: 24,
    constraints: [
      { id: "w3-reputation", label: "熟人声誉", hardness: "structural", description: "低匿名度让失败、冲突和越轨选择长期影响合作机会。", sourceIDs: [] },
      { id: "w3-network", label: "关系准入", hardness: "gate", description: "关键岗位、项目和资源常需要长期信任或本地中介。", sourceIDs: ["market-regulation"] },
      { id: "w3-local-rule", label: "属地规则", hardness: "statutory", description: "编制、办事、学位、住房和经营事项受属地资格约束。", sourceIDs: ["gov-service", "human-resources"] },
    ],
  },
  {
    id: 4, label: "单一资源与垄断系统", prototype: "资源型城市", description: "少数产业、许可或组织控制主要机会，路径依赖抬高转型成本。", defaultViscosity: 70, defaultInertia: 30,
    constraints: [
      { id: "w4-monopoly", label: "市场集中与特许", hardness: "gate", description: "资源、牌照、渠道或大型组织控制市场入口。", sourceIDs: ["market-regulation", "npc"] },
      { id: "w4-resource", label: "资源开采与环保许可", hardness: "statutory", description: "矿产、能源、土地和排放受许可、规划与生态红线约束。", sourceIDs: ["natural-resources", "ndrc"] },
      { id: "w4-path", label: "产业路径依赖", hardness: "structural", description: "人才、供应链和财政围绕单一产业配置，转向需要系统迁移。", sourceIDs: ["stats", "ndrc"] },
    ],
  },
  {
    id: 5, label: "高竞争城市市场", prototype: "劳动力丰富的二线城市", description: "机会密度上升，但劳动力替代性、住房和职业竞赛吞噬积累。", defaultViscosity: 61, defaultInertia: 39,
    constraints: [
      { id: "w5-labor", label: "劳动力竞争", hardness: "structural", description: "岗位的候选供给、学历筛选和年龄结构压低议价权。", sourceIDs: ["human-resources", "stats"] },
      { id: "w5-housing", label: "住房与通勤价格", hardness: "priced", description: "租售价格和通勤时间决定可用于学习、创业和照护的余量。", sourceIDs: ["stats", "gov-policy"] },
      { id: "w5-license", label: "行业与经营准入", hardness: "statutory", description: "职业资格、经营许可、劳动合同与平台规则限制行动。", sourceIDs: ["gov-service", "market-regulation", "npc"] },
    ],
  },
  {
    id: 6, label: "一线制度门槛", prototype: "权力资本集中的一线城市", description: "高密度机会与高门槛共存，身份、房价和组织位置决定是否获得城市惯性。", defaultViscosity: 54, defaultInertia: 48,
    constraints: [
      { id: "w6-hukou", label: "户籍与公共服务资格", hardness: "statutory", description: "落户、学位、购房、车辆和福利可能绑定积分与属地身份。", sourceIDs: ["gov-service", "gov-policy"] },
      { id: "w6-asset-price", label: "核心资产价格", hardness: "priced", description: "住房、教育和核心区时间成本形成高额入场券。", sourceIDs: ["stats", "central-bank"] },
      { id: "w6-organization", label: "头部组织席位", hardness: "gate", description: "履历、学历、职级与组织背书影响信息、信用和决策权。", sourceIDs: ["human-resources"] },
    ],
  },
  {
    id: 7, label: "核心资产与圈层", prototype: "一线城市核心区域", description: "资产、信用和关系开始产生复利，外部人面对高度固化的圈层边界。", defaultViscosity: 44, defaultInertia: 62,
    constraints: [
      { id: "w7-capital", label: "资本门槛", hardness: "priced", description: "优质资产、股权、专业服务和风险缓冲需要大额可承受资本。", sourceIDs: ["central-bank", "tax"] },
      { id: "w7-credential", label: "信用与履历门槛", hardness: "gate", description: "历史业绩、机构信用和共同关系决定交易资格。", sourceIDs: ["market-regulation"] },
      { id: "w7-insider", label: "核心信息圈层", hardness: "structural", description: "非公开语境、专业语言和信任网络造成持续信息差。", sourceIDs: [] },
    ],
  },
  {
    id: 8, label: "跨境制度层", prototype: "海外资产与身份通道", description: "跨境行动被护照、签证、税务居民、外汇和法域差异重新定价。", defaultViscosity: 36, defaultInertia: 70,
    constraints: [
      { id: "w8-status", label: "护照签证与居留", hardness: "statutory", description: "国籍、签证、居留和工作许可决定能否进入目标法域。", sourceIDs: ["immigration"] },
      { id: "w8-forex", label: "跨境资金规则", hardness: "statutory", description: "外汇、反洗钱、申报和资金用途限制跨境流动。", sourceIDs: ["forex", "central-bank"] },
      { id: "w8-tax", label: "税务居民与合规", hardness: "statutory", description: "税收居民、受益所有人、公司和资产申报产生持续义务。", sourceIDs: ["tax", "npc"] },
    ],
  },
  {
    id: 9, label: "私域资本与封闭治理", prototype: "私人庄园、家族与封闭资产网络", description: "规则由所有权、家族治理、信托与私域准入塑造，公开市场难以直接进入。", defaultViscosity: 28, defaultInertia: 82,
    constraints: [
      { id: "w9-ownership", label: "所有权与控制权", hardness: "statutory", description: "股权、产权、信托和治理文件定义谁能决定与受益。", sourceIDs: ["npc", "market-regulation"] },
      { id: "w9-private-access", label: "私人准入", hardness: "gate", description: "邀请、家族关系、长期共同利益和保密义务构成入口。", sourceIDs: [] },
      { id: "w9-preservation", label: "资产保全与代际安排", hardness: "structural", description: "税务、继承、法律结构和风险隔离优先于短期收益。", sourceIDs: ["tax", "npc"] },
    ],
  },
  {
    id: 10, label: "全球规则与系统风险", prototype: "难以直接观察的顶层世界", description: "国际规则、地缘、安全、技术和气候冲击改变所有下层的边界条件。", defaultViscosity: 22, defaultInertia: 92,
    constraints: [
      { id: "w10-trade", label: "贸易与市场准入", hardness: "statutory", description: "关税、原产地、技术标准和出口管制改变跨境可行性。", sourceIDs: ["commerce", "wto"] },
      { id: "w10-finance", label: "全球资本与汇率", hardness: "priced", description: "利率、汇率、流动性和风险偏好重估本地机会。", sourceIDs: ["imf", "central-bank"] },
      { id: "w10-system", label: "地缘与气候系统风险", hardness: "structural", description: "冲突、制裁、供应链与气候规则可能突然重写边界。", sourceIDs: ["unfccc", "wto"] },
    ],
  },
];

export function socialWorld(id: number): SocialWorld {
  return socialWorlds.find((world) => world.id === id) ?? socialWorlds[0];
}

export function hardConstraint(id: string): HardConstraint | undefined {
  return socialWorlds.flatMap((world) => world.constraints).find((constraint) => constraint.id === id);
}

export function constraintSource(id: string): ConstraintSource | undefined {
  return constraintSources.find((source) => source.id === id);
}