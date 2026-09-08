"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { BookOpen, Box, Crosshair, Layers3 } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Analysis } from "./analysis";
import { buildDisableTower } from "./disableTowerModel";
import WorldDossierDrawer from "./WorldDossierDrawer";
import { worldArt } from "./worldArt";
import { applyWorldSelection, buildWorldArchitecture, disposeWorld, type WorldArchitecture } from "./worldArchitecture3D";

const interventionLabels = { accept: "接受边界", train: "升级能力", acquire: "获取资源", negotiate: "协商合作", reroute: "绕路/换系统", wait: "等待窗口", exit: "退出游戏", experiment: "小步验证" } as const;

export default function DisableTower3D({ input }: { input: Analysis }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const architectureRef = useRef<WorldArchitecture | null>(null);
  const model = useMemo(() => buildDisableTower(input), [input]);
  const defaultLayer = [...model.layers].sort((left, right) => right.share - left.share)[0]?.id ?? model.layers[0]?.id;
  const defaultFacet = model.layers.find((layer) => layer.id === defaultLayer)?.facets.toSorted((left, right) => right.share - left.share)[0]?.id;
  const [selectedID, setSelectedID] = useState<number | undefined>(defaultLayer);
  const [selectedFacetID, setSelectedFacetID] = useState<string | undefined>(defaultFacet);
  const [dossierOpen, setDossierOpen] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const selected = model.layers.find((layer) => layer.id === selectedID) ?? model.layers[0];
  const selectedFacet = selected?.facets.find((facet) => facet.id === selectedFacetID) ?? selected?.facets.toSorted((left, right) => right.share - left.share)[0];

  const selectLayer = (layerID: number) => {
    const layer = model.layers.find((item) => item.id === layerID);
    setSelectedID(layerID);
    setSelectedFacetID(layer?.facets.toSorted((left, right) => right.share - left.share)[0]?.id);
    setDossierOpen(false);
  };

  const openFacet = (layerID: number, facetID: string) => {
    setSelectedID(layerID);
    setSelectedFacetID(facetID);
    setDossierOpen(true);
  };

  useEffect(() => {
    if (architectureRef.current) applyWorldSelection(architectureRef.current, selectedID, selectedFacetID);
  }, [selectedFacetID, selectedID]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof WebGLRenderingContext === "undefined") return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
    } catch {
      const timer = window.setTimeout(() => setUnsupported(true), 0);
      return () => window.clearTimeout(timer);
    }

    const scene = new THREE.Scene();
    canvas.dataset.layerCount = String(model.layers.length);
    canvas.dataset.motifCount = String(new Set(model.layers.map((layer) => worldArt[layer.domain].metaphor)).size);
    canvas.dataset.facetCount = String(model.layers.reduce((sum, layer) => sum + layer.facets.length, 0));
    canvas.dataset.nodeCount = String(model.layers.reduce((sum, layer) => sum + layer.nodes.length, 0));
    scene.background = new THREE.Color(0xf2eee1);
    scene.fog = new THREE.Fog(0xf2eee1, 20, 36);
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    const centerY = (model.layers[0].y + model.layers.at(-1)!.y) / 2 + .35;
    const initialCamera = new THREE.Vector3(12.4, centerY + 7.1, 14.5);
    camera.position.copy(initialCamera);
    camera.lookAt(0, centerY, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    scene.add(new THREE.HemisphereLight(0xfffdf5, 0x5b574b, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffefd4, 3.4);
    keyLight.position.set(6, 10, 7);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xb8d9cf, 1.55);
    rimLight.position.set(-7, 4, -5);
    scene.add(rimLight);

    const grid = new THREE.GridHelper(17, 34, 0xa99977, 0xd7ceba);
    grid.position.y = model.layers[0].y - .28;
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = .26;
    scene.add(grid);

    const architecture = buildWorldArchitecture(scene, model);
    architectureRef.current = architecture;
    if (architecture.targetPoints.length > 1) {
      const shaft = new THREE.Line(new THREE.BufferGeometry().setFromPoints(architecture.targetPoints), new THREE.LineBasicMaterial({ color: 0x6f6048, transparent: true, opacity: .52 }));
      scene.add(shaft);
    }
    const topLayer = model.layers.at(-1)!;
    const targetY = topLayer.y + 2.35;
    const targetRing = new THREE.Mesh(new THREE.TorusGeometry(.62, .035, 10, 60), new THREE.MeshBasicMaterial({ color: 0xa86f2d, transparent: true, opacity: .82 }));
    targetRing.position.set(0, targetY, 0);
    targetRing.rotation.x = Math.PI / 2;
    scene.add(targetRing);
    const compass = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 16 }, (_, index) => {
      const radius = index % 2 === 0 ? .56 : .2;
      const angle = index * Math.PI / 8;
      return new THREE.Vector3(Math.cos(angle) * radius, targetY, Math.sin(angle) * radius);
    })), new THREE.LineBasicMaterial({ color: 0x9c4936, transparent: true, opacity: .9 }));
    scene.add(compass);
    const shaftStart = architecture.targetPoints.at(-1)!;
    const shaftTarget = new THREE.Vector3(0, targetY, 0);
    const shaftDirection = shaftTarget.clone().sub(shaftStart);
    scene.add(new THREE.ArrowHelper(shaftDirection.clone().normalize(), shaftStart, shaftDirection.length(), 0xa86f2d, .3, .16));

    const controls = new OrbitControls(camera, canvas);
    controlsRef.current = controls;
    controls.target.set(0, centerY, 0);
    controls.update();
    controls.saveState();
    controls.enableDamping = true;
    controls.dampingFactor = .06;
    controls.enablePan = false;
    controls.minDistance = 10;
    controls.maxDistance = 26;
    controls.minPolarAngle = .55;
    controls.maxPolarAngle = 1.48;
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = .32;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pointerDown = new THREE.Vector2();
    const onPointerDown = (event: PointerEvent) => pointerDown.set(event.clientX, event.clientY);
    const intersect = (event: MouseEvent | PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(architecture.clickable, false)[0]?.object;
    };
    const onPointerMove = (event: PointerEvent) => {
      canvas.style.cursor = intersect(event) ? "pointer" : "grab";
    };
    const onClick = (event: MouseEvent) => {
      if (pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 7) return;
      const hit = intersect(event);
      const layerID = hit?.userData.layerID as number | undefined;
      const facetID = hit?.userData.facetID as string | undefined;
      if (layerID !== undefined) setSelectedID(layerID);
      if (layerID !== undefined && facetID !== undefined) openFacet(layerID, facetID);
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("click", onClick);

    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      targetRing.rotation.z += .0025;
      renderer.render(scene, camera);
      canvas.dataset.threeReady = "true";
    };
    animate();
    const initialLayer = [...model.layers].sort((left, right) => right.share - left.share)[0] ?? model.layers[0];
    const initialFacet = initialLayer.facets.toSorted((left, right) => right.share - left.share)[0];
    applyWorldSelection(architecture, initialLayer.id, initialFacet?.id);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("click", onClick);
      controls.dispose();
      controlsRef.current = null;
      architectureRef.current = null;
      disposeWorld(scene);
      renderer.dispose();
      delete canvas.dataset.layerCount;
      delete canvas.dataset.facetCount;
      delete canvas.dataset.nodeCount;
    };
  }, [model]);

  const resetView = () => controlsRef.current?.reset();

  return <section className="disable-tower" aria-labelledby="tower-title">
    <canvas ref={canvasRef} aria-label="3D 世界层级归因塔" />
    <header className="tower-heading"><div><Layers3 size={17} /><div><p>五重世界仪 · 比例与权力的解剖</p><h3 id="tower-title">3D 世界约束塔</h3></div></div><button aria-label="重置3D视角" title="重置视角" onClick={resetView}><Box size={16} /></button></header>
    <div className="tower-target"><Crosshair size={14} /><span>当前问题</span><strong>{model.target}</strong></div>
    <nav className="tower-layers" aria-label="3D层级选择">{model.layers.map((layer, index) => {
      const art = worldArt[layer.domain];
      return <button style={{ "--layer-color": `#${art.color.toString(16).padStart(6, "0")}` } as CSSProperties} aria-label={`${String(index + 1).padStart(2, "0")}${layer.label}${layer.share}%`} aria-pressed={selected?.id === layer.id} className={selected?.id === layer.id ? "is-active" : ""} onClick={() => selectLayer(layer.id)} key={layer.id}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{layer.label}</strong><em>{art.latin} · {art.metaphor}</em></div><b>{layer.share}%</b></button>;
    })}</nav>
    {selected && selectedFacet && <aside className="tower-detail" style={{ "--layer-color": `#${worldArt[selected.domain].color.toString(16).padStart(6, "0")}` } as CSSProperties}>
      <header><i style={{ background: `#${selected.color.toString(16).padStart(6, "0")}` }} /><span>第 {model.layers.findIndex((layer) => layer.id === selected.id) + 1} 层</span><strong>{selected.share}% 归因</strong></header>
      <h4>{selected.label}</h4><p>{selected.description}</p>
      <p className="tower-material"><strong>{worldArt[selected.domain].material}</strong><span>{worldArt[selected.domain].colorMeaning}</span></p>
      <div className="tower-ceiling"><span>层级天花板</span><strong>{Math.round(selected.ceilingStrength * 100)}</strong></div>
      <div className="tower-facets" aria-label={`${selected.label}子区域`}>{selected.facets.map((facet) => <button aria-pressed={facet.id === selectedFacet.id} className={facet.id === selectedFacet.id ? "is-active" : ""} onClick={() => openFacet(selected.id, facet.id)} key={facet.id}><span>{facet.label}</span><b>{facet.share}%</b></button>)}</div>
      <div className="tower-pinpoint"><header><span>问题定位</span><strong>{selectedFacet.label}</strong><b>{selectedFacet.share}%</b></header><p>{selectedFacet.description}</p>{selected.nodes.filter((node) => node.facetID === selectedFacet.id).map((node) => <span key={node.id}>{node.label} · {interventionLabels[node.intervention]}</span>)}<button className="tower-open-dossier" onClick={() => setDossierOpen(true)}><BookOpen size={13} />打开制度卷宗</button></div>
    </aside>}
    {selected && selectedFacet && <WorldDossierDrawer layer={selected} facet={selectedFacet} open={dossierOpen} onClose={() => setDossierOpen(false)} />}
    {unsupported && <p className="tower-fallback">此设备无法启用 WebGL，完整归因仍可在下方查看。</p>}
  </section>;
}