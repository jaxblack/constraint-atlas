"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUp, Binary, ExternalLink, Filter, Gauge, Landmark, Network, Pause, Play, RotateCcw, ScanSearch, Type, ZoomIn, ZoomOut } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { Analysis } from "./analysis";
import { animateSocialSorting, applySocialSortingFocus, buildSocialSortingArchitecture, type SocialSortingArchitecture } from "./socialSorting3D";
import { buildSocialSortingModel, socialFeatureAxes } from "./socialSortingModel";
import { buildTenWorldsModel, type TenWorldLayer } from "./tenWorldsModel";
import type { ConstraintHardness, SocialRelation } from "./socialWorlds";

const relationLabels: Record<SocialRelation, string> = {
  current: "当前环境", upstream: "上游结构", barrier: "跨层过滤膜", alternative: "可替代环境", remote: "间接作用", unverified: "待核验",
};

const hardnessLabels: Record<ConstraintHardness, string> = {
  absolute: "绝对边界", statutory: "法律/资格", gate: "准入闸门", priced: "价格门槛", structural: "结构阻力",
};

type MembraneVisual = {
  membrane: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshPhysicalMaterial>;
  mechanism: THREE.Group;
  halo: THREE.Mesh;
  label: CSS2DObject;
  gates: Map<string, THREE.Mesh>;
};

function applyVisualState(visuals: Map<number, MembraneVisual>, selectedWorldID: number, selectedConstraintID: string, hoveredWorldID?: number, hoveredConstraintID?: string): void {
  for (const [worldID, visual] of visuals) {
    const active = worldID === selectedWorldID;
    const hovered = worldID === hoveredWorldID;
    visual.mechanism.scale.setScalar(active ? 1.075 : hovered ? 1.025 : .985);
    visual.mechanism.position.y = Number(visual.mechanism.userData.baseY) + (active ? .14 : hovered ? .055 : 0);
    visual.mechanism.traverse((object) => {
      const renderable = object as THREE.Mesh;
      const materials = Array.isArray(renderable.material) ? renderable.material : renderable.material ? [renderable.material] : [];
      materials.forEach((material) => {
        const baseOpacity = material.userData.baseOpacity;
        if (typeof baseOpacity === "number") material.opacity = Math.min(1, baseOpacity * (active ? 1.45 : hovered ? 1.08 : .38));
      });
    });
    visual.membrane.material.opacity = Math.min(1, Number(visual.membrane.userData.baseOpacity) * (active ? 2.2 : hovered ? 1.45 : .42));
    visual.membrane.material.emissive.set(active || hovered ? visual.membrane.userData.color : 0x000000);
    visual.membrane.material.emissiveIntensity = active ? .48 : hovered ? .2 : 0;
    const haloMaterial = visual.halo.material as THREE.MeshPhysicalMaterial;
    haloMaterial.opacity = active ? .92 : hovered ? .42 : 0;
    haloMaterial.emissiveIntensity = active ? .72 : hovered ? .3 : 0;
    visual.label.element.classList.toggle("is-active", active);
    visual.label.element.classList.toggle("is-hovered", hovered);
    visual.label.element.classList.toggle("is-muted", !active && !hovered);
    for (const [constraintID, gate] of visual.gates) {
      const gateMaterial = gate.material as THREE.MeshPhysicalMaterial;
      const gateActive = worldID === selectedWorldID && constraintID === selectedConstraintID;
      const gateHovered = constraintID === hoveredConstraintID;
      gateMaterial.emissive.set(gateActive || gateHovered ? 0xd59a42 : 0x000000);
      gateMaterial.emissiveIntensity = gateActive ? .58 : gateHovered ? .38 : 0;
      gate.scale.setScalar(gateActive ? 1.28 : gateHovered ? 1.18 : 1);
    }
  }
}

function rememberMaterialOpacities(root: THREE.Object3D): void {
  root.traverse((object) => {
    const renderable = object as THREE.Mesh;
    const materials = Array.isArray(renderable.material) ? renderable.material : renderable.material ? [renderable.material] : [];
    materials.forEach((material) => {
      if (material.userData.baseOpacity === undefined) material.userData.baseOpacity = material.opacity;
    });
  });
}

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    const renderable = object as THREE.Mesh;
    renderable.geometry?.dispose();
    const materials = Array.isArray(renderable.material) ? renderable.material : renderable.material ? [renderable.material] : [];
    for (const material of materials) material.dispose();
  });
}

function membraneLabel(index: number, label: string, instrument: string, color: number): CSS2DObject {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "ten-world-label";
  element.style.setProperty("--world-color", `#${color.toString(16).padStart(6, "0")}`);
  element.innerHTML = `<span>${String(index).padStart(2, "0")}</span><span><strong>${label}</strong><em>${instrument}</em></span>`;
  const object = new CSS2DObject(element);
  object.center.set(0, .5);
  return object;
}

