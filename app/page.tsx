"use client";

import { useEffect, useState } from "react";
import { Background, Controls, Edge, MarkerType, Node, ReactFlow } from "@xyflow/react";
import { ArrowRight, Clock3, Compass, FlaskConical, History, Map as MapIcon, Play, Sparkles, Trash2 } from "lucide-react";
import "@xyflow/react/dist/style.css";
import type { Analysis } from "./analysis";

type SavedAnalysis = { id: string; question: string; createdAt: string; analysis: Analysis; source: "model" | "fallback" };
const STORAGE_KEY = "constraint-atlas-history-v1";
const starterQuestions = ["我想转行，但担心收入不稳定", "一段关系让我疲惫，却不知道该不该离开", "项目方向很多，团队无法决定先做什么"];
const demoCases = [
  { category: "职业", title: "要不要裸辞转行", focus: "现金流与可逆实验", question: "我在现在的工作里越来越没有成长感，想转行做 AI 产品，但家庭开支要求收入稳定。我应该现在裸辞，还是继续等待？请帮我找出可逆的验证路径。" },
  { category: "关系", title: "是否结束消耗关系", focus: "边界、事实与沉没成本", question: "这段关系已经让我持续疲惫半年，对方承诺会改变但行动很少。我害怕分开后后悔，也担心继续投入只是沉没成本。我应该怎样判断是否离开？" },
  { category: "产品", title: "资源有限时先做哪条产品线", focus: "影响、证据与机会成本", question: "团队只有两名工程师，却同时想做企业版、移动端和 AI 自动化三条产品线。客户声音互相矛盾，我们应该先做哪一条，怎样用最小成本获得可靠证据？" },
  { category: "生活", title: "要不要搬去另一座城市", focus: "不可逆成本与试住方案", question: "我想搬到一个生活节奏更慢的城市，但现在的社交关系和职业机会都在这里。远程工作暂时可行，我该直接搬家，还是先设计一次低风险试住？" },
  { category: "创作", title: "稳定工作还是独立创作", focus: "身份需求与时间约束", question: "我想认真做独立创作，现有工作提供稳定收入却消耗了大部分精力。我不想永远把创作当副业，也不能承受长期零收入，下一步该怎么安排？" },
];

