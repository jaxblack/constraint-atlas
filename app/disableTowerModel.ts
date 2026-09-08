import { analysisSchema, type Analysis } from "./analysis";
import { worldArt, worldArtOrder } from "./worldArt";

export type TowerNode = {
  id: string;
  label: string;
  detail: string;
  kind: Analysis["nodes"][number]["kind"];
  facetID: string;
  facetLabel: string;
  contribution: number;
  confidence: number;
  intervention: Analysis["nodes"][number]["intervention"];
  x: number;
  z: number;
};

export type TowerFacet = {
  id: string;
  label: string;
  description: string;
  share: number;
  x: number;
  z: number;
  width: number;
  depth: number;
};

export type TowerLayer = {
  id: number;
  domain: Analysis["layers"][number]["domain"];
  label: string;
  description: string;
  share: number;
  ceilingStrength: number;
  y: number;
  width: number;
  depth: number;
  color: number;
  facets: TowerFacet[];
  nodes: TowerNode[];
};

export type DisableTowerModel = {
  target: string;
  status: NonNullable<Analysis["disablement"]>["status"];
  topBlocker: string;
  layers: TowerLayer[];
  totalContribution: number;
};

const colors = worldArtOrder.map((domain) => worldArt[domain].color);
const hardness = { hard: 1, permission: .88, resource: .72, capability: .62, coordination: .52, temporary: .3, none: .1 } as const;
const facetPositions = [
  [-2.35, -1.15],
  [0, -1.15],
  [2.35, -1.15],
  [-1.18, 1.15],
  [1.18, 1.15],
] as const;
const nodeOffsets = [
  [0, 0],
  [-.32, .2],
  [.32, .2],
  [0, -.28],
] as const;

export function buildDisableTower(input: Analysis): DisableTowerModel {
  const analysis = analysisSchema.parse(input);
  const causalNodes = analysis.nodes.filter((node) => node.contribution > 0);
  const topBlocker = [...causalNodes].sort((left, right) => right.contribution - left.contribution)[0]?.label ?? "尚未识别";
  const verticalGap = 1.92;
  const centerOffset = (analysis.layers.length - 1) * verticalGap / 2;
  const layers = analysis.layers.map((layer, layerIndex) => {
    const nodes = analysis.nodes.filter((node) => node.layer === layer.id);
    const share = nodes.reduce((sum, node) => sum + node.contribution, 0);
    const causal = nodes.filter((node) => node.contribution > 0);
    const ceilingStrength = causal.length === 0 ? .08 : causal.reduce((sum, node) => sum + hardness[node.disableState] * node.contribution, 0) / share;
    const footprintScale = .8 + layerIndex * .11;
    const width = 6.5 + layerIndex * .7;
    const depth = 4.05 + layerIndex * .34;
    const facets = layer.facets.map((facet, facetIndex) => ({
      ...facet,
      share: nodes.filter((node) => node.facet === facet.id).reduce((sum, node) => sum + node.contribution, 0),
      x: facetPositions[facetIndex][0] * footprintScale,
      z: facetPositions[facetIndex][1] * footprintScale,
      width: 1.72 + layerIndex * .13,
      depth: 1.26 + layerIndex * .08,
    }));
    return {
      id: layer.id,
      domain: layer.domain,
      label: layer.label,
      description: layer.description,
      share,
      ceilingStrength,
      y: layerIndex * verticalGap - centerOffset,
      width,
      depth,
      color: colors[layerIndex % colors.length],
      facets,
      nodes: nodes.map((node) => {
        const facetIndex = Math.max(0, facets.findIndex((facet) => facet.id === node.facet));
        const siblingIndex = nodes.filter((candidate) => candidate.facet === node.facet).findIndex((candidate) => candidate.id === node.id);
        return {
          id: node.id,
          label: node.label,
          detail: node.detail,
          kind: node.kind,
          facetID: node.facet,
          facetLabel: facets[facetIndex].label,
          contribution: node.contribution,
          confidence: node.confidence,
          intervention: node.intervention,
          x: facets[facetIndex].x + nodeOffsets[siblingIndex % nodeOffsets.length][0],
          z: facets[facetIndex].z + nodeOffsets[siblingIndex % nodeOffsets.length][1],
        };
      }),
    };
  });
  return {
    target: analysis.disablement?.target ?? analysis.title,
    status: analysis.disablement?.status ?? "mixed",
    topBlocker: analysis.disablement?.topBlocker ?? topBlocker,
    layers,
    totalContribution: layers.reduce((sum, layer) => sum + layer.share, 0),
  };
}