function circlePoints(radius: number, y: number, segments = 64): THREE.Vector3[] {
  return Array.from({ length: segments }, (_, index) => {
    const angle = index * Math.PI * 2 / segments;
    return new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  });
}

function drawingLine(points: THREE.Vector3[], color: number, opacity = .45, closed = false): THREE.Line | THREE.LineLoop {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  return closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
}

function brassMesh(geometry: THREE.BufferGeometry, color = 0xb67b32, opacity = .78): THREE.Mesh {
  return new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity, roughness: .42, metalness: .38, clearcoat: .28, side: THREE.DoubleSide }));
}

function drawingTube(points: THREE.Vector3[], color: number, radius = .025, opacity = .68, closed = false): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
  return brassMesh(new THREE.TubeGeometry(curve, Math.max(24, points.length * 8), radius, 8, closed), color, opacity);
}

function horizontalRing(radius: number, tube: number, color: number, opacity = .68): THREE.Mesh {
  const ring = brassMesh(new THREE.TorusGeometry(radius, tube, 8, 72), color, opacity);
  ring.rotation.x = Math.PI / 2;
  return ring;
}

function archPoints(centerX: number, z: number, width: number, height: number): THREE.Vector3[] {
  return Array.from({ length: 21 }, (_, index) => {
    const angle = Math.PI - index * Math.PI / 20;
    return new THREE.Vector3(centerX + Math.cos(angle) * width, .12 + Math.sin(angle) * height, z);
  });
}

