import * as THREE from "three";
import type { TenWorldsModel } from "./tenWorldsModel";
import { rejectedStageForRank, socialFeatureAxes, type SocialSortingModel } from "./socialSortingModel";

type VectorTrace = {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>;
  curve: THREE.CatmullRomCurve3;
  offset: number;
  rejected: boolean;
  speed: number;
};

type ResourcePacket = {
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  curve: THREE.CatmullRomCurve3;
  offset: number;
  speed: number;
};

export type SocialSortingArchitecture = {
  group: THREE.Group;
  traces: VectorTrace[];
  resourcePackets: ResourcePacket[];
  neuralNodes: THREE.Mesh[];
  evaporationFields: THREE.Points[];
  visibleVectors: number;
  visibleCrosses: number;
  feedbackLoops: number;
  connections: FlowConnection[];
};

export type FlowKind = "forward" | "rejected" | "resource" | "feedback";

export type FlowConnection = {
  world: number;
  kind: FlowKind;
  objects: THREE.Object3D[];
  baseOpacity: number;
};

const fract = (value: number) => value - Math.floor(value);
const noise = (seed: number) => fract(Math.sin(seed * 91.3458 + 12.345) * 47453.5453);

function featureValues(seed: number): number[] {
  return socialFeatureAxes.map((_, index) => noise(seed * 17 + index * 31));
}

function featurePosition(world: TenWorldsModel["layers"][number], featureIndex: number, yOffset = 0): THREE.Vector3 {
  const angle = -Math.PI / 2 + featureIndex * Math.PI * 2 / socialFeatureAxes.length + world.id * .11;
  const radius = world.radius * .5;
  return new THREE.Vector3(Math.cos(angle) * radius, world.y + yOffset, Math.sin(angle) * radius);
}

function lineSegments(points: THREE.Vector3[], color: number, opacity: number): THREE.LineSegments {
  return new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, vertexColors: false }),
  );
}

function curveConnection(group: THREE.Group, curve: THREE.CatmullRomCurve3, world: number, kind: FlowKind, color: number, opacity: number, dashed = false): FlowConnection {
  const material = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: .12, gapSize: .09, depthWrite: false })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)), material);
  if (dashed) line.computeLineDistances();
  const marker = new THREE.Mesh(
    new THREE.ConeGeometry(.065, .19, 10),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: Math.min(1, opacity * 1.8), depthWrite: false }),
  );
  const point = curve.getPointAt(.72);
  const tangent = curve.getTangentAt(.72).normalize();
  marker.position.copy(point);
  marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  line.userData = { worldID: world, flowKind: kind };
  marker.userData = { worldID: world, flowKind: kind };
  group.add(line, marker);
  return { world, kind, objects: [line, marker], baseOpacity: opacity };
}

function buildFunnelEnvelope(group: THREE.Group, worlds: TenWorldsModel): void {
  for (let meridian = 0; meridian < 20; meridian++) {
    const angle = meridian * Math.PI * 2 / 20;
    const points = worlds.layers.map((world) => new THREE.Vector3(
      Math.cos(angle) * (world.radius + .02),
      world.y,
      Math.sin(angle) * (world.radius + .02),
    ));
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: meridian % 4 === 0 ? 0x8a6541 : 0x9a896d, transparent: true, opacity: meridian % 4 === 0 ? .19 : .075, depthWrite: false }),
    );
    group.add(line);
  }
}

function buildFeedbackLoops(group: THREE.Group, worlds: TenWorldsModel, sorting: SocialSortingModel): FlowConnection[] {
  const connections: FlowConnection[] = [];
  for (let index = 0; index < worlds.layers.length; index++) {
    const world = worlds.layers[index];
    const side = index % 2 === 0 ? 1 : -1;
    const sourceFeature = socialFeatureAxes.findIndex((feature) => feature.id === sorting.stages[index].activeFeatures[0]);
    const targetFeature = socialFeatureAxes.findIndex((feature) => feature.id === sorting.stages[index].activeFeatures.at(-1));
    const curve = new THREE.CatmullRomCurve3([
      featurePosition(world, sourceFeature, .3),
      new THREE.Vector3(side * (world.radius + 1.1), world.y + .48, -1.15 + index * .08),
      new THREE.Vector3(side * (world.radius + 1.35), world.y - .36, 1.1 - index * .06),
      featurePosition(world, targetFeature, -.18),
    ], false, "centripetal");
    const connection = curveConnection(group, curve, world.id, "feedback", 0x7f5d43, .2, true);
    connection.objects.forEach((object) => { object.userData.feedbackAdjustment = sorting.stages[index].feedbackAdjustment; });
    connections.push(connection);
  }
  return connections;
}

