import type { Analysis } from "./analysis";

type WorldDomain = Analysis["layers"][number]["domain"];

export type WorldArtSpec = {
  latin: string;
  metaphor: string;
  material: string;
  colorMeaning: string;
  color: number;
  accent: number;
};

export const worldArt: Record<WorldDomain, WorldArtSpec> = {
  personal: { latin: "CORPUS", metaphor: "生命刻度", material: "红粉笔", colorMeaning: "血肉、体温与人的有限性", color: 0x9c4936, accent: 0xc98262 },
  organization: { latin: "OFFICINA", metaphor: "共同工作", material: "赭石木构", colorMeaning: "建造、分工与共享资源", color: 0x8c6b37, accent: 0xc5a25c },
  norm: { latin: "TEXTURA", metaphor: "社会织网", material: "石墨墨线", colorMeaning: "习俗、声誉与无形约束", color: 0x59625b, accent: 0x8e9a81 },
  state: { latin: "FORUM", metaphor: "法权门廊", material: "青金蓝图", colorMeaning: "成文法、边界与公共秩序", color: 0x365d72, accent: 0x7595a5 },
  global: { latin: "ORBIS", metaphor: "世界浑天仪", material: "铜绿地图", colorMeaning: "地球、交换网络与跨境系统", color: 0x2f6d64, accent: 0x72a095 },
};

export const worldArtOrder: WorldDomain[] = ["personal", "organization", "norm", "state", "global"];