function buildMechanicalDrawing(parent: THREE.Group, layer: TenWorldLayer): THREE.Group {
  const drawing = new THREE.Group();
  const radius = layer.radius * .78;
  const ink = layer.color;
  const brass = 0xb98236;
  parent.add(drawing);

  switch (layer.instrument.geometry) {
    case "sieve": {
      for (let index = 0; index < 18; index++) {
        const angle = index * Math.PI * 2 / 18;
        const inner = .32 + index % 3 * .13;
        drawing.add(drawingLine([new THREE.Vector3(Math.cos(angle) * inner, .09, Math.sin(angle) * inner), new THREE.Vector3(Math.cos(angle) * radius, .09, Math.sin(angle) * radius)], ink, .3));
      }
      [.46, .92, 1.42, radius].forEach((ringRadius, index) => drawing.add(horizontalRing(ringRadius, index === 3 ? .025 : .014, ink, .42)));
      const cup = brassMesh(new THREE.CylinderGeometry(.22, .48, .25, 24), brass, .72);
      cup.position.y = .16;
      drawing.add(cup);
      break;
    }
    case "aqueduct": {
      [-.72, 0, .72].forEach((z, index) => drawing.add(drawingTube([new THREE.Vector3(-radius, .08 + index * .025, z), new THREE.Vector3(-radius * .3, .13, z + .08), new THREE.Vector3(radius * .35, .08, z - .06), new THREE.Vector3(radius, .12 + index * .02, z)], index === 1 ? brass : ink, index === 1 ? .045 : .025, .68)));
      [-1.35, 0, 1.35].forEach((x) => {
        const wheel = horizontalRing(.3, .035, brass, .78);
        wheel.position.set(x, .12, 0);
        drawing.add(wheel, drawingLine([new THREE.Vector3(x - .42, .11, -.42), new THREE.Vector3(x + .42, .11, .42)], ink, .35));
      });
      break;
    }
    case "network": {
      const nodes = Array.from({ length: 7 }, (_, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / 7;
        return new THREE.Vector3(Math.cos(angle) * radius, .12 + index % 2 * .05, Math.sin(angle) * radius);
      });
      nodes.forEach((node, index) => {
        const knot = brassMesh(new THREE.TorusGeometry(.13 + index % 2 * .025, .035, 8, 28), index % 2 ? brass : ink, .82);
        knot.rotation.x = Math.PI / 2;
        knot.position.copy(node);
        drawing.add(knot, drawingTube([node, nodes[(index + 2) % nodes.length], nodes[(index + 4) % nodes.length]], ink, .018, .4));
      });
      break;
    }
    case "monopoly": {
      const spindle = brassMesh(new THREE.CylinderGeometry(.12, .18, .88, 18), ink, .82);
      spindle.position.y = .48;
      const counterweight = brassMesh(new THREE.SphereGeometry(.19, 18, 12), brass, .92);
      counterweight.position.set(radius, .14, 0);
      drawing.add(spindle, drawingTube([new THREE.Vector3(0, .58, 0), new THREE.Vector3(radius * .48, .38, 0), new THREE.Vector3(radius, .14, 0)], brass, .055, .82), counterweight, horizontalRing(radius * .58, .018, ink, .38));
      [-.65, .65].forEach((z) => drawing.add(drawingLine([new THREE.Vector3(-radius * .7, .08, z), new THREE.Vector3(radius * .7, .08, z)], ink, .24)));
      break;
    }
    case "market": {
      const teeth = Array.from({ length: 48 }, (_, index) => {
        const angle = index * Math.PI * 2 / 48;
        const gearRadius = radius * (index % 2 === 0 ? 1 : .9);
        return new THREE.Vector3(Math.cos(angle) * gearRadius, .11, Math.sin(angle) * gearRadius);
      });
      drawing.add(drawingLine(teeth, ink, .76, true), horizontalRing(radius * .46, .028, brass, .76));
      for (let index = 0; index < 12; index++) {
        const angle = index * Math.PI / 6;
        drawing.add(drawingLine([new THREE.Vector3(Math.cos(angle) * .5, .1, Math.sin(angle) * .5), new THREE.Vector3(Math.cos(angle) * radius * .9, .1, Math.sin(angle) * radius * .9)], index % 3 === 0 ? brass : ink, .34));
      }
      break;
    }
    case "gate": {
      [-1.18, 0, 1.18].forEach((x, index) => {
        drawing.add(drawingTube(archPoints(x, 0, .43, .72 + index * .1), index === 1 ? brass : ink, index === 1 ? .045 : .025, .76));
        drawing.add(drawingLine([new THREE.Vector3(x - .52, .1, -.48), new THREE.Vector3(x - .52, .1, .48), new THREE.Vector3(x + .52, .1, .48), new THREE.Vector3(x + .52, .1, -.48)], ink, .3));
      });
      drawing.add(drawingTube([new THREE.Vector3(-radius, .11, -.7), new THREE.Vector3(0, .11, -.7), new THREE.Vector3(radius, .11, -.7)], ink, .018, .42));
      break;
    }
    case "vault": {
      [.48, .94, 1.42, radius].forEach((ringRadius, index) => drawing.add(horizontalRing(ringRadius, index === 3 ? .035 : .018, index % 2 ? brass : ink, .66)));
      for (let index = 0; index < 10; index++) {
        const angle = index * Math.PI / 5;
        drawing.add(drawingLine([new THREE.Vector3(Math.cos(angle) * .4, .11, Math.sin(angle) * .4), new THREE.Vector3(Math.cos(angle) * radius, .11, Math.sin(angle) * radius)], ink, .3));
      }
      const dial = brassMesh(new THREE.CylinderGeometry(.36, .36, .1, 30), brass, .72);
      dial.position.y = .12;
      drawing.add(dial);
      break;
    }
    case "astrolabe": {
      const core = brassMesh(new THREE.SphereGeometry(.16, 18, 12), brass, .9);
      core.position.y = .38;
      drawing.add(core);
      [[0, 0, 0], [Math.PI / 2, 0, 0], [Math.PI / 3, Math.PI / 4, 0]].forEach((rotation, index) => {
        const orbit = brassMesh(new THREE.TorusGeometry(1.12 + index * .2, .025 + index * .006, 8, 72), index === 1 ? brass : ink, .72);
        orbit.position.y = .38;
        orbit.rotation.set(rotation[0], rotation[1], rotation[2]);
        drawing.add(orbit);
      });
      drawing.add(horizontalRing(radius, .02, ink, .34));
      break;
    }
    case "cage": {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(radius * .72, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: ink, wireframe: true, transparent: true, opacity: .3 }));
      dome.scale.y = .58;
      dome.position.y = .08;
      drawing.add(dome, horizontalRing(radius * .74, .035, brass, .72), horizontalRing(radius, .018, ink, .34));
      for (let index = 0; index < 6; index++) {
        const angle = index * Math.PI / 3;
        const lock = brassMesh(new THREE.BoxGeometry(.16, .22, .12), index % 2 ? brass : ink, .78);
        lock.position.set(Math.cos(angle) * radius * .72, .18, Math.sin(angle) * radius * .72);
        lock.rotation.y = -angle;
        drawing.add(lock);
      }
      break;
    }
    case "armillary": {
      const globe = new THREE.Mesh(new THREE.SphereGeometry(.88, 22, 12), new THREE.MeshBasicMaterial({ color: ink, wireframe: true, transparent: true, opacity: .18 }));
      globe.position.y = .55;
      drawing.add(globe);
      [[0, 0, 0], [Math.PI / 2, 0, 0], [Math.PI / 3, Math.PI / 4, 0], [-Math.PI / 3, -Math.PI / 4, 0]].forEach((rotation, index) => {
        const orbit = brassMesh(new THREE.TorusGeometry(1.18 + index * .14, .025, 8, 72), index % 2 ? brass : ink, .76);
        orbit.position.y = .55;
        orbit.rotation.set(rotation[0], rotation[1], rotation[2]);
        drawing.add(orbit);
      });
      const crown = brassMesh(new THREE.ConeGeometry(.16, .42, 18), brass, .82);
      crown.position.y = 1.92;
      drawing.add(crown);
      break;
    }
  }

  drawing.userData.rotationSpeed = .00008 + layer.inertia * .0000016;
  return drawing;
}

