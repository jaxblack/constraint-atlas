"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Box, Crosshair, Layers3 } from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Analysis } from "./analysis";
import { buildDisableTower } from "./disableTowerModel";
import WorldDossierDrawer from "./WorldDossierDrawer";

const interventionLabels = { accept: "接受边界", train: "升级能力", acquire: "获取资源", negotiate: "协商合作", reroute: "绕路/换系统", wait: "等待窗口", exit: "退出游戏", experiment: "小步验证" } as const;

function geometryFor(kind: Analysis["nodes"][number]["kind"]) {
  switch (kind) {
    case "need": return new THREE.OctahedronGeometry(.24);
    case "constraint": return new THREE.BoxGeometry(.34, .34, .34);
    case "choice": return new THREE.TetrahedronGeometry(.28);
    case "action": return new THREE.ConeGeometry(.24, .48, 5);
    default: return new THREE.SphereGeometry(.23, 20, 14);
  }
}

function addEdges(scene: THREE.Object3D, mesh: THREE.Mesh, color: number, opacity: number) {
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  lines.position.copy(mesh.position);
  lines.rotation.copy(mesh.rotation);
  scene.add(lines);
  return lines;
}

function disposeObject(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
    for (const material of materials) {
      const mapped = material as THREE.Material & { map?: THREE.Texture | null };
      mapped.map?.dispose();
      material.dispose();
    }
  });
}

type FacetVisual = { layerID: number; meshes: THREE.Mesh[]; label: THREE.Sprite };
type LayerVisual = { meshes: THREE.Mesh[] };
const roman = ["I", "II", "III", "IV", "V"];

function labelSprite(text: string, color: number, width = 1.35): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 144;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "rgba(247, 243, 230, .92)";
  context.fillRect(8, 8, 624, 128);
  context.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
  context.lineWidth = 5;
  context.strokeRect(8, 8, 624, 128);
  context.fillStyle = "#332f29";
  context.font = '600 38px "Palatino Linotype", "Microsoft YaHei", serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 320, 74, 585);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.premultiplyAlpha = false;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(width, width * .225, 1);
  sprite.renderOrder = 20;
  return sprite;
}

function applySelection(facets: Map<string, FacetVisual>, layers: Map<number, LayerVisual>, selectedLayerID: number | undefined, selectedFacetID: string | undefined) {
  for (const [layerID, visual] of layers) {
    const active = layerID === selectedLayerID;
    for (const mesh of visual.meshes) {
      const material = mesh.material as THREE.MeshPhysicalMaterial;
      material.opacity = Math.min(.78, mesh.userData.baseOpacity + (active ? .12 : 0));
      material.emissive.set(active ? 0x5d4630 : 0x000000);
      material.emissiveIntensity = active ? .08 : 0;
    }
  }
  for (const [facetID, visual] of facets) {
    const inLayer = visual.layerID === selectedLayerID;
    const active = facetID === selectedFacetID;
    visual.label.visible = inLayer;
    const labelMaterial = visual.label.material as THREE.SpriteMaterial;
    labelMaterial.opacity = active ? 1 : .72;
    visual.label.scale.set(active ? 1.62 : 1.32, active ? .365 : .297, 1);
    for (const mesh of visual.meshes) {
      const material = mesh.material as THREE.MeshPhysicalMaterial;
      material.opacity = Math.min(.96, mesh.userData.baseOpacity + (active ? .42 : inLayer ? .1 : 0));
      material.emissive.set(active ? 0xc88a36 : 0x000000);
      material.emissiveIntensity = active ? .3 : 0;
      mesh.scale.y = active ? 1.65 : 1;
    }
  }
}