function buildNeuralCrosses(group: THREE.Group, worlds: TenWorldsModel, sorting: SocialSortingModel): { nodes: THREE.Mesh[]; crosses: number; connections: FlowConnection[] } {
  const nodes: THREE.Mesh[] = [];
  const connections: FlowConnection[] = [];
  let crosses = 0;
  worlds.layers.forEach((world, worldIndex) => {
    const active = new Set(sorting.stages[worldIndex].activeFeatures);
    socialFeatureAxes.forEach((feature, featureIndex) => {
      const enabled = active.has(feature.id);
      const node = new THREE.Mesh(
        new THREE.OctahedronGeometry(enabled ? .085 : .048, 0),
        new THREE.MeshPhysicalMaterial({ color: feature.color, transparent: true, opacity: enabled ? .88 : .26, roughness: .4, metalness: .18, emissive: enabled ? feature.color : 0x000000, emissiveIntensity: enabled ? .12 : 0 }),
      );
      node.position.copy(featurePosition(world, featureIndex, .22));
      node.userData = { worldID: world.id, featureID: feature.id, active: enabled };
      group.add(node);
      nodes.push(node);
    });

    if (worldIndex === 0) return;
    const previous = worlds.layers[worldIndex - 1];
    const previousActive = sorting.stages[worldIndex - 1].activeFeatures;
    const currentActive = sorting.stages[worldIndex].activeFeatures;
    const points: THREE.Vector3[] = [];
    previousActive.forEach((sourceID, sourceOrder) => {
      currentActive.forEach((targetID, targetOrder) => {
        const sourceIndex = socialFeatureAxes.findIndex((feature) => feature.id === sourceID);
        const targetIndex = socialFeatureAxes.findIndex((feature) => feature.id === targetID);
        points.push(featurePosition(previous, sourceIndex, .22 + sourceOrder * .006), featurePosition(world, targetIndex, .22 + targetOrder * .006));
        crosses += 1;
      });
    });
    const opacity = .12 + sorting.stages[worldIndex].threshold / 900;
    const crossing = lineSegments(points, world.color, opacity);
    crossing.userData = { worldID: world.id, flowKind: "forward" };
    group.add(crossing);
    connections.push({ world: world.id, kind: "forward", objects: [crossing], baseOpacity: opacity });
    const forwardCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, previous.y + .25, 0),
      new THREE.Vector3(-.22 + worldIndex % 2 * .44, (previous.y + world.y) / 2, .18),
      new THREE.Vector3(0, world.y - .2, 0),
    ], false, "centripetal");
    connections.push(curveConnection(group, forwardCurve, world.id, "forward", 0x5f7f84, .42));
  });
  return { nodes, crosses, connections };
}

function buildOutcomeConnections(group: THREE.Group, worlds: TenWorldsModel): FlowConnection[] {
  const top = worlds.layers.at(-1)!.y + 1.6;
  return worlds.layers.flatMap((world, index) => {
    const angle = index * 2.39996 + world.id * .43;
    const rejectedCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(angle) * world.radius * .62, world.y, Math.sin(angle) * world.radius * .62),
      new THREE.Vector3(Math.cos(angle) * world.radius, world.y - .08, Math.sin(angle) * world.radius),
      new THREE.Vector3(Math.cos(angle) * (world.radius + 1.35), world.y - .4, Math.sin(angle) * (world.radius + 1.35)),
    ], false, "centripetal");
    const resourceCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(angle) * (world.radius + .62), world.y - .12, Math.sin(angle) * (world.radius + .62)),
      new THREE.Vector3(Math.cos(angle) * world.radius * .35, world.y + .25, Math.sin(angle) * world.radius * .35),
      new THREE.Vector3(0, world.y + .72, 0),
      new THREE.Vector3(0, top, 0),
    ], false, "centripetal");
    return [
      curveConnection(group, rejectedCurve, world.id, "rejected", 0xa25f43, .3),
      curveConnection(group, resourceCurve, world.id, "resource", 0xd09a3f, .28),
    ];
  });
}

