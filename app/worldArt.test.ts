import { describe, expect, it } from "vitest";
import { worldArt, worldArtOrder } from "./worldArt";

describe("worldArt", () => {
  it("assigns one named instrument and material meaning to each world layer", () => {
    expect(worldArtOrder).toEqual(["personal", "organization", "norm", "state", "global"]);
    expect(new Set(worldArtOrder.map((domain) => worldArt[domain].metaphor)).size).toBe(5);
    expect(new Set(worldArtOrder.map((domain) => worldArt[domain].color)).size).toBe(5);
    expect(worldArtOrder.every((domain) => worldArt[domain].material.length > 2 && worldArt[domain].colorMeaning.length > 6)).toBe(true);
  });
});