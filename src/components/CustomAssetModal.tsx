import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { Box, Image as ImageIcon, RotateCw, Upload, X } from 'lucide-react';
import { customAssetRegistry } from '../game/customAssets';
import { buildCustomPreviewModel } from '../game/furnitureFactory';
import {
  CustomFinishKind,
  CustomShapeKind,
  FurnitureDef,
} from '../game/types';

interface CustomAssetModalProps {
  initialMode: 'import' | 'create';
  onClose: () => void;
  onAddCustomDef: (def: FurnitureDef) => void;
}

const SHAPE_OPTIONS: { id: Exclude<CustomShapeKind, 'imported'>; label: string; w: number; d: number; h: number }[] = [
  { id: 'table', label: 'Table / Desk', w: 1.4, d: 0.8, h: 0.75 },
  { id: 'cabinet', label: 'Cabinet / Unit', w: 1.2, d: 0.5, h: 0.9 },
  { id: 'ottoman', label: 'Round Ottoman', w: 0.75, d: 0.75, h: 0.45 },
  { id: 'vase', label: 'Sculpted Vase', w: 0.34, d: 0.34, h: 0.42 },
  { id: 'sculpture', label: 'Pedestal Art', w: 0.48, d: 0.48, h: 1.15 },
  { id: 'framed_art', label: 'Framed Artwork', w: 0.9, d: 0.08, h: 1.1 },
];

const FINISH_OPTIONS: { id: CustomFinishKind; label: string }[] = [
  { id: 'wood', label: 'Warm Wood' },
  { id: 'matte', label: 'Matte Plaster' },
  { id: 'ceramic', label: 'Gloss Ceramic' },
  { id: 'metal', label: 'Brushed Metal' },
  { id: 'glass', label: 'Frosted Glass' },
];

function disposeThreeTree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Line || obj instanceof THREE.Points) {
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const m of mats) {
        if (!m) continue;
        for (const value of Object.values(m)) {
          if (
            value &&
            typeof value === 'object' &&
            'isTexture' in value &&
            (value as THREE.Texture).isTexture &&
            !(value as THREE.Texture).userData?.isExternallyManaged
          ) {
            (value as THREE.Texture).dispose();
          }
        }
        m.dispose();
      }
    }
    obj.dispose();
  });
}

