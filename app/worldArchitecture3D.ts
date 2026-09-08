import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { DisableTowerModel, TowerFacet, TowerLayer } from "./disableTowerModel";
import { worldArt } from "./worldArt";

export type FacetVisual = {
  layerID: number;
  meshes: THREE.Mesh[];
  label: CSS2DObject;
  anchor: THREE.Vector3;
  halo: THREE.Mesh;
};

export type LayerVisual = { meshes: THREE.Mesh[] };

export type WorldArchitecture = {
  clickable: THREE.Object3D[];
  facets: Map<string, FacetVisual>;
  layers: Map<number, LayerVisual>;
  targetPoints: THREE.Vector3[];
  primaryFacetID: string;
};

type BuildContext = WorldArchitecture & { scene: THREE.Scene };

function material(color: number, opacity: number, roughness = .62): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness, metalness: .08, clearcoat: .28, side: THREE.DoubleSide });
}

function mesh(geometry: THREE.BufferGeometry, color: number, opacity: number, roughness = .62): THREE.Mesh {
  const object = new THREE.Mesh(geometry, material(color, opacity, roughness));
  object.userData.baseOpacity = opacity;
  return object;
}

function identify(object: THREE.Object3D, layerID: number, facetID?: string): void {
  object.userData.layerID = layerID;
  if (facetID) object.userData.facetID = facetID;
}

function hitMesh(geometry: THREE.BufferGeometry): THREE.Mesh {
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false, side: THREE.DoubleSide }));
}

function addHitTarget(ctx: BuildContext, parent: THREE.Object3D, target: THREE.Mesh, layerID: number, facetID: string): void {
  identify(target, layerID, facetID);
  parent.add(target);
  ctx.clickable.push(target);
}

function outline(parent: THREE.Object3D, object: THREE.Mesh, color: number, opacity = .72): void {
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(object.geometry, 18), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  edges.position.copy(object.position);
  edges.rotation.copy(object.rotation);
  edges.scale.copy(object.scale);
  parent.add(edges);
}

function tube(points: THREE.Vector3[], color: number, radius = .035, opacity = .78, closed = false): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
  return mesh(new THREE.TubeGeometry(curve, Math.max(20, points.length * 6), radius, 8, closed), color, opacity, .48);
}

function polygonPoints(radius: number, y: number, sides: number, rotation = -Math.PI / 2): THREE.Vector3[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + index * Math.PI * 2 / sides;
    return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  });
}

function lineLoop(points: THREE.Vector3[], color: number, opacity = .62): THREE.LineLoop {
  return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

function labelObject(text: string, color: number, kind: "layer" | "facet"): CSS2DObject {
  const element = document.createElement("span");
  element.className = `world-3d-label world-3d-label--${kind}`;
  element.textContent = text;
  element.style.setProperty("--label-color", `#${color.toString(16).padStart(6, "0")}`);
  const label = new CSS2DObject(element);
  label.center.set(.5, .5);
  return label;
}

function layerTitle(layer: TowerLayer): CSS2DObject {
  const art = worldArt[layer.domain];
  return labelObject(`${art.latin} · ${layer.label}`, art.color, "layer");
}

function facetLabel(layer: TowerLayer, facet: TowerFacet, anchor: THREE.Vector3): CSS2DObject {
  const art = worldArt[layer.domain];
  const label = labelObject(`${facet.label} ${facet.share}%`, art.color, "facet");
  label.position.copy(anchor).add(new THREE.Vector3(0, .3, 0));
  identify(label, layer.id, facet.id);
  return label;
}

function registerFacet(ctx: BuildContext, layer: TowerLayer, facet: TowerFacet, meshes: THREE.Mesh[], anchor: THREE.Vector3): void {
  const label = facetLabel(layer, facet, anchor);
  label.visible = false;
  ctx.scene.add(label);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(.25, .022, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xc88a36, transparent: true, opacity: 0, depthTest: false }),
  );
  halo.position.copy(anchor).add(new THREE.Vector3(0, .05, 0));
  halo.rotation.x = Math.PI / 2;
  halo.visible = false;
  halo.renderOrder = 18;
  ctx.scene.add(halo);
  for (const object of meshes) {
    identify(object, layer.id, facet.id);
    ctx.clickable.push(object);
  }
  ctx.clickable.push(label);
  ctx.facets.set(facet.id, { layerID: layer.id, meshes, label, anchor, halo });
}

