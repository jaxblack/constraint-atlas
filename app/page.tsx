"use client";

import { useEffect, useState } from "react";
import { Background, Controls, Edge, MarkerType, Node, ReactFlow } from "@xyflow/react";
import { ArrowRight, Clock3, Compass, History, Map as MapIcon, Sparkles, Trash2 } from "lucide-react";
import "@xyflow/react/dist/style.css";
import type { Analysis } from "./analysis";

type SavedAnalysis = { id: string; question: string; createdAt: string; analysis: Analysis; source: "model" | "fallback" };
const STORAGE_KEY = "constraint-atlas-history-v1";
const starterQuestions = ["我想转行，但担心收入不稳定", "一段关系让我疲惫，却不知道该不该离开", "项目方向很多，团队无法决定先做什么"];

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

  async function analyze() {
    if (question.trim().length < 8 || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/constraint-atlas/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "分析暂时不可用");
      const saved: SavedAnalysis = { id: crypto.randomUUID(), question: question.trim(), createdAt: new Date().toISOString(), analysis: body.analysis, source: body.source };
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
              <button onClick={analyze} disabled={question.trim().length < 8 || loading}>{loading ? <><Sparkles className="spin" size={17} /> 正在测绘</> : <>开始拆解 <ArrowRight size={17} /></>}</button>
            </div>
            <div className="starters">{starterQuestions.map((item) => <button key={item} onClick={() => setQuestion(item)}>{item}</button>)}</div>
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
