import { z } from "zod";

export const needTypes = ["安全稳定", "归属连接", "自主掌控", "成长胜任", "意义贡献"] as const;
export type NeedType = (typeof needTypes)[number];

const answerSchema = z.object({
  questionId: z.string().min(1),
  question: z.string().min(1),
  answer: z.string().min(1),
}).strict();

const goalSchema = z.object({
  outcome: z.string().min(1),
  metric: z.string().min(1),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  firstStep: z.string().min(1),
}).strict();

const mapSchema = z.object({
  need: z.string().min(1),
  conditions: z.array(z.string().min(1)).min(1),
  constraints: z.array(z.string().min(1)).min(1),
  resources: z.array(z.string().min(1)).min(1),
  actions: z.array(z.string().min(1)).min(1),
}).strict();

export const analysisSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  source: z.enum(["case", "custom"]),
  title: z.string().min(1),
  context: z.string().min(1),
  need: z.enum(needTypes),
  answers: z.array(answerSchema).min(1),
  goal: goalSchema,
  map: mapSchema,
}).strict();

export const historySchema = z.array(analysisSchema);
export type Analysis = z.infer<typeof analysisSchema>;

export type ExplorerCase = {
  slug: string;
  need: NeedType;
  symbol: string;
  title: string;
  summary: string;
  context: string;
  questions: { id: string; label: string; hint: string }[];
  exampleAnswers: string[];
  constraints: string[];
  resources: string[];
  suggestedGoal: { outcome: string; metric: string; firstStep: string };
};