function buildCorpus(ctx: BuildContext, layer: TowerLayer): THREE.Mesh[] {
  const art = worldArt.personal;
  const group = new THREE.Group();
  ctx.scene.add(group);
  const base = mesh(new THREE.CylinderGeometry(2.85, 2.95, .1, 64), art.color, .16);
  base.position.y = layer.y;
  identify(base, layer.id);
  group.add(base);
  ctx.clickable.push(base);
  outline(group, base, art.color, .78);

  const radii = [.48, .86, 1.27, 1.72, 2.22];
  layer.facets.forEach((facet, index) => {
    const ring = mesh(new THREE.RingGeometry(radii[index] - .13, radii[index] + .13, 72), art.color, facet.share > 0 ? .52 : .23, .72);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = layer.y + .07 + index * .004;
    group.add(ring);
    const hit = hitMesh(new THREE.RingGeometry(radii[index] - .18, radii[index] + .18, 72));
    hit.rotation.copy(ring.rotation);
    hit.position.copy(ring.position).add(new THREE.Vector3(0, .025, 0));
    addHitTarget(ctx, group, hit, layer.id, facet.id);
    const angle = -.88 + index * .42;
    const anchor = new THREE.Vector3(Math.cos(angle) * radii[index], layer.y + .12, Math.sin(angle) * radii[index]);
    registerFacet(ctx, layer, facet, [ring], anchor);
  });

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(2.62, 36, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: art.accent, wireframe: true, transparent: true, opacity: .08 + layer.ceilingStrength * .12 }),
  );
  dome.position.y = layer.y + .08;
  dome.scale.y = .47;
  group.add(dome);

  const figureCenterY = layer.y + .72;
  const proportionCircle = lineLoop(Array.from({ length: 64 }, (_, index) => {
    const angle = index * Math.PI * 2 / 64;
    return new THREE.Vector3(Math.cos(angle) * .7, figureCenterY + Math.sin(angle) * .7, 0);
  }), art.accent, .52);
  const proportionSquare = lineLoop([
    new THREE.Vector3(-.58, layer.y + .08, 0), new THREE.Vector3(.58, layer.y + .08, 0),
    new THREE.Vector3(.58, layer.y + 1.35, 0), new THREE.Vector3(-.58, layer.y + 1.35, 0),
  ], art.color, .46);
  const body = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, layer.y + 1.17, .01), new THREE.Vector3(0, layer.y + .48, .01),
    new THREE.Vector3(-.58, layer.y + .96, .01), new THREE.Vector3(.58, layer.y + .96, .01),
    new THREE.Vector3(-.48, layer.y + .8, .01), new THREE.Vector3(.48, layer.y + .8, .01),
    new THREE.Vector3(0, layer.y + .5, .01), new THREE.Vector3(-.43, layer.y + .08, .01),
    new THREE.Vector3(0, layer.y + .5, .01), new THREE.Vector3(.43, layer.y + .08, .01),
    new THREE.Vector3(0, layer.y + .5, .01), new THREE.Vector3(-.62, layer.y + .24, .01),
    new THREE.Vector3(0, layer.y + .5, .01), new THREE.Vector3(.62, layer.y + .24, .01),
  ]), new THREE.LineBasicMaterial({ color: art.color, transparent: true, opacity: .78 }));
  const head = new THREE.Mesh(new THREE.TorusGeometry(.11, .018, 8, 32), new THREE.MeshBasicMaterial({ color: art.color, transparent: true, opacity: .82 }));
  head.position.set(0, layer.y + 1.27, .01);
  group.add(proportionCircle, proportionSquare, body, head);

  const title = layerTitle(layer);
  title.position.set(-2.1, layer.y + .38, 2.62);
  group.add(title);
  return [base];
}