export default function TenWorlds3D({ input }: { input: Analysis }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualRef = useRef(new Map<number, MembraneVisual>());
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sortingArchitectureRef = useRef<SocialSortingArchitecture | null>(null);
  const reducedMotionRef = useRef(false);
  const rotationEnabledRef = useRef(true);
  const initialViewRef = useRef<{ position: THREE.Vector3; target: THREE.Vector3 } | null>(null);
  const model = useMemo(() => buildTenWorldsModel(input), [input]);
  const sorting = useMemo(() => buildSocialSortingModel(input), [input]);
  const [selectedWorldID, setSelectedWorldID] = useState(model.primaryWorldID);
  const selected = model.layers.find((layer) => layer.id === selectedWorldID) ?? model.layers[0];
  const defaultConstraint = selected.constraints.find((constraint) => constraint.binding) ?? selected.constraints[0];
  const [selectedConstraintID, setSelectedConstraintID] = useState(defaultConstraint.id);
  const [hoveredWorldID, setHoveredWorldID] = useState<number>();
  const [hoveredConstraintID, setHoveredConstraintID] = useState<string>();
  const [unsupported, setUnsupported] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [fontPercent, setFontPercent] = useState(100);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [motionReduced, setMotionReduced] = useState(false);
  const selectedConstraint = selected.constraints.find((constraint) => constraint.id === selectedConstraintID) ?? defaultConstraint;
  const selectedStage = sorting.stages[selected.id - 1];

  const selectWorld = (worldID: number) => {
    const world = model.layers.find((layer) => layer.id === worldID);
    setSelectedWorldID(worldID);
    setSelectedConstraintID((world?.constraints.find((constraint) => constraint.binding) ?? world?.constraints[0])!.id);
  };
  const selectWorldFromScene = useEffectEvent(selectWorld);

  const applyZoom = (value: number) => {
    const next = Math.min(160, Math.max(70, value));
    setZoomPercent(next);
    if (cameraRef.current) {
      cameraRef.current.zoom = next / 100;
      cameraRef.current.updateProjectionMatrix();
    }
    if (canvasRef.current) canvasRef.current.dataset.graphZoom = String(next);
  };

  const toggleRotation = () => {
    if (reducedMotionRef.current) return;
    const next = !rotationEnabledRef.current;
    rotationEnabledRef.current = next;
    setRotationEnabled(next);
    if (controlsRef.current) controlsRef.current.autoRotate = next;
    if (canvasRef.current) canvasRef.current.dataset.autoRotate = String(next);
  };

  const resetGraph = () => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (controls && camera && initialViewRef.current) {
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      controls.autoRotate = false;
      controls.update();
      camera.position.copy(initialViewRef.current.position);
      controls.target.copy(initialViewRef.current.target);
      camera.zoom = 1;
      camera.updateProjectionMatrix();
      controls.update();
      controls.enableDamping = damping;
    }
    applyZoom(100);
    const nextRotation = rotationEnabledRef.current && !reducedMotionRef.current;
    if (controlsRef.current) controlsRef.current.autoRotate = nextRotation;
    if (canvasRef.current) canvasRef.current.dataset.autoRotate = String(nextRotation);
  };

  useEffect(() => {
    applyVisualState(visualRef.current, selectedWorldID, selectedConstraintID, hoveredWorldID, hoveredConstraintID);
    if (sortingArchitectureRef.current) {
      const focusedConnections = applySocialSortingFocus(sortingArchitectureRef.current, selectedWorldID);
      if (canvasRef.current) {
        canvasRef.current.dataset.focusedWorld = String(selectedWorldID);
        canvasRef.current.dataset.focusedConnections = String(focusedConnections);
      }
    }
  }, [hoveredConstraintID, hoveredWorldID, selectedConstraintID, selectedWorldID]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (typeof WebGLRenderingContext === "undefined") {
      const timer = window.setTimeout(() => setUnsupported(true), 0);
      return () => window.clearTimeout(timer);
    }
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    } catch {
      const timer = window.setTimeout(() => setUnsupported(true), 0);
      return () => window.clearTimeout(timer);
    }
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.className = "ten-world-label-layer";
    canvas.parentElement?.appendChild(labelRenderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2eee1);
    scene.fog = new THREE.Fog(0xf2eee1, 19, 36);
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    camera.position.set(14.3, 8.9, 17.4);
    camera.lookAt(0, .45, 0);
    cameraRef.current = camera;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    scene.add(new THREE.HemisphereLight(0xfffdf5, 0x534c3d, 2.4));
    const key = new THREE.DirectionalLight(0xffedcf, 3.2);
    key.position.set(7, 12, 8);
    scene.add(key);

    const ground = new THREE.GridHelper(17, 34, 0xa99977, 0xd7ceba);
    ground.position.y = model.layers[0].y - .35;
    (ground.material as THREE.Material).transparent = true;
    (ground.material as THREE.Material).opacity = .22;
    scene.add(ground);

    const clickable: THREE.Object3D[] = [];
    const visuals = new Map<number, MembraneVisual>();
    const mechanisms: THREE.Group[] = [];
    for (const layer of model.layers) {
      const mechanism = new THREE.Group();
      mechanism.position.y = layer.y;
      mechanism.userData.baseY = layer.y;
      scene.add(mechanism);
      const baseOpacity = .1 + layer.relevance / 420;
      const membrane = new THREE.Mesh(
        new THREE.CylinderGeometry(layer.radius, layer.radius, .07 + layer.viscosity / 850, 72),
        new THREE.MeshPhysicalMaterial({ color: layer.color, transparent: true, opacity: baseOpacity, roughness: .76, metalness: .04, clearcoat: .14 }),
      );
      membrane.userData = { worldID: layer.id, baseOpacity, color: layer.color };
      mechanism.add(membrane);
      clickable.push(membrane);
      mechanism.add(drawingLine(circlePoints(layer.radius, .07), layer.color, .55, true));
      const drawing = buildMechanicalDrawing(mechanism, layer);
      mechanisms.push(drawing);
      const carrierRadius = layer.radius + .13;
      const ring = horizontalRing(carrierRadius, .016 + layer.inertia / 6000, layer.color, .48 + layer.inertia / 400);
      mechanism.add(ring);
      const halo = horizontalRing(layer.radius + .18, .065, 0xd6a048, 0);
      const haloMaterial = halo.material as THREE.MeshPhysicalMaterial;
      haloMaterial.emissive.set(0xd6a048);
      haloMaterial.emissiveIntensity = 0;
      mechanism.add(halo);
      for (let bead = 0; bead < 3; bead++) {
        const angle = bead * Math.PI * 2 / 3;
        const marker = new THREE.Mesh(new THREE.SphereGeometry(.055 + layer.inertia / 1800, 14, 10), new THREE.MeshStandardMaterial({ color: 0xb78338, emissive: 0x7d4e22, emissiveIntensity: .25 }));
        marker.position.set(Math.cos(angle) * carrierRadius, .08, Math.sin(angle) * carrierRadius);
        mechanism.add(marker);
      }

      const gates = new Map<string, THREE.Mesh>();
      layer.constraints.forEach((constraint, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / layer.constraints.length;
        const distance = layer.radius * .64;
        const gate = new THREE.Mesh(
          new THREE.TorusGeometry(.23, constraint.binding ? .055 : .035, 10, 36),
          new THREE.MeshPhysicalMaterial({ color: constraint.binding ? 0xb66a36 : 0xa88a58, roughness: .32, metalness: .34, transparent: true, opacity: constraint.binding ? .94 : .56 }),
        );
        gate.rotation.x = Math.PI / 2;
        gate.position.set(Math.cos(angle) * distance, .14, Math.sin(angle) * distance);
        gate.userData = { worldID: layer.id, constraintID: constraint.id };
        mechanism.add(gate);
        gates.set(constraint.id, gate);
        clickable.push(gate);
      });

      const label = membraneLabel(layer.id, layer.label, layer.instrument.title, layer.color);
      label.position.set(-layer.radius - .35, layer.y + .13, 0);
      label.element.addEventListener("click", () => selectWorldFromScene(layer.id));
      scene.add(label);
      rememberMaterialOpacities(mechanism);
      visuals.set(layer.id, { membrane, mechanism, halo, label, gates });
    }
    visualRef.current = visuals;
    const initialWorld = model.layers.find((layer) => layer.id === model.primaryWorldID) ?? model.layers[0];
    const initialConstraint = initialWorld.constraints.find((constraint) => constraint.binding) ?? initialWorld.constraints[0];
    applyVisualState(visuals, initialWorld.id, initialConstraint.id);

    const shaftPoints = [new THREE.Vector3(0, model.layers[0].y - .22, 0), new THREE.Vector3(0, model.layers.at(-1)!.y + .72, 0)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(shaftPoints), new THREE.LineBasicMaterial({ color: 0x9b682d, transparent: true, opacity: .68 })));
    scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), shaftPoints[1].clone().add(new THREE.Vector3(0, -.42, 0)), .58, 0xb67b32, .18, .1));
    const sortingArchitecture = buildSocialSortingArchitecture(scene, model, sorting);
    sortingArchitectureRef.current = sortingArchitecture;
    const focusedConnections = applySocialSortingFocus(sortingArchitecture, initialWorld.id);

    const controls = new OrbitControls(camera, canvas);
    controlsRef.current = controls;
    controls.target.set(0, 0, 0);
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.enableDamping = !reduceMotion;
    controls.enablePan = false;
    controls.minDistance = 11;
    controls.maxDistance = 27;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = .14;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.update();
    controls.saveState();
    initialViewRef.current = { position: camera.position.clone(), target: controls.target.clone() };
    reducedMotionRef.current = reduceMotion;
    rotationEnabledRef.current = !reduceMotion;
    const motionStateTimer = window.setTimeout(() => {
      setMotionReduced(reduceMotion);
      if (reduceMotion) setRotationEnabled(false);
    }, 0);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerDown = new THREE.Vector2();
    const intersect = (event: PointerEvent | MouseEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(clickable, false)[0]?.object;
    };
    const onPointerDown = (event: PointerEvent) => pointerDown.set(event.clientX, event.clientY);
    const onPointerMove = (event: PointerEvent) => {
      const hit = intersect(event);
      const worldID = hit?.userData.worldID as number | undefined;
      const constraintID = hit?.userData.constraintID as string | undefined;
      setHoveredWorldID(worldID);
      setHoveredConstraintID(constraintID);
      canvas.style.cursor = hit ? "pointer" : "grab";
    };
    const onPointerLeave = () => {
      setHoveredWorldID(undefined);
      setHoveredConstraintID(undefined);
    };
    const onClick = (event: MouseEvent) => {
      if (pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 7) return;
      const hit = intersect(event);
      const worldID = hit?.userData.worldID as number | undefined;
      const constraintID = hit?.userData.constraintID as string | undefined;
      if (worldID) selectWorldFromScene(worldID);
      if (worldID && constraintID) setSelectedConstraintID(constraintID);
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("click", onClick);

    const resize = () => {
      if (!canvas.clientWidth || !canvas.clientHeight) return;
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      labelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    canvas.dataset.worldCount = "10";
    canvas.dataset.mechanismCount = String(new Set(model.layers.map((layer) => layer.instrument.geometry)).size);
    canvas.dataset.constraintCount = String(model.layers.reduce((sum, layer) => sum + layer.constraints.length, 0));
    canvas.dataset.vectorCount = String(sorting.vectorCount);
    canvas.dataset.visibleVectorCount = String(sortingArchitecture.visibleVectors);
    canvas.dataset.crossCount = String(sorting.crossCount);
    canvas.dataset.visibleCrossCount = String(sortingArchitecture.visibleCrosses);
    canvas.dataset.filteredCount = String(sorting.totalFiltered);
    canvas.dataset.resourceUpflow = String(sorting.resourceUpflow);
      canvas.dataset.feedbackCount = String(sortingArchitecture.feedbackLoops);
    canvas.dataset.reducedMotion = String(reduceMotion);
      canvas.dataset.graphZoom = "100";
      canvas.dataset.autoRotate = String(!reduceMotion);
      canvas.dataset.focusedWorld = String(initialWorld.id);
      canvas.dataset.focusedConnections = String(focusedConnections);
    animateSocialSorting(sortingArchitecture, 0);
    let frame = 0;
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      controls.update();
      if (!reduceMotion) {
        mechanisms.forEach((mechanism) => { mechanism.rotation.y += Number(mechanism.userData.rotationSpeed); });
        animateSocialSorting(sortingArchitecture, now);
      }
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      canvas.dataset.cameraPosition = camera.position.toArray().map((value) => value.toFixed(3)).join(",");
      canvas.dataset.threeReady = "true";
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(motionStateTimer);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("click", onClick);
      controls.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
      sortingArchitectureRef.current = null;
      initialViewRef.current = null;
      visualRef.current.clear();
      disposeScene(scene);
      labelRenderer.domElement.remove();
      renderer.dispose();
      delete canvas.dataset.mechanismCount;
      delete canvas.dataset.vectorCount;
      delete canvas.dataset.visibleVectorCount;
      delete canvas.dataset.crossCount;
      delete canvas.dataset.visibleCrossCount;
      delete canvas.dataset.filteredCount;
      delete canvas.dataset.resourceUpflow;
      delete canvas.dataset.feedbackCount;
      delete canvas.dataset.reducedMotion;
      delete canvas.dataset.graphZoom;
      delete canvas.dataset.autoRotate;
      delete canvas.dataset.focusedWorld;
      delete canvas.dataset.focusedConnections;
      delete canvas.dataset.cameraPosition;
    };
  }, [model, sorting]);

  const relation = relationLabels[selected.relation];
  const previousWorld = model.layers[selected.id - 2];
  const nextWorld = model.layers[selected.id];
  const fontScale = fontPercent / 100;
  const graphStyle = {
    "--graph-font-scale": fontScale,
    "--graph-font-6": `${6 * fontScale}px`,
    "--graph-font-7": `${7 * fontScale}px`,
    "--graph-font-8": `${8 * fontScale}px`,
    "--graph-font-9": `${9 * fontScale}px`,
    "--graph-font-10": `${10 * fontScale}px`,
    "--graph-font-11": `${11 * fontScale}px`,
    "--graph-font-12": `${12 * fontScale}px`,
    "--graph-font-13": `${13 * fontScale}px`,
    "--graph-font-14": `${14 * fontScale}px`,
    "--graph-font-17": `${17 * fontScale}px`,
    "--graph-font-20": `${20 * fontScale}px`,
    "--graph-font-27": `${27 * fontScale}px`,
  } as CSSProperties;
  return <section className="ten-worlds" aria-labelledby="ten-worlds-title" style={graphStyle}>
    <canvas ref={canvasRef} aria-label="十重社会世界过滤膜" />
    {unsupported && <div className="ten-world-unsupported" role="status"><Filter size={21} /><strong>3D 场景不可用</strong><span>仍可通过十重世界索引查看每层过滤膜与硬约束。</span></div>}
    <header className="ten-worlds-heading"><div><Filter size={17} /><div><p>SOCIAL SORTING NETWORK · 十重世</p><h3 id="ten-worlds-title">社会如何计算并分流你</h3></div></div><a href="https://bestcoder.cn/%E5%8D%81%E9%87%8D%E4%B8%96" target="_blank" rel="noreferrer">理论原文<ExternalLink size={10} /></a></header>
    <div className="ten-worlds-target"><ArrowUp size={14} /><span>输入意图</span><strong>{model.target}</strong></div>
    <div className="social-algorithm-overview" aria-label="社会筛选算法概览"><span><b>{sorting.vectorCount} × {sorting.dimensions}</b>模拟人物向量</span><span><b>{sorting.crossCount}</b>累计 feature 评估</span><span><b>{sorting.totalFiltered}</b>模拟过滤量</span><span><b>{sorting.resourceUpflow}</b>资源上行指数</span><span className="is-feedback"><b>{sorting.feedbackCount} 条反馈回路</b>概念模拟，非人口统计或个体预测</span></div>
    <div className="social-flow-key" aria-label="流动图例"><span className="is-forward">特征前馈 ↑</span><span className="is-filtered">淘汰蒸发 ↘</span><span className="is-resource">资源汇聚 ↑</span><span className="is-feedback">阈值反馈 ↺</span></div>
    <div className="graph-controls" aria-label="图谱控制">
      <div><button type="button" aria-label="缩小图谱" title="缩小" onClick={() => applyZoom(zoomPercent - 10)}><ZoomOut size={15} /></button><input type="range" min="70" max="160" step="5" value={zoomPercent} onChange={(event) => applyZoom(Number(event.target.value))} aria-label="图谱缩放" /><button type="button" aria-label="放大图谱" title="放大" onClick={() => applyZoom(zoomPercent + 10)}><ZoomIn size={15} /></button></div>
      <button type="button" aria-label="自动旋转图谱" aria-pressed={rotationEnabled} title={motionReduced ? "系统已减少动画" : rotationEnabled ? "暂停自动旋转" : "开始自动旋转"} onClick={toggleRotation}>{rotationEnabled ? <Pause size={15} /> : <Play size={15} />}</button>
      <button type="button" aria-label="复位图谱视角" title="复位视角" onClick={resetGraph}><RotateCcw size={15} /></button>
      <div><Type size={14} aria-hidden="true" /><input type="range" min="85" max="140" step="5" value={fontPercent} onChange={(event) => setFontPercent(Number(event.target.value))} aria-label="字体大小" /></div>
    </div>
    <nav className="ten-worlds-nav" aria-label="十重社会世界">{model.layers.map((layer) => <button aria-pressed={layer.id === selected.id} className={layer.id === selected.id ? "is-active" : ""} style={{ "--world-color": `#${layer.color.toString(16).padStart(6, "0")}` } as CSSProperties} onClick={() => selectWorld(layer.id)} key={layer.id}><span>{String(layer.id).padStart(2, "0")}</span><div><strong>{layer.label}</strong><em>{layer.instrument.title}</em></div><b>{layer.relevance}</b></button>)}</nav>
    <aside className="ten-world-detail" style={{ "--world-color": `#${selected.color.toString(16).padStart(6, "0")}` } as CSSProperties}>
      <header><span>FOLIO {String(selected.id).padStart(2, "0")}</span><strong>{selected.instrument.latin}</strong><b>{relation} · {selected.relevance}</b></header>
      <h4>{selected.label}</h4><p className="ten-world-instrument">{selected.instrument.title}</p><p className="ten-world-prototype">文章原型：{selected.prototype}</p>
      <p className="ten-world-diagnosis">{selected.diagnosis}</p>
      <section className="sorting-stage-readout" aria-label={`第${selected.id}重筛选计算`}><header><Network size={14} /><strong>SELECTION KERNEL</strong><span>阈值 {selectedStage.threshold} · 前轮反馈 +{selectedStage.feedbackAdjustment}</span></header><div><span><b>{selectedStage.input}</b>输入</span><span><b>{selectedStage.passed}</b>通过</span><span><b>{selectedStage.filtered}</b>过滤</span><span><b>{selectedStage.evaporated}</b>蒸发</span><span><b>+{selectedStage.resourceYield}</b>资源指数</span></div><footer><Binary size={13} />{selectedStage.activeFeatures.map((featureID) => { const feature = socialFeatureAxes.find((item) => item.id === featureID)!; return <span style={{ "--feature-color": `#${feature.color.toString(16).padStart(6, "0")}` } as CSSProperties} key={feature.id}>{feature.label}</span>; })}</footer></section>
      <div className="stage-connections" aria-label={`第${selected.id}重连接关系`}><span className="is-forward">{previousWorld ? `${previousWorld.label} → 本层` : "输入向量 → 本层"}</span><span className="is-forward">{nextWorld ? `本层 → ${nextWorld.label}` : "本层 → 顶层资源池"}</span><span className="is-rejected">{selectedStage.filtered} 个模拟向量 ↘ 淘汰/蒸发</span><span className="is-resource">+{selectedStage.resourceYield} 资源指数 ↑ 汇聚</span><span className="is-feedback">反馈 +{selectedStage.feedbackAdjustment} ↺ 下一轮阈值</span></div>
      <div className="reynolds-meters"><div><span>环境黏性</span><b>{selected.viscosity}</b><i><em style={{ width: `${selected.viscosity}%` }} /></i></div><div><span>积累惯性</span><b>{selected.inertia}</b><i><em style={{ width: `${selected.inertia}%` }} /></i></div></div>
      <div className="hard-constraint-list"><header><Landmark size={13} /><span>本层硬约束</span></header>{selected.constraints.map((constraint) => <button aria-pressed={constraint.id === selectedConstraint.id} className={`${constraint.id === selectedConstraint.id ? "is-active" : ""} ${constraint.binding ? "is-binding" : ""}`} onClick={() => setSelectedConstraintID(constraint.id)} key={constraint.id}><span>{hardnessLabels[constraint.hardness]}</span><strong>{constraint.label}</strong>{constraint.binding && <b>当前绑定</b>}</button>)}</div>
      <div className="constraint-reading"><header><ScanSearch size={13} /><strong>{selectedConstraint.label}</strong><span>{hardnessLabels[selectedConstraint.hardness]}</span></header><p>{selectedConstraint.description}</p>{selectedConstraint.sources.length > 0 && <div>{selectedConstraint.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>{source.authority} · {source.title}<ExternalLink size={11} /></a>)}</div>}</div>
      <div className="ten-world-evidence"><Gauge size={13} /><p><span>还需要核验</span>{selected.evidenceNeeded}</p></div>
    </aside>
    <div className="ten-world-hover" aria-live="polite">{hoveredWorldID ? <><span>将检查</span><strong>第 {hoveredWorldID} 重{hoveredConstraintID ? ` · ${model.layers.find((layer) => layer.id === hoveredWorldID)?.constraints.find((constraint) => constraint.id === hoveredConstraintID)?.label}` : ""}</strong></> : <><span>当前聚焦</span><strong>第 {selected.id} 重 · {selected.label}</strong></>}</div>
  </section>;
}