import { analysisSchema, type Analysis } from "./analysis";
import { constraintSource, socialWorlds, type ConstraintSource, type HardConstraint, type SocialRelation } from "./socialWorlds";

export type TenWorldLayer = {
  id: number;
  label: string;
  prototype: string;
  description: string;
  relation: SocialRelation;
  relevance: number;
  viscosity: number;
  inertia: number;
  diagnosis: string;
  evidenceNeeded: string;
  constraints: Array<HardConstraint & { binding: boolean; sources: ConstraintSource[] }>;
  y: number;
  radius: number;
  color: number;
};

export type TenWorldsModel = {
  target: string;
  layers: TenWorldLayer[];
  primaryWorldID: number;
};

const palette = [0x854c37, 0x8f5f3e, 0x927047, 0x8b7e53, 0x748268, 0x5f8078, 0x527882, 0x496d82, 0x456276, 0x3f5869];

export function buildTenWorldsModel(input: Analysis): TenWorldsModel {
  const analysis = analysisSchema.parse(input);
  const assessments = new Map(analysis.worldAssessments.map((assessment) => [assessment.world, assessment]));
  const verticalGap = 1.08;
  const centerOffset = (socialWorlds.length - 1) * verticalGap / 2;
  const layers = socialWorlds.map((world, index) => {
    const assessment = assessments.get(world.id)!;
    const binding = new Set(assessment.bindingConstraintIDs);
    return {
      id: world.id,
      label: world.label,
      prototype: world.prototype,
      description: world.description,
      relation: assessment.relation,
      relevance: assessment.relevance,
      viscosity: assessment.viscosity,
      inertia: assessment.inertia,
      diagnosis: assessment.diagnosis,
      evidenceNeeded: assessment.evidenceNeeded,
      constraints: world.constraints.map((constraint) => ({
        ...constraint,
        binding: binding.has(constraint.id),
        sources: constraint.sourceIDs.flatMap((sourceID) => {
          const found = constraintSource(sourceID);
          return found ? [found] : [];
        }),
      })),
      y: index * verticalGap - centerOffset,
      radius: 2.65 + index * .1,
      color: palette[index],
    };
  });
  const primary = [...layers].sort((left, right) => right.relevance - left.relevance
    || Number(right.relation === "current") - Number(left.relation === "current")
    || left.id - right.id)[0];
  return { target: analysis.disablement?.target ?? analysis.title, layers, primaryWorldID: primary.id };
}