function buildVectorTraces(group: THREE.Group, worlds: TenWorldsModel, sorting: SocialSortingModel): VectorTrace[] {
  const traces: VectorTrace[] = [];
  const visibleVectors = 64;
  const bottom = worlds.layers[0].y - 1.35;
  const top = worlds.layers.at(-1)!.y + 1.55;
  for (let index = 0; index < visibleVectors; index++) {
    const rank = Math.floor((index + .5) / visibleVectors * sorting.vectorCount);
    const rejectedAt = rejectedStageForRank(rank, sorting);
    const values = featureValues(index + 1);
    const dominantFeature = values.indexOf(Math.max(...values));
    const startAngle = noise(index * 3 + 2) * Math.PI * 2;
    const startRadius = .55 + Math.sqrt(noise(index * 7 + 4)) * (worlds.layers[0].radius - .75);
    const points = [new THREE.Vector3(Math.cos(startAngle) * startRadius, bottom, Math.sin(startAngle) * startRadius)];
    const lastPassed = rejectedAt === undefined ? worlds.layers.length : rejectedAt;
    for (let stageIndex = 0; stageIndex < lastPassed; stageIndex++) {
      const stage = sorting.stages[stageIndex];
      const weighted = stage.activeFeatures
        .map((id) => socialFeatureAxes.findIndex((feature) => feature.id === id))
        .sort((left, right) => values[right] - values[left])[0];
      const target = featurePosition(worlds.layers[stageIndex], weighted, -.18);
      target.x += (noise(index * 13 + stageIndex) - .5) * .26;
      target.z += (noise(index * 19 + stageIndex) - .5) * .26;
      points.push(target);
    }
    if (rejectedAt === undefined) {
      points.push(new THREE.Vector3((noise(index + 81) - .5) * .3, top, (noise(index + 91) - .5) * .3));
    } else {
      const world = worlds.layers[rejectedAt];
      const exitAngle = startAngle + rejectedAt * .73;
      points.push(
        new THREE.Vector3(Math.cos(exitAngle) * world.radius * .74, world.y + .05, Math.sin(exitAngle) * world.radius * .74),
        new THREE.Vector3(Math.cos(exitAngle) * (world.radius + 1.25), world.y - .18, Math.sin(exitAngle) * (world.radius + 1.25)),
      );
    }
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(.055 + values[dominantFeature] * .045, 0),
      new THREE.MeshPhysicalMaterial({ color: socialFeatureAxes[dominantFeature].color, transparent: true, opacity: .9, roughness: .3, metalness: .24, emissive: socialFeatureAxes[dominantFeature].color, emissiveIntensity: .18 }),
    );
    mesh.userData = { vectorID: index, dimensions: socialFeatureAxes.length, rejectedAt: rejectedAt === undefined ? 0 : rejectedAt + 1 };
    group.add(mesh);
    traces.push({ mesh, curve, offset: noise(index * 29 + 3), rejected: rejectedAt !== undefined, speed: .000022 + noise(index * 37) * .000014 });
  }
  return traces;
}

function buildEvaporation(group: THREE.Group, worlds: TenWorldsModel, sorting: SocialSortingModel): THREE.Points[] {
  return worlds.layers.map((world, stageIndex) => {
    const count = Math.max(5, Math.min(24, sorting.stages[stageIndex].evaporated));
    const positions: number[] = [];
    for (let index = 0; index < count; index++) {
      const angle = noise(stageIndex * 71 + index) * Math.PI * 2;
      const radius = world.radius + .55 + noise(stageIndex * 89 + index) * 1.4;
      positions.push(Math.cos(angle) * radius, world.y + (noise(index * 11 + stageIndex) - .5) * .42, Math.sin(angle) * radius);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const field = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x9a674b, size: .055, transparent: true, opacity: .28, depthWrite: false }));
    field.userData = { baseY: world.y, drift: .00003 + stageIndex * .000002 };
    group.add(field);
    return field;
  });
}

function resourceCurve(world: TenWorldsModel["layers"][number], top: number, index: number): THREE.CatmullRomCurve3 {
  const angle = index * 2.39996 + world.id * .43;
  const originRadius = world.radius + .75;
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(Math.cos(angle) * originRadius, world.y - .12, Math.sin(angle) * originRadius),
    new THREE.Vector3(Math.cos(angle) * world.radius * .48, world.y + .16, Math.sin(angle) * world.radius * .48),
    new THREE.Vector3(Math.sin(angle * 1.7) * .38, world.y + .62, Math.cos(angle * 1.7) * .38),
    new THREE.Vector3(Math.sin(angle) * .2, top, Math.cos(angle) * .2),
  ], false, "centripetal");
}

