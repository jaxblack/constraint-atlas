"use client";

import { FormEvent, useEffect, useState } from "react";
import { Analysis, buildAnalysis, explorerCases, historySchema, NeedType, needTypes } from "../lib/atlas";

const STORAGE_KEY = "constraint-atlas-history-v1";
type View = "explore" | "form" | "result" | "history";

function readHistory(): Analysis[] {
  if (typeof window === "undefined") return [];
  try {
    return historySchema.parse(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"));
  } catch {
    return [];
  }
}

export default function Home() {
  const [view, setView] = useState<View>("explore");
  const [history, setHistory] = useState<Analysis[]>([]);
  const [source, setSource] = useState<"case" | "custom">("case");
  const [need, setNeed] = useState<NeedType>(needTypes[0]);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [outcome, setOutcome] = useState("");
  const [metric, setMetric] = useState("");
  const [deadline, setDeadline] = useState("2027-01-30");
  const [firstStep, setFirstStep] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const activeCase = explorerCases.find((item) => item.need === need)!;

  useEffect(() => {
    const timer = window.setTimeout(() => setHistory(readHistory()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function openCase(selectedNeed: NeedType) {
    const item = explorerCases.find((entry) => entry.need === selectedNeed)!;
    setSource("case"); setNeed(item.need); setTitle(item.title); setContext(item.context);
    setAnswers(item.exampleAnswers); setOutcome(item.suggestedGoal.outcome);
    setMetric(item.suggestedGoal.metric); setFirstStep(item.suggestedGoal.firstStep); setView("form");
  }

  function openCustom() {
    const item = explorerCases[0];
    setSource("custom"); setNeed(item.need); setTitle(""); setContext("");
    setAnswers(item.questions.map(() => "")); setOutcome(""); setMetric(""); setFirstStep(""); setView("form");
  }

  function changeNeed(nextNeed: NeedType) {
    setNeed(nextNeed);
    const item = explorerCases.find((entry) => entry.need === nextNeed)!;
    setAnswers(item.questions.map(() => ""));
  }

  function generate(event: FormEvent) {
    event.preventDefault();
    const analysis = buildAnalysis({
      title, context, need, source, outcome, metric, deadline, firstStep,
      answers: activeCase.questions.map((question, index) => ({ questionId: question.id, question: question.label, answer: answers[index] })),
    });
    setResult(analysis); setView("result");
  }

  function saveResult() {
    if (!result || history.some((item) => item.id === result.id)) return;
    const next = [result, ...history];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setHistory(next);
  }

  function removeHistory(id: string) {
    const next = history.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setHistory(next);
  }

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setView("explore")} aria-label="返回首页">
          <span className="brand-mark">CA</span><span>Constraint Atlas<small>约束地图</small></span>
        </button>
        <button className="history-button" onClick={() => setView("history")}>历史记录 <b>{history.length}</b></button>
      </header>

      {view === "explore" && (
        <section className="workspace hero" aria-labelledby="atlas-title">
          <div className="coordinates">35.68° N&nbsp;&nbsp; · &nbsp;&nbsp;139.76° E</div>
          <p className="eyebrow">NEED EXPLORER / 需求探索器</p>
          <h1 id="atlas-title">约束地图</h1>
          <p className="lede">从“我做不到”开始，定位真正的需要、条件与约束，绘制一条今天就能启程的行动路径。</p>
          <div className="legend"><span>01 选择需求</span><i /><span>02 回答测绘</span><i /><span>03 建立目标</span><i /><span>04 生成路径</span></div>
          <div className="explorer-grid">
            {explorerCases.map((item, index) => (
              <article className="need-card" key={item.need}>
                <div className="card-top"><span className="index">0{index + 1}</span><span className="symbol">{item.symbol}</span></div>
                <h2>{item.need}</h2><p>{item.summary}</p>
                <p className="case-label">离线案例 · {item.title}</p>
                <button onClick={() => openCase(item.need)} aria-label={`探索 ${item.need}`}>开始探索 <span>→</span></button>
              </article>
            ))}
          </div>
          <button className="custom-cta" onClick={openCustom} aria-label="创建自定义目标"><span>＋</span><strong>创建自定义目标</strong><small>从你此刻最想改变的事开始</small></button>
          <p className="privacy">所有分析均在本机完成并保存，无需联网，不上传任何内容。</p>
        </section>
      )}

      {view === "form" && (
        <section className="workspace survey" aria-labelledby="survey-title">
          <button className="back" onClick={() => setView("explore")}>← 返回需求地图</button>
          <p className="eyebrow">FIELD SURVEY / 本地测绘问卷</p>
          <h1 id="survey-title">{source === "custom" ? "自定义目标" : activeCase.title}</h1>
          <p className="lede">{source === "custom" ? "选择最接近的核心需要，再用一组针对性问题勘察现状。" : activeCase.context}</p>
          <form onSubmit={generate}>
            <div className="form-section">
              <span className="section-number">01</span><h2>定位目标</h2>
              <div className="field-grid">
                <label>目标名称<input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="我想改变……" /></label>
                <label>核心需要<select value={need} onChange={(e) => changeNeed(e.target.value as NeedType)}>{needTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
              </div>
              <label>当前处境<textarea value={context} onChange={(e) => setContext(e.target.value)} required placeholder="发生了什么？它如何影响你？" /></label>
            </div>
            <div className="form-section">
              <span className="section-number">02</span><h2>{need}测绘</h2>
              <div className="question-list">
                {activeCase.questions.map((question, index) => (
                  <label key={question.id}><strong>{question.label}</strong><small>{question.hint}</small><textarea value={answers[index] ?? ""} onChange={(e) => { const next = [...answers]; next[index] = e.target.value; setAnswers(next); }} required /></label>
                ))}
              </div>
            </div>
            <div className="form-section goal-builder">
              <span className="section-number">03</span><h2>Goal Builder</h2><p>把期待变成可验证的目标</p>
              <label>期望结果<input value={outcome} onChange={(e) => setOutcome(e.target.value)} required placeholder="完成后会有什么不同？" /></label>
              <div className="field-grid"><label>验证指标<input value={metric} onChange={(e) => setMetric(e.target.value)} required /></label><label>目标日期<input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required /></label></div>
              <label>最小第一步<input value={firstStep} onChange={(e) => setFirstStep(e.target.value)} required placeholder="24 小时内能做什么？" /></label>
            </div>
            <button className="primary" type="submit" aria-label="生成约束地图">生成约束地图 <span>→</span></button>
          </form>
        </section>
      )}

      {view === "result" && result && (
        <section className="workspace result" aria-labelledby="result-title">
          <button className="back" onClick={() => setView("form")}>← 修改测绘</button>
          <p className="eyebrow">ATLAS GENERATED / 路径已测绘</p><h1 id="result-title">你的行动地图</h1><p className="lede">{result.title}</p>
          <div className="map-board">
            <div className="map-line" aria-hidden="true" />
            <MapNode kind="need" title="核心需要" items={[result.map.need]} />
            <MapNode kind="condition" title="现场条件" items={result.map.conditions} />
            <MapNode kind="constraint" title="主要约束" items={result.map.constraints} />
            <MapNode kind="resource" title="可用资源" items={result.map.resources} />
            <MapNode kind="action" title="行动路径" items={result.map.actions} />
          </div>
          <aside className="goal-ticket"><span>目标坐标</span><strong>{result.goal.outcome}</strong><p>{result.goal.metric}</p><time>{result.goal.deadline}</time></aside>
          <div className="actions"><button className="primary" onClick={saveResult}>保存到本地历史</button><button onClick={() => setView("explore")}>开始新分析</button></div>
        </section>
      )}

      {view === "history" && (
        <section className="workspace history" aria-labelledby="history-title">
          <button className="back" onClick={() => setView("explore")}>← 返回需求地图</button><p className="eyebrow">LOCAL ARCHIVE / 本地档案</p><h1 id="history-title">历史记录</h1>
          <div data-testid="history-list" className="history-list">
            {history.length === 0 ? <p className="empty">还没有保存的分析。</p> : history.map((item) => (
              <article key={item.id}><div><small>{item.need} · {new Date(item.createdAt).toLocaleDateString("zh-CN")}</small><h2>{item.title}</h2><p>{item.goal.outcome}</p></div><div><button onClick={() => { setResult(item); setView("result"); }}>查看地图</button><button className="danger" onClick={() => removeHistory(item.id)}>删除</button></div></article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function MapNode({ kind, title, items }: { kind: string; title: string; items: string[] }) {
  return <article className={`map-node ${kind}`}><span>{title}</span>{items.map((item) => <p key={item}>{item}</p>)}</article>;
}
