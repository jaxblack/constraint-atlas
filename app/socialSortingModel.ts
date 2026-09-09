import { analysisSchema, type Analysis } from "./analysis";

export const socialFeatureAxes = [
  { id: "cash", label: "现金流", color: 0xb76c3c },
  { id: "credential", label: "学历履历", color: 0x8a7652 },
  { id: "geography", label: "地域身份", color: 0x567783 },
  { id: "network", label: "关系信用", color: 0x9a603f },
  { id: "health", label: "健康时间", color: 0x687e64 },
  { id: "ownership", label: "所有权", color: 0x465f78 },
  { id: "compliance", label: "法律资格", color: 0x73594d },
  { id: "information", label: "信息技术", color: 0x9b844c },
] as const;

export type SocialFeatureID = typeof socialFeatureAxes[number]["id"];

export type SortingStage = {
  world: number;
  input: number;
  passed: number;
  filtered: number;
  evaporated: number;
  threshold: number;
  feedbackAdjustment: number;
  resourceYield: number;
  cumulativeResource: number;
  activeFeatures: SocialFeatureID[];
};

export type SocialSortingModel = {
  vectorCount: number;
  dimensions: number;
  crossCount: number;
  finalSurvivors: number;
  totalFiltered: number;
  resourceUpflow: number;
  feedbackCount: number;
  stages: SortingStage[];
};

const stageFeatures: SocialFeatureID[][] = [
  ["cash", "health", "geography", "information"],
  ["geography", "credential", "cash", "information"],
  ["network", "geography", "information", "credential"],
  ["ownership", "network", "compliance", "cash"],
  ["credential", "cash", "information", "health"],
  ["geography", "credential", "compliance", "cash"],
  ["ownership", "network", "cash", "information"],
  ["compliance", "geography", "cash", "credential"],
  ["ownership", "network", "compliance", "information"],
  ["ownership", "compliance", "information", "geography"],
];

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export function buildSocialSortingModel(input: Analysis): SocialSortingModel {
  const analysis = analysisSchema.parse(input);
  const feedbackAdjustments = analysis.worldAssessments.map((assessment, index) => {
    const priorCyclePressure = assessment.viscosity * .45 + assessment.relevance * .35 + (100 - assessment.inertia) * .2;
    const priorCycleRetention = clamp(.9 - priorCyclePressure * .00225 - index * .012, .52, .82);
    return Math.round(clamp((1 - priorCycleRetention) * 12 + index * .2, 2, 8));
  });
  let population = 128;
  let cumulativeResource = 0;
  let crossCount = 0;

  const stages = analysis.worldAssessments.map((assessment, index) => {
    const pressure = assessment.viscosity * .45 + assessment.relevance * .35 + (100 - assessment.inertia) * .2;
    const feedbackAdjustment = feedbackAdjustments[index];
    const threshold = Math.round(clamp(34 + pressure * .5 + index * 1.4 + feedbackAdjustment, 38, 92));
    const retention = clamp(.9 - pressure * .00225 - index * .012, .52, .82);
    const futureFilters = analysis.worldAssessments.length - index - 1;
    const maximumPassed = Math.max(1, population - 1);
    const minimumPassed = Math.min(maximumPassed, futureFilters + 1);
    const passed = Math.min(maximumPassed, Math.max(minimumPassed, Math.floor(population * retention)));
    const filtered = population - passed;
    const evaporated = Math.min(filtered, Math.round(filtered * clamp(.28 + pressure * .004, .34, .68)));
    const resourceYield = Math.round(filtered * (.32 + index * .1) * (.72 + assessment.inertia / 180));
    cumulativeResource += resourceYield;
    crossCount += population * stageFeatures[index].length;
    const stage: SortingStage = {
      world: assessment.world,
      input: population,
      passed,
      filtered,
      evaporated,
      threshold,
      feedbackAdjustment,
      resourceYield,
      cumulativeResource,
      activeFeatures: stageFeatures[index],
    };
    population = passed;
    return stage;
  });

  return {
    vectorCount: 128,
    dimensions: socialFeatureAxes.length,
    crossCount,
    finalSurvivors: population,
    totalFiltered: 128 - population,
    resourceUpflow: cumulativeResource,
      feedbackCount: analysis.worldAssessments.length,
    stages,
  };
}

export function rejectedStageForRank(rank: number, sorting: SocialSortingModel): number | undefined {
  const stageIndex = sorting.stages.findIndex((stage) => rank >= stage.passed);
  return stageIndex < 0 ? undefined : stageIndex;
}