function buildOfficina(ctx: BuildContext, layer: TowerLayer): THREE.Mesh[] {
  const art = worldArt.organization;
  const group = new THREE.Group();
  ctx.scene.add(group);
  const base = mesh(new THREE.CylinderGeometry(3.15, 3.32, .12, 5), art.color, .18);
  base.position.y = layer.y;
  identify(base, layer.id);
  group.add(base);
  ctx.clickable.push(base);
  outline(group, base, art.color, .8);
  const anchors = polygonPoints(2.18, layer.y, 5);
  const roof = polygonPoints(2.22, layer.y + 1.14, 5);
  group.add(lineLoop(roof, art.accent, .68));
  group.add(lineLoop(polygonPoints(1.18, layer.y + .15, 5), art.color, .48));

  layer.facets.forEach((facet, index) => {
    const column = mesh(new THREE.CylinderGeometry(.13, .18, .82, 18), art.color, facet.share > 0 ? .82 : .46, .52);
    column.position.copy(anchors[index]).add(new THREE.Vector3(0, .48, 0));
    const capital = mesh(new THREE.CylinderGeometry(.25, .19, .09, 18), art.accent, facet.share > 0 ? .86 : .5, .42);
    capital.position.copy(anchors[index]).add(new THREE.Vector3(0, .92, 0));
    group.add(column, capital);
    const hit = hitMesh(new THREE.CylinderGeometry(.34, .4, 1.08, 16));
    hit.position.copy(anchors[index]).add(new THREE.Vector3(0, .56, 0));
    addHitTarget(ctx, group, hit, layer.id, facet.id);
    const beam = tube([anchors[index].clone().setY(layer.y + .96), roof[index].clone(), new THREE.Vector3(0, layer.y + 1.14, 0)], art.accent, .025, .55);
    group.add(beam);
    const responsibility = new THREE.Line(new THREE.BufferGeometry().setFromPoints([anchors[index].clone().setY(layer.y + .13), new THREE.Vector3(0, layer.y + .13, 0)]), new THREE.LineDashedMaterial({ color: art.color, transparent: true, opacity: .44, dashSize: .09, gapSize: .06 }));
    responsibility.computeLineDistances();
    group.add(responsibility);
    const seat = mesh(new THREE.CylinderGeometry(.24, .28, .09, 16), art.accent, .42, .68);
    seat.position.copy(anchors[index]).multiplyScalar(.64).setY(layer.y + .12);
    group.add(seat);
    registerFacet(ctx, layer, facet, [column, capital, beam], anchors[index].clone().setY(layer.y + .98));
  });

  const council = mesh(new THREE.CylinderGeometry(.7, .76, .08, 24), art.accent, .34);
  council.position.y = layer.y + .13;
  group.add(council);
  const title = layerTitle(layer);
  title.position.set(-2.25, layer.y + .34, 2.7);
  group.add(title);
  return [base, council];
}

function buildTextura(ctx: BuildContext, layer: TowerLayer): THREE.Mesh[] {
  const art = worldArt.norm;
  const group = new THREE.Group();
  ctx.scene.add(group);
  const base = mesh(new THREE.CylinderGeometry(3.38, 3.48, .08, 20), art.color, .1);
  base.position.y = layer.y;
  identify(base, layer.id);
  group.add(base);
  ctx.clickable.push(base);
  outline(group, base, art.color, .6);
  const anchors = polygonPoints(2.55, layer.y + .17, 5, -Math.PI / 2 + .12);
  const canopy = polygonPoints(2.76, layer.y + 1.06, 10, -Math.PI / 2 + .12);
  group.add(lineLoop(canopy, art.accent, .58));

  for (let index = -4; index <= 4; index++) {
    const offset = index * .48;
    const warp = Array.from({ length: 9 }, (_, pointIndex) => {
      const z = -2.2 + pointIndex * .55;
      return new THREE.Vector3(offset, layer.y + .09 + (pointIndex % 2) * .025, z);
    });
    const weft = Array.from({ length: 9 }, (_, pointIndex) => {
      const x = -2.2 + pointIndex * .55;
      return new THREE.Vector3(x, layer.y + .105 + ((pointIndex + index) % 2) * .025, offset);
    });
    group.add(tube(warp, art.color, .009, .2), tube(weft, art.accent, .009, .18));
  }

  layer.facets.forEach((facet, index) => {
    const start = anchors[index];
    const end = anchors[(index + 2) % anchors.length];
    const ribbon = tube([start, new THREE.Vector3(start.x * .34, layer.y + .24 + (index % 2) * .09, start.z * .34), new THREE.Vector3(end.x * .34, layer.y + .2 + ((index + 1) % 2) * .09, end.z * .34), end], art.color, .055, facet.share > 0 ? .8 : .4);
    group.add(ribbon);
    const knot = mesh(new THREE.TorusGeometry(.2, .055, 10, 30), art.accent, facet.share > 0 ? .9 : .48, .4);
    knot.position.copy(start);
    knot.rotation.x = Math.PI / 2;
    group.add(knot);
    const hit = hitMesh(new THREE.SphereGeometry(.38, 16, 10));
    hit.position.copy(start).add(new THREE.Vector3(0, .12, 0));
    addHitTarget(ctx, group, hit, layer.id, facet.id);
    const tension = tube([start, new THREE.Vector3(start.x * 1.04, layer.y + .68, start.z * 1.04), canopy[index * 2]], art.accent, .018, .4);
    group.add(tension);
    registerFacet(ctx, layer, facet, [ribbon, knot], start.clone().setY(layer.y + .42));
  });

  const title = layerTitle(layer);
  title.position.set(-2.45, layer.y + .36, 2.85);
  group.add(title);
  return [base];
}

