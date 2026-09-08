export type DossierSource = {
  title: string;
  authority: string;
  url: string;
  note: string;
};

export type FacetDossier = {
  principle: string;
  mechanisms: string[];
  auditQuestions: string[];
  sources: DossierSource[];
};

const source = (title: string, authority: string, url: string, note: string): DossierSource => ({ title, authority, url, note });
const dossier = (principle: string, mechanisms: string[], auditQuestions: string[], sources: DossierSource[] = []): FacetDossier => ({ principle, mechanisms, auditQuestions, sources });

export const worldDossiers: Record<string, FacetDossier> = {
  "personal.survival": dossier("身体是所有选择的硬件底座；透支不是意志问题，而是容量约束。", ["睡眠、营养和疾病改变可用注意力", "照护责任压缩连续时间", "慢性压力降低风险承受力"], ["哪项身体指标已经连续两周异常？", "哪些任务必须由本人完成？"]),
  "personal.safety": dossier("人会优先保护可预测性；现金流和退路决定可承担的实验尺度。", ["固定支出定义最低安全线", "不可逆承诺放大损失厌恶", "信息不确定性被感受为风险"], ["最坏情形的真实损失是多少？", "哪一步可以撤销或分期？"]),
  "personal.belonging": dossier("归属把个人选择嵌入亲密关系和群体承诺。", ["情感依赖影响退出成本", "照护与互惠形成隐性义务", "群体接纳塑造身份稳定"], ["谁会直接承担这项选择的后果？", "关系中的承诺是否被明确说过？"]),
  "personal.esteem": dossier("尊严与自主决定一个人是否愿意长期承受某种安排。", ["评价体系影响自我效能", "身份落差制造羞耻与防御", "控制感影响持续投入"], ["这是能力证据，还是他人的评价？", "哪种安排会持续损害自主权？"]),
  "personal.growth": dossier("成长需求把眼前收益与长期能力、意义和创造放在一起。", ["学习曲线改变未来选择集", "作品积累形成身份资产", "意义感支撑延迟满足"], ["一年后希望新增哪种不可替代能力？", "这条路径会留下什么可复用资产？"]),

  "organization.role": dossier("组织通过角色分工配置决定权、执行权与责任。", ["决策权与责任可能错配", "关键人依赖形成单点瓶颈", "角色模糊制造重复劳动"], ["谁拥有最终决定权？", "谁承担失败成本但没有发言权？"]),
  "organization.incentive": dossier("人会响应实际奖惩，而不是口头目标。", ["绩效口径引导局部最优", "预算归属影响优先级", "短期奖励挤压长期建设"], ["当前制度真正奖励什么行为？", "谁从维持现状中获益？"]),
  "organization.resource": dossier("预算、人力、时间和工具决定组织能够并行多少承诺。", ["共享资源形成排队与争抢", "切换成本吞噬名义产能", "预算周期限制采购窗口"], ["最先耗尽的资源是哪一个？", "停止哪项工作才能释放它？"]),
  "organization.coordination": dossier("协作成本随参与者和依赖数量非线性上升。", ["信息在交接中失真", "跨团队依赖放大等待时间", "缺少共同节奏导致返工"], ["最长等待发生在哪次交接？", "哪项依赖可以移除而非优化？"]),
  "organization.governance": dossier("治理把分歧转化为可执行决定，并定义申诉和复盘路径。", ["审批层级决定决策速度", "例外机制决定制度弹性", "问责方式影响风险偏好"], ["什么证据足以触发决策？", "决定错误后由谁、如何纠偏？"]),

  "norm.custom": dossier("习俗把历史选择沉淀成默认行为，即使没有正式强制。", ["代际期待形成非正式义务", "礼仪定义可接受表达", "道德直觉压缩公开讨论空间"], ["这条规则写在哪里，还是只是一直如此？", "违反它的真实惩罚是什么？"]),
  "norm.reputation": dossier("声誉是群体分配信任、机会和惩罚的低成本机制。", ["标签会跨情境传播", "可见失败被高估", "圈层评价影响资源入口"], ["具体是谁会降低信任？", "声誉损失是否可逆、可分群？"]),
  "norm.legitimacy": dossier("正当性决定行动能否被群体理解为合理，而不仅是是否合法。", ["程序公平影响结果接受度", "身份决定谁有资格发言", "共同价值为例外提供理由"], ["反对者质疑结果还是过程？", "怎样的程序能让分歧仍可合作？"]),
  "norm.network": dossier("关系网络通过信任、信息和非正式权力改变机会分布。", ["弱连接带来新信息", "中心节点控制传播速度", "互惠记录影响求助成功率"], ["关键资源经过哪个人或圈层？", "有没有不依赖单一中间人的路径？"]),
  "norm.narrative": dossier("公共叙事决定哪些问题可被命名，以及什么答案看起来理所当然。", ["媒体框架筛选因果解释", "身份故事限制可选角色", "流行范式影响资本与人才"], ["当前叙事省略了谁的成本？", "什么反例会让这个故事失效？"]),

  "state.law": dossier("法律定义可执行的权利、义务、合同与产权边界。", ["强制性规范限制约定自由", "合同配置风险与救济", "法律位阶决定规则效力"], ["适用法域和主体身份是什么？", "这是禁止、许可、备案还是合同约束？"], [
    source("国家法律法规数据库", "全国人大常委会", "https://flk.npc.gov.cn/", "检索现行法律、行政法规与司法解释"),
    source("司法解释与案例", "最高人民法院", "https://www.court.gov.cn/fabu.html", "核验司法解释、指导性案例与裁判规则"),
  ]),
  "state.citizenship": dossier("身份资格决定个人能否进入特定权利、福利和许可体系。", ["国籍与居留状态影响权利范围", "户籍和属地规则影响公共服务", "职业牌照设置准入门槛"], ["资格由哪个机关、依据哪条规则认定？", "是否存在临时、异地或替代资格？"], [
    source("政务服务平台", "国务院办公厅", "https://gjzwfw.www.gov.cn/", "按事项核验办理条件、材料和主管机关"),
    source("出入境政策", "国家移民管理局", "https://www.nia.gov.cn/", "核验签证、居留和出入境规则"),
  ]),
  "state.administration": dossier("行政监管把法律目标转化为审批、备案、标准和持续监督。", ["许可清单决定市场准入", "监管口径影响合规成本", "属地执行产生现实差异"], ["主管机关和事项清单是否明确？", "是否有公开办事指南、裁量基准或申诉渠道？"], [
    source("国务院政策文件库", "中国政府网", "https://www.gov.cn/zhengce/zhengceku/", "检索国务院及部门政策文件"),
    source("市场监管政策", "国家市场监督管理总局", "https://www.samr.gov.cn/zw/zfxxgk/", "核验市场准入、标准与监管规则"),
  ]),
  "state.fiscal": dossier("财政与公共品通过税收、补贴和基础设施改变行为成本。", ["税制改变边际收益", "补贴设置期限和资格窗口", "公共服务决定私人替代成本"], ["政策作用于价格、资格还是供给？", "补贴或税收规则何时到期、如何申报？"], [
    source("财政政策", "中华人民共和国财政部", "https://www.mof.gov.cn/zhengwuxinxi/zhengcefabu/", "核验财政制度、专项资金和政策发布"),
    source("税费政策", "国家税务总局", "https://www.chinatax.gov.cn/chinatax/n810341/index.html", "核验税种、优惠与征管口径"),
  ]),
  "state.enforcement": dossier("制度只有在可执行、可申诉时才形成稳定预期。", ["取证能力影响权利实现", "司法周期改变维权成本", "执行与监督决定规则可信度"], ["需要保存什么证据？", "调解、复议、仲裁、诉讼哪条路径适用？"], [
    source("司法行政", "中华人民共和国司法部", "https://www.moj.gov.cn/", "查找行政复议、法律服务与司法行政制度"),
    source("人民法院服务", "最高人民法院", "https://www.court.gov.cn/", "核验诉讼服务、司法政策与公开规则"),
  ]),

  "global.capital": dossier("全球资本通过利率、汇率和风险偏好重估本地项目。", ["基准利率改变融资成本", "汇率影响跨境收入与负债", "风险溢价改变资本可得性"], ["成本变化来自现金流还是折现率？", "哪项结论对汇率或利率最敏感？"], [
    source("IMF Data", "International Monetary Fund", "https://www.imf.org/en/Data", "核验宏观、汇率与国际金融数据"),
    source("BIS Statistics", "Bank for International Settlements", "https://www.bis.org/statistics/", "核验全球信贷、银行与金融市场统计"),
  ]),
  "global.trade": dossier("贸易规则通过关税、原产地和市场准入重排比较优势。", ["关税改变到岸价格", "技术标准形成非关税门槛", "原产地规则影响供应链选择"], ["商品或服务对应哪项分类？", "目标市场的准入与合规成本是多少？"], [
    source("Trade Topics", "World Trade Organization", "https://www.wto.org/english/tratop_e/tratop_e.htm", "核验多边贸易规则、议题与成员承诺"),
    source("WITS", "World Bank", "https://wits.worldbank.org/", "查询关税、贸易流与非关税措施"),
  ]),
  "global.supply": dossier("供应链把能源、原料、物流和生产节点连接成脆弱网络。", ["单一来源放大中断风险", "库存策略交换成本与韧性", "运输瓶颈造成时滞和价格冲击"], ["关键路径上哪个节点不可替代？", "中断多久会传导到最终交付？"], [
    source("Logistics Performance Index", "World Bank", "https://lpi.worldbank.org/", "比较跨国物流能力与瓶颈"),
    source("UNCTAD Data Hub", "UN Trade and Development", "https://unctadstat.unctad.org/", "核验贸易、航运与全球供应数据"),
  ]),
  "global.technology": dossier("技术平台通过接口、标准、算力和知识产权定义创新边界。", ["平台规则控制分发和抽成", "标准兼容性形成锁定", "算力与知识扩散改变进入成本"], ["依赖的是开放标准还是单一平台？", "平台规则变化会让哪项能力失效？"], [
    source("ITU DataHub", "International Telecommunication Union", "https://datahub.itu.int/", "核验全球数字基础设施与连接数据"),
    source("Global Innovation Index", "World Intellectual Property Organization", "https://www.wipo.int/global_innovation_index/", "比较创新制度、投入与产出"),
  ]),
  "global.geopolitics": dossier("地缘、安全与生态风险会突然重写跨境可行性。", ["制裁与出口管制改变技术流动", "冲突提高能源和保险成本", "气候政策重估高碳资产"], ["哪项依赖跨越高风险边界？", "风险是短期冲击还是长期制度变化？"], [
    source("UNFCCC", "United Nations Climate Change", "https://unfccc.int/", "核验全球气候制度、缔约方文件与进程"),
    source("UN Security Council", "United Nations", "https://main.un.org/securitycouncil/en", "核验国际安全框架与安理会文件"),
  ]),
};

export function getWorldDossier(facetID: string): FacetDossier {
  return worldDossiers[facetID] ?? dossier("该机制尚未进入固定目录。", ["先核验实际作用路径"], ["哪条证据能证明它正在生效？"]);
}