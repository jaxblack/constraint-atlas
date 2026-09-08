"use client";

import { useEffect, useRef } from "react";
import { BookOpen, ExternalLink, Landmark, ScanSearch, X } from "lucide-react";
import type { TowerFacet, TowerLayer } from "./disableTowerModel";
import { getWorldDossier } from "./worldDossiers";

const interventionLabels = { accept: "接受边界", train: "升级能力", acquire: "获取资源", negotiate: "协商合作", reroute: "绕路/换系统", wait: "等待窗口", exit: "退出游戏", experiment: "小步验证" } as const;

type Props = {
  layer: TowerLayer;
  facet: TowerFacet;
  open: boolean;
  onClose: () => void;
};

export default function WorldDossierDrawer({ layer, facet, open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dossier = getWorldDossier(facet.id);
  const nodes = layer.nodes.filter((node) => node.facetID === facet.id);
  const confidence = nodes.length === 0 ? 0 : Math.round(nodes.reduce((sum, node) => sum + node.confidence, 0) / nodes.length);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return <div className="dossier-scrim" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="world-dossier" role="dialog" aria-modal="true" aria-labelledby="dossier-title">
      <header className="dossier-heading">
        <div><Landmark size={17} /><span>WORLD LAYER {String(layer.id).padStart(2, "0")}</span></div>
        <button ref={closeRef} aria-label="关闭制度卷宗" title="关闭" onClick={onClose}><X size={17} /></button>
      </header>

      <div className="dossier-title-block">
        <span>{layer.label} / {facet.share}% 归因</span>
        <h4 id="dossier-title">{facet.label}</h4>
        <p>{dossier.principle}</p>
      </div>

      <div className="dossier-metrics" aria-label="卷宗指标">
        <div><span>问题归因</span><strong>{facet.share}%</strong></div>
        <div><span>层级天花板</span><strong>{Math.round(layer.ceilingStrength * 100)}</strong></div>
        <div><span>证据可信度</span><strong>{confidence || "待核"}</strong></div>
      </div>

      <section className="dossier-section">
        <header><BookOpen size={15} /><div><span>MECHANISMS</span><h5>制度如何起作用</h5></div></header>
        <ol>{dossier.mechanisms.map((mechanism, index) => <li key={mechanism}><b>{String(index + 1).padStart(2, "0")}</b><span>{mechanism}</span></li>)}</ol>
      </section>

      <section className="dossier-section dossier-findings">
        <header><ScanSearch size={15} /><div><span>LOCATED HERE</span><h5>这个问题落在这里</h5></div></header>
        {nodes.length > 0 ? nodes.map((node) => <article key={node.id}>
          <div><strong>{node.label}</strong><span>{node.contribution > 0 ? `${node.contribution}%` : "响应"}</span></div>
          <p>{node.detail}</p>
          <small>可信 {node.confidence}% · {interventionLabels[node.intervention]}</small>
        </article>) : <p className="dossier-empty">当前分析未把因果份额归到这里。它仍作为固定制度坐标保留，便于检查遗漏。</p>}
      </section>

      <section className="dossier-section dossier-audit">
        <header><span>VERIFY</span><h5>适用性核验</h5></header>
        <ul>{dossier.auditQuestions.map((question) => <li key={question}>{question}</li>)}</ul>
      </section>

      <section className="dossier-section dossier-sources">
        <header><span>PRIMARY SOURCES</span><h5>相关政策、法规与制度入口</h5></header>
        {dossier.sources.length > 0 ? <div>{dossier.sources.map((item) => <a href={item.url} target="_blank" rel="noreferrer" key={item.url}>
          <span>{item.authority}</span><strong>{item.title}</strong><p>{item.note}</p><ExternalLink size={14} />
        </a>)}</div> : <p className="dossier-empty">这一层主要由个人状态、组织章程或非正式规范构成。请优先核验合同、员工手册、会议纪要、家庭承诺和群体实际奖惩。</p>}
        <small>官方入口用于核验原文，不代表该规则必然适用于你的个案，也不替代专业意见。</small>
      </section>
    </aside>
  </div>;
}