export const explorerCases: ExplorerCase[] = [
  {
    slug: "stability", need: "安全稳定", symbol: "△", title: "稳定交付，不再被突发工作拖走",
    summary: "识别风险、边界与最低安全线。", context: "项目频繁插单，计划失真，长期处于救火状态。",
    questions: [
      { id: "risk", label: "最担心发生什么？", hint: "写下具体事件，而不是泛泛的焦虑" },
      { id: "baseline", label: "什么是可接受的最低稳定线？", hint: "例如每周最多一次临时插单" },
      { id: "control", label: "哪些风险在你的影响范围内？", hint: "流程、沟通、预留量……" },
    ],
    exampleAnswers: ["关键里程碑因插单延期", "核心计划每周变更不超过一次", "预留容量并要求插单明确优先级"],
    constraints: ["需求入口分散", "没有明确的插单优先级"], resources: ["周计划", "项目负责人支持"],
    suggestedGoal: { outcome: "建立可预测的交付节奏", metric: "连续四周核心计划达成率 ≥ 85%", firstStep: "为本周计划预留 20% 风险容量" },
  },
  {
    slug: "belonging", need: "归属连接", symbol: "○", title: "重建团队中的真实连接",
    summary: "辨认关系断点、支持与可发出的信号。", context: "远程协作只剩任务同步，很难获得信任与支持。",
    questions: [
      { id: "people", label: "你希望和谁建立更好的连接？", hint: "选择一到两位关键伙伴" },
      { id: "moment", label: "在哪些时刻最感到疏离？", hint: "回忆最近一次具体场景" },
      { id: "signal", label: "你能先发出什么低风险信号？", hint: "求助、反馈或一次非正式交流" },
    ],
    exampleAnswers: ["同项目的两位核心伙伴", "只在群里交接任务时", "约一次 20 分钟的一对一交流"],
    constraints: ["交流高度事务化", "担心打扰他人"], resources: ["固定协作伙伴", "每周同步时间"],
    suggestedGoal: { outcome: "形成稳定的双向支持关系", metric: "每周完成两次有实质反馈的交流", firstStep: "邀请一位伙伴进行 20 分钟咖啡聊" },
  },
  {
    slug: "autonomy", need: "自主掌控", symbol: "◇", title: "把时间重新握在自己手里",
    summary: "厘清可控范围、边界与选择权。", context: "会议和即时消息切碎整天，重要工作总被推迟。",
    questions: [
      { id: "choice", label: "你最想恢复哪项选择权？", hint: "时间、方法、顺序或合作方式" },
      { id: "interrupt", label: "最大的外部牵引是什么？", hint: "列出高频干扰源" },
      { id: "boundary", label: "可以先建立哪条小边界？", hint: "要具体、可沟通、可重复" },
    ],
    exampleAnswers: ["上午自主安排深度工作", "无议程会议和即时消息", "每天 9:30—11:00 免打扰"],
    constraints: ["日程被他人占用", "消息响应预期不清"], resources: ["日历专注模式", "团队异步协作规范"],
    suggestedGoal: { outcome: "恢复稳定的深度工作时间", metric: "每周至少 4 个 90 分钟专注块", firstStep: "在日历锁定明天上午的专注块" },
  },
  {
    slug: "growth", need: "成长胜任", symbol: "↗", title: "跨过能力停滞的平台期",
    summary: "把能力差距拆成刻意练习与反馈。", context: "承担了更复杂的职责，但迟迟感受不到能力提升。",
    questions: [
      { id: "skill", label: "哪项能力最限制当前表现？", hint: "选择一项，不要列清单" },
      { id: "evidence", label: "怎样算真正进步？", hint: "定义可观察的行为或产出" },
      { id: "feedback", label: "谁或什么能提供快速反馈？", hint: "导师、同伴、数据或用户" },
    ],
    exampleAnswers: ["复杂方案的结构化表达", "评审一次通过且关键假设清晰", "请资深同事在正式评审前预审"],
    constraints: ["练习目标过大", "反馈周期太长"], resources: ["历史优秀方案", "资深评审伙伴"],
    suggestedGoal: { outcome: "独立产出清晰的复杂方案", metric: "未来三次评审中至少两次无需结构性返工", firstStep: "拆解一份优秀方案的论证结构" },
  },
  {
    slug: "meaning", need: "意义贡献", symbol: "✦", title: "让工作重新连接真实影响",
    summary: "连接价值、受益者与可见贡献。", context: "工作量很大，却看不见产出对谁产生了什么影响。",
    questions: [
      { id: "value", label: "你真正重视的价值是什么？", hint: "例如创造、帮助、公平或探索" },
      { id: "beneficiary", label: "谁会从你的工作中受益？", hint: "描述具体的人群" },
      { id: "proof", label: "什么证据能让影响变得可见？", hint: "反馈、数据、行为变化或故事" },
    ],
    exampleAnswers: ["让复杂工具更易用", "第一次使用产品的新用户", "观察用户独立完成关键任务"],
    constraints: ["离用户太远", "只追踪产出不追踪结果"], resources: ["用户研究记录", "产品使用数据"],
    suggestedGoal: { outcome: "让贡献与用户结果直接相连", metric: "本月获得 5 条真实用户反馈并形成一项改进", firstStep: "联系研究团队获取最近的用户访谈" },
  },
];

export type BuildInput = {
  title: string; context: string; need: NeedType; answers: Analysis["answers"];
  outcome: string; metric: string; deadline: string; firstStep: string; source: "case" | "custom";
};

export function buildAnalysis(input: BuildInput): Analysis {
  const template = explorerCases.find((item) => item.need === input.need)!;
  return analysisSchema.parse({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    source: input.source,
    title: input.title,
    context: input.context,
    need: input.need,
    answers: input.answers,
    goal: { outcome: input.outcome, metric: input.metric, deadline: input.deadline, firstStep: input.firstStep },
    map: {
      need: `${input.need}：${input.outcome}`,
      conditions: input.answers.map((answer) => `${answer.question} ${answer.answer}`),
      constraints: template.constraints,
      resources: template.resources,
      actions: [`第一步：${input.firstStep}`, `验证指标：${input.metric}`, `复盘日期：${input.deadline}`],
    },
  });
}
