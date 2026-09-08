import { describe, expect, it } from "vitest";
import { fixedWorldLayers } from "./analysis";
import { worldDossiers } from "./worldDossiers";

describe("worldDossiers", () => {
  it("covers every fixed facet with mechanisms and audit questions", () => {
    const facets = fixedWorldLayers.flatMap((layer) => layer.facets);

    expect(Object.keys(worldDossiers).sort()).toEqual(facets.map((facet) => facet.id).sort());
    expect(Object.values(worldDossiers).every((item) => item.mechanisms.length >= 3)).toBe(true);
    expect(Object.values(worldDossiers).every((item) => item.auditQuestions.length >= 2)).toBe(true);
  });

  it("grounds state and global facets in official HTTPS sources", () => {
    const institutional = fixedWorldLayers
      .filter((layer) => layer.domain === "state" || layer.domain === "global")
      .flatMap((layer) => layer.facets);

    expect(institutional.every((facet) => worldDossiers[facet.id].sources.length >= 1)).toBe(true);
    expect(institutional.flatMap((facet) => worldDossiers[facet.id].sources).every((item) => item.url.startsWith("https://"))).toBe(true);
  });
});