function archCurve(centerX: number, y: number, z: number): THREE.Vector3[] {
  return Array.from({ length: 17 }, (_, index) => {
    const angle = Math.PI - index * Math.PI / 16;
    return new THREE.Vector3(centerX + Math.cos(angle) * .43, y + .62 + Math.sin(angle) * .43, z);
  });
}

function buildForum(ctx: BuildContext, layer: TowerLayer): THREE.Mesh[] {
  const art = worldArt.state;
  const group = new THREE.Group();
  ctx.scene.add(group);
  const lower = mesh(new THREE.BoxGeometry(7.35, .1, 3.05), art.color, .15);
  lower.position.y = layer.y;
  identify(lower, layer.id);
  group.add(lower);
  ctx.clickable.push(lower);
  outline(group, lower, art.color, .75);
  const step = mesh(new THREE.BoxGeometry(6.75, .08, 2.65), art.accent, .13);
  step.position.y = layer.y + .09;
  group.add(step);
  const upperStep = mesh(new THREE.BoxGeometry(6.15, .07, 2.28), art.color, .12);
  upperStep.position.y = layer.y + .17;
  group.add(upperStep);
  const xPositions = [-2.5, -1.25, 0, 1.25, 2.5];

  layer.facets.forEach((facet, index) => {
    const left = mesh(new THREE.CylinderGeometry(.075, .11, .6, 16), art.color, facet.share > 0 ? .82 : .45, .48);
    const right = left.clone();
    left.material = (left.material as THREE.Material).clone();
    right.material = (right.material as THREE.Material).clone();
    left.position.set(xPositions[index] - .43, layer.y + .46, 0);
    right.position.set(xPositions[index] + .43, layer.y + .46, 0);
    const arch = tube(archCurve(xPositions[index], layer.y, 0), art.color, .055, facet.share > 0 ? .86 : .46);
    group.add(left, right, arch);
    const hit = hitMesh(new THREE.PlaneGeometry(1.08, 1.22));
    hit.position.set(xPositions[index], layer.y + .67, .03);
    addHitTarget(ctx, group, hit, layer.id, facet.id);
    registerFacet(ctx, layer, facet, [left, right, arch], new THREE.Vector3(xPositions[index], layer.y + 1.17, 0));
  });

  const entablature = mesh(new THREE.BoxGeometry(7.05, .13, .3), art.accent, .42, .42);
  entablature.position.set(0, layer.y + 1.18, 0);
  group.add(entablature);
  const pediment = tube([
    new THREE.Vector3(-3.18, layer.y + 1.26, 0),
    new THREE.Vector3(0, layer.y + 1.58, 0),
    new THREE.Vector3(3.18, layer.y + 1.26, 0),
  ], art.accent, .035, .62);
  const seal = new THREE.Mesh(new THREE.TorusGeometry(.18, .025, 8, 32), new THREE.MeshBasicMaterial({ color: art.color, transparent: true, opacity: .72 }));
  seal.position.set(0, layer.y + 1.39, .02);
  group.add(pediment, seal);
  const title = layerTitle(layer);
  title.position.set(-2.62, layer.y + .34, 1.8);
  group.add(title);
  return [lower, step, upperStep, entablature];
}

