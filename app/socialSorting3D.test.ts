import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { buildFallback } from "./analysis";
import { applySocialSortingFocus, buildSocialSortingArchitecture } from "./socialSorting3D";
import { buildSocialSortingModel } from "./socialSortingModel";
import { buildTenWorldsModel } from "./tenWorldsModel";

describe("social sorting 3D architecture", () => {
  it("binds four directed connection kinds to every world and focuses one layer", () => {
    const analysis = buildFallback("我想理解每层社会筛选如何连接并反复作用。 ");
    const worlds = buildTenWorldsModel(analysis);
    const sorting = buildSocialSortingModel(analysis);
    const architecture = buildSocialSortingArchitecture(new THREE.Scene(), worlds, sorting);

    expect(new Set(architecture.connections.map((connection) => connection.kind))).toEqual(new Set(["forward", "rejected", "resource", "feedback"]));
    expect(worlds.layers.every((world) => {
      const kinds = new Set(architecture.connections.filter((connection) => connection.world === world.id).map((connection) => connection.kind));
      return kinds.has("rejected") && kinds.has("resource") && kinds.has("feedback") && (world.id === 1 || kinds.has("forward"));
    })).toBe(true);

    const focusedCount = applySocialSortingFocus(architecture, 5);
    const focused = architecture.connections.find((connection) => connection.world === 5)!;
    const muted = architecture.connections.find((connection) => connection.world === 6)!;
    const opacity = (connection: typeof focused) => (connection.objects[0] as THREE.Line).material as THREE.Material;

    expect(focusedCount).toBeGreaterThanOrEqual(4);
    expect(opacity(focused).opacity).toBeGreaterThan(opacity(muted).opacity);
    expect(architecture.neuralNodes.filter((node) => node.userData.worldID === 5).every((node) => node.userData.focused)).toBe(true);
  });
});