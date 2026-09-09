import { describe, expect, it } from "vitest";
import { constraintSources, socialWorlds } from "./socialWorlds";

describe("socialWorlds", () => {
  it("defines ten ordered social worlds with distinct hard constraints", () => {
    expect(socialWorlds.map((world) => world.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(socialWorlds.every((world) => world.constraints.length >= 3)).toBe(true);
    const ids = socialWorlds.flatMap((world) => world.constraints.map((constraint) => constraint.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps viscosity descending and inertia ascending across the model", () => {
    expect(socialWorlds.every((world, index) => index === 0 || world.defaultViscosity < socialWorlds[index - 1].defaultViscosity)).toBe(true);
    expect(socialWorlds.every((world, index) => index === 0 || world.defaultInertia > socialWorlds[index - 1].defaultInertia)).toBe(true);
  });

  it("resolves every declared source to an official HTTPS entry", () => {
    const sourceIDs = new Set(constraintSources.map((source) => source.id));
    const declared = socialWorlds.flatMap((world) => world.constraints.flatMap((constraint) => constraint.sourceIDs));
    expect(declared.every((id) => sourceIDs.has(id))).toBe(true);
    expect(constraintSources.every((source) => source.url.startsWith("https://"))).toBe(true);
  });
});