export const CustomAssetModal: React.FC<CustomAssetModalProps> = ({
  initialMode,
  onClose,
  onAddCustomDef,
}) => {
  const [mode, setMode] = useState<'import' | 'create'>(initialMode);

  // Import 3D file state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importName, setImportName] = useState('');
  const [importHeight, setImportHeight] = useState(0.85);
  const [importAsTabletop, setImportAsTabletop] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreviewDims, setImportPreviewDims] = useState<{ w: number; d: number; h: number } | null>(null);
  const [importParsing, setImportParsing] = useState(false);

  // Custom 3D creator state
  const [customName, setCustomName] = useState('Cozy Side Table');
  const [shape, setShape] = useState<Exclude<CustomShapeKind, 'imported'>>('table');
  const [widthM, setWidthM] = useState(1.4);
  const [depthM, setDepthM] = useState(0.8);
  const [heightM, setHeightM] = useState(0.75);
  const [finish, setFinish] = useState<CustomFinishKind>('wood');
  const [primaryColor, setPrimaryColor] = useState('#B5895A');
  const [accentColor, setAccentColor] = useState('#CFA255');
  const [wallMountArt, setWallMountArt] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewArtTex, setPreviewArtTex] = useState<THREE.Texture | null>(null);
  const [createBusy, setCreateBusy] = useState(false);

  // Live 3D preview viewport refs & state
  const previewMountRef = useRef<HTMLDivElement | null>(null);
  const previewStageRef = useRef<THREE.Group | null>(null);
  const previewCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const previewControlsRef = useRef<OrbitControls | null>(null);
  const importedRawTemplateRef = useRef<THREE.Object3D | null>(null);
  const autoSpinRef = useRef(true);
  const [autoSpin, setAutoSpin] = useState(true);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  // Helper to cleanly frame camera around any preview object
  const framePreviewObject = (obj: THREE.Object3D) => {
    const cam = previewCameraRef.current;
    const ctrl = previewControlsRef.current;
    if (!cam || !ctrl) return;
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) return;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z, 0.35);
    const dist = maxDim * 1.95;
    ctrl.target.copy(center);
    cam.position.set(center.x + dist * 0.78, center.y + dist * 0.52, center.z + dist * 0.85);
    cam.lookAt(center);
    ctrl.update();
  };

  // Mount isolated live 3D Preview WebGL Canvas once
  useEffect(() => {
    const container = previewMountRef.current;
    if (!container) return;

    const width = Math.max(240, container.clientWidth || 320);
    const height = Math.max(240, container.clientHeight || 300);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#EFE7DA');

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.05, 50);
    camera.position.set(2.1, 1.45, 2.3);
    previewCameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio RoomEnvironment IBL for realistic metal, ceramic, and glass previews
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmrem.dispose();
    scene.environment = envTex;
    scene.environmentIntensity = 0.65;

    // Cozy studio three-point lighting
    const hemi = new THREE.HemisphereLight('#FFF8EC', '#B9A58D', 1.15);
    scene.add(hemi);

    const key = new THREE.DirectionalLight('#FFF1DC', 1.5);
    key.position.set(3.2, 5.2, 3.6);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.bias = -0.0005;
    scene.add(key);

    const rim = new THREE.DirectionalLight('#D9E7F2', 0.55);
    rim.position.set(-3.5, 2.6, -3.0);
    scene.add(rim);

    // Subtle cozy stone turntable plinth + 0.5m scale grid
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.52, 0.06, 40),
      new THREE.MeshStandardMaterial({ color: '#E2D6C3', roughness: 0.86, metalness: 0.02 }),
    );
    plinth.position.y = -0.03;
    plinth.receiveShadow = true;
    scene.add(plinth);

    const grid = new THREE.GridHelper(2.4, 8, '#B89E82', '#D4C5B0');
    grid.position.y = 0.002;
    scene.add(grid);

    const stage = new THREE.Group();
    scene.add(stage);
    previewStageRef.current = stage;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 0.45;
    controls.maxDistance = 8.5;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 0.42, 0);
    controls.update();
    previewControlsRef.current = controls;

    const timer = new THREE.Timer();
    timer.connect(document);

    renderer.setAnimationLoop(() => {
      timer.update();
      const dt = Math.min(timer.getDelta(), 0.05);
      if (autoSpinRef.current && previewStageRef.current) {
        previewStageRef.current.rotation.y += 0.45 * dt;
      }
      controls.update();
      renderer.render(scene, camera);
    });

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const cw = Math.max(200, container.clientWidth);
      const ch = Math.max(200, container.clientHeight);
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    });
    ro.observe(container);

    return () => {
      renderer.setAnimationLoop(null);
      timer.dispose();
      ro.disconnect();
      controls.dispose();
      if (previewStageRef.current) {
        disposeThreeTree(previewStageRef.current);
      }
      plinth.geometry.dispose();
      (plinth.material as THREE.Material).dispose();
      plinth.dispose();
      grid.dispose();
      envTex.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      previewStageRef.current = null;
      previewCameraRef.current = null;
      previewControlsRef.current = null;
    };
  }, []);

  // Load uploaded framed-art image into preview texture
  useEffect(() => {
    if (!imageFile) {
      setPreviewArtTex((old) => {
        old?.dispose();
        return null;
      });
      return;
    }
    let cancelled = false;
    const loadArtPreview = async () => {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read image preview.'));
        reader.readAsDataURL(imageFile);
      });
      if (cancelled) return;
      const tex = await new THREE.TextureLoader().loadAsync(dataUrl);
      if (cancelled) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.userData.isExternallyManaged = true;
      tex.needsUpdate = true;
      setPreviewArtTex((old) => {
        old?.dispose();
        return tex;
      });
    };
    void loadArtPreview().catch(() => {
      /* ignore invalid preview image */
    });
    return () => {
      cancelled = true;
    };
  }, [imageFile]);

  // Parse uploaded .glb / .gltf / .obj immediately for live 3D preview!
  useEffect(() => {
    if (!importFile) {
      if (importedRawTemplateRef.current) {
        disposeThreeTree(importedRawTemplateRef.current);
        importedRawTemplateRef.current = null;
      }
      setImportPreviewDims(null);
      return;
    }

    let cancelled = false;
    setImportParsing(true);
    setImportError(null);

    const parsePreview = async () => {
      try {
        const ext = importFile.name.split('.').pop()?.toLowerCase() || '';
        let root: THREE.Object3D;
        if (ext === 'glb' || ext === 'gltf') {
          const buf = await importFile.arrayBuffer();
          const loader = new GLTFLoader();
          const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
            loader.parse(
              buf,
              '',
              (parsed) => resolve(parsed),
              (err) => reject(err instanceof Error ? err : new Error('Unable to preview GLB/GLTF model.')),
            );
          });
          root = gltf.scene;
        } else if (ext === 'obj') {
          const text = await importFile.text();
          const loader = new OBJLoader();
          root = loader.parse(text);
          root.traverse((obj) => {
            if (obj instanceof THREE.Mesh) {
              obj.material = new THREE.MeshStandardMaterial({
                color: '#D8D2C8',
                roughness: 0.62,
                metalness: 0.08,
              });
            }
          });
        } else {
          throw new Error('Unsupported 3D format. Use .glb, .gltf, or .obj.');
        }

        if (cancelled) {
          disposeThreeTree(root);
          return;
        }

        if (importedRawTemplateRef.current) {
          disposeThreeTree(importedRawTemplateRef.current);
        }
        importedRawTemplateRef.current = root;

        // Place normalized preview into stage
        const stage = previewStageRef.current;
        if (stage && mode === 'import') {
          while (stage.children.length > 0) {
            const c = stage.children[0];
            stage.remove(c);
            disposeThreeTree(c);
          }
          const cloned = root.clone(true);
          const wrapper = new THREE.Group();
          wrapper.add(cloned);
          wrapper.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(cloned);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);
          const targetH = Math.max(0.15, Math.min(2.8, importHeight));
          const sf = targetH / Math.max(0.001, size.y);
          cloned.scale.multiplyScalar(sf);
          cloned.position.set(-center.x * sf, -box.min.y * sf, -center.z * sf);
          wrapper.traverse((ch) => {
            if (ch instanceof THREE.Mesh) {
              ch.castShadow = true;
              ch.receiveShadow = true;
            }
          });
          stage.add(wrapper);
          stage.rotation.y = 0;
          const finalBox = new THREE.Box3().setFromObject(wrapper);
          const finalSize = new THREE.Vector3();
          finalBox.getSize(finalSize);
          setImportPreviewDims({
            w: Number(finalSize.x.toFixed(2)),
            d: Number(finalSize.z.toFixed(2)),
            h: Number(finalSize.y.toFixed(2)),
          });
          framePreviewObject(wrapper);
        }
      } catch (err) {
        if (!cancelled) {
          setImportError(err instanceof Error ? err.message : 'Unable to preview 3D model.');
          setImportPreviewDims(null);
        }
      } finally {
        if (!cancelled) setImportParsing(false);
      }
    };

    void parsePreview();
    return () => {
      cancelled = true;
    };
  }, [importFile]);

  // Rebuild live 3D preview whenever mode, parametric specs, colors, or importHeight change
  useEffect(() => {
    const stage = previewStageRef.current;
    if (!stage) return;

    while (stage.children.length > 0) {
      const c = stage.children[0];
      stage.remove(c);
      disposeThreeTree(c);
    }

    if (mode === 'create') {
      const clampedW = Math.max(0.2, Math.min(4.0, Number(widthM) || 0.6));
      const clampedD = Math.max(0.08, Math.min(4.0, Number(depthM) || 0.5));
      const clampedH = Math.max(0.15, Math.min(2.8, Number(heightM) || 0.75));
      const previewDef: FurnitureDef = {
        id: 'preview_custom',
        name: customName || 'Preview',
        category: 'custom',
        width: clampedW,
        depth: clampedD,
        height: clampedH,
        price: 0,
        comfort: 5,
        harmony: 5,
        lighting: 0,
        zoneAffinity: ['living'],
        defaultColor: primaryColor,
        swatches: [primaryColor],
        accentColor,
        customSpec: {
          kind: shape,
          widthM: clampedW,
          depthM: clampedD,
          heightM: clampedH,
          finish,
          accentColor,
        },
      };
      const built = buildCustomPreviewModel(previewDef, primaryColor, false, previewArtTex);
      stage.add(built);
      framePreviewObject(built);
    } else if (importedRawTemplateRef.current) {
      const cloned = importedRawTemplateRef.current.clone(true);
      const wrapper = new THREE.Group();
      wrapper.add(cloned);
      wrapper.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(cloned);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const targetH = Math.max(0.15, Math.min(2.8, importHeight));
      const sf = targetH / Math.max(0.001, size.y);
      cloned.scale.multiplyScalar(sf);
      cloned.position.set(-center.x * sf, -box.min.y * sf, -center.z * sf);
      wrapper.traverse((ch) => {
        if (ch instanceof THREE.Mesh) {
          ch.castShadow = true;
          ch.receiveShadow = true;
        }
      });
      stage.add(wrapper);
      const finalBox = new THREE.Box3().setFromObject(wrapper);
      const finalSize = new THREE.Vector3();
      finalBox.getSize(finalSize);
      setImportPreviewDims({
        w: Number(finalSize.x.toFixed(2)),
        d: Number(finalSize.z.toFixed(2)),
        h: Number(finalSize.y.toFixed(2)),
      });
      framePreviewObject(wrapper);
    }
  }, [mode, shape, widthM, depthM, heightM, finish, primaryColor, accentColor, previewArtTex, importHeight, customName]);

  const handleSelectShape = (nextShape: Exclude<CustomShapeKind, 'imported'>) => {
    setShape(nextShape);
    const preset = SHAPE_OPTIONS.find((s) => s.id === nextShape);
    if (preset) {
      setWidthM(preset.w);
      setDepthM(preset.d);
      setHeightM(preset.h);
      setCustomName(`Cozy ${preset.label}`);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      setImportError('Please select a .glb, .gltf, or .obj file first.');
      return;
    }
    setImportBusy(true);
    setImportError(null);
    try {
      const rec = await customAssetRegistry.importModelFile(
        importFile,
        importHeight,
        importName || undefined,
      );
      const def: FurnitureDef = {
        id: `custom_${rec.id}`,
        name: rec.name,
        category: 'custom',
        width: rec.widthM,
        depth: rec.depthM,
        height: rec.heightM,
        price: 0,
        comfort: 8,
        harmony: 12,
        lighting: 0,
        outdoorAllowed: true,
        tabletopProp: importAsTabletop || rec.heightM <= 0.55,
        allowOverlap: importAsTabletop || rec.heightM <= 0.55,
        zoneAffinity: ['living', 'bedroom', 'study', 'kitchen', 'bath', 'terrace'],
        defaultColor: '#FFFFFF',
        swatches: ['#FFFFFF', '#E5DDD0', '#B5895A', '#5C6F65', '#3B485E', '#2B2E33'],
        accentColor: '#CFA255',
        customSpec: {
          kind: 'imported',
          widthM: rec.widthM,
          depthM: rec.depthM,
          heightM: rec.heightM,
          finish: 'matte',
          accentColor: '#CFA255',
          importedAssetId: rec.id,
        },
      };
      onAddCustomDef(def);
      onClose();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Unable to load 3D model file.');
    } finally {
      setImportBusy(false);
    }
  };

  const handleCreateSubmit = async () => {
    setCreateBusy(true);
    try {
      let imageTextureId: string | undefined;
      if (shape === 'framed_art' && imageFile) {
        imageTextureId = await customAssetRegistry.registerImageTexture(imageFile);
      }

      const id = `custom_gen_${Date.now()}`;
      const isWall = shape === 'framed_art' && wallMountArt;
      const isSmall = !isWall && Math.max(widthM, depthM, heightM) <= 0.65;

      const def: FurnitureDef = {
        id,
        name: customName.trim().slice(0, 28) || 'Custom Piece',
        category: 'custom',
        width: Number(Math.max(0.2, Math.min(4.0, widthM)).toFixed(2)),
        depth: Number(Math.max(0.08, Math.min(4.0, depthM)).toFixed(2)),
        height: Number(Math.max(0.15, Math.min(3.0, heightM)).toFixed(2)),
        surfaceHeight: shape === 'table' || shape === 'cabinet' ? heightM : undefined,
        price: 0,
        comfort: 7,
        harmony: 11,
        lighting: 0,
        wallMount: isWall,
        outdoorAllowed: !isWall,
        tabletopProp: isSmall,
        allowOverlap: isWall || isSmall,
        zoneAffinity: ['living', 'bedroom', 'study', 'kitchen', 'bath', 'terrace'],
        defaultColor: primaryColor,
        swatches: [primaryColor, '#E5DDD0', '#8B6342', '#5C6F65', '#3B485E', '#2B2E33'],
        accentColor,
        customSpec: {
          kind: shape,
          widthM: Number(Math.max(0.2, Math.min(4.0, widthM)).toFixed(2)),
          depthM: Number(Math.max(0.08, Math.min(4.0, depthM)).toFixed(2)),
          heightM: Number(Math.max(0.15, Math.min(3.0, heightM)).toFixed(2)),
          finish,
          accentColor,
          imageTextureId,
        },
      };
      onAddCustomDef(def);
      onClose();
    } finally {
      setCreateBusy(false);
    }
  };

  const dimLabel =
    mode === 'create'
      ? `${Number(widthM || 0).toFixed(2)}m × ${Number(depthM || 0).toFixed(2)}m × H ${Number(heightM || 0).toFixed(2)}m`
      : importPreviewDims
        ? `${importPreviewDims.w.toFixed(2)}m × ${importPreviewDims.d.toFixed(2)}m × H ${importPreviewDims.h.toFixed(2)}m`
        : 'Drop .GLB / .GLTF / .OBJ to preview';

  return (
    <div className="fixed inset-0 z-40 pointer-events-auto bg-[#2C2018]/55 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#FAF5EC] border border-[#D9CBB6] rounded-2xl p-5 shadow-[0_22px_48px_-10px_rgba(51,38,29,0.32)] space-y-4 text-[#33261D] max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E3D6C3] pb-3">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#9C5422]">
              3D Asset Studio · Live Preview
            </p>
            <h2 className="font-display text-lg font-bold text-[#33261D]">
              Import or Design Custom 3D Assets
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#EFE6D7] hover:bg-[#E5D8C3] text-[#6B5644] hover:text-[#33261D] cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#E7DBC8] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              mode === 'create'
                ? 'bg-[#B86B35] text-[#FFFBF5] shadow-xs'
                : 'text-[#6B5644] hover:text-[#33261D]'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Custom 3D Builder</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('import')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              mode === 'import'
                ? 'bg-[#B86B35] text-[#FFFBF5] shadow-xs'
                : 'text-[#6B5644] hover:text-[#33261D]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import 3D (.GLB / .GLTF / .OBJ)</span>
          </button>
        </div>

        {/* 2-COLUMN BODY: LIVE 3D PREVIEW + CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-[290px_1fr] gap-4 items-start">
          {/* LEFT: INTERACTIVE LIVE 3D PREVIEW STAGE */}
          <div className="space-y-2">
            <div className="relative w-full h-[270px] md:h-[320px] rounded-2xl overflow-hidden border border-[#D9CBB6] bg-[#EFE7DA] shadow-inner">
              <div ref={previewMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

              {/* Top-left live dimensions readout */}
              <div className="pointer-events-none absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-[#FAF5EC]/92 border border-[#D9CBB6] text-[10px] font-mono-num font-semibold text-[#33261D]">
                {dimLabel}
              </div>

              {/* Top-right auto-spin button */}
              <button
                type="button"
                onClick={() => setAutoSpin((s) => !s)}
                title={autoSpin ? 'Pause turntable spin' : 'Auto-spin preview'}
                className={`absolute top-2.5 right-2.5 px-2 py-1 rounded-lg text-[10px] font-semibold border flex items-center gap-1 cursor-pointer transition-colors ${
                  autoSpin
                    ? 'bg-[#B86B35] border-[#B86B35] text-[#FFFBF5]'
                    : 'bg-[#FAF5EC]/92 border-[#D9CBB6] text-[#5A4738] hover:text-[#33261D]'
                }`}
              >
                <RotateCw className="w-3 h-3" />
                <span>{autoSpin ? 'Spin' : 'Static'}</span>
              </button>

              {/* Empty state overlay when Import mode has no file yet */}
              {mode === 'import' && !importFile && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-5 bg-[#EFE7DA]/55">
                  <Upload className="w-6 h-6 text-[#B86B35] mb-1.5" />
                  <p className="text-xs font-semibold text-[#33261D]">3D Preview Ready</p>
                  <p className="text-[11px] text-[#6B5644] mt-0.5">
                    Pilih file .GLB / .GLTF / .OBJ di kanan untuk melihat preview 3D secara langsung.
                  </p>
                </div>
              )}

              {mode === 'import' && importParsing && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#EFE7DA]/70">
                  <span className="px-3 py-1.5 rounded-lg bg-[#FAF5EC] border border-[#C48352] text-xs font-semibold text-[#33261D]">
                    Loading 3D Preview...
                  </span>
                </div>
              )}

              {/* Bottom drag hint */}
              <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-md bg-[#33261D]/78 text-[10px] font-mono-num text-[#FFFBF5] whitespace-nowrap">
                Drag Rotate · Scroll Zoom
              </div>
            </div>
          </div>

          {/* RIGHT: FORM CONTROLS */}
          <div>
            {/* TAB A: IMPORT 3D FILE */}
            {mode === 'import' && (
              <div className="space-y-3.5">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) {
                      setImportFile(dropped);
                      setImportName(dropped.name.replace(/\.[^/.]+$/, ''));
                      setImportError(null);
                    }
                  }}
                  className="border border-dashed border-[#C7B398] hover:border-[#B86B35] bg-[#F1E8DA] rounded-xl p-4 text-center cursor-pointer transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".glb,.gltf,.obj"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        setImportFile(f);
                        setImportName(f.name.replace(/\.[^/.]+$/, ''));
                        setImportError(null);
                      }
                    }}
                  />
                  <Upload className="w-5 h-5 text-[#B86B35] mx-auto mb-1.5" />
                  {importFile ? (
                    <p className="text-xs font-semibold text-[#33261D]">
                      Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </p>
                  ) : (
                    <p className="text-xs text-[#5A4738]">
                      Click or drop a <strong className="text-[#33261D]">.GLB</strong>,{' '}
                      <strong className="text-[#33261D]">.GLTF</strong>, or{' '}
                      <strong className="text-[#33261D]">.OBJ</strong> 3D model here
                    </p>
                  )}
                  <p className="text-[11px] text-[#7D6754] mt-1">
                    Auto-centered, grounded flush at y=0, and previewed live before placing.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-xs">
                    <span className="text-[#6B5644] font-medium block">Asset Name</span>
                    <input
                      type="text"
                      value={importName}
                      onChange={(e) => setImportName(e.target.value)}
                      placeholder="e.g. Cozy Armchair"
                      className="w-full px-3 py-2 rounded-lg bg-[#F1E8DA] border border-[#D9CBB6] text-[#33261D] placeholder:text-[#8E7A67] text-xs focus:outline-none focus:border-[#B86B35]"
                    />
                  </label>

                  <label className="space-y-1 text-xs">
                    <span className="text-[#6B5644] font-medium block">Target Height (meters)</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.15"
                      max="2.8"
                      value={importHeight}
                      onChange={(e) => setImportHeight(Math.max(0.15, Math.min(2.8, Number(e.target.value) || 0.85)))}
                      className="w-full px-3 py-2 rounded-lg bg-[#F1E8DA] border border-[#D9CBB6] text-[#33261D] text-xs font-mono-num focus:outline-none focus:border-[#B86B35]"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 text-xs text-[#5A4738] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importAsTabletop}
                    onChange={(e) => setImportAsTabletop(e.target.checked)}
                    className="accent-[#B86B35]"
                  />
                  <span>Treat as small tabletop prop (stack smoothly on tables &amp; counters)</span>
                </label>

                {importError && (
                  <p className="text-xs text-[#8A3229] bg-[#B54B40]/12 border border-[#B54B40]/35 rounded-lg px-3 py-2">
                    {importError}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-[#EFE6D7] hover:bg-[#E5D8C3] text-xs font-medium text-[#33261D] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={importBusy || !importFile}
                    onClick={handleImportSubmit}
                    className="px-5 py-2 rounded-xl bg-[#B86B35] hover:bg-[#A35C2B] disabled:opacity-45 text-xs font-semibold text-[#FFFBF5] cursor-pointer"
                  >
                    {importBusy ? 'Importing...' : 'Add 3D Asset to Catalog'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB B: PARAMETRIC CUSTOM 3D BUILDER */}
            {mode === 'create' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {SHAPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectShape(opt.id)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-medium border text-left cursor-pointer transition-colors ${
                        shape === opt.id
                          ? 'bg-[#B86B35]/14 border-[#B86B35] text-[#33261D] font-semibold'
                          : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#6B5644] hover:text-[#33261D] hover:bg-[#EAE0CE]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1 text-xs">
                    <span className="text-[#6B5644] font-medium block">Name</span>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#F1E8DA] border border-[#D9CBB6] text-[#33261D] text-xs focus:outline-none focus:border-[#B86B35]"
                    />
                  </label>

                  <label className="space-y-1 text-xs">
                    <span className="text-[#6B5644] font-medium block">Surface Finish</span>
                    <select
                      value={finish}
                      onChange={(e) => setFinish(e.target.value as CustomFinishKind)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#F1E8DA] border border-[#D9CBB6] text-[#33261D] text-xs focus:outline-none focus:border-[#B86B35]"
                    >
                      {FINISH_OPTIONS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Exact Width × Depth × Height */}
                <div className="grid grid-cols-3 gap-2.5">
                  <label className="space-y-1 text-xs">
                    <span className="text-[#6B5644] font-medium block">Width (m)</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.2"
                      max="4.0"
                      value={widthM}
                      onChange={(e) => setWidthM(Number(e.target.value) || 0.6)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#F1E8DA] border border-[#D9CBB6] text-[#33261D] text-xs font-mono-num focus:outline-none focus:border-[#B86B35]"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-[#6B5644] font-medium block">Depth (m)</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.08"
                      max="4.0"
                      value={depthM}
                      onChange={(e) => setDepthM(Number(e.target.value) || 0.5)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#F1E8DA] border border-[#D9CBB6] text-[#33261D] text-xs font-mono-num focus:outline-none focus:border-[#B86B35]"
                    />
                  </label>
                  <label className="space-y-1 text-xs">
                    <span className="text-[#6B5644] font-medium block">Height (m)</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.15"
                      max="2.8"
                      value={heightM}
                      onChange={(e) => setHeightM(Number(e.target.value) || 0.75)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#F1E8DA] border border-[#D9CBB6] text-[#33261D] text-xs font-mono-num focus:outline-none focus:border-[#B86B35]"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-[#5A4738] cursor-pointer">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer"
                    />
                    <span>Primary Color</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#5A4738] cursor-pointer">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-7 h-7 rounded bg-transparent border-0 cursor-pointer"
                    />
                    <span>Trim / Accent</span>
                  </label>
                </div>

                {shape === 'framed_art' && (
                  <div className="p-3 rounded-xl bg-[#F1E8DA] border border-[#D9CBB6] space-y-2">
                    <label className="flex items-center gap-2 text-xs text-[#33261D] font-medium cursor-pointer">
                      <ImageIcon className="w-4 h-4 text-[#B86B35]" />
                      <span>{imageFile ? `Artwork: ${imageFile.name}` : 'Upload Custom Poster / Photo (PNG/JPG)'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[#6B5644] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wallMountArt}
                        onChange={(e) => setWallMountArt(e.target.checked)}
                        className="accent-[#B86B35]"
                      />
                      <span>Mount flush on wall (uncheck to place on tables or floor)</span>
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-[#EFE6D7] hover:bg-[#E5D8C3] text-xs font-medium text-[#33261D] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={createBusy}
                    onClick={handleCreateSubmit}
                    className="px-5 py-2 rounded-xl bg-[#B86B35] hover:bg-[#A35C2B] disabled:opacity-45 text-xs font-semibold text-[#FFFBF5] cursor-pointer"
                  >
                    {createBusy ? 'Building...' : 'Create & Place 3D Model'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
