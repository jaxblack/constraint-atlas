"use client";

import { useState } from "react";
import { Crosshair, Microscope, Percent, Scale, ShieldAlert } from "lucide-react";
import { analysisSchema, type Analysis } from "./analysis";

const statusLabels = {
  hard_disabled: "硬性禁用",
  permission_required: "需要权限",
  temporarily_unavailable: "暂时不可用",
  mixed: "混合阻塞",
} as const;

const scaleLabels = {
  micro: { label: "微观", caption: "小刀处理眼前" },
  meso: { label: "中观", caption: "识别重复模式" },
  macro: { label: "宏观", caption: "大炮解释结构" },
} as const;

const theoryLabels = {
  painkiller: "止痛解释",
  legitimation: "正当化解释",
  navigation: "导航模型",
  mixed: "混合功能",
} as const;

function fallbackScales(analysis: Analysis): NonNullable<Analysis["scales"]> {
  const action = analysis.nodes.find((node) => node.kind === "action");
  return [
    { id: "micro", diagnosis: analysis.conclusion, prediction: "旧记录没有保存微观预测，需要重新运行分析。", nextStep: action?.detail ?? "验证一个关键事实。" },
    { id: "meso", diagnosis: "检查相似阻塞是否反复出现。", prediction: "若机制真实，相似条件下应出现相似结果。", nextStep: "对比最近三次相似经历。" },
    { id: "macro", diagnosis: "检查制度、环境和演化机制是否真的影响结果。", prediction: "改变结构条件后，结果应按模型方向变化。", nextStep: "寻找一个能推翻宏观解释的反例。" },
  ];
}

export default function InsightPanels({ input }: { input: Analysis }) {
  const analysis = analysisSchema.parse(input);
  const [activeScale, setActiveScale] = useState<"micro" | "meso" | "macro">("micro");
  const causalNodes = analysis.nodes.filter((node) => node.contribution > 0).sort((left, right) => right.contribution - left.contribution);
  const layerShares = analysis.layers.map((layer) => ({
    layer,
    share: analysis.nodes.filter((node) => node.layer === layer.id).reduce((sum, node) => sum + node.contribution, 0),
  }));
  const disablement = analysis.disablement ?? {
    target: analysis.title,
    status: "mixed" as const,
    topBlocker: causalNodes[0]?.label ?? "尚未识别",
  };
  const scales = analysis.scales ?? fallbackScales(analysis);
  const scale = scales.find((item) => item.id === activeScale) ?? scales[0];
  const theory = analysis.theoryAudit ?? {
    function: "mixed" as const,
    predictivePower: 0,
    explanation: "这条旧记录没有保存理论功能审计，建议重新运行分析。",
    falsifier: "重新分析后，用一个反例检验最高权重解释。",
  };

  return <>
    <section className="attribution-panel" aria-labelledby="attribution-title">
      <header>
        <div><Percent size={18} /><div><p>归因预算</p><h3 id="attribution-title">100% Disable 归因</h3></div></div>
        <span className={`disable-status disable-status--${disablement.status}`}>{statusLabels[disablement.status]}</span>
      </header>
      <div className="disable-target">
        <div><span>想做成的事</span><strong>{disablement.target}</strong></div>
        <div><span>首要置灰条件</span><strong>{disablement.topBlocker}</strong></div>
      </div>
      <div className="attribution-bar" aria-label="各层 Disable 归因占比">
        {layerShares.filter((item) => item.share > 0).map(({ layer, share }, index) => <span className={`layer-tone-${index % 5}`} style={{ flexBasis: `${share}%` }} title={`${layer.label} ${share}%`} key={layer.id}>{share >= 9 ? `${share}%` : ""}</span>)}
      </div>
      <div className="attribution-layers">
        {layerShares.map(({ layer, share }, index) => <article key={layer.id}>
          <header><i className={`layer-tone-${index % 5}`} /><span>{String(index + 1).padStart(2, "0")} · {layer.label}</span><strong>{share}%</strong></header>
          <div>{causalNodes.filter((node) => node.layer === layer.id).map((node) => <span key={node.id}>{node.label}<b>{node.contribution}%</b></span>)}{share === 0 && <span className="no-attribution">当前证据未归因到此层</span>}</div>
        </article>)}
      </div>
    </section>

    <div className="audit-grid">
      <section className="scale-panel" aria-labelledby="scale-title">
        <header><Microscope size={17} /><div><p>射击模式</p><h3 id="scale-title">尺度切换</h3></div></header>
        <div className="scale-tabs" role="tablist">{scales.map((item) => <button className={item.id === activeScale ? "is-active" : ""} role="tab" aria-selected={item.id === activeScale} aria-label={`${scaleLabels[item.id].label}模式`} onClick={() => setActiveScale(item.id)} key={item.id}><strong>{scaleLabels[item.id].label}</strong><span>{scaleLabels[item.id].caption}</span></button>)}</div>
        <div className="scale-content" role="tabpanel">
          <div><span>诊断</span><p>{scale.diagnosis}</p></div>
          <div><span>可验证预测</span><p>{scale.prediction}</p></div>
          <div className="scale-next"><Crosshair size={15} /><p><span>这一尺度的下一步</span>{scale.nextStep}</p></div>
        </div>
      </section>

      <aside className="theory-panel" aria-labelledby="theory-title">
        <header><ShieldAlert size={17} /><div><p>解释审计</p><h3 id="theory-title">{theoryLabels[theory.function]}</h3></div></header>
        <p>{theory.explanation}</p>
        <div className="predictive-score"><span>预测能力</span><strong>{Math.round(theory.predictivePower)} / 100</strong><i><b style={{ width: `${theory.predictivePower}%` }} /></i></div>
        <div className="falsifier"><Scale size={15} /><p><span>什么会推翻它</span>{theory.falsifier}</p></div>
      </aside>
    </div>
  </>;
}