function buildResourceUpflow(group: THREE.Group, worlds: TenWorldsModel, sorting: SocialSortingModel): ResourcePacket[] {
  const packets: ResourcePacket[] = [];
  const top = worlds.layers.at(-1)!.y + 1.6;
  for (let index = 0; index < 28; index++) {
    const stageIndex = index % sorting.stages.length;
    const curve = resourceCurve(worlds.layers[stageIndex], top, index);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(.045 + stageIndex * .003, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xd7a34b, emissive: 0x9d6227, emissiveIntensity: .48, roughness: .24, metalness: .42, transparent: true, opacity: .94 }),
    );
    mesh.userData = { sourceWorld: stageIndex + 1, resourceYield: sorting.stages[stageIndex].resourceYield };
    group.add(mesh);
    packets.push({ mesh, curve, offset: noise(index * 43 + 8), speed: .000032 + stageIndex * .0000015 });
  }
  const reservoir = new THREE.Mesh(
    new THREE.IcosahedronGeometry(.34, 2),
    new THREE.MeshPhysicalMaterial({ color: 0xd2a04c, emissive: 0x8d5423, emissiveIntensity: .5, roughness: .26, metalness: .48, transparent: true, opacity: .9 }),
  );
  reservoir.position.y = top + .08;
  reservoir.userData = { resourceReservoir: true };
  group.add(reservoir);
  return packets;
}

export function buildSocialSortingArchitecture(scene: THREE.Scene, worlds: TenWorldsModel, sorting: SocialSortingModel): SocialSortingArchitecture {
  const group = new THREE.Group();
  group.name = "social-sorting-network";
  scene.add(group);
  buildFunnelEnvelope(group, worlds);
  const feedbackConnections = buildFeedbackLoops(group, worlds, sorting);
  const neural = buildNeuralCrosses(group, worlds, sorting);
  const outcomeConnections = buildOutcomeConnections(group, worlds);
  const traces = buildVectorTraces(group, worlds, sorting);
  const evaporationFields = buildEvaporation(group, worlds, sorting);
  const resourcePackets = buildResourceUpflow(group, worlds, sorting);
  const connections = [...neural.connections, ...outcomeConnections, ...feedbackConnections];
  return { group, traces, resourcePackets, neuralNodes: neural.nodes, evaporationFields, visibleVectors: traces.length, visibleCrosses: neural.crosses, feedbackLoops: feedbackConnections.length, connections };
}

function setObjectOpacity(object: THREE.Object3D, opacity: number): void {
  const renderable = object as THREE.Mesh;
  const materials = Array.isArray(renderable.material) ? renderable.material : renderable.material ? [renderable.material] : [];
  materials.forEach((material) => {
    material.transparent = true;
    material.opacity = Math.min(1, opacity);
  });
}

export function applySocialSortingFocus(architecture: SocialSortingArchitecture, selectedWorldID: number): number {
  let focusedConnections = 0;
  architecture.connections.forEach((connection) => {
    const active = connection.world === selectedWorldID;
    if (active) focusedConnections += 1;
    connection.objects.forEach((object) => setObjectOpacity(object, connection.baseOpacity * (active ? 2.7 : .24)));
  });
  architecture.neuralNodes.forEach((node) => {
    const active = node.userData.worldID === selectedWorldID;
    node.userData.focused = active;
    setObjectOpacity(node, node.userData.active ? (active ? 1 : .16) : (active ? .42 : .08));
    node.scale.setScalar(active ? 1.45 : .72);
  });
  architecture.evaporationFields.forEach((field, index) => setObjectOpacity(field, index + 1 === selectedWorldID ? .48 : .07));
  return focusedConnections;
}

export function animateSocialSorting(architecture: SocialSortingArchitecture, now: number): void {
  architecture.traces.forEach((trace) => {
    const progress = (now * trace.speed + trace.offset) % 1;
    trace.mesh.position.copy(trace.curve.getPointAt(progress));
    trace.mesh.rotation.x += .006;
    trace.mesh.rotation.y += .009;
    const fade = trace.rejected && progress > .78 ? Math.max(0, (1 - progress) / .22) : 1;
    trace.mesh.material.opacity = .9 * fade;
    trace.mesh.scale.setScalar(.55 + fade * .45);
  });
  architecture.resourcePackets.forEach((packet) => {
    const progress = (now * packet.speed + packet.offset) % 1;
    packet.mesh.position.copy(packet.curve.getPointAt(progress));
    const pulse = .82 + Math.sin(now * .006 + packet.offset * 12) * .18;
    packet.mesh.scale.setScalar(pulse);
  });
  architecture.neuralNodes.forEach((node, index) => {
    const pulse = node.userData.active ? 1 + Math.sin(now * .003 + index) * .14 : 1;
    node.scale.setScalar((node.userData.focused ? 1.45 : .72) * pulse);
  });
  architecture.evaporationFields.forEach((field, index) => {
    field.rotation.y = now * Number(field.userData.drift) * (index % 2 ? -1 : 1);
  });
}