function buildOrbis(ctx: BuildContext, layer: TowerLayer): THREE.Mesh[] {
  const art = worldArt.global;
  const group = new THREE.Group();
  ctx.scene.add(group);
  const center = new THREE.Vector3(0, layer.y + .66, 0);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.82, 28, 18), new THREE.MeshBasicMaterial({ color: art.color, wireframe: true, transparent: true, opacity: .17 }));
  sphere.position.copy(center);
  group.add(sphere);
  const rotations = [
    [Math.PI / 2, 0, 0],
    [Math.PI / 2, .55, 0],
    [Math.PI / 2, -.55, 0],
    [.28, 0, .7],
    [-.28, 0, -.7],
  ];
  layer.facets.forEach((facet, index) => {
    const orbit = mesh(new THREE.TorusGeometry(2 + index * .08, .045 + (facet.share > 0 ? .012 : 0), 10, 90), index % 2 === 0 ? art.color : art.accent, facet.share > 0 ? .84 : .4, .38);
    orbit.position.copy(center);
    orbit.rotation.set(rotations[index][0], rotations[index][1], rotations[index][2]);
    group.add(orbit);
    const hit = hitMesh(new THREE.TorusGeometry(2 + index * .08, .14, 10, 90));
    hit.position.copy(center);
    hit.rotation.copy(orbit.rotation);
    addHitTarget(ctx, group, hit, layer.id, facet.id);
    const angle = -.7 + index * .35;
    const anchor = new THREE.Vector3(Math.cos(angle) * 2.18, center.y + Math.sin(index * 1.4) * .28, Math.sin(angle) * 2.18);
    registerFacet(ctx, layer, facet, [orbit], anchor);
  });
  const equator = lineLoop(polygonPoints(2.45, center.y, 64), art.accent, .58);
  group.add(equator);
  const axis = tube([new THREE.Vector3(0, layer.y - .05, 0), new THREE.Vector3(0, layer.y + .66, 0), new THREE.Vector3(0, layer.y + 1.38, 0)], art.accent, .025, .68);
  group.add(axis);
  const north = mesh(new THREE.SphereGeometry(.11, 16, 10), art.accent, .84, .36);
  north.position.set(0, layer.y + 2.12, 0);
  const south = north.clone();
  south.material = (north.material as THREE.Material).clone();
  south.position.set(0, layer.y - .22, 0);
  group.add(north, south);
  const title = layerTitle(layer);
  title.position.set(-2.5, layer.y + .25, 2.65);
  group.add(title);
  return [];
}

function addMeasurementPins(ctx: BuildContext, model: DisableTowerModel): void {
  for (const layer of model.layers) {
    const art = worldArt[layer.domain];
    const core = new THREE.Vector3(0, layer.y + .3, 0);
    ctx.targetPoints.push(core);
    for (const [nodeIndex, node] of layer.nodes.entries()) {
      const visual = ctx.facets.get(node.facetID);
      if (!visual) continue;
      const offset = new THREE.Vector3(((nodeIndex % 3) - 1) * .14, 0, ((nodeIndex % 2) - .5) * .14);
      const base = visual.anchor.clone().add(offset).setY(layer.y + .13);
      const height = .3 + Math.sqrt(node.contribution / 100) * .72;
      const pin = mesh(new THREE.CylinderGeometry(.028, .04, height, 12), 0xa86f2d, node.contribution > 0 ? .92 : .52, .34);
      pin.position.copy(base).add(new THREE.Vector3(0, height / 2, 0));
      const head = mesh(new THREE.SphereGeometry(.09 + Math.sqrt(node.contribution / 100) * .08, 18, 12), node.contribution > 0 ? 0xc88a3a : art.color, .96, .28);
      head.position.copy(base).add(new THREE.Vector3(0, height, 0));
      identify(pin, layer.id, node.facetID);
      identify(head, layer.id, node.facetID);
      ctx.scene.add(pin, head);
      ctx.clickable.push(pin, head);
      const sightLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([head.position, core]), new THREE.LineDashedMaterial({ color: art.color, transparent: true, opacity: .52, dashSize: .11, gapSize: .08 }));
      sightLine.computeLineDistances();
      ctx.scene.add(sightLine);
    }
  }
}