export default function DisableTower3D({ input }: { input: Analysis }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const facetVisualsRef = useRef(new Map<string, FacetVisual>());
  const layerVisualsRef = useRef(new Map<number, LayerVisual>());
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
    applySelection(facetVisualsRef.current, layerVisualsRef.current, selectedID, selectedFacetID);
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

    const clickable: THREE.Object3D[] = [];
    const targetPoints: THREE.Vector3[] = [];
    const facetVisuals = new Map<string, FacetVisual>();
    const layerVisuals = new Map<number, LayerVisual>();
    for (const layer of model.layers) {
      const group = new THREE.Group();
      group.userData.layerID = layer.id;
      scene.add(group);

      const layerMeshes: THREE.Mesh[] = [];

      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(layer.width + .24, .15, layer.depth + .24),
        new THREE.MeshPhysicalMaterial({ color: layer.color, transparent: true, opacity: .2, roughness: .72, metalness: .08, clearcoat: .18 }),
      );
      plinth.position.y = layer.y - .1;
      plinth.userData.layerID = layer.id;
      plinth.userData.baseOpacity = .2;
      group.add(plinth);
      layerMeshes.push(plinth);
      clickable.push(plinth);
      addEdges(group, plinth, layer.color, .82);

      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(layer.width, .08, layer.depth),
        new THREE.MeshPhysicalMaterial({ color: layer.color, transparent: true, opacity: .27, roughness: .58, metalness: .12, clearcoat: .4 }),
      );
      floor.position.y = layer.y;
      floor.receiveShadow = true;
      floor.userData.layerID = layer.id;
      floor.userData.baseOpacity = .27;
      group.add(floor);
      layerMeshes.push(floor);
      clickable.push(floor);
      addEdges(group, floor, layer.color, .92);

      const ceilingThickness = .055 + layer.ceilingStrength * .17;
      const ceiling = new THREE.Mesh(
        new THREE.BoxGeometry(layer.width * .96, ceilingThickness, layer.depth * .92),
        new THREE.MeshPhysicalMaterial({ color: layer.color, transparent: true, opacity: .13 + layer.ceilingStrength * .28, roughness: .28, metalness: .18, clearcoat: .55 }),
      );
      ceiling.position.y = layer.y + 1.18;
      ceiling.userData.layerID = layer.id;
      ceiling.userData.baseOpacity = .13 + layer.ceilingStrength * .28;
      group.add(ceiling);
      layerMeshes.push(ceiling);
      clickable.push(ceiling);
      addEdges(group, ceiling, layer.color, .68 + layer.ceilingStrength * .24);

      const layerLabel = labelSprite(`${roman[layer.id - 1]} · ${layer.label}`, layer.color, 2.28);
      layerLabel.position.set(-layer.width / 2 + 1.18, layer.y + .34, layer.depth / 2 + .18);
      group.add(layerLabel);

      for (const [facetIndex, facet] of layer.facets.entries()) {
        const facetColor = new THREE.Color(layer.color).offsetHSL((facetIndex - 2) * .012, 0, (facetIndex - 2) * .025);
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(facet.width, .07, facet.depth),
          new THREE.MeshPhysicalMaterial({ color: facetColor, transparent: true, opacity: facet.share > 0 ? .48 : .22, roughness: .46, metalness: .08, clearcoat: .34 }),
        );
        tile.position.set(facet.x, layer.y + .09, facet.z);
        tile.userData.layerID = layer.id;
        tile.userData.facetID = facet.id;
        tile.userData.baseOpacity = facet.share > 0 ? .48 : .22;
        group.add(tile);
        clickable.push(tile);
        addEdges(group, tile, facetColor.getHex(), facet.share > 0 ? .95 : .58);

        const facetCeiling = new THREE.Mesh(
          new THREE.BoxGeometry(facet.width, Math.max(.04, ceilingThickness * .62), facet.depth),
          new THREE.MeshPhysicalMaterial({ color: facetColor, transparent: true, opacity: .12 + layer.ceilingStrength * .14 + Math.min(facet.share, 40) / 220, roughness: .25, metalness: .18, clearcoat: .62 }),
        );
        facetCeiling.position.set(facet.x, layer.y + 1.18 + ceilingThickness / 2, facet.z);
        facetCeiling.userData.layerID = layer.id;
        facetCeiling.userData.facetID = facet.id;
        facetCeiling.userData.baseOpacity = .12 + layer.ceilingStrength * .14 + Math.min(facet.share, 40) / 220;
        group.add(facetCeiling);
        clickable.push(facetCeiling);
        addEdges(group, facetCeiling, facetColor.getHex(), facet.share > 0 ? .88 : .44);

        const facetLabel = labelSprite(`${facet.label} ${facet.share}%`, facetColor.getHex());
        facetLabel.position.set(facet.x, layer.y + .48, facet.z);
        facetLabel.userData.layerID = layer.id;
        facetLabel.userData.facetID = facet.id;
        group.add(facetLabel);
        clickable.push(facetLabel);
        facetVisuals.set(facet.id, { layerID: layer.id, meshes: [tile, facetCeiling], label: facetLabel });

        if (facet.share > 0) {
          const beacon = new THREE.Mesh(
            new THREE.CylinderGeometry(.075 + Math.sqrt(facet.share) * .012, .075 + Math.sqrt(facet.share) * .012, .32, 16),
            new THREE.MeshStandardMaterial({ color: facetColor, emissive: facetColor, emissiveIntensity: .75, roughness: .28 }),
          );
          beacon.position.set(facet.x, layer.y + .24, facet.z);
          beacon.userData.layerID = layer.id;
          beacon.userData.facetID = facet.id;
          group.add(beacon);
          clickable.push(beacon);
        }
      }

      const x = layer.width / 2 - .16;
      const z = layer.depth / 2 - .16;
      const pillarGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-x, layer.y, -z), new THREE.Vector3(-x, layer.y + 1.18, -z),
        new THREE.Vector3(x, layer.y, -z), new THREE.Vector3(x, layer.y + 1.18, -z),
        new THREE.Vector3(-x, layer.y, z), new THREE.Vector3(-x, layer.y + 1.18, z),
        new THREE.Vector3(x, layer.y, z), new THREE.Vector3(x, layer.y + 1.18, z),
      ]);
      group.add(new THREE.LineSegments(pillarGeometry, new THREE.LineBasicMaterial({ color: layer.color, transparent: true, opacity: .42 })));

      const corePoint = new THREE.Vector3(0, layer.y + .38, 0);
      targetPoints.push(corePoint);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.36, .035, 10, 40), new THREE.MeshBasicMaterial({ color: layer.color, transparent: true, opacity: .8 }));
      ring.position.copy(corePoint);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      layerVisuals.set(layer.id, { meshes: layerMeshes });

      for (const node of layer.nodes) {
        const scale = .82 + Math.sqrt(node.contribution / 100) * 1.1;
        const mesh = new THREE.Mesh(
          geometryFor(node.kind),
          new THREE.MeshStandardMaterial({ color: layer.color, emissive: layer.color, emissiveIntensity: node.contribution > 0 ? .38 : .12, roughness: .34, metalness: .28, transparent: true, opacity: node.contribution > 0 ? .95 : .62 }),
        );
        mesh.position.set(node.x, layer.y + .26, node.z);
        mesh.scale.setScalar(scale);
        mesh.castShadow = true;
        mesh.userData.layerID = layer.id;
        mesh.userData.facetID = node.facetID;
        group.add(mesh);
        clickable.push(mesh);
        if (node.contribution > 0) {
          const start = mesh.position.clone();
          const direction = corePoint.clone().sub(start);
          const length = direction.length();
          const arrow = new THREE.ArrowHelper(direction.normalize(), start, length, layer.color, .2, .11);
          const arrowLine = arrow.line.material as THREE.LineBasicMaterial;
          arrowLine.transparent = true;
          arrowLine.opacity = .55;
          const arrowCone = arrow.cone.material as THREE.MeshBasicMaterial;
          arrowCone.transparent = true;
          arrowCone.opacity = .75;
          group.add(arrow);
        }
      }
    }

    if (targetPoints.length > 1) {
      const shaft = new THREE.Line(new THREE.BufferGeometry().setFromPoints(targetPoints), new THREE.LineBasicMaterial({ color: 0x53675b, transparent: true, opacity: .7 }));
      scene.add(shaft);
    }
    const topLayer = model.layers.at(-1)!;
    const targetY = topLayer.y + 2.35;
    const target = new THREE.Mesh(new THREE.SphereGeometry(.34, 28, 20), new THREE.MeshStandardMaterial({ color: 0xfff7e9, emissive: 0xc55f3d, emissiveIntensity: .9, roughness: .25, metalness: .2 }));
    target.position.set(0, targetY, 0);
    target.castShadow = true;
    scene.add(target);
    const targetRing = new THREE.Mesh(new THREE.TorusGeometry(.66, .035, 10, 60), new THREE.MeshBasicMaterial({ color: 0xc55f3d, transparent: true, opacity: .72 }));
    targetRing.position.copy(target.position);
    targetRing.rotation.x = Math.PI / 2;
    scene.add(targetRing);
    const shaftStart = targetPoints.at(-1)!;
    const shaftDirection = target.position.clone().sub(shaftStart);
    scene.add(new THREE.ArrowHelper(shaftDirection.clone().normalize(), shaftStart, shaftDirection.length(), 0xc55f3d, .3, .16));

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
      return raycaster.intersectObjects(clickable, false)[0]?.object;
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
    facetVisualsRef.current = facetVisuals;
    layerVisualsRef.current = layerVisuals;
    const initialLayer = [...model.layers].sort((left, right) => right.share - left.share)[0] ?? model.layers[0];
    const initialFacet = initialLayer.facets.toSorted((left, right) => right.share - left.share)[0];
    applySelection(facetVisuals, layerVisuals, initialLayer.id, initialFacet?.id);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("click", onClick);
      controls.dispose();
      controlsRef.current = null;
      facetVisualsRef.current.clear();
      layerVisualsRef.current.clear();
      disposeObject(scene);
      renderer.dispose();
      delete canvas.dataset.facetCount;
      delete canvas.dataset.nodeCount;
    };
  }, [model]);

  const resetView = () => controlsRef.current?.reset();

  return <section className="disable-tower" aria-labelledby="tower-title">
    <canvas ref={canvasRef} aria-label="3D 世界层级归因塔" />
    <header className="tower-heading"><div><Layers3 size={17} /><div><p>固定世界坐标</p><h3 id="tower-title">3D 世界约束塔</h3></div></div><button aria-label="重置3D视角" title="重置视角" onClick={resetView}><Box size={16} /></button></header>
    <div className="tower-target"><Crosshair size={14} /><span>当前问题</span><strong>{model.target}</strong></div>
    <nav className="tower-layers" aria-label="3D层级选择">{model.layers.map((layer, index) => <button aria-pressed={selected?.id === layer.id} className={selected?.id === layer.id ? "is-active" : ""} onClick={() => selectLayer(layer.id)} key={layer.id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{layer.label}</strong><b>{layer.share}%</b></button>)}</nav>
    {selected && selectedFacet && <aside className="tower-detail">
      <header><i style={{ background: `#${selected.color.toString(16).padStart(6, "0")}` }} /><span>第 {model.layers.findIndex((layer) => layer.id === selected.id) + 1} 层</span><strong>{selected.share}% 归因</strong></header>
      <h4>{selected.label}</h4><p>{selected.description}</p>
      <div className="tower-ceiling"><span>层级天花板</span><strong>{Math.round(selected.ceilingStrength * 100)}</strong></div>
      <div className="tower-facets" aria-label={`${selected.label}子区域`}>{selected.facets.map((facet) => <button aria-pressed={facet.id === selectedFacet.id} className={facet.id === selectedFacet.id ? "is-active" : ""} onClick={() => openFacet(selected.id, facet.id)} key={facet.id}><span>{facet.label}</span><b>{facet.share}%</b></button>)}</div>
      <div className="tower-pinpoint"><header><span>问题定位</span><strong>{selectedFacet.label}</strong><b>{selectedFacet.share}%</b></header><p>{selectedFacet.description}</p>{selected.nodes.filter((node) => node.facetID === selectedFacet.id).map((node) => <span key={node.id}>{node.label} · {interventionLabels[node.intervention]}</span>)}<button className="tower-open-dossier" onClick={() => setDossierOpen(true)}><BookOpen size={13} />打开制度卷宗</button></div>
    </aside>}
    {selected && selectedFacet && <WorldDossierDrawer layer={selected} facet={selectedFacet} open={dossierOpen} onClose={() => setDossierOpen(false)} />}
    {unsupported && <p className="tower-fallback">此设备无法启用 WebGL，完整归因仍可在下方查看。</p>}
  </section>;
}