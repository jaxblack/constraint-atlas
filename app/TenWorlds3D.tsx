"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUp, ExternalLink, Filter, Gauge, Landmark, ScanSearch } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { Analysis } from "./analysis";
import { buildTenWorldsModel } from "./tenWorldsModel";
import type { ConstraintHardness, SocialRelation } from "./socialWorlds";

const relationLabels: Record<SocialRelation, string> = {
  current: "当前环境", upstream: "上游结构", barrier: "跨层过滤膜", alternative: "可替代环境", remote: "间接作用", unverified: "待核验",
};

const hardnessLabels: Record<ConstraintHardness, string> = {
  absolute: "绝对边界", statutory: "法律/资格", gate: "准入闸门", priced: "价格门槛", structural: "结构阻力",
};

type MembraneVisual = {
  membrane: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshPhysicalMaterial>;
  flywheel: THREE.Group;
  label: CSS2DObject;
  gates: Map<string, THREE.Mesh>;
};

function applyVisualState(visuals: Map<number, MembraneVisual>, selectedWorldID: number, selectedConstraintID: string, hoveredWorldID?: number, hoveredConstraintID?: string): void {
  for (const [worldID, visual] of visuals) {
    const active = worldID === selectedWorldID;
    const hovered = worldID === hoveredWorldID;
    visual.membrane.material.opacity = Number(visual.membrane.userData.baseOpacity) + (active ? .22 : hovered ? .13 : 0);
    visual.membrane.material.emissive.set(active || hovered ? visual.membrane.userData.color : 0x000000);
    visual.membrane.material.emissiveIntensity = active ? .24 : hovered ? .14 : 0;
    visual.label.element.classList.toggle("is-active", active);
    visual.label.element.classList.toggle("is-hovered", hovered);
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

function disposeScene(scene: THREE.Scene): void {
  scene.traverse((object) => {
    const renderable = object as THREE.Mesh;
    renderable.geometry?.dispose();
    const materials = Array.isArray(renderable.material) ? renderable.material : renderable.material ? [renderable.material] : [];
    for (const material of materials) material.dispose();
  });
}

function membraneLabel(index: number, label: string, color: number): CSS2DObject {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "ten-world-label";
  element.style.setProperty("--world-color", `#${color.toString(16).padStart(6, "0")}`);
  element.innerHTML = `<span>${String(index).padStart(2, "0")}</span><strong>${label}</strong>`;
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

export default function TenWorlds3D({ input }: { input: Analysis }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualRef = useRef(new Map<number, MembraneVisual>());
  const model = useMemo(() => buildTenWorldsModel(input), [input]);
  const [selectedWorldID, setSelectedWorldID] = useState(model.primaryWorldID);
  const selected = model.layers.find((layer) => layer.id === selectedWorldID) ?? model.layers[0];
  const defaultConstraint = selected.constraints.find((constraint) => constraint.binding) ?? selected.constraints[0];
  const [selectedConstraintID, setSelectedConstraintID] = useState(defaultConstraint.id);
  const [hoveredWorldID, setHoveredWorldID] = useState<number>();
  const [hoveredConstraintID, setHoveredConstraintID] = useState<string>();
  const [unsupported, setUnsupported] = useState(false);
  const selectedConstraint = selected.constraints.find((constraint) => constraint.id === selectedConstraintID) ?? defaultConstraint;

  const selectWorld = (worldID: number) => {
    const world = model.layers.find((layer) => layer.id === worldID);
    setSelectedWorldID(worldID);
    setSelectedConstraintID((world?.constraints.find((constraint) => constraint.binding) ?? world?.constraints[0])!.id);
  };
  const selectWorldFromScene = useEffectEvent(selectWorld);

  useEffect(() => {
    applyVisualState(visualRef.current, selectedWorldID, selectedConstraintID, hoveredWorldID, hoveredConstraintID);
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
    camera.position.set(11.8, 7.5, 14.2);
    camera.lookAt(0, 0, 0);
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
    const flywheels: THREE.Group[] = [];
    const particles: THREE.Mesh[] = [];
    for (const layer of model.layers) {
      const baseOpacity = .1 + layer.relevance / 420;
      const membrane = new THREE.Mesh(
        new THREE.CylinderGeometry(layer.radius, layer.radius, .07 + layer.viscosity / 850, 72),
        new THREE.MeshPhysicalMaterial({ color: layer.color, transparent: true, opacity: baseOpacity, roughness: .68, metalness: .06, clearcoat: .22 }),
      );
      membrane.position.y = layer.y;
      membrane.userData = { worldID: layer.id, baseOpacity, color: layer.color };
      scene.add(membrane);
      clickable.push(membrane);

      const density = 4 + Math.round(layer.viscosity / 12);
      for (let spoke = 0; spoke < density; spoke++) {
        const angle = spoke * Math.PI / density;
        const points = [
          new THREE.Vector3(Math.cos(angle) * -layer.radius, layer.y + .07, Math.sin(angle) * -layer.radius),
          new THREE.Vector3(Math.cos(angle) * layer.radius, layer.y + .07, Math.sin(angle) * layer.radius),
        ];
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: layer.color, transparent: true, opacity: .12 + layer.viscosity / 800 })));
      }
      const circles = 1 + Math.round(layer.viscosity / 24);
      for (let circle = 1; circle <= circles; circle++) {
        scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(circlePoints(layer.radius * circle / (circles + 1), layer.y + .075)), new THREE.LineBasicMaterial({ color: layer.color, transparent: true, opacity: .12 })));
      }

      const flywheel = new THREE.Group();
      const flywheelRadius = layer.radius + .12 + layer.inertia / 520;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(flywheelRadius, .025 + layer.inertia / 2600, 8, 90), new THREE.MeshStandardMaterial({ color: layer.color, roughness: .34, metalness: .38, transparent: true, opacity: .55 + layer.inertia / 240 }));
      ring.rotation.x = Math.PI / 2;
      flywheel.add(ring);
      for (let bead = 0; bead < 3; bead++) {
        const angle = bead * Math.PI * 2 / 3;
        const marker = new THREE.Mesh(new THREE.SphereGeometry(.055 + layer.inertia / 1800, 14, 10), new THREE.MeshStandardMaterial({ color: 0xb78338, emissive: 0x7d4e22, emissiveIntensity: .25 }));
        marker.position.set(Math.cos(angle) * flywheelRadius, 0, Math.sin(angle) * flywheelRadius);
        flywheel.add(marker);
      }
      flywheel.position.y = layer.y + .04;
      scene.add(flywheel);
      flywheels.push(flywheel);

      const gates = new Map<string, THREE.Mesh>();
      layer.constraints.forEach((constraint, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / layer.constraints.length;
        const distance = layer.radius * .64;
        const gate = new THREE.Mesh(
          new THREE.TorusGeometry(.23, constraint.binding ? .055 : .035, 10, 36),
          new THREE.MeshPhysicalMaterial({ color: constraint.binding ? 0xb66a36 : 0xa88a58, roughness: .32, metalness: .34, transparent: true, opacity: constraint.binding ? .94 : .56 }),
        );
        gate.rotation.x = Math.PI / 2;
        gate.position.set(Math.cos(angle) * distance, layer.y + .14, Math.sin(angle) * distance);
        gate.userData = { worldID: layer.id, constraintID: constraint.id };
        scene.add(gate);
        gates.set(constraint.id, gate);
        clickable.push(gate);
      });

      const label = membraneLabel(layer.id, layer.label, layer.color);
      label.position.set(-layer.radius - .35, layer.y + .13, 0);
      label.element.addEventListener("click", () => selectWorldFromScene(layer.id));
      scene.add(label);
      visuals.set(layer.id, { membrane, flywheel, label, gates });
    }
    visualRef.current = visuals;
    const initialWorld = model.layers.find((layer) => layer.id === model.primaryWorldID) ?? model.layers[0];
    const initialConstraint = initialWorld.constraints.find((constraint) => constraint.binding) ?? initialWorld.constraints[0];
    applyVisualState(visuals, initialWorld.id, initialConstraint.id);

    const shaftPoints = [new THREE.Vector3(0, model.layers[0].y - .22, 0), new THREE.Vector3(0, model.layers.at(-1)!.y + .72, 0)];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(shaftPoints), new THREE.LineBasicMaterial({ color: 0x9b682d, transparent: true, opacity: .68 })));
    scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), shaftPoints[1].clone().add(new THREE.Vector3(0, -.42, 0)), .58, 0xb67b32, .18, .1));
    for (let index = 0; index < 8; index++) {
      const particle = new THREE.Mesh(new THREE.SphereGeometry(.035 + index % 2 * .018, 12, 8), new THREE.MeshBasicMaterial({ color: 0xc69243, transparent: true, opacity: .76 }));
      particle.userData.offset = index / 8;
      scene.add(particle);
      particles.push(particle);
    }

    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 11;
    controls.maxDistance = 27;
    controls.autoRotate = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = .22;

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
    canvas.dataset.constraintCount = String(model.layers.reduce((sum, layer) => sum + layer.constraints.length, 0));
    let frame = 0;
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      controls.update();
      flywheels.forEach((flywheel, index) => { flywheel.rotation.y += .00015 + model.layers[index].inertia * .000003; });
      const bottom = model.layers[0].y;
      const range = model.layers.at(-1)!.y - bottom + .55;
      particles.forEach((particle) => {
        const progress = (now * .000055 + Number(particle.userData.offset)) % 1;
        particle.position.set(Math.sin(progress * Math.PI * 4) * .05, bottom + progress * range, Math.cos(progress * Math.PI * 4) * .05);
      });
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      canvas.dataset.threeReady = "true";
    };
    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("click", onClick);
      controls.dispose();
      visualRef.current.clear();
      disposeScene(scene);
      labelRenderer.domElement.remove();
      renderer.dispose();
    };
  }, [model]);

  const relation = relationLabels[selected.relation];
  return <section className="ten-worlds" aria-labelledby="ten-worlds-title">
    <canvas ref={canvasRef} aria-label="十重社会世界过滤膜" />
    {unsupported && <div className="ten-world-unsupported" role="status"><Filter size={21} /><strong>3D 场景不可用</strong><span>仍可通过十重世界索引查看每层过滤膜与硬约束。</span></div>}
    <header className="ten-worlds-heading"><div><Filter size={17} /><div><p>十重世 · 社会雷诺数</p><h3 id="ten-worlds-title">你在哪一层被阻住</h3></div></div><a href="https://bestcoder.cn/%E5%8D%81%E9%87%8D%E4%B8%96" target="_blank" rel="noreferrer">理论原文<ExternalLink size={10} /></a></header>
    <div className="ten-worlds-target"><ArrowUp size={14} /><span>试图推动</span><strong>{model.target}</strong></div>
    <nav className="ten-worlds-nav" aria-label="十重社会世界">{model.layers.map((layer) => <button aria-pressed={layer.id === selected.id} className={layer.id === selected.id ? "is-active" : ""} style={{ "--world-color": `#${layer.color.toString(16).padStart(6, "0")}` } as CSSProperties} onClick={() => selectWorld(layer.id)} key={layer.id}><span>{String(layer.id).padStart(2, "0")}</span><strong>{layer.label}</strong><b>{layer.relevance}</b></button>)}</nav>
    <aside className="ten-world-detail" style={{ "--world-color": `#${selected.color.toString(16).padStart(6, "0")}` } as CSSProperties}>
      <header><span>第 {selected.id} 重</span><strong>{relation}</strong><b>关联 {selected.relevance}</b></header>
      <h4>{selected.label}</h4><p className="ten-world-prototype">文章原型：{selected.prototype}</p>
      <p className="ten-world-diagnosis">{selected.diagnosis}</p>
      <div className="reynolds-meters"><div><span>环境黏性</span><b>{selected.viscosity}</b><i><em style={{ width: `${selected.viscosity}%` }} /></i></div><div><span>积累惯性</span><b>{selected.inertia}</b><i><em style={{ width: `${selected.inertia}%` }} /></i></div></div>
      <div className="hard-constraint-list"><header><Landmark size={13} /><span>本层硬约束</span></header>{selected.constraints.map((constraint) => <button aria-pressed={constraint.id === selectedConstraint.id} className={`${constraint.id === selectedConstraint.id ? "is-active" : ""} ${constraint.binding ? "is-binding" : ""}`} onClick={() => setSelectedConstraintID(constraint.id)} key={constraint.id}><span>{hardnessLabels[constraint.hardness]}</span><strong>{constraint.label}</strong>{constraint.binding && <b>当前绑定</b>}</button>)}</div>
      <div className="constraint-reading"><header><ScanSearch size={13} /><strong>{selectedConstraint.label}</strong><span>{hardnessLabels[selectedConstraint.hardness]}</span></header><p>{selectedConstraint.description}</p>{selectedConstraint.sources.length > 0 && <div>{selectedConstraint.sources.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}>{source.authority} · {source.title}<ExternalLink size={11} /></a>)}</div>}</div>
      <div className="ten-world-evidence"><Gauge size={13} /><p><span>还需要核验</span>{selected.evidenceNeeded}</p></div>
    </aside>
    <div className="ten-world-hover" aria-live="polite">{hoveredWorldID ? <><span>将检查</span><strong>第 {hoveredWorldID} 重{hoveredConstraintID ? ` · ${model.layers.find((layer) => layer.id === hoveredWorldID)?.constraints.find((constraint) => constraint.id === hoveredConstraintID)?.label}` : ""}</strong></> : <><span>主过滤膜</span><strong>第 {model.primaryWorldID} 重 · {model.layers.find((layer) => layer.id === model.primaryWorldID)?.label}</strong></>}</div>
  </section>;
}