export function buildWorldArchitecture(scene: THREE.Scene, model: DisableTowerModel): WorldArchitecture {
  const primaryFacet = model.layers.flatMap((layer) => layer.facets).toSorted((left, right) => right.share - left.share)[0];
  const result: BuildContext = { scene, clickable: [], facets: new Map(), layers: new Map(), targetPoints: [], primaryFacetID: primaryFacet?.id ?? "" };
  for (const layer of model.layers) {
    let meshes: THREE.Mesh[];
    switch (layer.domain) {
      case "personal": meshes = buildCorpus(result, layer); break;
      case "organization": meshes = buildOfficina(result, layer); break;
      case "norm": meshes = buildTextura(result, layer); break;
      case "state": meshes = buildForum(result, layer); break;
      case "global": meshes = buildOrbis(result, layer); break;
    }
    result.layers.set(layer.id, { meshes });
  }
  addMeasurementPins(result, model);
  return result;
}

export function applyWorldSelection(architecture: WorldArchitecture, selectedLayerID: number | undefined, selectedFacetID: string | undefined, hoveredFacetID?: string): void {
  for (const [layerID, visual] of architecture.layers) {
    const active = layerID === selectedLayerID;
    for (const object of visual.meshes) {
      const objectMaterial = object.material as THREE.MeshPhysicalMaterial;
      objectMaterial.opacity = Math.min(.78, object.userData.baseOpacity + (active ? .12 : 0));
      objectMaterial.emissive.set(active ? 0x5d4630 : 0x000000);
      objectMaterial.emissiveIntensity = active ? .08 : 0;
    }
  }
  for (const [facetID, visual] of architecture.facets) {
    const inLayer = visual.layerID === selectedLayerID;
    const active = facetID === selectedFacetID;
    const hovered = facetID === hoveredFacetID;
    const primary = facetID === architecture.primaryFacetID;
    visual.label.visible = inLayer || hovered;
    visual.label.element.classList.toggle("is-active", active);
    visual.label.element.classList.toggle("is-hovered", hovered);
    visual.halo.visible = active || hovered || primary;
    visual.halo.userData.attention = primary && !active && !hovered;
    visual.halo.scale.setScalar(hovered ? 1.34 : active ? 1.14 : 1);
    const haloMaterial = visual.halo.material as THREE.MeshBasicMaterial;
    haloMaterial.opacity = hovered ? .92 : active ? .72 : primary ? .28 : 0;
    for (const object of visual.meshes) {
      const objectMaterial = object.material as THREE.MeshPhysicalMaterial;
      objectMaterial.opacity = Math.min(.98, object.userData.baseOpacity + (active ? .3 : hovered ? .22 : inLayer ? .08 : 0));
      objectMaterial.emissive.set(active || hovered ? 0xc88a36 : 0x000000);
      objectMaterial.emissiveIntensity = hovered ? .42 : active ? .28 : 0;
    }
  }
}

export function animateWorldAttention(architecture: WorldArchitecture, now: number): void {
  const visual = architecture.facets.get(architecture.primaryFacetID);
  if (!visual?.halo.visible || !visual.halo.userData.attention) return;
  const phase = (Math.sin(now * .0032) + 1) / 2;
  visual.halo.scale.setScalar(1 + phase * .24);
  (visual.halo.material as THREE.MeshBasicMaterial).opacity = .18 + phase * .2;
}

export function disposeWorld(root: THREE.Object3D): void {
  root.traverse((object) => {
    const renderable = object as THREE.Mesh;
    renderable.geometry?.dispose();
    const materials = Array.isArray(renderable.material) ? renderable.material : renderable.material ? [renderable.material] : [];
    for (const item of materials) {
      const mapped = item as THREE.Material & { map?: THREE.Texture | null };
      mapped.map?.dispose();
      item.dispose();
    }
  });
}