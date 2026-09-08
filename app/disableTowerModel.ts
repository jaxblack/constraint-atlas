import { analysisSchema, type Analysis } from "./analysis";

export type TowerNode = {
  id: string;
  label: string;
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
};

export type TowerLayer = {
  id: number;
  label: string;
  description: string;
  share: number;
  ceilingStrength: number;
  y: number;
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

const colors = [0xc45d3c, 0x66797e, 0xb18435, 0x4b7890, 0x3f7f5a, 0x755c8e];
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
  const centerOffset = (analysis.layers.length - 1) * .82;
  const layers = analysis.layers.map((layer, layerIndex) => {
    const nodes = analysis.nodes.filter((node) => node.layer === layer.id);
    const share = nodes.reduce((sum, node) => sum + node.contribution, 0);
    const causal = nodes.filter((node) => node.contribution > 0);
    const ceilingStrength = causal.length === 0 ? .08 : causal.reduce((sum, node) => sum + hardness[node.disableState] * node.contribution, 0) / share;
    const facets = layer.facets.map((facet, facetIndex) => ({
      ...facet,
      share: nodes.filter((node) => node.facet === facet.id).reduce((sum, node) => sum + node.contribution, 0),
      x: facetPositions[facetIndex][0],
      z: facetPositions[facetIndex][1],
    }));
    return {
      id: layer.id,
      label: layer.label,
      description: layer.description,
      share,
      ceilingStrength,
      y: layerIndex * 1.64 - centerOffset,
      color: colors[layerIndex % colors.length],
      facets,
      nodes: nodes.map((node) => {
        const facetIndex = Math.max(0, facets.findIndex((facet) => facet.id === node.facet));
        const siblingIndex = nodes.filter((candidate) => candidate.facet === node.facet).findIndex((candidate) => candidate.id === node.id);
        return {
          id: node.id,
          label: node.label,
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