function flowElements(analysis: Analysis): { nodes: Node[]; edges: Edge[] } {
  const columns = ["need", "fact", "constraint", "choice", "action"];
  const counts = new Map<string, number>();
  const nodes = analysis.nodes.map((item) => {
    const row = counts.get(item.kind) ?? 0;
    counts.set(item.kind, row + 1);
    return {
      id: item.id,
      position: { x: columns.indexOf(item.kind) * 220, y: row * 150 + (columns.indexOf(item.kind) % 2) * 34 },
      data: { label: <div className={`map-node map-node--${item.kind}`}><span>{item.kind}</span><strong>{item.label}</strong><p>{item.detail}</p></div> },
      style: { width: 190, border: 0, padding: 0, background: "transparent" },
    };
  });
  const edges = analysis.edges.map((item, index) => ({
    id: `edge-${index}`,
    source: item.source,
    target: item.target,
    label: item.relation,
    animated: item.target === "action",
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: "#697a6f", strokeWidth: 1.5 },
    labelStyle: { fill: "#526158", fontSize: 11 },
  }));
  return { nodes, edges };
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [current, setCurrent] = useState<SavedAnalysis | null>(null);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setHistory(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")); } catch { localStorage.removeItem(STORAGE_KEY); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function analyze(input = question) {
    const nextQuestion = input.trim();
    if (nextQuestion.length < 8 || loading) return;
    setQuestion(nextQuestion);
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/constraint-atlas/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: nextQuestion }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "分析暂时不可用");
      const saved: SavedAnalysis = { id: crypto.randomUUID(), question: nextQuestion, createdAt: new Date().toISOString(), analysis: body.analysis, source: body.source };
      const next = [saved, ...history].slice(0, 20);
      setCurrent(saved);
      setHistory(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "分析暂时不可用");
    } finally { setLoading(false); }
  }

  function removeHistory(id: string) {
    const next = history.filter((item) => item.id !== id);
    setHistory(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (current?.id === id) setCurrent(null);
  }

  const flow = current ? flowElements(current.analysis) : null;
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><Compass size={22} /><strong>Constraint Atlas</strong><span>哲学大炮</span></div>
        <div className="privacy"><span /> 记录仅保存在此浏览器</div>
      </header>

      <section className="workspace">
        <aside className="history-rail" aria-label="历史分析">
          <div className="rail-heading"><History size={16} /><span>最近地图</span></div>
          {history.length === 0 ? <p className="empty-history">你的决策地图会出现在这里。</p> : history.map((item) => (
            <div className={`history-row ${current?.id === item.id ? "is-active" : ""}`} key={item.id}>
              <button onClick={() => { setCurrent(item); setQuestion(item.question); }}><strong>{item.analysis.title}</strong><span>{new Date(item.createdAt).toLocaleDateString("zh-CN")}</span></button>
              <button className="icon-button" aria-label={`删除 ${item.analysis.title}`} onClick={() => removeHistory(item.id)} title="删除"><Trash2 size={14} /></button>
            </div>
          ))}
        </aside>

        <div className="main-stage">
          <section className="prompt-panel" aria-labelledby="page-title">
            <div>
              <p className="eyebrow">从混乱到下一步</p>
              <h1 id="page-title">把困局摊开来看。</h1>
              <p className="intro">不是替你做决定，而是把需求、事实、约束和选择放在同一张地图上。</p>
            </div>
            <label htmlFor="question">把你卡住的问题写下来</label>
            <div className="composer">
              <textarea id="question" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：我想换一个更有意义的工作，但不能承受半年没有收入……" maxLength={2000} />
              <button onClick={() => analyze()} disabled={question.trim().length < 8 || loading}>{loading ? <><Sparkles className="spin" size={17} /> 正在测绘</> : <>开始拆解 <ArrowRight size={17} /></>}</button>
            </div>
            <div className="starters">{starterQuestions.map((item) => <button key={item} onClick={() => setQuestion(item)}>{item}</button>)}</div>
            <section className="case-lab" aria-labelledby="case-lab-title">
              <div className="case-lab-heading">
                <span><FlaskConical size={15} /></span>
                <div><p id="case-lab-title">测试案例</p><small>选一个真实场景，直接看看大炮怎么拆。</small></div>
              </div>
              <div className="case-grid">
                {demoCases.map((item) => (
                  <button key={item.title} aria-label={`运行案例：${item.title}`} onClick={() => analyze(item.question)} disabled={loading}>
                    <span>{item.category}</span>
                    <strong>{item.title}</strong>
                    <small>{item.focus}</small>
                    <Play size={13} fill="currentColor" />
                  </button>
                ))}
              </div>
            </section>
            {error && <p className="error" role="alert">{error}</p>}
          </section>

          {current && flow ? (
            <section className="results" aria-live="polite">
              <div className="result-heading">
                <div><p className="eyebrow">当前地图</p><h2>{current.analysis.title}</h2></div>
                <span className={`source source--${current.source}`}>{current.source === "model" ? "AI 分析" : "离线分析"}</span>
              </div>
              <div className="conclusion"><MapIcon size={20} /><div><span>地图结论</span><p>{current.analysis.conclusion}</p></div></div>
              <div className="flow-wrap"><ReactFlow nodes={flow.nodes} edges={flow.edges} fitView minZoom={0.45} maxZoom={1.4} nodesDraggable={false} nodesConnectable={false} proOptions={{ hideAttribution: true }}><Background color="#ccd4ce" gap={24} size={1} /><Controls showInteractive={false} /></ReactFlow></div>
            </section>
          ) : (
            <section className="blank-map">
              <div className="contours" aria-hidden="true" />
              <MapIcon size={30} /><h2>你的地图会在这里展开</h2><p>先描述一个真实、具体、正在消耗你的问题。</p>
              <div className="legend"><span><i className="need" />需求</span><span><i className="constraint" />约束</span><span><i className="choice" />选择</span><span><i className="action" />行动</span></div>
            </section>
          )}
          <footer><Clock3 size={14} /> Constraint Atlas 提供思考辅助，不替代医疗、法律或财务专业意见。</footer>
        </div>
      </section>
    </main>
  );
}
