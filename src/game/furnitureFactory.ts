import * as THREE from 'three';
import { getFurnitureDef } from './catalog';
import { customAssetRegistry } from './customAssets';
import { ProceduralTextureLibrary } from './textures';
import { CustomFinishKind, FurnitureDef, WallOpeningType, WALL_HEIGHT, WALL_THICKNESS } from './types';

function makeMat(
  color: string | number,
  roughness: number,
  metalness = 0.05,
  extra?: THREE.MeshStandardMaterialParameters,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    ...extra,
  });
}

function addBox(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  recolorable = false,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (recolorable) mesh.userData.recolorable = true;
  parent.add(mesh);
  return mesh;
}

function addCyl(
  parent: THREE.Object3D,
  rt: number,
  rb: number,
  h: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.Material,
  segs = 18,
  recolorable = false,
): THREE.Mesh {
  const geo = new THREE.CylinderGeometry(rt, rb, h, segs);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (recolorable) mesh.userData.recolorable = true;
  parent.add(mesh);
  return mesh;
}

function addContactShadow(
  parent: THREE.Object3D,
  w: number,
  d: number,
  tex: THREE.CanvasTexture,
): void {
  const geo = new THREE.PlaneGeometry(w * 1.12, d * 1.12);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(geo, mat);
  shadow.position.y = 0.006;
  shadow.renderOrder = 1;
  shadow.userData.isContactShadow = true;
  parent.add(shadow);
}

/**
 * Updates the primary customizable color of any placed furniture group cleanly.
 */
export function applyFurnitureColor(group: THREE.Object3D, hexColor: string): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.userData.recolorable) {
      const mat = obj.material;
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        mat.color.set(hexColor);
      }
    }
  });
}

/**
 * Builds a rich, composite 3–12 part procedural 3D model for any catalog furniture item.
 * Every model is pivoted at bottom-center (y = 0) flush with the floor.
 */
export function buildFurnitureModel(
  defId: string,
  colorHex: string,
  textures: ProceduralTextureLibrary,
  isSoftwareGl: boolean,
  customDefs?: Record<string, FurnitureDef>,
): THREE.Group {
  const def = getFurnitureDef(defId, customDefs);
  const group = new THREE.Group();
  group.userData.defId = defId;

  // Handle user-imported 3D assets (.glb / .gltf / .obj) & user-created custom parametric models
  if (def?.customSpec) {
    return buildCustomFurnitureModel(def, colorHex, textures, isSoftwareGl);
  }

  const primaryMat = makeMat(colorHex, 0.72, 0.04);
  const oakMat = makeMat('#8B6342', 0.56, 0.05);
  const darkWoodMat = makeMat('#422E21', 0.48, 0.06);
  const brassMat = makeMat('#CFA255', 0.22, 0.88);
  const chromeMat = makeMat('#D5D9DF', 0.16, 0.92);
  const marbleMat = makeMat('#EFECE6', 0.2, 0.06);
  const linenMat = makeMat('#F3EFE6', 0.86, 0.0);
  const darkMetalMat = makeMat('#2A2D33', 0.38, 0.78);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#DDF0F5',
    roughness: 0.08,
    metalness: 0.05,
    transmission: isSoftwareGl ? 0 : 0.75,
    transparent: true,
    opacity: isSoftwareGl ? 0.36 : 0.92,
    ior: 1.5,
  });

  if (
    def &&
    !def.ceilingMount &&
    !def.wallMount &&
    !def.tabletopProp &&
    defId !== 'area_rug' &&
    defId !== 'round_jute_rug' &&
    defId !== 'bath_mat' &&
    defId !== 'toilet_squat'
  ) {
    addContactShadow(group, def.width * 0.92, def.depth * 0.92, textures.contactShadowTex);
  }

  switch (defId) {
    case 'l_sofa': {
      // Base oak plinth + legs
      addBox(group, 2.74, 0.12, 0.94, 0, 0.16, -0.42, darkWoodMat);
      addBox(group, 1.02, 0.12, 1.02, -0.86, 0.16, 0.44, darkWoodMat);
      for (const [lx, lz] of [
        [-1.28, -0.82],
        [1.28, -0.82],
        [-1.28, 0.86],
        [-0.42, 0.86],
        [1.28, -0.02],
      ]) {
        addCyl(group, 0.032, 0.02, 0.12, lx, 0.06, lz, darkWoodMat, 10);
      }
      // Plush seat cushions (3 across main + chaise)
      addBox(group, 0.88, 0.22, 0.86, -0.88, 0.33, -0.38, primaryMat, true);
      addBox(group, 0.88, 0.22, 0.86, 0.02, 0.33, -0.38, primaryMat, true);
      addBox(group, 0.86, 0.22, 0.86, 0.9, 0.33, -0.38, primaryMat, true);
      addBox(group, 0.94, 0.22, 0.98, -0.88, 0.33, 0.46, primaryMat, true);
      // Backrest & armrests
      addBox(group, 2.78, 0.56, 0.2, 0, 0.52, -0.82, primaryMat, true);
      addBox(group, 0.2, 0.44, 1.82, -1.32, 0.46, 0.04, primaryMat, true);
      addBox(group, 0.2, 0.44, 0.96, 1.32, 0.46, -0.4, primaryMat, true);
      // Contrast throw pillows
      const pillowMat = makeMat('#E5DDD0', 0.88, 0.0);
      const p1 = addBox(group, 0.38, 0.34, 0.14, -0.96, 0.58, -0.62, pillowMat);
      p1.rotation.set(-0.18, 0.28, 0.08);
      const p2 = addBox(group, 0.38, 0.34, 0.14, 0.95, 0.58, -0.62, makeMat('#C69058', 0.85, 0.0));
      p2.rotation.set(-0.2, -0.32, -0.06);
      break;
    }

    case 'lounge_chair': {
      // Swivel 4-star brushed steel base
      addCyl(group, 0.04, 0.05, 0.22, 0, 0.14, 0, chromeMat, 14);
      for (let i = 0; i < 4; i++) {
        const leg = addBox(group, 0.56, 0.035, 0.045, 0, 0.035, 0, chromeMat);
        leg.rotation.y = (i * Math.PI) / 2 + Math.PI / 4;
      }
      // Molded walnut plywood shell + reclined leather cushions
      const shell = new THREE.Group();
      shell.position.set(0, 0.32, 0.02);
      shell.rotation.x = -0.18;
      addBox(shell, 0.72, 0.06, 0.64, 0, 0, 0, darkWoodMat);
      addBox(shell, 0.68, 0.14, 0.58, 0, 0.09, 0.02, primaryMat, true);
      // Back shell + headrest
      const back = new THREE.Group();
      back.position.set(0, 0.24, -0.28);
      back.rotation.x = -0.24;
      addBox(back, 0.7, 0.54, 0.055, 0, 0.1, -0.04, darkWoodMat);
      addBox(back, 0.64, 0.46, 0.12, 0, 0.1, 0.04, primaryMat, true);
      shell.add(back);
      // Armrests
      addBox(shell, 0.1, 0.22, 0.46, -0.34, 0.14, -0.04, primaryMat, true);
      addBox(shell, 0.1, 0.22, 0.46, 0.34, 0.14, -0.04, primaryMat, true);
      group.add(shell);
      break;
    }

    case 'dining_chair': {
      for (const [lx, lz] of [
        [-0.2, -0.2],
        [0.2, -0.2],
        [-0.2, 0.2],
        [0.2, 0.2],
      ]) {
        const leg = addCyl(group, 0.02, 0.014, 0.44, lx, 0.22, lz, darkWoodMat, 10);
        leg.rotation.z = lx > 0 ? -0.06 : 0.06;
        // Brass ferrules
        addCyl(group, 0.017, 0.014, 0.08, lx * 1.04, 0.04, lz, brassMat, 10);
      }
      addBox(group, 0.48, 0.08, 0.48, 0, 0.46, 0, primaryMat, true);
      // Curved backrest
      const backGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.34, 18, 1, true, Math.PI * 0.65, Math.PI * 0.7);
      const backMat = primaryMat.clone();
      backMat.side = THREE.DoubleSide;
      const backMesh = new THREE.Mesh(backGeo, backMat);
      backMesh.position.set(0, 0.68, 0.02);
      backMesh.castShadow = true;
      backMesh.userData.recolorable = true;
      group.add(backMesh);
      break;
    }

    case 'ottoman_bench': {
      addBox(group, 1.56, 0.16, 0.62, 0, 0.38, 0, primaryMat, true);
      addBox(group, 1.5, 0.05, 0.56, 0, 0.28, 0, oakMat);
      // Button tufts
      for (const tx of [-0.48, 0, 0.48]) {
        addCyl(group, 0.028, 0.028, 0.02, tx, 0.465, 0, brassMat, 10);
      }
      for (const [lx, lz] of [
        [-0.66, -0.22],
        [0.66, -0.22],
        [-0.66, 0.22],
        [0.66, 0.22],
      ]) {
        addCyl(group, 0.032, 0.024, 0.28, lx, 0.14, lz, oakMat, 12);
      }
      // Brass stretcher bar
      addCyl(group, 0.012, 0.012, 1.32, 0, 0.12, 0, brassMat, 10).rotation.z = Math.PI / 2;
      break;
    }

    case 'marble_coffee_table': {
      // Sculpted travertine slab + fluted pillar legs + brass tray + decor book
      const top = addBox(group, 1.62, 0.075, 0.76, 0, 0.39, 0, primaryMat, true);
      top.material = primaryMat;
      addCyl(group, 0.16, 0.18, 0.35, -0.48, 0.175, 0, primaryMat, 16, true);
      addCyl(group, 0.16, 0.18, 0.35, 0.48, 0.175, 0, primaryMat, 16, true);
      // Lower brass inlay trim
      addBox(group, 1.0, 0.02, 0.26, 0, 0.12, 0, brassMat);
      // Styled coffee table books + small ceramic bowl
      addBox(group, 0.34, 0.04, 0.26, -0.34, 0.45, 0.05, makeMat('#2F3C4B', 0.65, 0.05));
      addBox(group, 0.28, 0.035, 0.22, -0.32, 0.488, 0.04, makeMat('#D99B4E', 0.62, 0.05));
      addCyl(group, 0.11, 0.07, 0.07, 0.36, 0.46, -0.04, makeMat('#53695E', 0.35, 0.08), 16);
      break;
    }

    case 'oak_dining_table': {
      // Thick beveled wood tabletop
      addBox(group, 2.52, 0.08, 1.36, 0, 0.74, 0, primaryMat, true);
      // Architectural A-frame trestle legs
      for (const sx of [-0.95, 0.95]) {
        const l1 = addBox(group, 0.09, 0.74, 0.09, sx, 0.36, -0.38, darkWoodMat);
        l1.rotation.x = 0.22;
        const l2 = addBox(group, 0.09, 0.74, 0.09, sx, 0.36, 0.38, darkWoodMat);
        l2.rotation.x = -0.22;
        addBox(group, 0.08, 0.07, 0.96, sx, 0.2, 0, darkWoodMat);
      }
      addBox(group, 1.98, 0.07, 0.08, 0, 0.22, 0, darkWoodMat);
      // Linen table runner + centerpiece ceramic vase
      addBox(group, 2.1, 0.008, 0.34, 0, 0.785, 0, linenMat);
      const vasePts = [
        new THREE.Vector2(0.0, 0),
        new THREE.Vector2(0.08, 0),
        new THREE.Vector2(0.11, 0.12),
        new THREE.Vector2(0.06, 0.24),
        new THREE.Vector2(0.075, 0.29),
      ];
      const vase = new THREE.Mesh(new THREE.LatheGeometry(vasePts, 18), makeMat('#E4DDD1', 0.35, 0.06));
      vase.position.set(0, 0.79, 0);
      vase.castShadow = true;
      group.add(vase);
      break;
    }

    case 'architect_desk': {
      // Desktop + dual pedestals + brass pulls + studio monitor + desk mat
      addBox(group, 1.78, 0.06, 0.82, 0, 0.73, 0, primaryMat, true);
      addBox(group, 0.42, 0.68, 0.72, -0.64, 0.35, 0, primaryMat, true);
      addBox(group, 0.42, 0.68, 0.72, 0.64, 0.35, 0, primaryMat, true);
      // Drawer grooves & brass handles
      for (const sx of [-0.64, 0.64]) {
        for (const dy of [0.22, 0.42, 0.6]) {
          addBox(group, 0.12, 0.018, 0.025, sx, dy, 0.37, brassMat);
        }
      }
      // Leather desk pad & keyboard
      addBox(group, 0.68, 0.008, 0.36, 0, 0.764, 0.12, darkMetalMat);
      addBox(group, 0.34, 0.016, 0.12, 0, 0.775, 0.14, chromeMat);
      // Ultrawide architectural display
      addBox(group, 0.05, 0.24, 0.04, 0, 0.88, -0.22, chromeMat);
      addBox(group, 0.22, 0.018, 0.16, 0, 0.77, -0.2, chromeMat);
      addBox(group, 0.82, 0.38, 0.03, 0, 1.04, -0.2, darkMetalMat);
      const screenMat = new THREE.MeshStandardMaterial({
        map: textures.tvScreenTex,
        emissive: '#3B5670',
        emissiveIntensity: 0.45,
        roughness: 0.2,
      });
      addBox(group, 0.78, 0.34, 0.01, 0, 1.04, -0.18, screenMat);
      break;
    }

    case 'nightstand': {
      addBox(group, 0.62, 0.4, 0.52, 0, 0.36, 0, primaryMat, true);
      addBox(group, 0.64, 0.03, 0.54, 0, 0.57, 0, marbleMat);
      for (const [lx, lz] of [
        [-0.25, -0.2],
        [0.25, -0.2],
        [-0.25, 0.2],
        [0.25, 0.2],
      ]) {
        addCyl(group, 0.02, 0.015, 0.16, lx, 0.08, lz, brassMat, 10);
      }
      addCyl(group, 0.024, 0.024, 0.025, 0, 0.44, 0.27, brassMat, 12).rotation.x = Math.PI / 2;
      addCyl(group, 0.024, 0.024, 0.025, 0, 0.27, 0.27, brassMat, 12).rotation.x = Math.PI / 2;
      break;
    }

    case 'king_bed': {
      // Wood platform frame
      addBox(group, 1.88, 0.18, 2.66, 0, 0.18, 0, oakMat);
      for (const [lx, lz] of [
        [-0.86, -1.24],
        [0.86, -1.24],
        [-0.86, 1.24],
        [0.86, 1.24],
      ]) {
        addCyl(group, 0.04, 0.03, 0.12, lx, 0.06, lz, darkWoodMat, 10);
      }
      // Channel-tufted headboard
      addBox(group, 1.92, 1.08, 0.14, 0, 0.66, -1.28, primaryMat, true);
      for (let i = -3; i <= 3; i++) {
        addBox(group, 0.22, 0.94, 0.06, i * 0.25, 0.68, -1.19, primaryMat, true);
      }
      // Crisp white mattress + folded textured duvet
      addBox(group, 1.76, 0.24, 2.38, 0, 0.38, 0.04, linenMat);
      addBox(group, 1.82, 0.14, 1.56, 0, 0.48, 0.42, primaryMat, true);
      // 4 plush pillows
      const pMat1 = makeMat('#F7F4EE', 0.88, 0.0);
      const pMat2 = makeMat('#C89E68', 0.84, 0.0);
      addBox(group, 0.68, 0.18, 0.38, -0.44, 0.58, -0.92, pMat1).rotation.x = 0.24;
      addBox(group, 0.68, 0.18, 0.38, 0.44, 0.58, -0.92, pMat1).rotation.x = 0.24;
      addBox(group, 0.44, 0.16, 0.26, -0.36, 0.56, -0.66, pMat2).rotation.x = 0.28;
      addBox(group, 0.44, 0.16, 0.26, 0.36, 0.56, -0.66, pMat2).rotation.x = 0.28;
      break;
    }

    case 'wardrobe': {
      // Plinth + tall cabinet body + fluted doors + long brass pulls
      addBox(group, 1.66, 0.12, 0.68, 0, 0.06, 0, darkWoodMat);
      addBox(group, 1.72, 1.98, 0.72, 0, 1.11, 0, primaryMat, true);
      addBox(group, 1.76, 0.06, 0.76, 0, 2.13, 0, darkWoodMat);
      // Center seam + brass handles
      addBox(group, 0.015, 1.94, 0.02, 0, 1.11, 0.36, darkWoodMat);
      addBox(group, 0.022, 0.68, 0.04, -0.08, 1.12, 0.38, brassMat);
      addBox(group, 0.022, 0.68, 0.04, 0.08, 1.12, 0.38, brassMat);
      break;
    }

    case 'kitchen_island': {
      // Recessed dark toe-kick + main fluted cabinetry + waterfall marble top + sink + gooseneck faucet
      addBox(group, 2.54, 0.1, 0.72, 0, 0.05, 0, darkMetalMat);
      addBox(group, 2.66, 0.78, 0.82, 0, 0.49, 0, primaryMat, true);
      // Waterfall marble top & side cheeks
      addBox(group, 2.78, 0.075, 0.92, 0, 0.91, 0, marbleMat);
      addBox(group, 0.07, 0.92, 0.92, -1.36, 0.46, 0, marbleMat);
      addBox(group, 0.07, 0.92, 0.92, 1.36, 0.46, 0, marbleMat);
      // Recessed stainless sink basin
      addBox(group, 0.68, 0.04, 0.48, -0.45, 0.935, 0, makeMat('#7E848C', 0.25, 0.85));
      // Gooseneck brass faucet via TubeGeometry
      const faucetCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.45, 0.94, -0.32),
        new THREE.Vector3(-0.45, 1.24, -0.32),
        new THREE.Vector3(-0.45, 1.3, -0.18),
        new THREE.Vector3(-0.45, 1.18, -0.06),
      ]);
      const faucet = new THREE.Mesh(new THREE.TubeGeometry(faucetCurve, 18, 0.016, 10, false), brassMat);
      faucet.castShadow = true;
      group.add(faucet);
      // Brass cabinet pulls
      for (const px of [-0.85, 0.0, 0.85]) {
        addBox(group, 0.22, 0.02, 0.03, px, 0.72, 0.42, brassMat);
      }
      // Fruit bowl accent
      addCyl(group, 0.16, 0.1, 0.08, 0.68, 0.99, 0.06, makeMat('#3B4248', 0.45, 0.12), 18);
      break;
    }

    case 'chef_range': {
      addBox(group, 1.78, 0.88, 0.8, 0, 0.44, 0, primaryMat, true);
      addBox(group, 1.82, 0.05, 0.84, 0, 0.9, 0, marbleMat);
      // Induction glass cooktop + burner rings
      addBox(group, 0.88, 0.018, 0.62, 0, 0.93, 0, darkMetalMat);
      for (const [bx, bz] of [
        [-0.22, -0.14],
        [0.22, -0.14],
        [-0.22, 0.15],
        [0.22, 0.15],
      ]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 8, 20), chromeMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(bx, 0.942, bz);
        group.add(ring);
      }
      // Oven door + steel bar handle + knobs
      addBox(group, 0.78, 0.56, 0.03, 0, 0.44, 0.41, darkMetalMat);
      addBox(group, 0.64, 0.34, 0.015, 0, 0.44, 0.425, glassMat);
      addBox(group, 0.68, 0.028, 0.04, 0, 0.76, 0.43, chromeMat);
      // Overhead range hood
      addBox(group, 1.05, 0.16, 0.56, 0, 1.72, -0.1, chromeMat);
      addBox(group, 0.42, 0.42, 0.34, 0, 1.98, -0.2, chromeMat);
      break;
    }

    case 'retro_fridge': {
      addBox(group, 0.76, 0.08, 0.72, 0, 0.04, 0, darkMetalMat);
      addBox(group, 0.8, 1.24, 0.74, 0, 1.32, 0, primaryMat, true);
      addBox(group, 0.8, 0.6, 0.74, 0, 0.38, 0, primaryMat, true);
      // Chrome handles & emblem bar
      addBox(group, 0.035, 0.36, 0.05, 0.28, 1.18, 0.39, chromeMat);
      addBox(group, 0.035, 0.24, 0.05, 0.28, 0.48, 0.39, chromeMat);
      addBox(group, 0.24, 0.025, 0.02, 0, 1.74, 0.38, chromeMat);
      break;
    }

    case 'espresso_bar': {
      addBox(group, 1.62, 0.82, 0.62, 0, 0.45, 0, primaryMat, true);
      addBox(group, 1.66, 0.045, 0.66, 0, 0.88, 0, marbleMat);
      for (const [lx, lz] of [
        [-0.72, -0.24],
        [0.72, -0.24],
        [-0.72, 0.24],
        [0.72, 0.24],
      ]) {
        addCyl(group, 0.022, 0.016, 0.14, lx, 0.07, lz, brassMat, 10);
      }
      // Chrome espresso machine + bean grinder + cups
      addBox(group, 0.44, 0.36, 0.34, -0.25, 1.08, -0.05, chromeMat);
      addBox(group, 0.42, 0.04, 0.16, -0.25, 0.92, 0.12, darkMetalMat);
      addCyl(group, 0.04, 0.03, 0.07, -0.32, 0.97, 0.12, linenMat, 12);
      addCyl(group, 0.04, 0.03, 0.07, -0.18, 0.97, 0.12, linenMat, 12);
      addCyl(group, 0.09, 0.07, 0.28, 0.28, 1.04, -0.06, darkMetalMat, 14);
      addCyl(group, 0.09, 0.04, 0.12, 0.28, 1.24, -0.06, glassMat, 14);
      break;
    }

    case 'soaking_tub': {
      // Sculpted oval soaking vessel built from scaled cylinders + rim + brass filler
      const outer = addCyl(group, 0.48, 0.4, 0.58, 0, 0.3, 0, primaryMat, 28, true);
      outer.scale.set(1.78, 1, 0.92);
      const inner = addCyl(group, 0.42, 0.35, 0.04, 0, 0.56, 0, makeMat('#BFD8E0', 0.12, 0.08), 24);
      inner.scale.set(1.74, 1, 0.88);
      // Floor-mounted brass tub filler
      addCyl(group, 0.022, 0.026, 0.82, 0.86, 0.41, -0.26, brassMat, 12);
      const spoutCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.86, 0.82, -0.26),
        new THREE.Vector3(0.76, 0.86, -0.16),
        new THREE.Vector3(0.66, 0.78, -0.1),
      ]);
      const spout = new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 12, 0.015, 8, false), brassMat);
      group.add(spout);
      // Wooden bath caddy tray across tub
      addBox(group, 0.24, 0.025, 0.88, -0.12, 0.6, 0, oakMat);
      break;
    }

    case 'marble_vanity': {
      // Floating walnut cabinet + marble counter + vessel sink + brass faucet + backlit mirror
      addBox(group, 1.56, 0.44, 0.56, 0, 0.58, 0, primaryMat, true);
      addBox(group, 1.62, 0.055, 0.6, 0, 0.825, 0, marbleMat);
      // Vessel ceramic basin
      const basin = addCyl(group, 0.22, 0.17, 0.14, 0, 0.92, 0.02, linenMat, 22);
      basin.scale.set(1.25, 1, 0.95);
      addCyl(group, 0.016, 0.018, 0.22, 0, 0.96, -0.2, brassMat, 10);
      // Backlit round architectural mirror
      const haloMat = new THREE.MeshStandardMaterial({
        color: '#FFF4DE',
        emissive: '#FFE8BE',
        emissiveIntensity: 1.1,
        roughness: 0.4,
      });
      const halo = addCyl(group, 0.46, 0.46, 0.02, 0, 1.52, -0.28, haloMat, 28);
      halo.rotation.x = Math.PI / 2;
      const mirror = addCyl(group, 0.42, 0.42, 0.03, 0, 1.52, -0.26, makeMat('#E6EEF2', 0.04, 0.95), 28);
      mirror.rotation.x = Math.PI / 2;
      break;
    }

    case 'toilet_modern': {
      // Sculpted ceramic pedestal + oval bowl + hinged seat/lid + tank with dual-flush + bidet sprayer
      const ceramicMat = primaryMat;
      ceramicMat.roughness = 0.22;
      ceramicMat.metalness = 0.04;
      // Base pedestal
      const ped = addCyl(group, 0.14, 0.17, 0.28, 0, 0.14, 0.02, ceramicMat, 20, true);
      ped.scale.set(0.92, 1, 1.28);
      // Upper bowl
      const bowl = addCyl(group, 0.21, 0.15, 0.2, 0, 0.34, 0.08, ceramicMat, 22, true);
      bowl.scale.set(0.92, 1, 1.24);
      // Seat ring & closed lid
      const seat = addCyl(group, 0.205, 0.205, 0.032, 0, 0.455, 0.08, linenMat, 22);
      seat.scale.set(0.92, 1, 1.22);
      const lid = addCyl(group, 0.195, 0.205, 0.026, 0, 0.482, 0.075, ceramicMat, 22, true);
      lid.scale.set(0.9, 1, 1.2);
      // Rear cistern tank + beveled top cap
      addBox(group, 0.38, 0.42, 0.19, 0, 0.56, -0.22, ceramicMat, true);
      addBox(group, 0.4, 0.035, 0.21, 0, 0.775, -0.22, ceramicMat, true);
      // Chrome dual-flush button
      addCyl(group, 0.028, 0.028, 0.018, 0, 0.798, -0.22, chromeMat, 14);
      // Side jet-washer bidet sprayer + coiled hose
      addBox(group, 0.03, 0.05, 0.03, 0.26, 0.44, -0.26, chromeMat);
      addCyl(group, 0.014, 0.012, 0.1, 0.26, 0.45, -0.23, chromeMat, 10);
      const hoseCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.26, 0.4, -0.23),
        new THREE.Vector3(0.29, 0.22, -0.18),
        new THREE.Vector3(0.24, 0.16, -0.28),
      ]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 12, 0.008, 6, false), chromeMat));
      break;
    }

    case 'toilet_squat': {
      // Indonesian squat toilet on tiled ceramic riser + ribbed footrests + recessed basin + water tap
      const ceramicMat = primaryMat;
      ceramicMat.roughness = 0.24;
      // Low stepped ceramic deck
      addBox(group, 0.72, 0.11, 0.82, 0, 0.055, 0, ceramicMat, true);
      // Inner recessed basin & water trap
      addBox(group, 0.28, 0.025, 0.48, 0, 0.105, 0.04, makeMat('#D9D6CE', 0.25, 0.04));
      const trap = addCyl(group, 0.095, 0.085, 0.02, 0, 0.112, 0.16, makeMat('#92B5C2', 0.12, 0.06), 16);
      trap.scale.set(0.95, 1, 1.3);
      // Dual textured footrest pads
      for (const sx of [-0.21, 0.21]) {
        addBox(group, 0.15, 0.022, 0.34, sx, 0.118, 0.04, linenMat);
        for (let r = -2; r <= 2; r++) {
          addBox(group, 0.12, 0.008, 0.016, sx, 0.132, 0.04 + r * 0.055, makeMat('#CFC9BE', 0.65, 0.02));
        }
      }
      // Front hood splash shield
      const hood = addCyl(group, 0.12, 0.14, 0.08, 0, 0.14, -0.24, ceramicMat, 16, true);
      hood.scale.set(1.1, 1, 0.75);
      // Compact corner chrome tap valve
      addCyl(group, 0.016, 0.016, 0.26, 0.28, 0.22, -0.34, chromeMat, 10);
      addBox(group, 0.025, 0.025, 0.12, 0.28, 0.32, -0.29, brassMat);
      break;
    }

    case 'glass_shower': {
      // Walk-in rainfall shower cubicle: stone base tray, drain, frameless L-glass, overhead rain head & niche
      // Low stone tray + stainless floor drain
      addBox(group, 0.94, 0.07, 0.94, 0, 0.035, 0, marbleMat);
      addBox(group, 0.84, 0.015, 0.84, 0, 0.072, 0, makeMat('#DCD7CE', 0.45, 0.04));
      addBox(group, 0.18, 0.008, 0.05, 0, 0.082, -0.28, chromeMat);

      // Tempered glass screens (left & partial front) with metal framing
      const showerGlass = new THREE.MeshPhysicalMaterial({
        color: '#DDF2F8',
        roughness: 0.06,
        metalness: 0.04,
        transmission: isSoftwareGl ? 0 : 0.78,
        transparent: true,
        opacity: isSoftwareGl ? 0.32 : 0.88,
        ior: 1.48,
      });
      const frameMat = primaryMat;
      frameMat.roughness = 0.32;
      frameMat.metalness = 0.78;

      // Left glass panel
      const leftGlass = addBox(group, 0.02, 2.02, 0.88, -0.45, 1.09, 0, showerGlass);
      leftGlass.castShadow = false;
      addBox(group, 0.038, 2.06, 0.038, -0.45, 1.1, -0.44, frameMat, true);
      addBox(group, 0.038, 2.06, 0.038, -0.45, 1.1, 0.44, frameMat, true);
      addBox(group, 0.038, 0.035, 0.9, -0.45, 2.12, 0, frameMat, true);

      // Partial front glass door + vertical handle
      const frontGlass = addBox(group, 0.56, 2.02, 0.02, -0.17, 1.09, 0.44, showerGlass);
      frontGlass.castShadow = false;
      addBox(group, 0.58, 0.035, 0.038, -0.17, 2.12, 0.44, frameMat, true);
      addBox(group, 0.025, 0.34, 0.06, 0.06, 1.08, 0.46, frameMat, true);

      // Vertical shower riser rail + mixer bar + rainfall overhead head + handheld wand
      addCyl(group, 0.015, 0.015, 1.22, 0, 1.5, -0.41, frameMat, 10, true);
      addBox(group, 0.24, 0.045, 0.065, 0, 0.98, -0.4, frameMat, true);
      // Overhead arm + wide square rainfall head
      addBox(group, 0.026, 0.026, 0.34, 0, 2.09, -0.25, frameMat, true);
      addBox(group, 0.26, 0.022, 0.26, 0, 2.06, -0.1, frameMat, true);
      addBox(group, 0.22, 0.01, 0.22, 0, 2.046, -0.1, chromeMat);
      // Handheld shower wand
      addCyl(group, 0.024, 0.012, 0.16, 0.14, 1.32, -0.37, frameMat, 10, true);
      // Corner shampoo shelf + amber bottles
      addBox(group, 0.28, 0.022, 0.12, -0.24, 1.18, -0.38, marbleMat);
      addCyl(group, 0.026, 0.026, 0.14, -0.3, 1.26, -0.38, makeMat('#A45D35', 0.25, 0.05), 10);
      addCyl(group, 0.024, 0.024, 0.11, -0.2, 1.245, -0.38, makeMat('#5A7463', 0.3, 0.05), 10);
      break;
    }

    case 'bath_tub_bak': {
      // Iconic cozy Bali/Indonesian rounded terrazzo bak mandi + clear water + teak gayung ladle + brass tap
      const terrazzoMat = primaryMat;
      terrazzoMat.roughness = 0.44;
      // Sculpted rounded vessel (outer body + rim)
      addCyl(group, 0.34, 0.26, 0.72, 0, 0.36, 0, terrazzoMat, 26, true);
      addCyl(group, 0.355, 0.345, 0.05, 0, 0.72, 0, terrazzoMat, 26, true);
      // Shimmering clear water surface inside
      const waterMat = new THREE.MeshPhysicalMaterial({
        color: '#88C4D4',
        roughness: 0.08,
        metalness: 0.05,
        transmission: isSoftwareGl ? 0 : 0.6,
        transparent: true,
        opacity: 0.85,
      });
      addCyl(group, 0.295, 0.295, 0.03, 0, 0.66, 0, waterMat, 24);
      // Wooden floating water ladle (gayung) resting on rim
      addCyl(group, 0.075, 0.058, 0.09, 0.08, 0.7, 0.04, oakMat, 14);
      const handle = addBox(group, 0.18, 0.022, 0.028, 0.2, 0.74, 0.04, oakMat);
      handle.rotation.z = 0.24;
      // Tall brass water spout behind vessel
      addCyl(group, 0.018, 0.022, 0.88, 0, 0.44, -0.38, brassMat, 12);
      addBox(group, 0.03, 0.03, 0.2, 0, 0.86, -0.29, brassMat);
      addCyl(group, 0.02, 0.016, 0.05, 0, 0.83, -0.21, brassMat, 10);
      break;
    }

    case 'compact_sink': {
      // Compact ceramic pedestal washbasin + gooseneck brass tap + soap pump + round mirror
      const sinkMat = primaryMat;
      sinkMat.roughness = 0.24;
      // Tapered pedestal column + plinth
      addBox(group, 0.24, 0.06, 0.24, 0, 0.03, -0.08, sinkMat, true);
      addCyl(group, 0.095, 0.115, 0.66, 0, 0.39, -0.08, sinkMat, 18, true);
      // Ceramic basin body + recessed inner bowl
      addBox(group, 0.56, 0.16, 0.44, 0, 0.78, -0.04, sinkMat, true);
      addBox(group, 0.44, 0.025, 0.28, 0, 0.855, -0.01, makeMat('#DCE3E8', 0.18, 0.08));
      // Brass gooseneck faucet + soap dispenser
      addCyl(group, 0.014, 0.018, 0.18, 0, 0.94, -0.19, brassMat, 10);
      addBox(group, 0.022, 0.022, 0.12, 0, 1.02, -0.14, brassMat);
      addCyl(group, 0.028, 0.03, 0.11, 0.19, 0.91, -0.15, makeMat('#A5633A', 0.32, 0.06), 12);
      // Slim wood-framed mirror mounted above
      const mFrame = addCyl(group, 0.27, 0.27, 0.032, 0, 1.38, -0.28, oakMat, 24);
      mFrame.rotation.x = Math.PI / 2;
      const mGlass = addCyl(group, 0.24, 0.24, 0.036, 0, 1.38, -0.275, makeMat('#E6EEF2', 0.04, 0.95), 24);
      mGlass.rotation.x = Math.PI / 2;
      break;
    }

    case 'water_heater': {
      // Wall-mounted electric water heater tank + LED dial + hot/cold braided pipes
      const wz = -0.32;
      const wy = 1.76;
      const bodyMat = primaryMat;
      bodyMat.roughness = 0.28;
      // Sleek rounded horizontal tank housing
      addBox(group, 0.54, 0.34, 0.24, 0, wy, wz, bodyMat, true);
      const leftCap = addCyl(group, 0.17, 0.17, 0.24, -0.27, wy, wz, bodyMat, 18, true);
      leftCap.rotation.x = Math.PI / 2;
      const rightCap = addCyl(group, 0.17, 0.17, 0.24, 0.27, wy, wz, bodyMat, 18, true);
      rightCap.rotation.x = Math.PI / 2;
      // Front black control fascia + glowing warm temperature readout
      addBox(group, 0.24, 0.09, 0.02, 0, wy - 0.03, wz + 0.125, darkMetalMat);
      addBox(
        group,
        0.08,
        0.035,
        0.01,
        0,
        wy - 0.03,
        wz + 0.138,
        makeMat('#FFAE52', 0.2, 0.1, { emissive: '#FF9430', emissiveIntensity: 1.4 }),
      );
      // Hot (red collar) & cold (blue collar) bottom braided copper/chrome pipes
      addCyl(group, 0.014, 0.014, 0.24, -0.1, wy - 0.28, wz, chromeMat, 10);
      addCyl(group, 0.014, 0.014, 0.24, 0.1, wy - 0.28, wz, chromeMat, 10);
      addCyl(group, 0.022, 0.022, 0.03, -0.1, wy - 0.18, wz, makeMat('#C84A3A', 0.4, 0.1), 10);
      addCyl(group, 0.022, 0.022, 0.03, 0.1, wy - 0.18, wz, makeMat('#3B78A8', 0.4, 0.1), 10);
      break;
    }

    case 'bath_mirror_cab': {
      // Wall-mounted bathroom mirror cabinet with warm LED halo + bottom shelf + toiletries
      const wz = -0.36;
      const wy = 1.48;
      // Backlit warm LED halo panel
      const ledMat = new THREE.MeshStandardMaterial({
        color: '#FFF4DE',
        emissive: '#FFE5B4',
        emissiveIntensity: 1.2,
        roughness: 0.35,
      });
      addBox(group, 0.72, 0.68, 0.02, 0, wy, wz - 0.055, ledMat);
      // Wooden cabinet box
      addBox(group, 0.66, 0.62, 0.14, 0, wy, wz, primaryMat, true);
      // Dual reflective mirror doors with fine center seam
      addBox(group, 0.3, 0.58, 0.018, -0.158, wy, wz + 0.075, makeMat('#E6EEF2', 0.04, 0.96));
      addBox(group, 0.3, 0.58, 0.018, 0.158, wy, wz + 0.075, makeMat('#E6EEF2', 0.04, 0.96));
      // Bottom open ledge with toothbrush tumbler & soap bottle
      addBox(group, 0.66, 0.03, 0.17, 0, wy - 0.36, wz + 0.02, primaryMat, true);
      addCyl(group, 0.032, 0.026, 0.09, -0.18, wy - 0.3, wz + 0.03, linenMat, 12);
      addCyl(group, 0.028, 0.028, 0.12, 0.18, wy - 0.285, wz + 0.03, makeMat('#A5633A', 0.28, 0.08), 12);
      break;
    }

    case 'towel_warmer': {
      // Leaning cozy teak/metal ladder rack with 3 draped folded cotton towels
      const ladder = new THREE.Group();
      ladder.position.set(0, 0, -0.06);
      ladder.rotation.x = -0.12;
      // Side rails
      addCyl(ladder, 0.018, 0.018, 1.48, -0.24, 0.74, 0, primaryMat, 10, true);
      addCyl(ladder, 0.018, 0.018, 1.48, 0.24, 0.74, 0, primaryMat, 10, true);
      // Cross rungs + draped towels in cozy terracotta/cream/sage hues
      const towelHues = ['#F2ECE0', '#C68462', '#7B9182'];
      const rungYs = [0.36, 0.68, 1.0, 1.32];
      rungYs.forEach((ry, idx) => {
        const rung = addCyl(ladder, 0.014, 0.014, 0.5, 0, ry, 0, primaryMat, 10, true);
        rung.rotation.z = Math.PI / 2;
        if (idx > 0) {
          const tMat = makeMat(towelHues[(idx - 1) % towelHues.length], 0.9, 0.0);
          addBox(ladder, 0.36, 0.036, 0.07, 0, ry + 0.018, 0, tMat);
          addBox(ladder, 0.36, 0.22, 0.024, 0, ry - 0.09, 0.028, tMat);
          addBox(ladder, 0.36, 0.18, 0.022, 0, ry - 0.07, -0.028, tMat);
        }
      });
      group.add(ladder);
      break;
    }

    case 'bath_cabinet': {
      // Slim tall bathroom linen tower: lower closed cabinet + upper open shelves with rolled towels & jars
      addBox(group, 0.52, 0.92, 0.4, 0, 0.52, 0, primaryMat, true);
      // Tapered wood legs
      for (const [lx, lz] of [
        [-0.21, -0.15],
        [0.21, -0.15],
        [-0.21, 0.15],
        [0.21, 0.15],
      ]) {
        addCyl(group, 0.02, 0.014, 0.08, lx, 0.04, lz, darkWoodMat, 8);
      }
      // Door panel + brass knob
      addBox(group, 0.44, 0.82, 0.024, 0, 0.52, 0.205, primaryMat, true);
      addCyl(group, 0.014, 0.014, 0.03, 0.16, 0.62, 0.228, brassMat, 10);
      // Upper open frame + 3 shelves
      addBox(group, 0.035, 0.86, 0.38, -0.242, 1.41, 0, primaryMat, true);
      addBox(group, 0.035, 0.86, 0.38, 0.242, 1.41, 0, primaryMat, true);
      addBox(group, 0.52, 0.035, 0.38, 0, 1.84, 0, primaryMat, true);
      addBox(group, 0.48, 0.028, 0.36, 0, 1.26, 0, primaryMat, true);
      addBox(group, 0.48, 0.028, 0.36, 0, 1.56, 0, primaryMat, true);
      // Rolled towels on middle shelf
      for (let i = 0; i < 3; i++) {
        const roll = addCyl(
          group,
          0.055,
          0.055,
          0.26,
          -0.12 + i * 0.12,
          1.04,
          0.02,
          i === 1 ? makeMat('#C88A6B', 0.9, 0.0) : linenMat,
          12,
        );
        roll.rotation.x = Math.PI / 2;
      }
      // Woven basket + ceramic jars on upper shelves
      addBox(group, 0.32, 0.14, 0.24, 0, 1.345, 0.02, makeMat('#B58E63', 0.86, 0.02));
      addCyl(group, 0.04, 0.04, 0.14, -0.1, 1.64, 0.02, makeMat('#687E71', 0.35, 0.06), 12);
      addCyl(group, 0.035, 0.038, 0.1, 0.06, 1.62, 0.02, linenMat, 12);
      break;
    }

    case 'washing_machine': {
      // Modern front-loading washing machine with circular dark glass porthole, dial & detergent bottle
      const bodyMat = primaryMat;
      bodyMat.roughness = 0.32;
      bodyMat.metalness = 0.08;
      // Main cabinet + slightly beveled top deck
      addBox(group, 0.62, 0.84, 0.6, 0, 0.43, 0, bodyMat, true);
      addBox(group, 0.63, 0.025, 0.61, 0, 0.85, 0, makeMat('#E8E4DC', 0.25, 0.05));
      // Rubber feet
      for (const [fx, fz] of [
        [-0.25, -0.24],
        [0.25, -0.24],
        [-0.25, 0.24],
        [0.25, 0.24],
      ]) {
        addCyl(group, 0.024, 0.024, 0.02, fx, 0.01, fz, darkMetalMat, 8);
      }
      // Top control fascia: detergent drawer + rotary program dial + LED display
      addBox(group, 0.18, 0.11, 0.02, -0.19, 0.76, 0.302, makeMat('#E3DFD7', 0.35, 0.05));
      const dial = addCyl(group, 0.036, 0.036, 0.028, 0, 0.76, 0.308, chromeMat, 18);
      dial.rotation.x = Math.PI / 2;
      addBox(group, 0.16, 0.07, 0.018, 0.18, 0.76, 0.304, darkMetalMat);
      addBox(
        group,
        0.09,
        0.024,
        0.01,
        0.18,
        0.765,
        0.314,
        makeMat('#7CE0C3', 0.2, 0.1, { emissive: '#4DC4A2', emissiveIntensity: 0.9 }),
      );
      // Circular front porthole rim + dark tinted drum glass
      const doorRing = addCyl(group, 0.22, 0.22, 0.045, 0, 0.4, 0.305, darkMetalMat, 28);
      doorRing.rotation.x = Math.PI / 2;
      const doorChrome = addCyl(group, 0.185, 0.185, 0.05, 0, 0.4, 0.308, chromeMat, 26);
      doorChrome.rotation.x = Math.PI / 2;
      const drumGlass = addCyl(
        group,
        0.165,
        0.165,
        0.054,
        0,
        0.4,
        0.31,
        makeMat('#1C222B', 0.1, 0.65),
        24,
      );
      drumGlass.rotation.x = Math.PI / 2;
      break;
    }

    case 'laundry_hamper': {
      // Woven rattan cylinder laundry basket with folded cream linen liner rim & leather side handles
      const weaveMat = primaryMat;
      weaveMat.roughness = 0.88;
      addCyl(group, 0.23, 0.19, 0.58, 0, 0.29, 0, weaveMat, 20, true);
      // Woven rib bands
      for (const ry of [0.14, 0.29, 0.44]) {
        addCyl(group, 0.222, 0.222, 0.022, 0, ry, 0, darkWoodMat, 20);
      }
      // Folded cream canvas liner collar + soft laundry pile peeking out
      addCyl(group, 0.24, 0.236, 0.07, 0, 0.57, 0, linenMat, 20);
      const pile = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.16, 1),
        makeMat('#D8CFC2', 0.92, 0.0),
      );
      pile.position.set(0, 0.56, 0);
      pile.scale.set(1.1, 0.42, 1.0);
      group.add(pile);
      // Side leather handles
      addBox(group, 0.022, 0.07, 0.09, -0.24, 0.48, 0, darkWoodMat);
      addBox(group, 0.022, 0.07, 0.09, 0.24, 0.48, 0, darkWoodMat);
      break;
    }

    case 'bathroom_caddy': {
      // 3-tier bamboo/metal bath trolley with amber pump bottles, rolled hand towel & reed diffuser
      const postPos: [number, number][] = [
        [-0.18, -0.13],
        [0.18, -0.13],
        [-0.18, 0.13],
        [0.18, 0.13],
      ];
      for (const [px, pz] of postPos) {
        addCyl(group, 0.014, 0.014, 0.84, px, 0.42, pz, primaryMat, 8, true);
      }
      for (const sy of [0.14, 0.44, 0.74]) {
        addBox(group, 0.38, 0.024, 0.28, 0, sy, 0, primaryMat, true);
        // Guard rails
        addBox(group, 0.38, 0.014, 0.014, 0, sy + 0.05, 0.135, primaryMat, true);
        addBox(group, 0.38, 0.014, 0.014, 0, sy + 0.05, -0.135, primaryMat, true);
      }
      // Top shelf: shampoo, conditioner & reed diffuser
      addCyl(group, 0.032, 0.032, 0.15, -0.1, 0.825, 0, makeMat('#A55D35', 0.24, 0.05), 12);
      addCyl(group, 0.03, 0.03, 0.13, 0.0, 0.815, 0.02, makeMat('#5A7463', 0.28, 0.05), 12);
      addCyl(group, 0.028, 0.034, 0.08, 0.11, 0.79, -0.02, linenMat, 12);
      for (const tilt of [-0.18, 0, 0.18]) {
        const reed = addCyl(group, 0.003, 0.003, 0.16, 0.11 + tilt * 0.06, 0.88, -0.02, darkWoodMat, 6);
        reed.rotation.z = tilt;
      }
      // Middle shelf: folded cream & sage towels
      addBox(group, 0.28, 0.05, 0.2, 0, 0.475, 0, linenMat);
      addBox(group, 0.26, 0.045, 0.19, 0, 0.525, 0, makeMat('#7B9182', 0.9, 0.0));
      // Bottom shelf: spare paper rolls
      addCyl(group, 0.055, 0.055, 0.1, -0.08, 0.2, 0, linenMat, 14);
      addCyl(group, 0.055, 0.055, 0.1, 0.08, 0.2, 0, linenMat, 14);
      break;
    }

    case 'toilet_paper_stand': {
      // Freestanding brass/black toilet paper stand with spare rolls + matching ceramic toilet brush cup
      const metalMat = primaryMat;
      metalMat.roughness = 0.26;
      metalMat.metalness = 0.82;
      // Weighted marble base
      addCyl(group, 0.11, 0.12, 0.026, -0.04, 0.013, 0, marbleMat, 20);
      // Vertical stem + top dispensing arm + active toilet roll
      addCyl(group, 0.011, 0.012, 0.64, -0.04, 0.34, 0, metalMat, 12, true);
      const arm = addCyl(group, 0.01, 0.01, 0.16, 0.04, 0.65, 0, metalMat, 10, true);
      arm.rotation.z = Math.PI / 2;
      const activeRoll = addCyl(group, 0.052, 0.052, 0.11, 0.05, 0.65, 0, linenMat, 16);
      activeRoll.rotation.z = Math.PI / 2;
      // 2 spare rolls stacked around vertical stem
      addCyl(group, 0.052, 0.052, 0.105, -0.04, 0.08, 0, linenMat, 16);
      addCyl(group, 0.052, 0.052, 0.105, -0.04, 0.19, 0, linenMat, 16);
      // Companion ceramic toilet brush canister + handle
      addCyl(group, 0.054, 0.048, 0.15, 0.16, 0.075, -0.04, linenMat, 16);
      addCyl(group, 0.008, 0.008, 0.26, 0.16, 0.24, -0.04, metalMat, 8, true);
      break;
    }

    case 'bath_mat': {
      // Plush tufted waffle-weave cozy bath mat with subtle woven border strips
      const matMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.94,
        metalness: 0.0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.022, 0.56), matMat);
      base.position.y = 0.013;
      base.receiveShadow = true;
      base.userData.recolorable = true;
      group.add(base);
      // Soft woven border stripes along ends
      const stripeMat = makeMat('#F5EFE6', 0.92, 0.0);
      addBox(group, 0.045, 0.025, 0.54, -0.34, 0.014, 0, stripeMat);
      addBox(group, 0.045, 0.025, 0.54, 0.34, 0.014, 0, stripeMat);
      break;
    }

    case 'bookshelf': {
      // Open architectural shelving with 4 tiers + color-coded book clusters + ceramic accents
      addBox(group, 1.68, 0.08, 0.42, 0, 0.04, 0, primaryMat, true);
      addBox(group, 0.06, 2.08, 0.4, -0.81, 1.06, 0, primaryMat, true);
      addBox(group, 0.06, 2.08, 0.4, 0.81, 1.06, 0, primaryMat, true);
      addBox(group, 0.05, 2.04, 0.36, 0, 1.06, 0, primaryMat, true);

      const bookColors = ['#B86B4E', '#3A4F63', '#5C7465', '#D6B985', '#DFD8CC', '#6E4C41', '#2B313B'];
      for (const sy of [0.54, 1.04, 1.54, 2.06]) {
        addBox(group, 1.66, 0.045, 0.4, 0, sy, 0, primaryMat, true);
        if (sy < 2.0) {
          // Populate books on left & right bays
          let bx = -0.72;
          for (let i = 0; i < 6; i++) {
            const bw = 0.045 + (i % 3) * 0.015;
            const bh = 0.24 + ((i * 7) % 5) * 0.03;
            addBox(
              group,
              bw,
              bh,
              0.24,
              bx + bw / 2,
              sy + 0.025 + bh / 2,
              0.02,
              makeMat(bookColors[(i + Math.round(sy * 3)) % bookColors.length], 0.78, 0.02),
            );
            bx += bw + 0.014;
          }
          // Right bay decorative books + sculptural vase
          let rx = 0.14;
          for (let i = 0; i < 4; i++) {
            const bw = 0.05;
            const bh = 0.26 + (i % 2) * 0.05;
            addBox(
              group,
              bw,
              bh,
              0.24,
              rx + bw / 2,
              sy + 0.025 + bh / 2,
              0.02,
              makeMat(bookColors[(i + 3) % bookColors.length], 0.78, 0.02),
            );
            rx += bw + 0.016;
          }
          addCyl(group, 0.065, 0.08, 0.2, 0.62, sy + 0.12, 0.02, brassMat, 14);
        }
      }
      break;
    }

    case 'media_console': {
      // Slatted low walnut console + brass legs + thin OLED TV + soundbar
      addBox(group, 2.52, 0.36, 0.52, 0, 0.34, 0, primaryMat, true);
      for (const [lx, lz] of [
        [-1.15, -0.2],
        [1.15, -0.2],
        [-1.15, 0.2],
        [1.15, 0.2],
      ]) {
        addCyl(group, 0.02, 0.016, 0.16, lx, 0.08, lz, brassMat, 10);
      }
      // Soundbar
      addBox(group, 1.05, 0.065, 0.1, 0, 0.555, 0.12, darkMetalMat);
      // OLED panel + stand
      addBox(group, 0.56, 0.025, 0.22, 0, 0.535, -0.06, darkMetalMat);
      addBox(group, 0.12, 0.16, 0.04, 0, 0.62, -0.08, darkMetalMat);
      addBox(group, 1.78, 0.98, 0.04, 0, 1.12, -0.08, darkMetalMat);
      const tvMat = new THREE.MeshStandardMaterial({
        map: textures.tvScreenTex,
        emissive: '#3D5266',
        emissiveIntensity: 0.42,
        roughness: 0.15,
      });
      addBox(group, 1.72, 0.92, 0.012, 0, 1.12, -0.056, tvMat);
      break;
    }

    case 'upright_piano': {
      // Lacquered cabinet + keybed + white/black keys + brass pedals + matching bench
      const lacquerMat = makeMat(colorHex, 0.14, 0.12);
      addBox(group, 1.54, 1.28, 0.42, 0, 0.64, -0.18, lacquerMat, true);
      addBox(group, 1.58, 0.05, 0.46, 0, 1.3, -0.18, lacquerMat, true);
      // Keybed
      addBox(group, 1.48, 0.1, 0.34, 0, 0.72, 0.16, lacquerMat, true);
      addBox(group, 0.08, 0.68, 0.24, -0.7, 0.34, 0.18, lacquerMat, true);
      addBox(group, 0.08, 0.68, 0.24, 0.7, 0.34, 0.18, lacquerMat, true);
      // Ivory keys + ebony accidentals
      addBox(group, 1.32, 0.04, 0.2, 0, 0.785, 0.19, linenMat);
      for (let k = -8; k <= 8; k++) {
        if (k % 3 === 0) continue;
        addBox(group, 0.032, 0.03, 0.11, k * 0.072, 0.81, 0.15, darkMetalMat);
      }
      // Sheet music + brass pedals
      addBox(group, 0.44, 0.26, 0.015, 0, 1.04, 0.04, linenMat).rotation.x = -0.18;
      for (const px of [-0.08, 0, 0.08]) {
        addBox(group, 0.03, 0.02, 0.1, px, 0.06, 0.06, brassMat);
      }
      break;
    }

    case 'fireplace': {
      // Travertine hearth plinth + recessed dark firebox + chimney breast + animated ember logs
      addBox(group, 1.76, 0.16, 0.78, 0, 0.08, 0.04, primaryMat, true);
      addBox(group, 1.56, 2.38, 0.56, 0, 1.34, -0.06, primaryMat, true);
      // Recessed firebox chamber
      addBox(group, 0.96, 0.64, 0.42, 0, 0.5, 0.06, makeMat('#1C1D20', 0.92, 0.05));
      // Mantel ledge
      addBox(group, 1.68, 0.09, 0.66, 0, 1.02, 0, primaryMat, true);
      // Charred logs + warm glowing flame core (tagged for live flicker!)
      const logMat = makeMat('#3C281E', 0.92, 0.0);
      addCyl(group, 0.05, 0.055, 0.48, -0.04, 0.24, 0.1, logMat, 10).rotation.z = Math.PI / 2 + 0.15;
      addCyl(group, 0.045, 0.05, 0.44, 0.05, 0.28, 0.12, logMat, 10).rotation.z = Math.PI / 2 - 0.22;
      const flameMat = new THREE.MeshStandardMaterial({
        color: '#FF9838',
        emissive: '#FF6A14',
        emissiveIntensity: 2.2,
        roughness: 0.3,
      });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 8), flameMat);
      flame.position.set(0, 0.4, 0.1);
      flame.userData.isFlame = true;
      group.add(flame);
      break;
    }

    case 'arc_lamp': {
      // Heavy marble cylinder base + graceful TubeGeometry sweeping brass arc + dome shade + glowing bulb
      addCyl(group, 0.19, 0.21, 0.28, 0, 0.14, -0.22, marbleMat, 22);
      const arcCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.26, -0.22),
        new THREE.Vector3(0, 1.38, -0.22),
        new THREE.Vector3(0, 1.98, 0.02),
        new THREE.Vector3(0, 1.84, 0.34),
      ]);
      const stem = new THREE.Mesh(new THREE.TubeGeometry(arcCurve, 28, 0.018, 10, false), primaryMat);
      stem.castShadow = true;
      stem.userData.recolorable = true;
      group.add(stem);
      // Spun dome shade
      const shadeGeo = new THREE.SphereGeometry(0.22, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.56);
      const shadeMat = primaryMat.clone();
      shadeMat.side = THREE.DoubleSide;
      shadeMat.roughness = 0.25;
      shadeMat.metalness = 0.8;
      const shade = new THREE.Mesh(shadeGeo, shadeMat);
      shade.position.set(0, 1.68, 0.34);
      shade.castShadow = true;
      shade.userData.recolorable = true;
      group.add(shade);
      // Glowing opal bulb
      const bulbMat = new THREE.MeshStandardMaterial({
        color: '#FFF4D8',
        emissive: '#FFD68A',
        emissiveIntensity: 1.8,
        roughness: 0.2,
      });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 14), bulbMat);
      bulb.position.set(0, 1.66, 0.34);
      bulb.userData.isLightBulb = true;
      group.add(bulb);
      break;
    }

    case 'table_lamp': {
      // Pedestal side table + lathed ribbed ceramic lamp + glowing linen drum shade
      addCyl(group, 0.24, 0.24, 0.04, 0, 0.48, 0, oakMat, 20);
      addCyl(group, 0.04, 0.14, 0.46, 0, 0.23, 0, oakMat, 16);
      const bodyPts = [
        new THREE.Vector2(0.0, 0),
        new THREE.Vector2(0.09, 0),
        new THREE.Vector2(0.13, 0.11),
        new THREE.Vector2(0.11, 0.22),
        new THREE.Vector2(0.045, 0.28),
      ];
      const base = new THREE.Mesh(new THREE.LatheGeometry(bodyPts, 20), primaryMat);
      base.position.y = 0.5;
      base.castShadow = true;
      base.userData.recolorable = true;
      group.add(base);
      const shadeMat = new THREE.MeshStandardMaterial({
        color: '#F5EFE2',
        emissive: '#FFDF9E',
        emissiveIntensity: 0.72,
        roughness: 0.82,
        side: THREE.DoubleSide,
      });
      const shade = addCyl(group, 0.15, 0.18, 0.22, 0, 0.86, 0, shadeMat, 22);
      shade.userData.isLightBulb = true;
      break;
    }

    case 'chandelier': {
      // Suspended ceiling rods + horizontal brass linear bar + 4 frosted opal globes
      const ceilY = WALL_HEIGHT;
      addBox(group, 0.56, 0.04, 0.14, 0, ceilY - 0.02, 0, primaryMat, true);
      addCyl(group, 0.012, 0.012, 0.52, -0.22, ceilY - 0.28, 0, primaryMat, 8, true);
      addCyl(group, 0.012, 0.012, 0.52, 0.22, ceilY - 0.28, 0, primaryMat, 8, true);
      addCyl(group, 0.018, 0.018, 1.48, 0, ceilY - 0.54, 0, primaryMat, 12, true).rotation.z = Math.PI / 2;
      const globeMat = new THREE.MeshStandardMaterial({
        color: '#FFFDF7',
        emissive: '#FFE5B2',
        emissiveIntensity: 1.5,
        roughness: 0.22,
      });
      for (const gx of [-0.62, -0.22, 0.22, 0.62]) {
        const g = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 16), globeMat);
        g.position.set(gx, ceilY - 0.64, 0);
        g.userData.isLightBulb = true;
        group.add(g);
      }
      break;
    }

    case 'fiddle_tree': {
      // Fluted terracotta/ceramic planter + soil + branching trunk + lush multi-leaf canopy
      const potPts = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.18, 0),
        new THREE.Vector2(0.24, 0.26),
        new THREE.Vector2(0.22, 0.44),
        new THREE.Vector2(0.2, 0.44),
      ];
      const pot = new THREE.Mesh(new THREE.LatheGeometry(potPts, 20), primaryMat);
      pot.castShadow = true;
      pot.receiveShadow = true;
      pot.userData.recolorable = true;
      group.add(pot);
      addCyl(group, 0.19, 0.19, 0.04, 0, 0.4, 0, makeMat('#3B2E24', 0.95, 0.0), 16);

      const trunkMat = makeMat('#654A35', 0.86, 0.0);
      addCyl(group, 0.024, 0.036, 0.86, 0, 0.82, 0, trunkMat, 8);
      const b1 = addCyl(group, 0.014, 0.022, 0.42, -0.1, 1.15, 0.06, trunkMat, 8);
      b1.rotation.z = 0.42;
      const b2 = addCyl(group, 0.014, 0.022, 0.44, 0.11, 1.2, -0.06, trunkMat, 8);
      b2.rotation.z = -0.38;

      const leafShades = ['#3F673D', '#4F7A4A', '#355936', '#5D8A55'];
      const leafPos: [number, number, number, number][] = [
        [0, 1.56, 0, 0.24],
        [-0.22, 1.38, 0.12, 0.21],
        [0.24, 1.42, -0.1, 0.22],
        [-0.14, 1.24, -0.18, 0.18],
        [0.16, 1.26, 0.18, 0.19],
        [0.02, 1.44, 0.2, 0.18],
        [-0.08, 1.52, -0.16, 0.17],
      ];
      leafPos.forEach(([lx, ly, lz, r], idx) => {
        const leaf = new THREE.Mesh(
          new THREE.DodecahedronGeometry(r, 1),
          makeMat(leafShades[idx % leafShades.length], 0.72, 0.02),
        );
        leaf.position.set(lx, ly, lz);
        leaf.scale.set(1.15, 0.68, 1.0);
        leaf.rotation.set(idx * 0.4, idx * 0.9, idx * 0.2);
        leaf.castShadow = true;
        group.add(leaf);
      });
      break;
    }

    case 'area_rug': {
      const rugMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        map: textures.rugTex,
        roughness: 0.92,
        metalness: 0.0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const rug = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.022, 1.84), rugMat);
      rug.position.y = 0.015;
      rug.receiveShadow = true;
      rug.userData.recolorable = true;
      group.add(rug);
      break;
    }

    case 'gallery_art': {
      // Sculptural leaning walnut gallery easel & framed triptych display
      addBox(group, 1.72, 0.1, 0.24, 0, 0.05, 0, darkWoodMat);
      const frames = [-0.54, 0, 0.54];
      frames.forEach((fx, i) => {
        const fGroup = new THREE.Group();
        fGroup.position.set(fx, 0.96, -0.02);
        fGroup.rotation.x = -0.05;
        addBox(fGroup, 0.48, 0.68, 0.04, 0, 0, 0, oakMat);
        const artMat = new THREE.MeshStandardMaterial({
          map: textures.artTextures[i % textures.artTextures.length],
          color: colorHex,
          roughness: 0.72,
        });
        const canvasMesh = addBox(fGroup, 0.42, 0.62, 0.012, 0, 0, 0.022, artMat, true);
        canvasMesh.castShadow = false;
        // Support posts down to plinth
        addCyl(group, 0.016, 0.016, 0.62, fx, 0.36, -0.02, brassMat, 8);
        group.add(fGroup);
      });
      break;
    }

    case 'zen_fountain': {
      // Carved basalt slate basin + shimmering water + stacked zen stones + bamboo spout
      addBox(group, 0.78, 0.36, 0.78, 0, 0.18, 0, primaryMat, true);
      const waterMat = new THREE.MeshPhysicalMaterial({
        color: '#6BA7B8',
        roughness: 0.08,
        metalness: 0.1,
        clearcoat: 1.0,
        transparent: true,
        opacity: 0.82,
      });
      const water = addBox(group, 0.66, 0.04, 0.66, 0, 0.35, 0, waterMat);
      water.userData.isWater = true;
      // Stacked smooth basalt river stones
      const stoneMat = makeMat('#42474D', 0.52, 0.08);
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), stoneMat);
      s1.scale.set(1.2, 0.55, 1.1);
      s1.position.set(-0.08, 0.4, -0.08);
      s1.castShadow = true;
      group.add(s1);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), stoneMat);
      s2.scale.set(1.15, 0.55, 1.05);
      s2.position.set(-0.06, 0.49, -0.07);
      s2.castShadow = true;
      group.add(s2);
      // Bamboo water spout
      const bambooMat = makeMat('#8B9B63', 0.58, 0.04);
      addCyl(group, 0.024, 0.026, 0.42, 0.24, 0.52, -0.22, bambooMat, 10);
      const spout = addCyl(group, 0.018, 0.02, 0.28, 0.14, 0.64, -0.14, bambooMat, 10);
      spout.rotation.z = 1.25;
      spout.rotation.y = 0.6;
      break;
    }

    // ===== WALL-MOUNTED DECORATIONS (Pajangan Dinding — mounted flush against -Z wall) =====
    case 'wall_painting': {
      const wz = -0.415;
      const wy = 1.54;
      // Outer sculpted frame + recessed mat board + botanical print canvas
      addBox(group, 0.72, 0.92, 0.045, 0, wy, wz, primaryMat, true);
      addBox(group, 0.62, 0.82, 0.025, 0, wy, wz + 0.015, linenMat);
      const printMat = new THREE.MeshStandardMaterial({
        map: textures.botanicalPrintTex,
        roughness: 0.7,
      });
      const art = addBox(group, 0.54, 0.74, 0.012, 0, wy, wz + 0.028, printMat);
      art.castShadow = false;
      // Top brass gallery picture light bar
      addCyl(group, 0.012, 0.012, 0.34, 0, wy + 0.5, wz + 0.09, brassMat, 10).rotation.z = Math.PI / 2;
      addBox(group, 0.04, 0.03, 0.09, 0, wy + 0.5, wz + 0.045, brassMat);
      break;
    }

    case 'wall_diptych': {
      const wz = -0.415;
      const wy = 1.54;
      const offsets = [-0.42, 0.42];
      offsets.forEach((ox, idx) => {
        addBox(group, 0.74, 0.9, 0.045, ox, wy, wz, darkWoodMat);
        addBox(group, 0.66, 0.82, 0.025, ox, wy, wz + 0.016, linenMat);
        const artMat = new THREE.MeshStandardMaterial({
          map: textures.artTextures[idx % textures.artTextures.length],
          color: colorHex,
          roughness: 0.68,
        });
        const canvasMesh = addBox(group, 0.6, 0.76, 0.012, ox, wy, wz + 0.028, artMat, true);
        canvasMesh.castShadow = false;
      });
      break;
    }

    case 'sunburst_mirror': {
      const wz = -0.415;
      const wy = 1.56;
      // Outer metallic ring + beveled reflective mirror glass + 16 radiant sunburst rays
      const bezel = addCyl(group, 0.32, 0.32, 0.045, 0, wy, wz, primaryMat, 28, true);
      bezel.rotation.x = Math.PI / 2;
      const glass = addCyl(
        group,
        0.27,
        0.27,
        0.052,
        0,
        wy,
        wz + 0.005,
        makeMat('#E6EEF2', 0.04, 0.96),
        28,
      );
      glass.rotation.x = Math.PI / 2;
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2;
        const len = i % 2 === 0 ? 0.22 : 0.14;
        const dist = 0.31 + len / 2;
        const ray = addBox(
          group,
          0.014,
          len,
          0.014,
          Math.cos(ang) * dist,
          wy + Math.sin(ang) * dist,
          wz - 0.005,
          primaryMat,
          true,
        );
        ray.rotation.z = ang - Math.PI / 2;
      }
      break;
    }

    case 'floating_shelves': {
      const wz = -0.34;
      // Twin floating timber ledges + brass bookends + ceramic vases + trailing plant
      for (const sy of [1.24, 1.66]) {
        addBox(group, 1.64, 0.045, 0.22, 0, sy, wz, primaryMat, true);
        addBox(group, 0.03, 0.06, 0.18, -0.62, sy - 0.045, wz - 0.01, brassMat);
        addBox(group, 0.03, 0.06, 0.18, 0.62, sy - 0.045, wz - 0.01, brassMat);
      }
      // Top shelf styling: ceramic vase + stacked books + mini framed photo
      const vasePts = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.055, 0),
        new THREE.Vector2(0.075, 0.11),
        new THREE.Vector2(0.04, 0.2),
        new THREE.Vector2(0.05, 0.24),
      ];
      const vase = new THREE.Mesh(new THREE.LatheGeometry(vasePts, 16), makeMat('#E4DDD1', 0.35, 0.05));
      vase.position.set(-0.52, 1.685, wz);
      group.add(vase);
      addBox(group, 0.26, 0.04, 0.15, 0.02, 1.705, wz, makeMat('#384B5C', 0.7, 0.05));
      addBox(group, 0.22, 0.035, 0.14, 0.04, 1.742, wz, makeMat('#C98F5A', 0.7, 0.05));
      addBox(group, 0.22, 0.28, 0.025, 0.48, 1.82, wz - 0.04, darkWoodMat).rotation.x = -0.1;

      // Bottom shelf styling: books + small trailing pot plant
      const colors = ['#B86B4E', '#4B6358', '#DFD8CC', '#2E3A4A'];
      colors.forEach((c, i) => {
        addBox(group, 0.042, 0.2 + (i % 2) * 0.04, 0.15, -0.58 + i * 0.052, 1.37, wz, makeMat(c, 0.78, 0.02));
      });
      addCyl(group, 0.075, 0.055, 0.12, 0.56, 1.32, wz, makeMat('#BA7854', 0.75, 0.02), 14);
      const bush = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.11, 1),
        makeMat('#4C7349', 0.72, 0.02),
      );
      bush.position.set(0.56, 1.43, wz + 0.02);
      group.add(bush);
      break;
    }

    case 'wall_clock': {
      const wz = -0.415;
      const wy = 1.62;
      const casing = addCyl(group, 0.29, 0.29, 0.055, 0, wy, wz, primaryMat, 28, true);
      casing.rotation.x = Math.PI / 2;
      const dialMat = new THREE.MeshStandardMaterial({
        map: textures.clockDialTex,
        roughness: 0.45,
      });
      const dial = addCyl(group, 0.26, 0.26, 0.012, 0, wy, wz + 0.028, dialMat, 28);
      dial.rotation.x = Math.PI / 2;
      break;
    }

    case 'wall_sconces': {
      const wz = -0.41;
      const wy = 1.56;
      // Fluted walnut backing plate + brass mount + vertical glowing opal glass cylinder
      addBox(group, 0.24, 0.56, 0.03, 0, wy, wz, darkWoodMat);
      addCyl(group, 0.05, 0.05, 0.04, 0, wy, wz + 0.03, primaryMat, 16, true).rotation.x = Math.PI / 2;
      addBox(group, 0.025, 0.025, 0.09, 0, wy, wz + 0.06, primaryMat, true);
      const opalMat = new THREE.MeshStandardMaterial({
        color: '#FFF9EC',
        emissive: '#FFE0A3',
        emissiveIntensity: 1.6,
        roughness: 0.25,
      });
      const tube = addCyl(group, 0.046, 0.046, 0.36, 0, wy, wz + 0.11, opalMat, 18);
      tube.userData.isLightBulb = true;
      addCyl(group, 0.052, 0.052, 0.03, 0, wy + 0.18, wz + 0.11, primaryMat, 16, true);
      addCyl(group, 0.052, 0.052, 0.03, 0, wy - 0.18, wz + 0.11, primaryMat, 16, true);
      break;
    }

    case 'woven_tapestry': {
      const wz = -0.415;
      const wy = 1.52;
      // Brass hanging dowel + finials + woven canvas cloth + bottom fringe tassels
      addCyl(group, 0.015, 0.015, 0.78, 0, wy + 0.42, wz + 0.025, brassMat, 12).rotation.z = Math.PI / 2;
      const tapMat = new THREE.MeshStandardMaterial({
        map: textures.tapestryTex,
        color: colorHex,
        roughness: 0.92,
      });
      const cloth = addBox(group, 0.66, 0.8, 0.018, 0, wy, wz + 0.02, tapMat, true);
      cloth.castShadow = false;
      for (let i = -5; i <= 5; i++) {
        addBox(group, 0.022, 0.11, 0.014, i * 0.058, wy - 0.45, wz + 0.02, linenMat);
      }
      break;
    }

    // ===== TABLETOP PROPS (place freely on tables, desks, counters, shelves, or floor) =====
    case 'laptop_studio': {
      // Anodized aluminum unibody base + dark keyboard deck + angled display lid with glowing UI
      addBox(group, 0.36, 0.016, 0.25, 0, 0.008, 0.02, primaryMat, true);
      addBox(group, 0.31, 0.005, 0.13, 0, 0.018, 0.0, darkMetalMat);
      addBox(group, 0.1, 0.004, 0.065, 0, 0.017, 0.095, makeMat('#9EA3AA', 0.35, 0.4));
      const lid = new THREE.Group();
      lid.position.set(0, 0.016, -0.105);
      lid.rotation.x = -0.26;
      addBox(lid, 0.36, 0.23, 0.012, 0, 0.115, 0, primaryMat, true);
      const screenMat = new THREE.MeshStandardMaterial({
        color: '#25354A',
        emissive: '#3C6994',
        emissiveIntensity: 0.65,
        roughness: 0.14,
      });
      addBox(lid, 0.33, 0.2, 0.005, 0, 0.115, 0.006, screenMat);
      group.add(lid);
      break;
    }

    case 'desk_monitor': {
      // Sculpted aluminum base + vertical riser + ultrawide display + wireless keyboard & mouse
      addBox(group, 0.24, 0.012, 0.15, 0, 0.006, -0.04, chromeMat);
      addBox(group, 0.055, 0.24, 0.02, 0, 0.12, -0.08, chromeMat);
      addBox(group, 0.62, 0.31, 0.024, 0, 0.29, -0.06, primaryMat, true);
      const dispMat = new THREE.MeshStandardMaterial({
        color: '#1E2A38',
        emissive: '#2C4966',
        emissiveIntensity: 0.55,
        roughness: 0.12,
      });
      addBox(group, 0.59, 0.28, 0.006, 0, 0.29, -0.046, dispMat);
      addBox(group, 0.34, 0.014, 0.11, -0.04, 0.007, 0.1, makeMat('#E2E4E8', 0.42, 0.2));
      addBox(group, 0.055, 0.018, 0.09, 0.2, 0.009, 0.1, makeMat('#E2E4E8', 0.35, 0.2));
      break;
    }

    case 'book_stack': {
      // 3 staggered coffee-table hardcover books + brass spherical paperweight
      addBox(group, 0.32, 0.042, 0.24, 0, 0.021, 0, primaryMat, true);
      addBox(group, 0.3, 0.036, 0.22, 0.01, 0.021, 0.008, linenMat);
      const b2 = addBox(group, 0.27, 0.038, 0.21, -0.01, 0.061, -0.01, makeMat('#3B4D64', 0.72, 0.04));
      b2.rotation.y = 0.14;
      const b3 = addBox(group, 0.22, 0.034, 0.17, 0.01, 0.097, 0.005, makeMat('#DFD8CC', 0.78, 0.02));
      b3.rotation.y = -0.18;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 14), brassMat);
      orb.position.set(0.02, 0.155, 0.0);
      orb.castShadow = true;
      group.add(orb);
      break;
    }

    case 'candle_trio': {
      // Brushed brass round tray + 3 staggered pillar candles + warm emissive flames
      addCyl(group, 0.16, 0.15, 0.016, 0, 0.008, 0, brassMat, 24);
      const flameMat = new THREE.MeshStandardMaterial({
        color: '#FFF5CC',
        emissive: '#FFAA33',
        emissiveIntensity: 2.4,
        roughness: 0.2,
      });
      const pillars: [number, number, number, number][] = [
        [-0.045, 0.2, -0.03, 0.036],
        [0.055, 0.14, -0.015, 0.033],
        [0.0, 0.1, 0.06, 0.032],
      ];
      for (const [cx, ch, cz, cr] of pillars) {
        addCyl(group, cr, cr, ch, cx, 0.016 + ch / 2, cz, primaryMat, 16, true);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 10), flameMat);
        flame.position.set(cx, 0.016 + ch + 0.02, cz);
        flame.userData.isLightBulb = true;
        group.add(flame);
      }
      break;
    }

    case 'fruit_bowl': {
      // LatheGeometry sculpted pedestal bowl + colorful citrus & pears
      const pts = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.075, 0.0),
        new THREE.Vector2(0.065, 0.05),
        new THREE.Vector2(0.14, 0.09),
        new THREE.Vector2(0.175, 0.16),
        new THREE.Vector2(0.16, 0.165),
        new THREE.Vector2(0.12, 0.1),
        new THREE.Vector2(0.0, 0.08),
      ];
      const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), primaryMat);
      bowl.castShadow = true;
      bowl.receiveShadow = true;
      bowl.userData.recolorable = true;
      group.add(bowl);
      const fruits: [number, number, number, string, number][] = [
        [-0.055, 0.13, 0.02, '#E07A33', 0.044],
        [0.05, 0.135, 0.03, '#D9A638', 0.042],
        [0.0, 0.14, -0.05, '#789E4A', 0.045],
        [0.005, 0.175, 0.005, '#C94B3B', 0.04],
      ];
      for (const [fx, fy, fz, col, rad] of fruits) {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(rad, 14, 12), makeMat(col, 0.45, 0.02));
        sphere.position.set(fx, fy, fz);
        sphere.castShadow = true;
        group.add(sphere);
      }
      break;
    }

    case 'table_bonsai': {
      // Rectangular glazed ceramic bonsai tray + dark soil + twisted trunk + 3 foliage clouds
      addBox(group, 0.28, 0.08, 0.2, 0, 0.04, 0, primaryMat, true);
      addBox(group, 0.24, 0.02, 0.16, 0, 0.082, 0, makeMat('#3B2E24', 0.92, 0));
      const trunk1 = addCyl(group, 0.018, 0.028, 0.17, -0.02, 0.15, 0, darkWoodMat, 10);
      trunk1.rotation.z = -0.32;
      const trunk2 = addCyl(group, 0.014, 0.019, 0.15, 0.03, 0.25, 0.01, darkWoodMat, 10);
      trunk2.rotation.z = 0.25;
      const foliageMat = makeMat('#4A7348', 0.72, 0.02);
      const pads: [number, number, number, number][] = [
        [-0.08, 0.24, 0.01, 0.075],
        [0.08, 0.31, -0.01, 0.085],
        [0.01, 0.37, 0.01, 0.07],
      ];
      for (const [px, py, pz, r] of pads) {
        const pad = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), foliageMat);
        pad.scale.set(1.35, 0.62, 1.15);
        pad.position.set(px, py, pz);
        pad.castShadow = true;
        group.add(pad);
      }
      break;
    }

    case 'coffee_set': {
      // Walnut/brass serving tray + glass pour-over carafe + matte kettle + ceramic mug
      addBox(group, 0.42, 0.018, 0.28, 0, 0.009, 0, oakMat);
      addBox(group, 0.43, 0.028, 0.014, 0, 0.014, -0.14, brassMat);
      addBox(group, 0.43, 0.028, 0.014, 0, 0.014, 0.14, brassMat);
      // Gooseneck kettle
      addCyl(group, 0.055, 0.068, 0.13, -0.1, 0.083, -0.01, primaryMat, 18, true);
      addCyl(group, 0.018, 0.018, 0.02, -0.1, 0.158, -0.01, oakMat, 10);
      // Glass carafe with coffee inside
      addCyl(group, 0.042, 0.06, 0.12, 0.04, 0.078, -0.01, glassMat, 18);
      addCyl(group, 0.048, 0.055, 0.055, 0.04, 0.048, -0.01, makeMat('#2B1A12', 0.15, 0.05), 16);
      // Ceramic mug
      addCyl(group, 0.036, 0.034, 0.08, 0.15, 0.058, 0.03, linenMat, 16);
      break;
    }

    case 'vinyl_player': {
      // Walnut turntable plinth + aluminum platter + vinyl LP + tonearm + brass feet
      addBox(group, 0.46, 0.07, 0.36, 0, 0.048, 0, primaryMat, true);
      for (const [fx, fz] of [
        [-0.19, -0.14],
        [0.19, -0.14],
        [-0.19, 0.14],
        [0.19, 0.14],
      ]) {
        addCyl(group, 0.016, 0.014, 0.018, fx, 0.009, fz, brassMat, 10);
      }
      addCyl(group, 0.145, 0.145, 0.014, -0.04, 0.09, 0, chromeMat, 28);
      addCyl(group, 0.14, 0.14, 0.006, -0.04, 0.099, 0, makeMat('#18191D', 0.22, 0.15), 28);
      addCyl(group, 0.042, 0.042, 0.008, -0.04, 0.101, 0, makeMat('#D99B4E', 0.45, 0.08), 18);
      // Tonearm assembly
      addCyl(group, 0.025, 0.028, 0.035, 0.16, 0.098, -0.1, chromeMat, 14);
      const arm = addCyl(group, 0.005, 0.005, 0.21, 0.11, 0.115, -0.01, chromeMat, 8);
      arm.rotation.x = Math.PI / 2;
      arm.rotation.z = 0.42;
      break;
    }

    case 'ceramic_sculpt': {
      // Sculptural architectural travertine arch + intersecting brass orb on dark plinth
      addBox(group, 0.26, 0.03, 0.16, 0, 0.015, 0, darkMetalMat);
      addBox(group, 0.055, 0.24, 0.08, -0.075, 0.15, 0, primaryMat, true);
      addBox(group, 0.055, 0.24, 0.08, 0.075, 0.15, 0, primaryMat, true);
      const archTop = new THREE.Mesh(
        new THREE.TorusGeometry(0.075, 0.032, 12, 22, Math.PI),
        primaryMat,
      );
      archTop.position.set(0, 0.25, 0);
      archTop.castShadow = true;
      archTop.userData.recolorable = true;
      group.add(archTop);
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 16), brassMat);
      sphere.position.set(0.02, 0.14, 0.03);
      sphere.castShadow = true;
      group.add(sphere);
      break;
    }

    // === NEW COZY SEATING ===
    case 'boucle_armchair': {
      // Sculptural chubby Cloud Bouclé chair on warm oak bun feet + curved bolster backrest + matching pouf
      const boucleMat = makeMat(colorHex, 0.94, 0.0);
      for (const [lx, lz] of [
        [-0.26, -0.22],
        [0.26, -0.22],
        [-0.26, 0.2],
        [0.26, 0.2],
      ]) {
        addCyl(group, 0.045, 0.036, 0.1, lx, 0.05, lz, oakMat, 14);
      }
      // Chubby rounded seat cushion
      addCyl(group, 0.36, 0.35, 0.24, 0, 0.22, 0.02, boucleMat, 26, true);
      const seatTop = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        boucleMat,
      );
      seatTop.scale.set(1, 0.22, 1);
      seatTop.position.set(0, 0.33, 0.02);
      seatTop.castShadow = true;
      seatTop.userData.recolorable = true;
      group.add(seatTop);
      // Curved wrap-around barrel backrest (5 overlapping plush pillows in a U-arc)
      for (let i = 0; i < 7; i++) {
        const ang = Math.PI * 0.12 + (i / 6) * Math.PI * 0.76;
        const bx = Math.cos(ang) * 0.31;
        const bz = -Math.sin(ang) * 0.29 + 0.02;
        const h = i === 0 || i === 6 ? 0.36 : 0.48;
        addCyl(group, 0.12, 0.12, h, bx, 0.32 + h * 0.45, bz, boucleMat, 16, true);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), boucleMat);
        cap.position.set(bx, 0.32 + h * 0.92, bz);
        cap.castShadow = true;
        cap.userData.recolorable = true;
        group.add(cap);
      }
      // Accent terracotta/sage lumbar pillow
      const lumbar = addCyl(group, 0.075, 0.075, 0.32, 0, 0.46, -0.14, makeMat('#C48562', 0.9, 0), 14);
      lumbar.rotation.z = Math.PI / 2;
      break;
    }

    case 'reading_daybed': {
      // Warm oak slatted window daybed with tufted linen mattress, twin bolsters & draped knit throw
      for (const [lx, lz] of [
        [-0.82, -0.36],
        [0.82, -0.36],
        [-0.82, 0.36],
        [0.82, 0.36],
      ]) {
        addCyl(group, 0.034, 0.024, 0.24, lx, 0.12, lz, oakMat, 12);
      }
      // Solid oak frame + slatted back rail
      addBox(group, 1.82, 0.1, 0.86, 0, 0.27, 0, oakMat);
      addBox(group, 1.82, 0.06, 0.06, 0, 0.68, -0.4, oakMat);
      for (let i = -7; i <= 7; i++) {
        addBox(group, 0.04, 0.38, 0.024, i * 0.115, 0.48, -0.4, oakMat);
      }
      // Plush mattress + channel tufting lines
      addBox(group, 1.74, 0.18, 0.78, 0, 0.41, 0.02, primaryMat, true);
      for (const tx of [-0.48, 0, 0.48]) {
        addBox(group, 0.014, 0.015, 0.76, tx, 0.502, 0.02, makeMat('#B9AA96', 0.9, 0));
      }
      // Twin cylindrical bolster pillows
      const b1 = addCyl(group, 0.1, 0.1, 0.72, -0.76, 0.56, 0.02, makeMat('#C48664', 0.9, 0), 16);
      b1.rotation.x = Math.PI / 2;
      const b2 = addCyl(group, 0.1, 0.1, 0.72, 0.76, 0.56, 0.02, makeMat('#7A907E', 0.9, 0), 16);
      b2.rotation.x = Math.PI / 2;
      // Draped chunky blanket over front edge
      const throwMat = makeMat('#C89B6E', 0.94, 0);
      addBox(group, 0.54, 0.028, 0.78, 0.26, 0.51, 0.04, throwMat);
      addBox(group, 0.54, 0.26, 0.032, 0.26, 0.39, 0.425, throwMat);
      break;
    }

    case 'ergo_chair': {
      // Cozy aesthetic bouclé swivel task chair on 5-star brushed brass base with casters
      addCyl(group, 0.028, 0.032, 0.34, 0, 0.24, 0, brassMat, 14);
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const spoke = addBox(group, 0.3, 0.026, 0.03, Math.cos(ang) * 0.15, 0.07, Math.sin(ang) * 0.15, brassMat);
        spoke.rotation.y = -ang;
        addCyl(group, 0.026, 0.026, 0.024, Math.cos(ang) * 0.28, 0.03, Math.sin(ang) * 0.28, darkMetalMat, 10);
      }
      // Molded seat cushion + curved ribbed backrest + sculpted armrests
      addBox(group, 0.52, 0.09, 0.5, 0, 0.45, 0.02, primaryMat, true);
      addBox(group, 0.48, 0.44, 0.08, 0, 0.72, -0.22, primaryMat, true);
      // Curved armrests
      addBox(group, 0.06, 0.2, 0.42, -0.26, 0.58, -0.02, primaryMat, true);
      addBox(group, 0.06, 0.2, 0.42, 0.26, 0.58, -0.02, primaryMat, true);
      // Brass back bracket
      addBox(group, 0.08, 0.26, 0.025, 0, 0.58, -0.27, brassMat);
      break;
    }

    // === NEW AESTHETIC TABLES & DESKTOP SETUP ===
    case 'cozy_pc_setup': {
      // Complete cozy aesthetic desktop station: oak slab desk, dual drawer pedestals, walnut riser,
      // ultrawide + vertical side monitors, desk mat, keyboard, mouse, glowing warm lightbar & mini plant!
      // Drawer pedestals (left & right)
      addBox(group, 0.38, 0.72, 0.66, -0.7, 0.36, 0, linenMat);
      addBox(group, 0.38, 0.72, 0.66, 0.7, 0.36, 0, linenMat);
      for (const px of [-0.7, 0.7]) {
        for (const dy of [0.16, 0.36, 0.56]) {
          addBox(group, 0.34, 0.17, 0.02, px, dy, 0.335, makeMat('#E9E1D3', 0.75, 0.02));
          addBox(group, 0.1, 0.016, 0.024, px, dy + 0.02, 0.352, brassMat);
        }
      }
      // Thick warm oak desktop slab (recolorable)
      addBox(group, 1.88, 0.052, 0.76, 0, 0.746, 0, primaryMat, true);
      // Walnut monitor riser shelf
      addBox(group, 1.14, 0.026, 0.24, -0.04, 0.85, -0.2, darkWoodMat);
      addBox(group, 0.03, 0.08, 0.22, -0.56, 0.81, -0.2, darkMetalMat);
      addBox(group, 0.03, 0.08, 0.22, 0.48, 0.81, -0.2, darkMetalMat);
      // Main ultrawide monitor with warm cozy screen glow + monitor lightbar
      addBox(group, 0.76, 0.38, 0.028, -0.14, 1.1, -0.22, darkMetalMat);
      const mainScreen = addBox(
        group,
        0.72,
        0.34,
        0.01,
        -0.14,
        1.1,
        -0.203,
        makeMat('#F4CE9B', 0.25, 0.05, { emissive: '#E0A15A', emissiveIntensity: 0.65 }),
      );
      mainScreen.castShadow = false;
      addCyl(group, 0.022, 0.026, 0.16, -0.14, 0.94, -0.24, darkMetalMat, 12);
      // Warm glowing lightbar atop ultrawide
      addCyl(
        group,
        0.012,
        0.012,
        0.44,
        -0.14,
        1.305,
        -0.19,
        makeMat('#FFE6BE', 0.2, 0.1, { emissive: '#FFCC82', emissiveIntensity: 1.4 }),
        12,
      ).rotation.z = Math.PI / 2;
      // Vertical side monitor (rotated slightly inward)
      const sideMon = new THREE.Group();
      sideMon.position.set(0.4, 1.08, -0.17);
      sideMon.rotation.y = -0.28;
      addBox(sideMon, 0.28, 0.44, 0.026, 0, 0, 0, darkMetalMat);
      const sideScreen = addBox(
        sideMon,
        0.25,
        0.41,
        0.01,
        0,
        0,
        0.016,
        makeMat('#C9D7CC', 0.28, 0.04, { emissive: '#87A690', emissiveIntensity: 0.42 }),
      );
      sideScreen.castShadow = false;
      addBox(sideMon, 0.03, 0.16, 0.03, 0, -0.2, -0.02, darkMetalMat);
      group.add(sideMon);
      // Felt desk mat + creamy mechanical keyboard + wireless mouse
      addBox(group, 0.78, 0.008, 0.34, -0.06, 0.776, 0.14, makeMat('#8B8378', 0.92, 0));
      addBox(group, 0.34, 0.022, 0.13, -0.14, 0.79, 0.15, linenMat);
      addBox(group, 0.31, 0.01, 0.1, -0.14, 0.805, 0.15, makeMat('#C88A5E', 0.7, 0.05));
      addBox(group, 0.065, 0.024, 0.1, 0.18, 0.79, 0.16, linenMat);
      // Cozy mug & tiny potted succulent on the desk corners
      addCyl(group, 0.038, 0.034, 0.085, -0.74, 0.815, 0.14, makeMat('#C67D58', 0.4, 0.05), 14);
      addCyl(group, 0.055, 0.045, 0.08, 0.74, 0.812, -0.12, linenMat, 14);
      const succ = new THREE.Mesh(new THREE.DodecahedronGeometry(0.065, 1), makeMat('#5A8256', 0.72, 0.02));
      succ.position.set(0.74, 0.88, -0.12);
      succ.castShadow = true;
      group.add(succ);
      break;
    }

    case 'round_bistro_table': {
      // Sculptural fluted drum pedestal base + beveled round table top
      addCyl(group, 0.46, 0.45, 0.048, 0, 0.716, 0, primaryMat, 32, true);
      // Fluted wooden/travertine drum pedestal (core + 14 vertical flutes)
      addCyl(group, 0.2, 0.23, 0.68, 0, 0.34, 0, oakMat, 22);
      for (let i = 0; i < 14; i++) {
        const ang = (i / 14) * Math.PI * 2;
        addCyl(
          group,
          0.024,
          0.026,
          0.66,
          Math.cos(ang) * 0.21,
          0.34,
          Math.sin(ang) * 0.21,
          primaryMat,
          8,
          true,
        );
      }
      addCyl(group, 0.26, 0.27, 0.032, 0, 0.016, 0, brassMat, 24);
      break;
    }

    case 'console_table': {
      // Aesthetic arched-leg entry console table with lower display shelf & brass accent bowl
      addBox(group, 1.66, 0.055, 0.44, 0, 0.792, 0, primaryMat, true);
      addBox(group, 1.38, 0.034, 0.34, 0, 0.22, 0, primaryMat, true);
      // Sculpted double-arch side panels
      for (const sx of [-0.66, 0.66]) {
        addBox(group, 0.06, 0.76, 0.38, sx, 0.38, 0, primaryMat, true);
        addBox(group, 0.075, 0.03, 0.4, sx, 0.015, 0, brassMat);
      }
      // Decorative arch apron ribs underneath top
      for (const ax of [-0.32, 0.32]) {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.024, 10, 18, Math.PI), primaryMat);
        arch.position.set(ax, 0.58, 0);
        arch.castShadow = true;
        arch.userData.recolorable = true;
        group.add(arch);
      }
      break;
    }

    case 'nested_coffee_tables': {
      // Pair of organic pebble-rounded nesting tables at staggered cozy heights
      // Taller primary oval table (left-back, y=0.44)
      const top1 = addCyl(group, 0.52, 0.52, 0.048, -0.26, 0.416, -0.06, primaryMat, 28, true);
      top1.scale.set(1.25, 1, 0.85);
      for (const [lx, lz] of [
        [-0.64, -0.26],
        [0.12, -0.26],
        [-0.26, 0.2],
      ]) {
        addCyl(group, 0.048, 0.038, 0.39, lx, 0.195, lz, primaryMat, 14, true);
      }
      // Lower warm oak nested round table (right-front, y=0.34)
      addCyl(group, 0.36, 0.36, 0.042, 0.46, 0.319, 0.12, oakMat, 26);
      addCyl(group, 0.15, 0.18, 0.295, 0.46, 0.148, 0.12, darkWoodMat, 18);
      break;
    }

    case 'vanity_desk': {
      // Cozy bedroom vanity table with fluted drawer front, brass legs & glowing arched mirror
      for (const [lx, lz] of [
        [-0.68, -0.26],
        [0.68, -0.26],
        [-0.68, 0.26],
        [0.68, 0.26],
      ]) {
        addCyl(group, 0.022, 0.016, 0.62, lx, 0.31, lz, brassMat, 12);
      }
      addBox(group, 1.54, 0.15, 0.62, 0, 0.685, 0, primaryMat, true);
      // Twin drawer reveals + brass knobs
      addBox(group, 0.68, 0.11, 0.018, -0.36, 0.685, 0.315, primaryMat, true);
      addBox(group, 0.68, 0.11, 0.018, 0.36, 0.685, 0.315, primaryMat, true);
      addCyl(group, 0.018, 0.018, 0.025, -0.36, 0.685, 0.335, brassMat, 12).rotation.x = Math.PI / 2;
      addCyl(group, 0.018, 0.018, 0.025, 0.36, 0.685, 0.335, brassMat, 12).rotation.x = Math.PI / 2;
      // Glowing arched backlit vanity mirror
      const glowMat = makeMat('#FFF3DC', 0.2, 0.1, { emissive: '#FFDCA6', emissiveIntensity: 1.25 });
      const mirrorMat = makeMat('#E4EDF0', 0.05, 0.92);
      addBox(group, 0.64, 0.44, 0.036, 0, 0.98, -0.24, brassMat);
      addBox(group, 0.6, 0.42, 0.02, 0, 0.98, -0.215, glowMat);
      addBox(group, 0.56, 0.38, 0.012, 0, 0.98, -0.203, mirrorMat);
      const archFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.036, 24), brassMat);
      archFrame.rotation.x = Math.PI / 2;
      archFrame.position.set(0, 1.16, -0.24);
      group.add(archFrame);
      const archGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.024, 24), mirrorMat);
      archGlass.rotation.x = Math.PI / 2;
      archGlass.position.set(0, 1.16, -0.21);
      group.add(archGlass);
      // Perfume bottles on brass tray
      addCyl(group, 0.1, 0.1, 0.014, 0.46, 0.768, -0.05, brassMat, 18);
      addCyl(group, 0.025, 0.028, 0.09, 0.43, 0.82, -0.06, glassMat, 12);
      addCyl(group, 0.02, 0.024, 0.075, 0.49, 0.812, -0.03, makeMat('#D99B7E', 0.2, 0.1), 12);
      break;
    }

    case 'low_chabudai': {
      // Cozy Japandi low oak tea table with slatted shelf + two woven floor zabuton cushions
      addBox(group, 1.38, 0.048, 0.72, 0, 0.336, 0, primaryMat, true);
      for (const [lx, lz] of [
        [-0.58, -0.28],
        [0.58, -0.28],
        [-0.58, 0.28],
        [0.58, 0.28],
      ]) {
        addBox(group, 0.06, 0.32, 0.06, lx, 0.16, lz, primaryMat, true);
      }
      // Lower slatted shelf
      for (let i = -2; i <= 2; i++) {
        addBox(group, 1.16, 0.018, 0.08, 0, 0.11, i * 0.11, primaryMat, true);
      }
      // Two cozy square zabuton floor cushions tucked at left & right
      const cushionMat = makeMat('#D8C8B2', 0.92, 0);
      addBox(group, 0.44, 0.08, 0.44, -0.84, 0.04, 0, cushionMat);
      addBox(group, 0.44, 0.08, 0.44, 0.84, 0.04, 0, makeMat('#8B9E8E', 0.92, 0));
      break;
    }

    // === NEW TABLETOP DESK & COZY ACCESSORIES ===
    case 'pc_tower': {
      // Aesthetic wood-slat front (Fractal-North inspired) tempered glass PC case with warm amber glow
      addBox(group, 0.22, 0.44, 0.42, 0, 0.24, 0, primaryMat, true);
      // Warm walnut front grille slats
      for (let i = -3; i <= 3; i++) {
        addBox(group, 0.018, 0.41, 0.018, i * 0.028, 0.24, 0.214, oakMat);
      }
      // Tempered glass left window revealing warm amber glowing fans & GPU inside
      const sideGlass = addBox(group, 0.012, 0.36, 0.34, -0.112, 0.245, -0.01, glassMat);
      sideGlass.castShadow = false;
      const glowRingMat = makeMat('#FFD394', 0.2, 0.1, { emissive: '#F29D4B', emissiveIntensity: 1.5 });
      addCyl(group, 0.05, 0.05, 0.02, -0.095, 0.32, 0.1, glowRingMat, 16).rotation.z = Math.PI / 2;
      addCyl(group, 0.05, 0.05, 0.02, -0.095, 0.18, 0.1, glowRingMat, 16).rotation.z = Math.PI / 2;
      addBox(group, 0.03, 0.04, 0.22, -0.09, 0.21, -0.04, darkMetalMat);
      // Brass feet + top power button
      for (const [fx, fz] of [
        [-0.08, -0.16],
        [0.08, -0.16],
        [-0.08, 0.16],
        [0.08, 0.16],
      ]) {
        addCyl(group, 0.018, 0.018, 0.02, fx, 0.01, fz, brassMat, 10);
      }
      addCyl(group, 0.012, 0.012, 0.008, 0.06, 0.464, 0.16, brassMat, 10);
      break;
    }

    case 'mech_keyboard_set': {
      // Cozy felt desk mat + creamy 75% mechanical keyboard + terracotta accent keys + wireless mouse
      addBox(group, 0.74, 0.007, 0.32, 0, 0.0035, 0, primaryMat, true);
      addBox(group, 0.34, 0.022, 0.135, -0.08, 0.018, 0.02, linenMat);
      // Keycap grid rows
      addBox(group, 0.31, 0.012, 0.105, -0.08, 0.034, 0.02, makeMat('#F7F1E5', 0.65, 0.04));
      addBox(group, 0.042, 0.014, 0.022, -0.215, 0.035, -0.02, makeMat('#C4733B', 0.6, 0.04));
      addBox(group, 0.055, 0.014, 0.022, 0.048, 0.035, 0.045, makeMat('#5E7A65', 0.6, 0.04));
      // Coiled cable aesthetic touch
      const coil = addCyl(group, 0.01, 0.01, 0.16, -0.08, 0.016, -0.085, makeMat('#C4733B', 0.7, 0.05), 12);
      coil.rotation.z = Math.PI / 2;
      // Ergonomic mouse
      const mouse = new THREE.Mesh(new THREE.SphereGeometry(0.046, 16, 12), linenMat);
      mouse.scale.set(0.75, 0.52, 1.15);
      mouse.position.set(0.22, 0.024, 0.03);
      mouse.castShadow = true;
      group.add(mouse);
      break;
    }

    case 'studio_speakers': {
      // Matched pair of cozy walnut bookshelf speakers with copper woofers & cream baffles
      const copperMat = makeMat('#C9824B', 0.28, 0.72);
      for (const sx of [-0.24, 0.24]) {
        const spk = new THREE.Group();
        spk.position.set(sx, 0, 0);
        spk.rotation.y = sx < 0 ? 0.16 : -0.16;
        addBox(spk, 0.16, 0.25, 0.2, 0, 0.125, 0, primaryMat, true);
        addBox(spk, 0.14, 0.23, 0.012, 0, 0.125, 0.102, linenMat);
        // Woofer & tweeter cones
        const woofer = addCyl(spk, 0.048, 0.034, 0.018, 0, 0.085, 0.108, copperMat, 18);
        woofer.rotation.x = Math.PI / 2;
        const tweeter = addCyl(spk, 0.022, 0.018, 0.014, 0, 0.185, 0.108, darkMetalMat, 16);
        tweeter.rotation.x = Math.PI / 2;
        group.add(spk);
      }
      break;
    }

    case 'desk_lamp_cozy': {
      // Iconic mid-century glowing opal-glass Mushroom Desk Lamp
      const glowShade = makeMat(colorHex, 0.28, 0.04, {
        emissive: '#FFCC82',
        emissiveIntensity: 1.05,
      });
      // Brass base ring + tapered opal stem
      addCyl(group, 0.085, 0.095, 0.024, 0, 0.012, 0, brassMat, 22);
      addCyl(group, 0.052, 0.075, 0.2, 0, 0.12, 0, glowShade, 22, true);
      // Iconic domed mushroom cap
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.155, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.56),
        glowShade,
      );
      cap.scale.set(1, 0.78, 1);
      cap.position.set(0, 0.22, 0);
      cap.castShadow = true;
      cap.userData.recolorable = true;
      group.add(cap);
      // Tiny brass finial knob on top
      addCyl(group, 0.014, 0.014, 0.016, 0, 0.345, 0, brassMat, 12);
      break;
    }

    // === NEW LIBRARIES & BOOKCASES ===
    case 'grand_library': {
      // Floor-to-ceiling 3-bay grand walnut library wall with crown molding, lower cabinets,
      // colorful hardcover books, ceramic vases, AND brass rail + angled wooden rolling ladder!
      addBox(group, 2.86, 0.08, 0.46, 0, 0.04, -0.22, primaryMat, true); // Plinth
      addBox(group, 2.9, 0.09, 0.5, 0, 2.43, -0.22, primaryMat, true); // Crown molding
      addBox(group, 2.82, 2.38, 0.04, 0, 1.22, -0.43, darkWoodMat); // Back panel
      // 4 vertical bay dividers
      for (const vx of [-1.4, -0.47, 0.47, 1.4]) {
        addBox(group, 0.06, 2.36, 0.44, vx, 1.22, -0.22, primaryMat, true);
      }
      // Lower closed cabinet doors with brass knobs (y = 0.08..0.68)
      addBox(group, 2.84, 0.045, 0.46, 0, 0.68, -0.21, primaryMat, true);
      for (const bx of [-0.935, 0, 0.935]) {
        addBox(group, 0.42, 0.54, 0.025, bx - 0.22, 0.37, -0.01, primaryMat, true);
        addBox(group, 0.42, 0.54, 0.025, bx + 0.22, 0.37, -0.01, primaryMat, true);
        addCyl(group, 0.015, 0.015, 0.025, bx - 0.05, 0.52, 0.012, brassMat, 10).rotation.x = Math.PI / 2;
        addCyl(group, 0.015, 0.015, 0.025, bx + 0.05, 0.52, 0.012, brassMat, 10).rotation.x = Math.PI / 2;
      }
      // 4 upper bookshelves loaded with cozy books & small vases
      const bookPalette = ['#B85E45', '#4E6B5C', '#3E526A', '#D6B88C', '#8F4D4A', '#C99B52', '#EFE8DC', '#6C594B'];
      const shelfYs = [1.04, 1.38, 1.72, 2.06];
      shelfYs.forEach((sy, sIdx) => {
        addBox(group, 2.82, 0.032, 0.4, 0, sy, -0.22, primaryMat, true);
        for (const bayIdx of [0, 1, 2]) {
          const bayCx = (bayIdx - 1) * 0.935;
          for (let b = 0; b < 9; b++) {
            if ((sIdx + bayIdx + b) % 7 === 0) continue; // Breathing gaps
            const bh = 0.17 + ((b * 13 + sIdx * 7 + bayIdx * 5) % 6) * 0.018;
            const bw = 0.042 + ((b + sIdx) % 3) * 0.01;
            const bx = bayCx - 0.38 + b * 0.092;
            const col = bookPalette[(b + sIdx * 3 + bayIdx * 2) % bookPalette.length];
            const book = addBox(group, bw, bh, 0.22, bx, sy + 0.016 + bh / 2, -0.22, makeMat(col, 0.72, 0.04));
            if (b === 8 && (sIdx + bayIdx) % 2 === 0) book.rotation.z = 0.22;
          }
          if ((sIdx + bayIdx) % 3 === 1) {
            addCyl(group, 0.045, 0.06, 0.16, bayCx + 0.28, sy + 0.095, -0.2, linenMat, 14);
          }
        }
      });
      // Brass rolling ladder rail + angled wooden library ladder!
      addCyl(group, 0.014, 0.014, 2.84, 0, 2.26, 0.04, brassMat, 12).rotation.z = Math.PI / 2;
      const ladder = new THREE.Group();
      ladder.position.set(0.58, 0, 0.24);
      ladder.rotation.x = -0.17;
      addBox(ladder, 0.036, 2.34, 0.055, -0.19, 1.17, 0, oakMat);
      addBox(ladder, 0.036, 2.34, 0.055, 0.19, 1.17, 0, oakMat);
      for (let r = 0; r < 7; r++) {
        addBox(ladder, 0.36, 0.024, 0.05, 0, 0.28 + r * 0.3, 0, oakMat);
      }
      // Brass top hooks
      addCyl(ladder, 0.024, 0.024, 0.03, -0.19, 2.31, -0.02, brassMat, 12).rotation.z = Math.PI / 2;
      addCyl(ladder, 0.024, 0.024, 0.03, 0.19, 2.31, -0.02, brassMat, 12).rotation.z = Math.PI / 2;
      group.add(ladder);
      break;
    }

    case 'arched_bookcase': {
      // Aesthetic curved-top recessed arch cabinet with 4 shelves, books & ceramic vessels
      const innerBackMat = makeMat('#EFE8DC', 0.85, 0.02);
      addBox(group, 0.86, 1.72, 0.4, 0, 0.86, -0.22, primaryMat, true);
      // Curved arch crown at top
      const archCrown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.43, 0.43, 0.4, 24, 1, false, 0, Math.PI),
        primaryMat,
      );
      archCrown.rotation.z = Math.PI / 2;
      archCrown.rotation.y = Math.PI / 2;
      archCrown.position.set(0, 1.72, -0.22);
      archCrown.castShadow = true;
      archCrown.userData.recolorable = true;
      group.add(archCrown);
      // Recessed warm plaster display alcove front
      addBox(group, 0.72, 1.56, 0.04, 0, 0.94, -0.34, innerBackMat);
      // 4 protruding shelves inside the arch
      const cols = ['#C4733B', '#546E5D', '#3D4E63', '#D9C3A3', '#96594C'];
      for (let i = 0; i < 4; i++) {
        const sy = 0.44 + i * 0.38;
        addBox(group, 0.74, 0.032, 0.34, 0, sy, -0.17, primaryMat, true);
        // Curated books + vase per shelf
        for (let b = 0; b < 5; b++) {
          const bh = 0.17 + ((i + b) % 3) * 0.03;
          addBox(
            group,
            0.048,
            bh,
            0.2,
            -0.25 + b * 0.064,
            sy + 0.016 + bh / 2,
            -0.18,
            makeMat(cols[(i + b) % cols.length], 0.75, 0.04),
          );
        }
        addCyl(group, 0.045, 0.065, 0.16, 0.22, sy + 0.095, -0.18, linenMat, 14);
      }
      // Lower closed drawer with brass pull
      addBox(group, 0.74, 0.34, 0.03, 0, 0.21, -0.01, primaryMat, true);
      addBox(group, 0.16, 0.018, 0.028, 0, 0.24, 0.015, brassMat);
      break;
    }

    case 'low_bookcase': {
      // Mid-century low open bookcase / credenza (flat top at 0.88m for stacking lamps/turntables!)
      for (const [lx, lz] of [
        [-0.78, -0.18],
        [0.78, -0.18],
        [-0.78, 0.18],
        [0.78, 0.18],
      ]) {
        addCyl(group, 0.024, 0.016, 0.16, lx, 0.08, lz, oakMat, 12);
      }
      // Main shell + top slab flush at y=0.88
      addBox(group, 1.76, 0.04, 0.44, 0, 0.86, 0, primaryMat, true);
      addBox(group, 1.76, 0.04, 0.44, 0, 0.18, 0, primaryMat, true);
      addBox(group, 1.72, 0.68, 0.03, 0, 0.52, -0.2, primaryMat, true);
      for (const vx of [-0.86, -0.28, 0.28, 0.86]) {
        addBox(group, 0.04, 0.68, 0.42, vx, 0.52, 0, primaryMat, true);
      }
      addBox(group, 1.72, 0.03, 0.4, 0, 0.52, 0, primaryMat, true);
      // Stacked books & leaning vinyl records inside the cubbies
      const spineColors = ['#C4733B', '#4F725D', '#3D4E66', '#E5DAC8', '#9A5B4B', '#CFA255'];
      for (const rowY of [0.2, 0.535]) {
        for (const cubbyX of [-0.57, 0, 0.57]) {
          for (let b = 0; b < 5; b++) {
            const bh = 0.21 + ((b + Math.round(rowY * 10)) % 3) * 0.025;
            addBox(
              group,
              0.044,
              bh,
              0.24,
              cubbyX - 0.16 + b * 0.072,
              rowY + bh / 2,
              0.02,
              makeMat(spineColors[(b + Math.abs(Math.round(cubbyX * 3))) % spineColors.length], 0.72, 0.04),
            );
          }
        }
      }
      break;
    }

    case 'corner_bookshelf': {
      // Aesthetic Scandinavian leaning A-frame ladder bookcase with 4 tapered shelves & woven basket
      for (const sx of [-0.36, 0.36]) {
        const rail = addBox(group, 0.04, 1.86, 0.055, sx, 0.92, -0.12, primaryMat, true);
        rail.rotation.x = -0.14;
      }
      const tiers: { y: number; d: number; z: number }[] = [
        { y: 0.34, d: 0.42, z: -0.02 },
        { y: 0.78, d: 0.36, z: -0.08 },
        { y: 1.22, d: 0.3, z: -0.15 },
        { y: 1.62, d: 0.24, z: -0.22 },
      ];
      const bookCols = ['#B86B43', '#567060', '#D8C7AE', '#43556B', '#C99B58'];
      tiers.forEach((tier, idx) => {
        addBox(group, 0.76, 0.028, tier.d, 0, tier.y, tier.z, primaryMat, true);
        if (idx === 0) {
          // Woven seagrass storage basket on bottom shelf
          addBox(group, 0.54, 0.24, 0.32, 0, tier.y + 0.135, tier.z, makeMat('#C9AE82', 0.9, 0));
        } else {
          for (let b = 0; b < 5; b++) {
            const bh = 0.16 + ((b + idx) % 3) * 0.025;
            addBox(
              group,
              0.045,
              bh,
              0.16,
              -0.24 + b * 0.068,
              tier.y + 0.014 + bh / 2,
              tier.z,
              makeMat(bookCols[(b + idx) % bookCols.length], 0.74, 0.04),
            );
          }
          // Tiny potted trailing plant on top shelf
          if (idx === 3) {
            addCyl(group, 0.055, 0.045, 0.09, 0.2, tier.y + 0.06, tier.z, linenMat, 12);
            const leaves = new THREE.Mesh(
              new THREE.DodecahedronGeometry(0.075, 1),
              makeMat('#5A8256', 0.75, 0.02),
            );
            leaves.position.set(0.2, tier.y + 0.14, tier.z);
            group.add(leaves);
          }
        }
      });
      break;
    }

    // === NEW WALL DECOR ===
    case 'wall_pegboard': {
      // Cozy desk pegboard with hanging mini shelves, pinned art postcard, headphones & succulent
      const wz = -0.42;
      addBox(group, 0.78, 0.62, 0.026, 0, 1.48, wz, primaryMat, true);
      // Peg holes pattern (decorative dark dots)
      for (let r = -2; r <= 2; r++) {
        for (let c = -3; c <= 3; c++) {
          addCyl(group, 0.008, 0.008, 0.01, c * 0.1, 1.48 + r * 0.1, wz + 0.012, darkWoodMat, 6).rotation.x =
            Math.PI / 2;
        }
      }
      // Mini hanging shelves + small succulent + art postcard + headphones
      addBox(group, 0.3, 0.02, 0.11, -0.18, 1.56, wz + 0.065, oakMat);
      addCyl(group, 0.04, 0.032, 0.07, -0.22, 1.605, wz + 0.065, linenMat, 12);
      const miniPlant = new THREE.Mesh(new THREE.DodecahedronGeometry(0.048, 1), makeMat('#5A8256', 0.72, 0));
      miniPlant.position.set(-0.22, 1.66, wz + 0.065);
      group.add(miniPlant);
      // Pinned cozy postcard
      addBox(group, 0.18, 0.22, 0.008, 0.2, 1.58, wz + 0.02, makeMat('#F4ECE0', 0.85, 0));
      addBox(group, 0.14, 0.16, 0.009, 0.2, 1.58, wz + 0.024, makeMat('#C4733B', 0.7, 0));
      // Lower tray + hanging headphones
      addBox(group, 0.26, 0.02, 0.1, 0.18, 1.32, wz + 0.06, oakMat);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 8, 16, Math.PI), darkMetalMat);
      band.position.set(-0.18, 1.36, wz + 0.045);
      group.add(band);
      addCyl(group, 0.032, 0.032, 0.026, -0.245, 1.33, wz + 0.045, makeMat('#C48A5E', 0.6, 0.1), 12).rotation.z =
        Math.PI / 2;
      addCyl(group, 0.032, 0.032, 0.026, -0.115, 1.33, wz + 0.045, makeMat('#C48A5E', 0.6, 0.1), 12).rotation.z =
        Math.PI / 2;
      break;
    }

    case 'string_lights': {
      // Draped warm fairy-light garland (2m wide catenary arc with 9 glowing amber bulbs)
      const wz = -0.41;
      const wireMat = makeMat('#4A3B31', 0.7, 0.2);
      const bulbMat = makeMat('#FFF2D4', 0.2, 0.05, {
        emissive: '#FFBE6B',
        emissiveIntensity: 1.85,
      });
      // Build catenary curve tube
      const curvePts: THREE.Vector3[] = [];
      for (let i = 0; i <= 16; i++) {
        const t = i / 16;
        const x = -0.88 + t * 1.76;
        const sag = Math.sin(t * Math.PI) * 0.28;
        curvePts.push(new THREE.Vector3(x, 2.08 - sag, wz + 0.02));
      }
      const curve = new THREE.CatmullRomCurve3(curvePts);
      const wireGeo = new THREE.TubeGeometry(curve, 24, 0.008, 6, false);
      const wire = new THREE.Mesh(wireGeo, wireMat);
      group.add(wire);
      // 9 warm glowing bulbs hanging along the drape
      for (let i = 1; i <= 9; i++) {
        const pt = curve.getPoint(i / 10);
        addCyl(group, 0.012, 0.012, 0.03, pt.x, pt.y - 0.018, pt.z, primaryMat, 8, true);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 10), bulbMat);
        bulb.position.set(pt.x, pt.y - 0.055, pt.z);
        group.add(bulb);
      }
      break;
    }

    // === NEW COZY DECOR ===
    case 'record_cabinet': {
      // Mid-century oak vinyl record crate & plant stand (flat top at 0.84m for turntables!)
      for (const [lx, lz] of [
        [-0.32, -0.22],
        [0.32, -0.22],
        [-0.32, 0.22],
        [0.32, 0.22],
      ]) {
        addCyl(group, 0.022, 0.015, 0.28, lx, 0.14, lz, oakMat, 12);
      }
      // Cabinet body flush at y=0.84
      addBox(group, 0.78, 0.036, 0.52, 0, 0.822, 0, primaryMat, true);
      addBox(group, 0.78, 0.036, 0.52, 0, 0.298, 0, primaryMat, true);
      addBox(group, 0.036, 0.52, 0.52, -0.372, 0.56, 0, primaryMat, true);
      addBox(group, 0.036, 0.52, 0.52, 0.372, 0.56, 0, primaryMat, true);
      addBox(group, 0.72, 0.52, 0.028, 0, 0.56, -0.245, primaryMat, true);
      // Brass record dividers + colorful upright vinyl sleeves
      for (const dx of [-0.12, 0.12]) {
        addBox(group, 0.01, 0.44, 0.42, dx, 0.54, 0.02, brassMat);
      }
      const lpColors = ['#C4733B', '#4B6B5A', '#DFC9A6', '#3A4A60', '#B35D52', '#D4A55A', '#E8E1D5', '#68596B'];
      for (let i = 0; i < 11; i++) {
        const lx = -0.31 + i * 0.062;
        if (Math.abs(lx + 0.12) < 0.025 || Math.abs(lx - 0.12) < 0.025) continue;
        const lp = addBox(
          group,
          0.018,
          0.34,
          0.34,
          lx,
          0.49,
          0.02,
          makeMat(lpColors[i % lpColors.length], 0.58, 0.05),
        );
        lp.rotation.z = (i % 3 - 1) * 0.06;
      }
      break;
    }

    case 'olive_tree': {
      // Woven seagrass belly basket + slender branching Mediterranean olive tree with sage foliage
      const basketPts = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.18, 0),
        new THREE.Vector2(0.26, 0.16),
        new THREE.Vector2(0.24, 0.32),
        new THREE.Vector2(0.19, 0.4),
        new THREE.Vector2(0.17, 0.4),
      ];
      const basket = new THREE.Mesh(new THREE.LatheGeometry(basketPts, 24), primaryMat);
      basket.castShadow = true;
      basket.receiveShadow = true;
      basket.userData.recolorable = true;
      group.add(basket);
      addCyl(group, 0.16, 0.16, 0.04, 0, 0.34, 0, makeMat('#423328', 0.94, 0), 16);
      // Slender woody trunk + 3 graceful branches
      const trunk = addCyl(group, 0.022, 0.036, 1.05, 0, 0.82, 0, darkWoodMat, 10);
      trunk.rotation.z = 0.06;
      const b1 = addCyl(group, 0.012, 0.02, 0.48, -0.1, 1.32, 0.06, darkWoodMat, 8);
      b1.rotation.z = 0.45;
      const b2 = addCyl(group, 0.012, 0.018, 0.45, 0.11, 1.38, -0.05, darkWoodMat, 8);
      b2.rotation.z = -0.38;
      // Silvery-sage olive leaf clusters
      const sageMat = makeMat('#738C70', 0.78, 0.02);
      const sageLight = makeMat('#8FA58A', 0.78, 0.02);
      const clusters: [number, number, number, number, boolean][] = [
        [0.02, 1.68, 0, 0.22, false],
        [-0.22, 1.48, 0.1, 0.18, true],
        [0.21, 1.54, -0.08, 0.19, true],
        [-0.08, 1.36, -0.14, 0.15, false],
        [0.14, 1.34, 0.14, 0.15, false],
      ];
      for (const [cx, cy, cz, r, light] of clusters) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), light ? sageLight : sageMat);
        puff.scale.set(1.15, 0.82, 1.05);
        puff.position.set(cx, cy, cz);
        puff.castShadow = true;
        group.add(puff);
      }
      break;
    }

    case 'round_jute_rug': {
      // Cozy circular concentric braided natural jute rug
      addCyl(group, 0.96, 0.96, 0.018, 0, 0.012, 0, primaryMat, 40, true);
      const ringMat = makeMat('#B59A73', 0.94, 0);
      for (const rad of [0.28, 0.56, 0.82]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.008, 6, 36), ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.022;
        group.add(ring);
      }
      break;
    }

    // === STAIRS (TANGGA) ===
    case 'straight_stairs': {
      const steps = 11;
      const totalH = 2.6;
      const totalD = 2.8;
      const stepH = totalH / steps;
      const stepD = totalD / steps;
      // Twin dark steel stringers
      const stringerLen = Math.hypot(totalD, totalH);
      const slopeAngle = Math.atan2(totalH, totalD);
      for (const sx of [-0.42, 0.42]) {
        const stringer = addBox(group, 0.055, 0.16, stringerLen, sx, totalH / 2 - 0.04, 0, darkMetalMat);
        stringer.rotation.x = slopeAngle;
      }
      // Solid oak treads & risers
      for (let i = 0; i < steps; i++) {
        const sy = (i + 1) * stepH;
        const sz = totalD / 2 - (i + 0.5) * stepD;
        addBox(group, 0.9, 0.048, stepD + 0.03, 0, sy - 0.024, sz, primaryMat, true);
        if (i % 2 === 0 || i === steps - 1) {
          addCyl(group, 0.014, 0.014, 0.88, 0.44, sy + 0.44, sz, darkMetalMat, 8);
        }
      }
      // Sleek handrail along right side
      const rail = addBox(group, 0.045, 0.045, stringerLen, 0.44, totalH / 2 + 0.88, 0, oakMat);
      rail.rotation.x = slopeAngle;
      break;
    }

    case 'l_stairs': {
      // Lower run (6 steps rising to 1.35m landing at back), then 90-degree turn right up to 2.6m
      const lowerSteps = 6;
      const midH = 1.35;
      for (let i = 0; i < lowerSteps; i++) {
        const sy = ((i + 1) / lowerSteps) * midH;
        const sz = 1.35 - i * 0.28;
        addBox(group, 0.86, 0.05, 0.28, -0.48, sy - 0.025, sz, primaryMat, true);
        addBox(group, 0.82, sy - 0.05, 0.04, -0.48, (sy - 0.05) / 2, sz - 0.12, darkMetalMat);
      }
      // Corner landing deck at (-0.48, 1.35, -0.82)
      addBox(group, 0.92, 0.08, 0.92, -0.48, midH - 0.04, -0.82, primaryMat, true);
      for (const [px, pz] of [[-0.9, -1.22], [-0.08, -1.22], [-0.9, -0.42]]) {
        addCyl(group, 0.028, 0.028, midH, px, midH / 2, pz, darkMetalMat, 10);
      }
      // Upper run turning +X across back (5 steps rising from 1.35m to 2.60m)
      const upperSteps = 5;
      for (let i = 0; i < upperSteps; i++) {
        const sy = midH + ((i + 1) / upperSteps) * (2.6 - midH);
        const sx = 0.08 + i * 0.22;
        addBox(group, 0.24, 0.05, 0.86, sx, sy - 0.025, -0.82, primaryMat, true);
        addCyl(group, 0.014, 0.014, 0.86, sx, sy + 0.43, -0.42, darkMetalMat, 8);
      }
      // Handrail segments
      const rail1 = addBox(group, 0.04, 0.04, 2.05, -0.06, midH / 2 + 0.85, 0.55, oakMat);
      rail1.rotation.x = Math.atan2(midH, 1.75);
      const rail2 = addBox(group, 1.15, 0.04, 0.04, 0.52, midH + 0.62 + 0.86, -0.42, oakMat);
      rail2.rotation.z = Math.atan2(1.25, 1.1);
      break;
    }

    case 'spiral_stairs': {
      // Architectural spiral staircase around central steel column
      addCyl(group, 0.085, 0.095, 2.7, 0, 1.35, 0, primaryMat, 16, true);
      addCyl(group, 0.16, 0.18, 0.05, 0, 0.025, 0, darkMetalMat, 18);
      const steps = 13;
      for (let i = 0; i < steps; i++) {
        const angle = i * ((Math.PI * 1.65) / steps);
        const sy = 0.2 + i * 0.195;
        const treadGroup = new THREE.Group();
        treadGroup.position.y = sy;
        treadGroup.rotation.y = angle;
        addBox(treadGroup, 0.78, 0.042, 0.34, 0.44, 0, 0, oakMat);
        // Vertical outer baluster rod
        addCyl(treadGroup, 0.012, 0.012, 0.92, 0.8, 0.46, 0, primaryMat, 8, true);
        // Connecting curved handrail chord to next baluster
        const chord = addBox(treadGroup, 0.032, 0.036, 0.34, 0.8, 0.96, -0.15, primaryMat, true);
        chord.rotation.x = -0.48;
        group.add(treadGroup);
      }
      break;
    }

    // === GARDEN, GAZEBO & PARK ===
    case 'gazebo_wood': {
      // Raised timber deck plinth + stepped front entry
      const roofTileMat = makeMat(def?.accentColor || '#A8583B', 0.78, 0.04);
      addBox(group, 2.74, 0.16, 2.74, 0, 0.08, 0, primaryMat, true);
      addBox(group, 1.1, 0.08, 0.38, 0, 0.04, 1.5, primaryMat, true);
      // 4 sturdy corner timber posts + decorative knee braces
      for (const [px, pz] of [[-1.22, -1.22], [1.22, -1.22], [-1.22, 1.22], [1.22, 1.22]]) {
        addBox(group, 0.14, 2.1, 0.14, px, 1.21, pz, primaryMat, true);
        addBox(group, 0.18, 0.08, 0.18, px, 0.2, pz, darkWoodMat);
      }
      // Perimeter top ring beams
      addBox(group, 2.66, 0.12, 0.12, 0, 2.22, -1.22, primaryMat, true);
      addBox(group, 2.66, 0.12, 0.12, 0, 2.22, 1.22, primaryMat, true);
      addBox(group, 0.12, 0.12, 2.66, -1.22, 2.22, 0, primaryMat, true);
      addBox(group, 0.12, 0.12, 2.66, 1.22, 2.22, 0, primaryMat, true);
      // Built-in cozy wooden perimeter benches + slatted railings (open at +Z front)
      addBox(group, 2.34, 0.06, 0.42, 0, 0.52, -1.0, oakMat);
      addBox(group, 0.42, 0.06, 2.1, -1.0, 0.52, 0.04, oakMat);
      addBox(group, 0.42, 0.06, 2.1, 1.0, 0.52, 0.04, oakMat);
      // Back & side railings
      addBox(group, 2.4, 0.06, 0.06, 0, 0.96, -1.22, primaryMat, true);
      addBox(group, 0.06, 0.06, 2.4, -1.22, 0.96, 0, primaryMat, true);
      addBox(group, 0.06, 0.06, 2.4, 1.22, 0.96, 0, primaryMat, true);
      // Hanging warm center lantern
      const glowMat = makeMat('#FFE8B5', 0.2, 0.05, { emissive: '#FFBE6B', emissiveIntensity: 1.5 });
      addCyl(group, 0.012, 0.012, 0.35, 0, 2.12, 0, darkMetalMat, 8);
      addCyl(group, 0.11, 0.09, 0.2, 0, 1.88, 0, glowMat, 12);
      // 4-sided overhanging pyramid roof + wooden finial cap
      const roofGeo = new THREE.ConeGeometry(2.38, 0.96, 4);
      roofGeo.rotateY(Math.PI / 4);
      const roof = new THREE.Mesh(roofGeo, roofTileMat);
      roof.position.y = 2.74;
      roof.castShadow = true;
      roof.receiveShadow = true;
      group.add(roof);
      addCyl(group, 0.04, 0.08, 0.16, 0, 3.24, 0, darkWoodMat, 8);
      break;
    }

    case 'garden_tree': {
      // Organic shade tree with stone edging bed, tapered trunk, forked branches & lush multi-cluster canopy
      const soilMat = makeMat('#5A4636', 0.94, 0);
      addCyl(group, 0.58, 0.62, 0.08, 0, 0.04, 0, makeMat('#9E9589', 0.88, 0), 18);
      addCyl(group, 0.5, 0.5, 0.09, 0, 0.045, 0, soilMat, 16);
      // Trunk + 3 branches
      addCyl(group, 0.11, 0.18, 1.55, 0, 0.82, 0, darkWoodMat, 10);
      const br1 = addCyl(group, 0.05, 0.09, 0.85, -0.24, 1.65, 0.14, darkWoodMat, 8);
      br1.rotation.set(0.25, 0, 0.45);
      const br2 = addCyl(group, 0.05, 0.09, 0.82, 0.26, 1.7, -0.16, darkWoodMat, 8);
      br2.rotation.set(-0.22, 0, -0.42);
      // Layered foliage puffs
      const altLeafMat = makeMat(colorHex, 0.82, 0.02);
      altLeafMat.color.offsetHSL(0.02, 0.04, 0.06);
      const puffs: [number, number, number, number, boolean][] = [
        [0, 2.55, 0, 0.84, false],
        [-0.58, 2.15, 0.34, 0.62, true],
        [0.62, 2.24, -0.28, 0.66, false],
        [0.24, 2.1, 0.56, 0.56, true],
        [-0.32, 2.28, -0.52, 0.58, false],
        [0.05, 3.05, 0.06, 0.54, true],
      ];
      for (const [cx, cy, cz, r, light] of puffs) {
        const mesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(r, 1),
          light ? altLeafMat : primaryMat,
        );
        mesh.scale.set(1.12, 0.86, 1.08);
        mesh.position.set(cx, cy, cz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.recolorable = true;
        group.add(mesh);
      }
      break;
    }

    case 'pine_tree': {
      addCyl(group, 0.07, 0.12, 0.9, 0, 0.45, 0, darkWoodMat, 10);
      const tiers: [number, number, number][] = [
        [0.58, 1.1, 1.2],
        [0.48, 1.0, 1.85],
        [0.37, 0.95, 2.48],
        [0.24, 0.85, 3.08],
      ];
      for (const [rad, h, y] of tiers) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 8), primaryMat);
        cone.position.y = y;
        cone.castShadow = true;
        cone.receiveShadow = true;
        cone.userData.recolorable = true;
        group.add(cone);
      }
      break;
    }

    case 'flower_bed': {
      // Timber raised garden box + dark soil + lush hedge + colorful blooms
      addBox(group, 1.82, 0.28, 0.78, 0, 0.14, 0, oakMat);
      addBox(group, 1.7, 0.24, 0.66, 0, 0.17, 0, makeMat('#4A382B', 0.95, 0));
      const bushMat = makeMat('#507845', 0.84, 0);
      for (let i = -3; i <= 3; i++) {
        const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + (Math.abs(i) % 2) * 0.03, 1), bushMat);
        bush.position.set(i * 0.23, 0.36, (i % 2) * 0.06);
        bush.scale.set(1.1, 0.78, 1.0);
        bush.castShadow = true;
        group.add(bush);
        // Flower clusters on top
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), primaryMat);
        bloom.position.set(i * 0.23 + 0.03, 0.49, (i % 2) * 0.06 + 0.04);
        bloom.userData.recolorable = true;
        group.add(bloom);
        const bloom2 = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), primaryMat);
        bloom2.position.set(i * 0.23 - 0.06, 0.47, (i % 2) * 0.06 - 0.05);
        bloom2.userData.recolorable = true;
        group.add(bloom2);
      }
      break;
    }

    case 'garden_pond': {
      // Stone-rimmed serene koi pond with reflective water, lily pads & bright koi fish accents
      const stoneMat = makeMat('#8E877D', 0.86, 0.03);
      addCyl(group, 0.94, 0.98, 0.22, 0, 0.11, 0, stoneMat, 22);
      // Decorative stone boulders along rim
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.14 + (i % 3) * 0.04, 0),
          makeMat(i % 2 === 0 ? '#969086' : '#7A746B', 0.9, 0.02),
        );
        rock.scale.set(1.2, 0.65, 1.0);
        rock.position.set(Math.cos(a) * 0.86, 0.22, Math.sin(a) * 0.86);
        rock.castShadow = true;
        group.add(rock);
      }
      // Shimmering water disc
      const waterMat = makeMat(colorHex, 0.12, 0.15);
      addCyl(group, 0.82, 0.82, 0.04, 0, 0.18, 0, waterMat, 24, true);
      // Lily pads + pink lotus + koi fish
      const padMat = makeMat('#4D7A47', 0.72, 0);
      for (const [lx, lz, r] of [[-0.32, -0.24, 0.15], [0.36, 0.28, 0.13], [-0.14, 0.42, 0.11]]) {
        addCyl(group, r, r, 0.012, lx, 0.205, lz, padMat, 14);
      }
      const lotus = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.06, 6), makeMat('#E598A8', 0.6, 0));
      lotus.position.set(-0.32, 0.23, -0.24);
      group.add(lotus);
      const koiMat = makeMat('#E8733A', 0.3, 0.05);
      const koi1 = addBox(group, 0.18, 0.02, 0.055, 0.12, 0.205, -0.14, koiMat);
      koi1.rotation.y = 0.6;
      const koi2 = addBox(group, 0.15, 0.02, 0.05, -0.22, 0.205, 0.12, makeMat('#F4ECE0', 0.3, 0.05));
      koi2.rotation.y = -0.8;
      break;
    }

    case 'park_bench': {
      // Cast-iron side frames + warm slatted timber seat & backrest
      for (const sx of [-0.74, 0.74]) {
        addBox(group, 0.055, 0.44, 0.56, sx, 0.22, 0, darkMetalMat);
        addBox(group, 0.055, 0.44, 0.055, sx, 0.64, -0.24, darkMetalMat);
        addBox(group, 0.055, 0.04, 0.52, sx, 0.62, 0.0, darkMetalMat);
      }
      for (let i = 0; i < 4; i++) {
        addBox(group, 1.72, 0.038, 0.1, 0, 0.44, -0.18 + i * 0.12, primaryMat, true);
      }
      for (let i = 0; i < 3; i++) {
        const slat = addBox(group, 1.72, 0.095, 0.032, 0, 0.56 + i * 0.12, -0.23 - i * 0.02, primaryMat, true);
        slat.rotation.x = -0.16;
      }
      break;
    }

    case 'garden_lamp': {
      // Architectural outdoor lantern post with warm glowing glass housing
      addCyl(group, 0.14, 0.18, 0.12, 0, 0.06, 0, primaryMat, 12, true);
      addCyl(group, 0.042, 0.055, 1.68, 0, 0.94, 0, primaryMat, 12, true);
      addBox(group, 0.28, 0.04, 0.28, 0, 1.78, 0, primaryMat, true);
      const glowMat = makeMat('#FFF2C8', 0.15, 0.05, { emissive: '#FFCC72', emissiveIntensity: 1.65 });
      addBox(group, 0.2, 0.28, 0.2, 0, 1.94, 0, glowMat);
      // Corner lantern mullions
      for (const [cx, cz] of [[-0.105, -0.105], [0.105, -0.105], [-0.105, 0.105], [0.105, 0.105]]) {
        addBox(group, 0.02, 0.3, 0.02, cx, 1.94, cz, primaryMat, true);
      }
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.16, 4), primaryMat);
      cap.rotation.y = Math.PI / 4;
      cap.position.y = 2.16;
      cap.castShadow = true;
      cap.userData.recolorable = true;
      group.add(cap);
      break;
    }

    case 'stepping_stones': {
      // Natural irregular garden stepping stones along a 2m strip
      const stones: [number, number, number, number, number][] = [
        [-0.08, -0.7, 0.56, 0.36, 0.08],
        [0.09, -0.22, 0.52, 0.38, -0.12],
        [-0.06, 0.26, 0.58, 0.35, 0.06],
        [0.07, 0.72, 0.52, 0.36, -0.09],
      ];
      for (const [sx, sz, sw, sd, rot] of stones) {
        const st = addBox(group, sw, 0.045, sd, sx, 0.0225, sz, primaryMat, true);
        st.rotation.y = rot;
      }
      break;
    }

    case 'fence_wood': {
      // Modular warm timber garden fence (2m wide)
      addBox(group, 0.1, 1.16, 0.1, -0.94, 0.58, 0, darkWoodMat);
      addBox(group, 0.1, 1.16, 0.1, 0.94, 0.58, 0, darkWoodMat);
      addBox(group, 1.88, 0.06, 0.05, 0, 0.32, -0.02, darkWoodMat);
      addBox(group, 1.88, 0.06, 0.05, 0, 0.9, -0.02, darkWoodMat);
      for (let i = 0; i < 9; i++) {
        const px = -0.8 + i * 0.2;
        addBox(group, 0.14, 1.06, 0.028, px, 0.56, 0.025, primaryMat, true);
      }
      break;
    }

    // === VEHICLES & PARKING AREA (MOBIL, MOTOR & PARKIRAN) ===
    case 'sedan_car':
    case 'city_suv': {
      const isSuv = defId === 'city_suv';
      const bodyW = isSuv ? 1.78 : 1.68;
      const bodyL = isSuv ? 3.82 : 3.68;
      const lowerH = isSuv ? 0.64 : 0.52;
      const cabinH = isSuv ? 0.68 : 0.56;
      const cabinL = isSuv ? 2.25 : 1.82;
      const cabinZ = isSuv ? -0.22 : -0.18;
      const wheelR = isSuv ? 0.34 : 0.29;
      const paintMat = makeMat(colorHex, 0.26, 0.38);
      const tireMat = makeMat('#222428', 0.88, 0.05);
      const cabinGlass = makeMat('#2E3A47', 0.12, 0.65);
      const headLightMat = makeMat('#FFF6D6', 0.1, 0.1, { emissive: '#FFE8A8', emissiveIntensity: 1.1 });
      const tailLightMat = makeMat('#C83B32', 0.2, 0.1, { emissive: '#D63A30', emissiveIntensity: 0.9 });

      // Lower chassis + sculpted bumpers
      addBox(group, bodyW, lowerH, bodyL, 0, wheelR + lowerH * 0.48, 0, paintMat, true);
      addBox(group, bodyW + 0.02, 0.14, 0.16, 0, wheelR + 0.14, bodyL / 2 - 0.02, darkMetalMat);
      addBox(group, bodyW + 0.02, 0.14, 0.16, 0, wheelR + 0.14, -bodyL / 2 + 0.02, darkMetalMat);
      // Cabin upper body + tinted windows wrap
      addBox(group, bodyW * 0.86, cabinH, cabinL, 0, wheelR + lowerH + cabinH * 0.44, cabinZ, paintMat, true);
      addBox(group, bodyW * 0.88, cabinH * 0.72, cabinL * 0.86, 0, wheelR + lowerH + cabinH * 0.46, cabinZ, cabinGlass);
      addBox(group, bodyW * 0.78, cabinH * 0.72, cabinL + 0.03, 0, wheelR + lowerH + cabinH * 0.46, cabinZ, cabinGlass);
      // SUV roof rack rails
      if (isSuv) {
        addBox(group, 0.04, 0.06, cabinL * 0.78, -bodyW * 0.36, wheelR + lowerH + cabinH + 0.02, cabinZ, darkMetalMat);
        addBox(group, 0.04, 0.06, cabinL * 0.78, bodyW * 0.36, wheelR + lowerH + cabinH + 0.02, cabinZ, darkMetalMat);
      }
      // Front grille, headlights, taillights & side mirrors
      addBox(group, bodyW * 0.5, 0.18, 0.05, 0, wheelR + lowerH * 0.45, bodyL / 2 + 0.01, darkMetalMat);
      addBox(group, 0.28, 0.14, 0.06, -bodyW * 0.36, wheelR + lowerH * 0.58, bodyL / 2 + 0.005, headLightMat);
      addBox(group, 0.28, 0.14, 0.06, bodyW * 0.36, wheelR + lowerH * 0.58, bodyL / 2 + 0.005, headLightMat);
      addBox(group, 0.3, 0.12, 0.06, -bodyW * 0.34, wheelR + lowerH * 0.62, -bodyL / 2 - 0.005, tailLightMat);
      addBox(group, 0.3, 0.12, 0.06, bodyW * 0.34, wheelR + lowerH * 0.62, -bodyL / 2 - 0.005, tailLightMat);
      addBox(group, 0.14, 0.09, 0.1, -bodyW * 0.52, wheelR + lowerH + 0.12, 0.52, paintMat, true);
      addBox(group, 0.14, 0.09, 0.1, bodyW * 0.52, wheelR + lowerH + 0.12, 0.52, paintMat, true);
      // 4 wheels with alloy rims
      for (const [wx, wz] of [
        [-bodyW * 0.48, bodyL * 0.31],
        [bodyW * 0.48, bodyL * 0.31],
        [-bodyW * 0.48, -bodyL * 0.31],
        [bodyW * 0.48, -bodyL * 0.31],
      ]) {
        const tire = addCyl(group, wheelR, wheelR, 0.22, wx, wheelR, wz, tireMat, 18);
        tire.rotation.z = Math.PI / 2;
        const rim = addCyl(group, wheelR * 0.58, wheelR * 0.58, 0.235, wx, wheelR, wz, chromeMat, 14);
        rim.rotation.z = Math.PI / 2;
      }
      break;
    }

    case 'scooter_bike': {
      // Cozy Vespa-style motor skutik with front shield, seat, headlamp, handlebars & two tires
      const tireMat = makeMat('#222428', 0.88, 0.05);
      const paintMat = makeMat(colorHex, 0.26, 0.32);
      const leatherMat = makeMat('#7B5034', 0.72, 0.04);
      // Front & rear wheels
      for (const wz of [0.56, -0.52]) {
        const tire = addCyl(group, 0.22, 0.22, 0.11, 0, 0.22, wz, tireMat, 16);
        tire.rotation.z = Math.PI / 2;
        const rim = addCyl(group, 0.12, 0.12, 0.12, 0, 0.22, wz, chromeMat, 12);
        rim.rotation.z = Math.PI / 2;
      }
      // Step-through deck + rear body shell + cozy leather seat
      addBox(group, 0.34, 0.08, 0.64, 0, 0.24, 0.06, darkMetalMat);
      addBox(group, 0.4, 0.34, 0.78, 0, 0.46, -0.34, paintMat, true);
      addBox(group, 0.32, 0.13, 0.66, 0, 0.68, -0.32, leatherMat);
      // Front leg shield + angled steering column
      const shield = addBox(group, 0.42, 0.62, 0.12, 0, 0.56, 0.48, paintMat, true);
      shield.rotation.x = -0.22;
      const stem = addCyl(group, 0.032, 0.035, 0.75, 0, 0.62, 0.52, chromeMat, 10);
      stem.rotation.x = -0.22;
      // Handlebars + round headlamp + mirrors
      addCyl(group, 0.018, 0.018, 0.64, 0, 0.96, 0.44, chromeMat, 10).rotation.z = Math.PI / 2;
      addCyl(group, 0.025, 0.025, 0.12, -0.28, 0.96, 0.44, darkMetalMat, 8).rotation.z = Math.PI / 2;
      addCyl(group, 0.025, 0.025, 0.12, 0.28, 0.96, 0.44, darkMetalMat, 8).rotation.z = Math.PI / 2;
      const lamp = addCyl(group, 0.085, 0.085, 0.08, 0, 0.95, 0.52, makeMat('#FFF3CE', 0.15, 0.1, { emissive: '#FFE4A0', emissiveIntensity: 1.2 }), 14);
      lamp.rotation.x = Math.PI / 2;
      // Exhaust muffler & taillight
      addCyl(group, 0.038, 0.044, 0.45, 0.22, 0.28, -0.52, chromeMat, 10).rotation.x = Math.PI / 2;
      addBox(group, 0.1, 0.07, 0.05, 0, 0.56, -0.74, makeMat('#C83B32', 0.2, 0.1));
      break;
    }

    case 'parking_bay': {
      // Clean paved asphalt parking slot (2.8×4.8m) with crisp white painted bay markings & wheel stopper
      const lineMat = makeMat('#F3EFE6', 0.7, 0.02);
      const curbMat = makeMat('#E5B84B', 0.65, 0.05);
      addBox(group, 2.86, 0.03, 4.86, 0, 0.015, 0, primaryMat, true);
      // White U-frame bay stripes
      addBox(group, 0.1, 0.008, 4.5, -1.32, 0.035, 0, lineMat);
      addBox(group, 0.1, 0.008, 4.5, 1.32, 0.035, 0, lineMat);
      addBox(group, 2.74, 0.008, 0.1, 0, 0.035, -2.2, lineMat);
      // Yellow/concrete wheel stopper bumper near back
      addBox(group, 1.85, 0.1, 0.14, 0, 0.08, -1.78, curbMat);
      break;
    }

    case 'carport_canopy': {
      // Sleek architectural steel & warm timber-slat carport shelter (3×5m, cars drive right inside!)
      const roofGlass = new THREE.MeshPhysicalMaterial({
        color: '#D5E5EC',
        roughness: 0.14,
        metalness: 0.06,
        transparent: true,
        opacity: isSoftwareGl ? 0.42 : 0.58,
      });
      // 4 slim steel columns at corners (keeping inner 2.55m completely clear for vehicles)
      for (const [px, pz] of [[-1.36, -2.28], [1.36, -2.28], [-1.36, 2.28], [1.36, 2.28]]) {
        addBox(group, 0.12, 2.55, 0.12, px, 1.275, pz, primaryMat, true);
        addBox(group, 0.2, 0.08, 0.2, px, 0.04, pz, darkMetalMat);
      }
      // Perimeter cantilevered roof frame
      addBox(group, 2.98, 0.14, 0.14, 0, 2.56, -2.35, primaryMat, true);
      addBox(group, 2.98, 0.14, 0.14, 0, 2.56, 2.35, primaryMat, true);
      addBox(group, 0.14, 0.14, 4.84, -1.42, 2.56, 0, primaryMat, true);
      addBox(group, 0.14, 0.14, 4.84, 1.42, 2.56, 0, primaryMat, true);
      // Warm cedar pergola roof slats + translucent polycarbonate cover
      for (let i = -5; i <= 5; i++) {
        addBox(group, 2.72, 0.08, 0.09, 0, 2.55, i * 0.42, oakMat);
      }
      const cover = addBox(group, 2.94, 0.025, 4.8, 0, 2.64, 0, roofGlass);
      cover.castShadow = false;
      break;
    }

    case 'bike_parking': {
      // Paved motorcycle / scooter parking strip with steel front wheel hoops & white lane markers
      const lineMat = makeMat('#F3EFE6', 0.7, 0.02);
      addBox(group, 2.84, 0.03, 1.9, 0, 0.015, 0, primaryMat, true);
      addBox(group, 2.74, 0.008, 0.08, 0, 0.034, -0.86, lineMat);
      for (const sx of [-1.34, -0.45, 0.45, 1.34]) {
        addBox(group, 0.06, 0.008, 1.72, sx, 0.034, 0, lineMat);
      }
      // 3 brushed steel U-rack hoops at back
      for (const hx of [-0.9, 0, 0.9]) {
        addCyl(group, 0.022, 0.022, 0.56, hx - 0.18, 0.28, -0.68, chromeMat, 10);
        addCyl(group, 0.022, 0.022, 0.56, hx + 0.18, 0.28, -0.68, chromeMat, 10);
        addCyl(group, 0.022, 0.022, 0.38, hx, 0.56, -0.68, chromeMat, 10).rotation.z = Math.PI / 2;
      }
      break;
    }

    case 'ac_split': {
      // Sleek wall-mounted split AC indoor unit with louver vent & green power indicator
      const wz = -0.35;
      const wy = 2.08;
      const bodyMat = primaryMat;
      bodyMat.roughness = 0.28;
      addBox(group, 0.86, 0.26, 0.21, 0, wy, wz, bodyMat, true);
      // Lower air outlet louver recess + swinging vane
      addBox(group, 0.78, 0.055, 0.04, 0, wy - 0.09, wz + 0.095, darkMetalMat);
      const vane = addBox(group, 0.76, 0.024, 0.045, 0, wy - 0.105, wz + 0.115, bodyMat, true);
      vane.rotation.x = 0.42;
      // Subtle top intake grill & LED display strip
      addBox(group, 0.78, 0.015, 0.12, 0, wy + 0.132, wz - 0.01, makeMat('#C8CDD3', 0.5, 0.1));
      addBox(
        group,
        0.065,
        0.024,
        0.01,
        0.26,
        wy + 0.02,
        wz + 0.108,
        makeMat('#5CE09B', 0.2, 0.1, { emissive: '#38B876', emissiveIntensity: 1.2 }),
      );
      break;
    }

    case 'ac_outdoor': {
      // Exterior AC condenser box with circular fan grille, louvres, copper pipe stubs & rubber feet
      const boxMat = primaryMat;
      boxMat.roughness = 0.46;
      boxMat.metalness = 0.25;
      addBox(group, 0.76, 0.54, 0.3, 0, 0.31, 0, boxMat, true);
      // Rubber mounting feet
      addBox(group, 0.1, 0.04, 0.34, -0.26, 0.02, 0, darkMetalMat);
      addBox(group, 0.1, 0.04, 0.34, 0.26, 0.02, 0, darkMetalMat);
      // Circular dark fan chamber + slatted grille rings
      const fanBg = addCyl(group, 0.2, 0.2, 0.024, -0.1, 0.32, 0.145, darkMetalMat, 22);
      fanBg.rotation.x = Math.PI / 2;
      const fanRing = addCyl(group, 0.21, 0.21, 0.03, -0.1, 0.32, 0.148, makeMat('#5A6068', 0.4, 0.5), 22);
      fanRing.rotation.x = Math.PI / 2;
      for (let i = -3; i <= 3; i++) {
        addBox(group, 0.38, 0.01, 0.012, -0.1, 0.32 + i * 0.052, 0.162, darkMetalMat);
      }
      // Side copper valves + right-side brand panel
      addBox(group, 0.18, 0.36, 0.018, 0.24, 0.32, 0.15, makeMat('#D5D9DF', 0.4, 0.2));
      addCyl(group, 0.012, 0.012, 0.12, 0.41, 0.18, 0.04, brassMat, 8).rotation.z = Math.PI / 2;
      addCyl(group, 0.01, 0.01, 0.12, 0.41, 0.25, 0.04, brassMat, 8).rotation.z = Math.PI / 2;
      break;
    }

    case 'double_fridge': {
      // Tall side-by-side 2-door stainless/matte refrigerator with ice/water dispenser & vertical handles
      const bodyMat = primaryMat;
      bodyMat.roughness = 0.24;
      bodyMat.metalness = 0.42;
      // Main insulated carcass
      addBox(group, 0.86, 1.88, 0.68, 0, 0.96, -0.02, bodyMat, true);
      // Left & right doors with clean center shadow gap
      addBox(group, 0.415, 1.84, 0.06, -0.215, 0.96, 0.335, bodyMat, true);
      addBox(group, 0.415, 1.84, 0.06, 0.215, 0.96, 0.335, bodyMat, true);
      // Brushed vertical handles
      addBox(group, 0.02, 0.72, 0.045, -0.045, 1.12, 0.38, chromeMat);
      addBox(group, 0.02, 0.72, 0.045, 0.045, 1.12, 0.38, chromeMat);
      // Recessed water/ice dispenser on left door
      addBox(group, 0.18, 0.3, 0.03, -0.22, 1.16, 0.358, darkMetalMat);
      addBox(
        group,
        0.14,
        0.04,
        0.012,
        -0.22,
        1.27,
        0.37,
        makeMat('#7CE0F2', 0.2, 0.1, { emissive: '#4AB8D4', emissiveIntensity: 0.7 }),
      );
      // Bottom vent plinth
      addBox(group, 0.84, 0.06, 0.66, 0, 0.03, 0, darkMetalMat);
      break;
    }

    case 'stove_hood': {
      // 4-burner gas/induction range with glass oven door + floating stainless chimney cooker hood above
      addBox(group, 0.84, 0.88, 0.66, 0, 0.44, 0, primaryMat, true);
      // Stainless stovetop + 4 burner grates
      addBox(group, 0.84, 0.025, 0.66, 0, 0.892, 0, chromeMat);
      for (const [bx, bz, r] of [
        [-0.21, -0.14, 0.09],
        [0.21, -0.14, 0.075],
        [-0.21, 0.14, 0.075],
        [0.21, 0.14, 0.09],
      ]) {
        addCyl(group, r, r, 0.018, bx, 0.912, bz, darkMetalMat, 16);
        addBox(group, r * 2.1, 0.016, 0.014, bx, 0.922, bz, darkMetalMat);
        addBox(group, 0.014, 0.016, r * 2.1, bx, 0.922, bz, darkMetalMat);
      }
      // Control knobs strip + oven window + handle
      for (let i = 0; i < 4; i++) {
        const knob = addCyl(group, 0.022, 0.022, 0.028, -0.27 + i * 0.18, 0.82, 0.34, chromeMat, 12);
        knob.rotation.x = Math.PI / 2;
      }
      addBox(group, 0.64, 0.44, 0.024, 0, 0.42, 0.332, makeMat('#1D222A', 0.12, 0.6));
      addBox(group, 0.56, 0.022, 0.055, 0, 0.68, 0.355, chromeMat);
      // Floating stainless chimney cooker hood above (y = 1.56..2.15)
      addBox(group, 0.86, 0.07, 0.54, 0, 1.58, -0.06, chromeMat);
      const hoodCanopy = addCyl(group, 0.18, 0.46, 0.24, 0, 1.73, -0.1, chromeMat, 4);
      hoodCanopy.rotation.y = Math.PI / 4;
      hoodCanopy.scale.set(1.3, 1, 0.82);
      addBox(group, 0.28, 0.42, 0.24, 0, 1.98, -0.18, chromeMat);
      // Warm under-hood LED bar
      addBox(
        group,
        0.52,
        0.015,
        0.06,
        0,
        1.54,
        -0.18,
        makeMat('#FFF3DA', 0.2, 0.1, { emissive: '#FFE5B4', emissiveIntensity: 1.2 }),
      );
      break;
    }

    case 'kitchen_l_set': {
      // Complete 2x2m L-shaped kitchen cabinetry: marble L-counter, undermount sink, upper wall cabinets & LED strip
      // Back run (along Z = -0.62) & Left return (along X = -0.62)
      addBox(group, 1.9, 0.84, 0.62, 0, 0.42, -0.62, primaryMat, true);
      addBox(group, 0.62, 0.84, 1.32, -0.64, 0.42, 0.28, primaryMat, true);
      // Continuous marble L-countertop
      addBox(group, 1.94, 0.055, 0.66, 0, 0.865, -0.62, marbleMat);
      addBox(group, 0.66, 0.055, 1.34, -0.64, 0.865, 0.28, marbleMat);
      // Stainless sink basin + brass gooseneck tap on back run
      addBox(group, 0.54, 0.02, 0.38, 0.32, 0.892, -0.62, chromeMat);
      addBox(group, 0.48, 0.025, 0.32, 0.32, 0.896, -0.62, makeMat('#9AA3AE', 0.22, 0.85));
      addCyl(group, 0.014, 0.016, 0.26, 0.32, 1.02, -0.84, brassMat, 10);
      addBox(group, 0.024, 0.024, 0.16, 0.32, 1.14, -0.76, brassMat);
      // Built-in 2-burner induction glass hob on left wing
      addBox(group, 0.42, 0.016, 0.54, -0.64, 0.9, 0.34, darkMetalMat);
      addCyl(group, 0.09, 0.09, 0.008, -0.64, 0.91, 0.22, makeMat('#5A626D', 0.3, 0.5), 16);
      addCyl(group, 0.08, 0.08, 0.008, -0.64, 0.91, 0.46, makeMat('#5A626D', 0.3, 0.5), 16);
      // Upper hanging cabinets along back wall + warm under-cabinet LED strip
      addBox(group, 1.88, 0.62, 0.36, 0, 1.78, -0.75, primaryMat, true);
      addBox(
        group,
        1.78,
        0.018,
        0.04,
        0,
        1.46,
        -0.72,
        makeMat('#FFF3D8', 0.2, 0.1, { emissive: '#FFE5B2', emissiveIntensity: 1.1 }),
      );
      // Cabinet brass bar pulls
      for (const hx of [-0.6, 0, 0.6]) {
        addBox(group, 0.018, 0.16, 0.026, hx, 1.66, -0.56, brassMat);
        addBox(group, 0.16, 0.018, 0.026, hx, 0.72, -0.3, brassMat);
      }
      break;
    }

    case 'water_dispenser': {
      // Standing water dispenser with translucent blue gallon jug on top + hot/cold spouts
      addBox(group, 0.34, 0.94, 0.36, 0, 0.47, 0, primaryMat, true);
      // Recessed tap alcove + drip tray + hot (red) & cold (blue) taps
      addBox(group, 0.26, 0.26, 0.09, 0, 0.74, 0.15, darkMetalMat);
      addBox(group, 0.26, 0.022, 0.12, 0, 0.61, 0.16, chromeMat);
      addBox(group, 0.032, 0.048, 0.04, -0.055, 0.83, 0.18, makeMat('#D14B3C', 0.35, 0.1));
      addBox(group, 0.032, 0.048, 0.04, 0.055, 0.83, 0.18, makeMat('#3B82C4', 0.35, 0.1));
      // Translucent blue 19L water gallon bottle inverted on top
      const jugMat = new THREE.MeshPhysicalMaterial({
        color: '#6BBCE0',
        roughness: 0.1,
        metalness: 0.02,
        transmission: isSoftwareGl ? 0 : 0.72,
        transparent: true,
        opacity: isSoftwareGl ? 0.58 : 0.86,
      });
      addCyl(group, 0.135, 0.125, 0.36, 0, 1.14, 0, jugMat, 20);
      addCyl(group, 0.12, 0.135, 0.06, 0, 1.35, 0, jugMat, 20);
      break;
    }

    case 'stand_fan': {
      // Pedestal oscillating stand fan with weighted base, chrome pole, motor head & slatted safety cage
      addCyl(group, 0.18, 0.2, 0.04, 0, 0.02, 0, primaryMat, 22, true);
      addCyl(group, 0.018, 0.024, 0.92, 0, 0.5, 0, chromeMat, 12);
      // Motor housing + control buttons
      const motor = addCyl(group, 0.065, 0.055, 0.16, 0, 1.06, -0.04, primaryMat, 14, true);
      motor.rotation.x = Math.PI / 2;
      // Outer protective circular hoop + center badge + 3 fan blades
      const cage = new THREE.Mesh(
        new THREE.TorusGeometry(0.21, 0.012, 10, 28),
        primaryMat,
      );
      cage.position.set(0, 1.08, 0.08);
      cage.userData.recolorable = true;
      group.add(cage);
      const cap = addCyl(group, 0.045, 0.045, 0.03, 0, 1.08, 0.095, brassMat, 14);
      cap.rotation.x = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const blade = addBox(group, 0.08, 0.17, 0.01, 0, 1.08, 0.08, makeMat('#B5BCC4', 0.35, 0.4));
        const ang = (i * Math.PI * 2) / 3;
        blade.position.set(Math.sin(ang) * 0.095, 1.08 + Math.cos(ang) * 0.095, 0.078);
        blade.rotation.z = -ang;
      }
      // Radial cage wire spokes
      for (let i = 0; i < 6; i++) {
        const wire = addBox(group, 0.42, 0.006, 0.006, 0, 1.08, 0.092, chromeMat);
        wire.rotation.z = (i * Math.PI) / 6;
      }
      break;
    }

    case 'wall_tv': {
      // Ultra-slim 65" wall-mounted smart TV with warm bias backlight & floating soundbar
      const wz = -0.4;
      const wy = 1.42;
      // Soft ambient bias backlight behind screen
      addBox(
        group,
        1.48,
        0.84,
        0.018,
        0,
        wy,
        wz - 0.032,
        makeMat('#FFF1D6', 0.35, 0.05, { emissive: '#FFE0A8', emissiveIntensity: 0.95 }),
      );
      // Slim bezel & dark satin screen
      addBox(group, 1.44, 0.82, 0.036, 0, wy, wz, primaryMat, true);
      addBox(group, 1.38, 0.76, 0.01, 0, wy, wz + 0.018, makeMat('#1A2029', 0.12, 0.42));
      // Compact floating soundbar below screen
      addBox(group, 0.94, 0.068, 0.08, 0, wy - 0.5, wz + 0.01, darkMetalMat);
      break;
    }

    case 'rice_cooker': {
      // Compact cozy ceramic electric rice cooker with hinged lid, carry handle & LED dot
      addCyl(group, 0.135, 0.125, 0.18, 0, 0.09, 0, primaryMat, 20, true);
      addCyl(group, 0.13, 0.138, 0.05, 0, 0.2, 0, primaryMat, 20, true);
      addCyl(group, 0.035, 0.035, 0.018, 0, 0.23, -0.04, chromeMat, 12);
      // Front digital panel + warm keep-warm LED
      addBox(group, 0.11, 0.055, 0.02, 0, 0.11, 0.13, darkMetalMat);
      addBox(
        group,
        0.024,
        0.014,
        0.01,
        0,
        0.115,
        0.142,
        makeMat('#FFAE52', 0.2, 0.1, { emissive: '#FF912E', emissiveIntensity: 1.2 }),
      );
      break;
    }

    case 'bunk_bed': {
      // Sturdy warm-oak 2-tier bunk bed with guardrails, ladder, mattresses, pillows & blankets
      // 4 tall corner posts
      for (const [px, pz] of [
        [-0.92, -0.44],
        [0.92, -0.44],
        [-0.92, 0.44],
        [0.92, 0.44],
      ]) {
        addBox(group, 0.075, 1.8, 0.075, px, 0.9, pz, primaryMat, true);
      }
      // Lower & upper bed frames + mattresses + blankets + pillows
      const blanketColors = ['#6D8275', '#C27E5B'];
      [0.34, 1.26].forEach((by, idx) => {
        addBox(group, 1.86, 0.1, 0.9, 0, by, 0, primaryMat, true);
        addBox(group, 1.76, 0.16, 0.82, 0, by + 0.12, 0, linenMat);
        // Cozy duvet blanket folded over foot half
        addBox(group, 1.12, 0.175, 0.84, 0.3, by + 0.125, 0, makeMat(blanketColors[idx], 0.88, 0.0));
        // Plush pillow at headboard end
        addBox(group, 0.36, 0.11, 0.56, -0.66, by + 0.23, 0, makeMat('#F6F2EA', 0.9, 0.0));
      });
      // Upper safety guardrails (back full + front partial leaving ladder entry)
      addBox(group, 1.84, 0.055, 0.04, 0, 1.66, -0.44, primaryMat, true);
      addBox(group, 1.22, 0.055, 0.04, -0.31, 1.66, 0.44, primaryMat, true);
      addBox(group, 1.22, 0.04, 0.035, -0.31, 1.52, 0.44, primaryMat, true);
      // Right-front climbing ladder (2 vertical stiles + 4 rungs)
      addBox(group, 0.04, 1.48, 0.04, 0.44, 0.78, 0.48, primaryMat, true);
      addBox(group, 0.04, 1.48, 0.04, 0.8, 0.78, 0.48, primaryMat, true);
      for (const ry of [0.34, 0.64, 0.94, 1.24]) {
        addBox(group, 0.36, 0.032, 0.045, 0.62, ry, 0.48, primaryMat, true);
      }
      break;
    }

    case 'sliding_wardrobe': {
      // Full-height 2m modern wardrobe: left fluted oak door + right smoked-glass door showing hanging clothes
      addBox(group, 1.88, 2.16, 0.58, 0, 1.08, -0.02, primaryMat, true);
      // Recessed right interior bay with hanging rail & pastel garments visible behind smoked glass
      addBox(group, 0.86, 1.98, 0.04, 0.45, 1.08, 0.12, makeMat('#4A3A2E', 0.8, 0.02));
      addCyl(group, 0.012, 0.012, 0.82, 0.45, 1.78, 0.18, brassMat, 8).rotation.z = Math.PI / 2;
      const shirtColors = ['#E5DDD0', '#C68562', '#6C8073', '#4B5D70', '#D4B684'];
      shirtColors.forEach((col, i) => {
        addBox(group, 0.08, 0.58, 0.24, 0.14 + i * 0.15, 1.46, 0.18, makeMat(col, 0.88, 0.0));
      });
      // Left sliding solid wood panel with vertical fluted grooves
      addBox(group, 0.93, 2.08, 0.045, -0.45, 1.08, 0.29, primaryMat, true);
      for (let i = -3; i <= 3; i++) {
        addBox(group, 0.014, 2.02, 0.014, -0.45 + i * 0.11, 1.08, 0.316, darkWoodMat);
      }
      addBox(group, 0.022, 0.52, 0.032, -0.05, 1.05, 0.325, brassMat);
      // Right sliding smoked-glass door in slim dark aluminum frame
      const smokedGlass = new THREE.MeshPhysicalMaterial({
        color: '#2D343E',
        roughness: 0.08,
        metalness: 0.15,
        transmission: isSoftwareGl ? 0 : 0.62,
        transparent: true,
        opacity: isSoftwareGl ? 0.48 : 0.72,
      });
      addBox(group, 0.92, 2.08, 0.03, 0.45, 1.08, 0.26, darkMetalMat);
      const glassPane = addBox(group, 0.84, 1.98, 0.018, 0.45, 1.08, 0.265, smokedGlass);
      glassPane.castShadow = false;
      addBox(group, 0.022, 0.52, 0.032, 0.05, 1.05, 0.29, brassMat);
      break;
    }

    case 'shoe_rack': {
      // Cozy entryway bench with padded cushion top + 2 slatted wood shoe tiers + miniature shoes
      // 4 legs + seat bench + cushion
      for (const [lx, lz] of [
        [-0.38, -0.15],
        [0.38, -0.15],
        [-0.38, 0.15],
        [0.38, 0.15],
      ]) {
        addBox(group, 0.04, 0.46, 0.04, lx, 0.23, lz, primaryMat, true);
      }
      addBox(group, 0.84, 0.04, 0.36, 0, 0.46, 0, primaryMat, true);
      addBox(group, 0.8, 0.07, 0.33, 0, 0.515, 0, makeMat('#E5DCD0', 0.9, 0.0));
      // 2 lower slatted shoe shelves
      addBox(group, 0.76, 0.022, 0.3, 0, 0.12, 0, primaryMat, true);
      addBox(group, 0.76, 0.022, 0.3, 0, 0.29, 0, primaryMat, true);
      // Miniature pairs of shoes
      const shoeCols = ['#F2EFEA', '#7A5438', '#3B4859'];
      shoeCols.forEach((sc, i) => {
        const sx = -0.24 + i * 0.24;
        addBox(group, 0.07, 0.06, 0.19, sx - 0.04, 0.33, 0.02, makeMat(sc, 0.72, 0.02));
        addBox(group, 0.07, 0.06, 0.19, sx + 0.04, 0.33, 0.02, makeMat(sc, 0.72, 0.02));
      });
      break;
    }

    case 'ironing_board': {
      // Folding X-leg padded linen ironing board with miniature steam iron
      const leg1 = addCyl(group, 0.014, 0.014, 1.02, 0, 0.42, 0, darkMetalMat, 10);
      leg1.rotation.z = 0.46;
      const leg2 = addCyl(group, 0.014, 0.014, 1.02, 0, 0.42, 0, darkMetalMat, 10);
      leg2.rotation.z = -0.46;
      // Tapered padded board top
      addBox(group, 0.72, 0.04, 0.32, -0.06, 0.82, 0, primaryMat, true);
      const nose = addCyl(group, 0.155, 0.155, 0.04, 0.3, 0.82, 0, primaryMat, 14, true);
      nose.scale.set(1.2, 1, 1);
      // Side metal iron rest + miniature steam iron
      addBox(group, 0.16, 0.016, 0.26, -0.48, 0.82, 0, chromeMat);
      addBox(group, 0.12, 0.07, 0.09, -0.48, 0.865, 0, makeMat('#4A687A', 0.3, 0.15));
      addBox(group, 0.13, 0.012, 0.095, -0.48, 0.832, 0, chromeMat);
      break;
    }

    case 'sliding_gate': {
      // 3m modern hollow-steel slatted sliding driveway gate + twin concrete pillars + warm pillar lamps
      // Floor steel guide rail
      addBox(group, 2.94, 0.024, 0.06, 0, 0.012, 0, chromeMat);
      // Left & right plastered concrete gate pillars + warm pillar lanterns
      const pillarMat = makeMat('#DDD5C8', 0.82, 0.02);
      for (const px of [-1.36, 1.36]) {
        addBox(group, 0.32, 1.66, 0.32, px, 0.83, 0, pillarMat);
        addBox(group, 0.36, 0.06, 0.36, px, 1.68, 0, darkMetalMat);
        addBox(
          group,
          0.14,
          0.16,
          0.14,
          px,
          1.78,
          0,
          makeMat('#FFEBC2', 0.3, 0.05, { emissive: '#FFCF82', emissiveIntensity: 1.25 }),
        );
      }
      // Horizontal matte-steel sliding gate leaf with warm wood-slat accent strip
      addBox(group, 2.42, 0.06, 0.06, 0, 1.54, 0, primaryMat, true);
      addBox(group, 2.42, 0.06, 0.06, 0, 0.12, 0, primaryMat, true);
      addBox(group, 0.06, 1.48, 0.06, -1.18, 0.83, 0, primaryMat, true);
      addBox(group, 0.06, 1.48, 0.06, 1.18, 0.83, 0, primaryMat, true);
      for (let i = 0; i < 11; i++) {
        const sy = 0.22 + i * 0.12;
        addBox(
          group,
          2.32,
          0.072,
          0.036,
          0,
          sy,
          0,
          i >= 6 && i <= 8 ? oakMat : primaryMat,
          i < 6 || i > 8,
        );
      }
      break;
    }

    case 'iron_fence': {
      // 2m modern minimalist boundary wall: plastered low concrete plinth + matte-black vertical iron slats
      addBox(group, 1.98, 0.56, 0.18, 0, 0.28, 0, makeMat('#DDD5C8', 0.85, 0.02));
      addBox(group, 2.0, 0.045, 0.22, 0, 0.58, 0, makeMat('#CFC7BA', 0.78, 0.02));
      // Top & bottom iron rails + vertical balusters
      addBox(group, 1.98, 0.045, 0.045, 0, 1.52, 0, primaryMat, true);
      addBox(group, 1.98, 0.04, 0.045, 0, 0.64, 0, primaryMat, true);
      for (let i = -8; i <= 8; i++) {
        addBox(group, 0.026, 0.88, 0.026, i * 0.115, 1.08, 0, primaryMat, true);
      }
      break;
    }

    case 'swimming_pool': {
      // 4x3m backyard tiled swimming pool: stone coping deck, turquoise shimmering water, steel ladder & float ring
      const deckMat = primaryMat;
      deckMat.roughness = 0.68;
      // Raised low pool coping surround (4 edges)
      addBox(group, 3.92, 0.22, 0.34, 0, 0.11, -1.28, deckMat, true);
      addBox(group, 3.92, 0.22, 0.34, 0, 0.11, 1.28, deckMat, true);
      addBox(group, 0.34, 0.22, 2.24, -1.79, 0.11, 0, deckMat, true);
      addBox(group, 0.34, 0.22, 2.24, 1.79, 0.11, 0, deckMat, true);
      // Mosaic pool floor & luminous turquoise water volume
      addBox(group, 3.28, 0.04, 2.24, 0, 0.03, 0, makeMat('#2B8DA6', 0.35, 0.05));
      const poolWaterMat = new THREE.MeshPhysicalMaterial({
        color: '#52CBE0',
        emissive: '#1D6B7D',
        emissiveIntensity: 0.22,
        roughness: 0.08,
        metalness: 0.06,
        transmission: isSoftwareGl ? 0 : 0.62,
        transparent: true,
        opacity: isSoftwareGl ? 0.72 : 0.86,
      });
      const water = addBox(group, 3.24, 0.12, 2.2, 0, 0.14, 0, poolWaterMat);
      water.castShadow = false;
      // Stainless curved pool entry ladder at corner
      for (const lx of [1.26, 1.56]) {
        addCyl(group, 0.016, 0.016, 0.44, lx, 0.32, -1.16, chromeMat, 10);
        addBox(group, 0.032, 0.032, 0.26, lx, 0.52, -1.04, chromeMat);
        addCyl(group, 0.016, 0.016, 0.36, lx, 0.35, -0.92, chromeMat, 10);
      }
      // Cheerful terracotta-striped floating pool ring
      const floatRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.085, 12, 24),
        makeMat('#E38B62', 0.38, 0.04),
      );
      floatRing.rotation.x = Math.PI / 2;
      floatRing.position.set(-0.55, 0.21, 0.22);
      floatRing.castShadow = true;
      group.add(floatRing);
      break;
    }

    case 'terrace_pillar': {
      // Architectural porch column with stone base plinth, fluted plaster/wood shaft & top capital
      const plinthMat = makeMat('#7B746C', 0.86, 0.02);
      addBox(group, 0.38, 0.58, 0.38, 0, 0.29, 0, plinthMat);
      addBox(group, 0.42, 0.06, 0.42, 0, 0.6, 0, makeMat('#CFC7BA', 0.78, 0.02));
      addBox(group, 0.28, 1.94, 0.28, 0, 1.6, 0, primaryMat, true);
      addBox(group, 0.38, 0.09, 0.38, 0, 2.6, 0, primaryMat, true);
      break;
    }

    case 'balcony_railing': {
      // 2m modern glass & wood handrail balcony balustrade (ideal for Lantai 2 & terraces)
      // Slim floor shoe + 3 matte-black posts + tempered glass panes + warm oak/painted top handrail
      addBox(group, 1.98, 0.045, 0.07, 0, 0.0225, 0, darkMetalMat);
      for (const px of [-0.95, 0, 0.95]) {
        addBox(group, 0.045, 0.98, 0.045, px, 0.51, 0, darkMetalMat);
      }
      addBox(group, 2.0, 0.055, 0.075, 0, 1.01, 0, primaryMat, true);
      const railGlass = new THREE.MeshPhysicalMaterial({
        color: '#DDF2F8',
        roughness: 0.06,
        metalness: 0.06,
        transmission: isSoftwareGl ? 0 : 0.76,
        transparent: true,
        opacity: isSoftwareGl ? 0.32 : 0.85,
      });
      const g1 = addBox(group, 0.9, 0.88, 0.018, -0.475, 0.51, 0, railGlass);
      const g2 = addBox(group, 0.9, 0.88, 0.018, 0.475, 0.51, 0, railGlass);
      g1.castShadow = false;
      g2.castShadow = false;
      break;
    }

    case 'terrace_canopy': {
      // 3x2m modern patio glass pergola canopy with 2 front dark-steel posts & slatted beams
      for (const px of [-1.42, 1.42]) {
        addBox(group, 0.09, 2.48, 0.09, px, 1.24, 0.92, primaryMat, true);
      }
      // Main perimeter steel frame
      addBox(group, 2.94, 0.1, 0.09, 0, 2.46, 0.92, primaryMat, true);
      addBox(group, 2.94, 0.1, 0.09, 0, 2.54, -0.92, primaryMat, true);
      // Sloped rafters
      for (let i = -3; i <= 3; i++) {
        const rafter = addBox(group, 0.05, 0.07, 1.94, i * 0.46, 2.5, 0, primaryMat, true);
        rafter.rotation.x = 0.042;
      }
      // Translucent polycarbonate/glass roof sheet
      const roofGlass = new THREE.MeshPhysicalMaterial({
        color: '#DCEFF5',
        roughness: 0.14,
        metalness: 0.04,
        transmission: isSoftwareGl ? 0 : 0.68,
        transparent: true,
        opacity: isSoftwareGl ? 0.36 : 0.72,
      });
      const sheet = addBox(group, 2.94, 0.025, 1.94, 0, 2.545, 0, roofGlass);
      sheet.rotation.x = 0.042;
      sheet.castShadow = false;
      break;
    }

    case 'drying_rack': {
      // Folding aluminum laundry drying rack with neatly draped colorful shirts & towels
      for (const sx of [-0.62, 0.62]) {
        const l1 = addCyl(group, 0.012, 0.012, 1.06, sx, 0.48, 0, primaryMat, 8, true);
        l1.rotation.x = 0.34;
        const l2 = addCyl(group, 0.012, 0.012, 1.06, sx, 0.48, 0, primaryMat, 8, true);
        l2.rotation.x = -0.34;
      }
      // Horizontal drying bars
      for (const [by, bz] of [
        [0.98, -0.24],
        [0.98, 0],
        [0.98, 0.24],
        [1.04, -0.38],
        [1.04, 0.38],
      ]) {
        const bar = addCyl(group, 0.009, 0.009, 1.56, 0, by, bz, chromeMat, 8);
        bar.rotation.z = Math.PI / 2;
      }
      // Draped laundry clothes in cozy linen/terracotta/sage/denim tones
      const clothes: [number, number, string][] = [
        [-0.44, -0.24, '#F2ECE2'],
        [0.12, -0.24, '#C68462'],
        [-0.22, 0, '#6E8578'],
        [0.36, 0.24, '#566C82'],
      ];
      clothes.forEach(([cx, cz, col]) => {
        const cMat = makeMat(col, 0.9, 0.0);
        addBox(group, 0.32, 0.026, 0.04, cx, 0.99, cz, cMat);
        addBox(group, 0.32, 0.34, 0.018, cx, 0.82, cz + 0.018, cMat);
        addBox(group, 0.32, 0.3, 0.018, cx, 0.84, cz - 0.018, cMat);
      });
      break;
    }

    default: {
      addBox(group, 0.8, 0.8, 0.8, 0, 0.4, 0, primaryMat, true);
    }
  }

  return group;
}

/**
 * Builds either a user-imported 3D model (.glb / .gltf / .obj) or a user-designed
 * custom parametric 3D furniture / decor model from CustomModelSpec.
 */
function buildCustomFurnitureModel(
  def: FurnitureDef,
  colorHex: string,
  textures: ProceduralTextureLibrary,
  isSoftwareGl: boolean,
): THREE.Group {
  const spec = def.customSpec!;
  const group = new THREE.Group();
  group.userData.defId = def.id;

  if (spec.kind === 'imported' && spec.importedAssetId) {
    const cloned = customAssetRegistry.cloneImportedModel(spec.importedAssetId, colorHex);
    if (cloned) {
      group.add(cloned);
      return group;
    }
  }

  const finishParams: Record<CustomFinishKind, { r: number; m: number; glass?: boolean }> = {
    wood: { r: 0.56, m: 0.05 },
    matte: { r: 0.82, m: 0.02 },
    metal: { r: 0.22, m: 0.88 },
    ceramic: { r: 0.24, m: 0.08 },
    glass: { r: 0.08, m: 0.05, glass: true },
  };
  const fp = finishParams[spec.finish] || finishParams.matte;

  const mainMat = fp.glass
    ? new THREE.MeshPhysicalMaterial({
        color: colorHex,
        roughness: 0.08,
        metalness: 0.05,
        transmission: isSoftwareGl ? 0 : 0.72,
        transparent: true,
        opacity: isSoftwareGl ? 0.38 : 0.9,
        ior: 1.5,
      })
    : makeMat(colorHex, fp.r, fp.m);
  const accentMat = makeMat(spec.accentColor || '#CFA255', 0.28, 0.65);

  const w = Math.max(0.18, spec.widthM);
  const d = Math.max(0.12, spec.depthM);
  const h = Math.max(0.14, spec.heightM);

  if (!def.wallMount && !def.tabletopProp) {
    addContactShadow(group, w * 0.95, d * 0.95, textures.contactShadowTex);
  }

  if (spec.kind === 'table') {
    const topThick = Math.min(0.08, h * 0.12);
    addBox(group, w, topThick, d, 0, h - topThick / 2, 0, mainMat, true);
    const legH = h - topThick;
    const ox = w * 0.42;
    const oz = d * 0.4;
    const legR = Math.min(0.045, Math.min(w, d) * 0.06);
    for (const [lx, lz] of [
      [-ox, -oz],
      [ox, -oz],
      [-ox, oz],
      [ox, oz],
    ]) {
      addCyl(group, legR, legR * 0.82, legH, lx, legH / 2, lz, accentMat, 12);
    }
    addBox(group, w * 0.84, 0.035, d * 0.78, 0, h - topThick - 0.02, 0, accentMat);
  } else if (spec.kind === 'cabinet') {
    const baseH = Math.min(0.1, h * 0.12);
    addBox(group, w * 0.92, baseH, d * 0.88, 0, baseH / 2, 0, accentMat);
    addBox(group, w, h - baseH, d, 0, baseH + (h - baseH) / 2, 0, mainMat, true);
    // Inset architectural door reveals + twin brass pulls
    addBox(group, w * 0.44, (h - baseH) * 0.86, 0.015, -w * 0.23, baseH + (h - baseH) / 2, d / 2 + 0.006, mainMat, true);
    addBox(group, w * 0.44, (h - baseH) * 0.86, 0.015, w * 0.23, baseH + (h - baseH) / 2, d / 2 + 0.006, mainMat, true);
    addCyl(group, 0.012, 0.012, Math.min(0.24, h * 0.25), -0.04, baseH + (h - baseH) * 0.52, d / 2 + 0.025, accentMat, 10);
    addCyl(group, 0.012, 0.012, Math.min(0.24, h * 0.25), 0.04, baseH + (h - baseH) * 0.52, d / 2 + 0.025, accentMat, 10);
  } else if (spec.kind === 'ottoman') {
    const r = Math.min(w, d) / 2;
    addCyl(group, r * 0.88, r * 0.92, h * 0.18, 0, h * 0.09, 0, accentMat, 26);
    addCyl(group, r, r * 0.96, h * 0.76, 0, h * 0.18 + h * 0.38, 0, mainMat, 28, true);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mainMat);
    crown.scale.set(1, (h * 0.16) / Math.max(0.05, r), 1);
    crown.position.y = h * 0.9;
    crown.castShadow = true;
    crown.userData.recolorable = true;
    group.add(crown);
  } else if (spec.kind === 'vase') {
    const r = Math.min(w, d) / 2;
    const pts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(r * 0.58, 0),
      new THREE.Vector2(r * 0.98, h * 0.36),
      new THREE.Vector2(r * 0.75, h * 0.68),
      new THREE.Vector2(r * 0.42, h * 0.86),
      new THREE.Vector2(r * 0.52, h),
      new THREE.Vector2(r * 0.42, h),
      new THREE.Vector2(r * 0.34, h * 0.84),
    ];
    const vessel = new THREE.Mesh(new THREE.LatheGeometry(pts, 26), mainMat);
    vessel.castShadow = true;
    vessel.receiveShadow = true;
    vessel.userData.recolorable = true;
    group.add(vessel);
    addCyl(group, r * 0.55, r * 0.55, 0.02, 0, h * 0.84, 0, accentMat, 24);
  } else if (spec.kind === 'framed_art') {
    const wz = def.wallMount ? -0.41 : 0;
    const wy = def.wallMount ? 1.54 : h / 2;
    addBox(group, w, h, 0.045, 0, wy, wz, mainMat, true);
    addBox(group, w * 0.88, h * 0.88, 0.025, 0, wy, wz + 0.016, makeMat('#F3EFE6', 0.85, 0));
    const customTex = customAssetRegistry.getImageTexture(spec.imageTextureId);
    const artMat = new THREE.MeshStandardMaterial({
      map: customTex || textures.botanicalPrintTex,
      roughness: 0.65,
    });
    const art = addBox(group, w * 0.8, h * 0.8, 0.012, 0, wy, wz + 0.029, artMat);
    art.castShadow = false;
  } else {
    // Architectural sculpture / pedestal
    addBox(group, w * 0.9, h * 0.12, d * 0.9, 0, h * 0.06, 0, accentMat);
    addBox(group, w * 0.62, h * 0.56, d * 0.62, 0, h * 0.12 + h * 0.28, 0, mainMat, true);
    const topGeo = new THREE.OctahedronGeometry(Math.min(w, d, h) * 0.28, 1);
    const topMesh = new THREE.Mesh(topGeo, accentMat);
    topMesh.position.y = h * 0.84;
    topMesh.castShadow = true;
    group.add(topMesh);
  }

  return group;
}

/**
 * Standalone lightweight builder for CustomAssetModal live 3D preview (no full texture library needed).
 */
export function buildCustomPreviewModel(
  def: FurnitureDef,
  colorHex: string,
  isSoftwareGl = false,
  previewImageTex?: THREE.Texture | null,
): THREE.Group {
  const spec = def.customSpec;
  if (!spec) {
    const g = new THREE.Group();
    addBox(g, 0.8, 0.8, 0.8, 0, 0.4, 0, makeMat(colorHex, 0.65, 0.05), true);
    return g;
  }

  // Create a minimal dummy texture stub so buildCustomFurnitureModel can reuse the exact same geometry logic
  const stubTex = previewImageTex || new THREE.DataTexture(new Uint8Array([235, 228, 214, 255]), 1, 1);
  stubTex.needsUpdate = true;
  const dummyTextures = {
    contactShadowTex: stubTex as unknown as THREE.CanvasTexture,
    botanicalPrintTex: stubTex as unknown as THREE.CanvasTexture,
  } as ProceduralTextureLibrary;

  const defForPreview: FurnitureDef = {
    ...def,
    wallMount: false, // Center framed art cleanly on preview turntable
    tabletopProp: true, // Skip contact shadow plane inside preview turntable
  };
  const built = buildCustomFurnitureModel(defForPreview, colorHex, dummyTextures, isSoftwareGl);
  if (spec.kind === 'framed_art' && previewImageTex) {
    // Ensure custom uploaded artwork image renders immediately in live preview
    built.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial && obj.material.map === stubTex) {
        obj.material.map = previewImageTex;
        obj.material.needsUpdate = true;
      }
    });
  }
  return built;
}

/**
 * Helper: creates a clean extruded semicircular arch wall header with ZERO coplanar Z-fighting.
 */
function buildArchHeaderMesh(
  spanW: number,
  topH: number,
  archRadius: number,
  thickness: number,
  mat: THREE.Material,
): THREE.Mesh {
  const halfW = spanW / 2;
  const r = Math.min(archRadius, halfW - 0.02);
  const totalH = r + topH;

  const shape = new THREE.Shape();
  shape.moveTo(-halfW, 0);
  shape.lineTo(-r, 0);
  shape.absarc(0, 0, r, Math.PI, 0, true);
  shape.lineTo(halfW, 0);
  shape.lineTo(halfW, totalH);
  shape.lineTo(-halfW, totalH);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 18,
  });
  geo.translate(0, 0, -thickness / 2);

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Builds a glitch-free architectural corner/junction pillar placed exactly at grid vertices
 * where perpendicular walls meet, eliminating coplanar Z-fighting and outer corner notches.
 */
export function buildCornerPostMesh(
  height: number,
  wallMat: THREE.Material,
  thickness = WALL_THICKNESS,
): THREE.Group {
  const group = new THREE.Group();
  const t = Math.max(0.06, thickness);
  const trimMat = makeMat('#DED7CA', 0.6, 0.05);

  addBox(group, t, height, t, 0, height / 2, 0, wallMat);
  addBox(group, t + 0.025, 0.09, t + 0.025, 0, 0.045, 0, trimMat);
  addBox(group, t + 0.02, 0.035, t + 0.02, 0, height + 0.0175, 0, trimMat);
  return group;
}

/**
 * Builds a single architectural wall segment of exact length (with optional left/right corner
 * trims so perpendicular walls never overlap or Z-fight) — solid or carved with a framed
 * Window, Arched Window, Oak Door, Archway, or Glass Sliding Door.
 */
export function buildWallSegmentMesh(
  length: number,
  height: number,
  opening: WallOpeningType,
  wallMat: THREE.Material,
  isSoftwareGl: boolean,
  trimLeft = 0,
  trimRight = 0,
  thickness = WALL_THICKNESS,
): THREE.Group {
  const group = new THREE.Group();
  const t = Math.max(0.06, thickness);
  const effLen = Math.max(0.12, length - trimLeft - trimRight);
  const cx = (trimLeft - trimRight) / 2;

  const trimMat = makeMat('#DED7CA', 0.6, 0.05);
  const frameMat = makeMat('#353940', 0.36, 0.55);
  const oakDoorMat = makeMat('#8D6442', 0.52, 0.06);
  const brassMat = makeMat('#D1A554', 0.22, 0.88);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#D5EBF2',
    roughness: 0.06,
    metalness: 0.05,
    transmission: isSoftwareGl ? 0 : 0.72,
    transparent: true,
    opacity: isSoftwareGl ? 0.34 : 0.88,
    ior: 1.5,
  });

  // Low/cutaway walls or solid wall segments
  if (height < 1.1 || opening === 'none' || effLen < 0.55) {
    addBox(group, effLen, height, t, cx, height / 2, 0, wallMat);
    addBox(group, effLen, 0.09, t + 0.025, cx, 0.045, 0, trimMat);
    addBox(group, effLen, 0.035, t + 0.02, cx, height + 0.0175, 0, trimMat);
    return group;
  }

  // Opening width scales naturally for both 1m grid segments and long freeform custom walls
  const maxOpeningW =
    opening === 'glass_slider' || opening === 'double_door'
      ? 1.85
      : opening === 'wood_slider'
        ? 1.35
        : 0.82;
  const innerW = Math.min(effLen - 0.14, maxOpeningW);
  const sideW = (effLen - innerW) / 2;
  const leftPierX = cx - effLen / 2 + sideW / 2;
  const rightPierX = cx + effLen / 2 - sideW / 2;

  if (opening === 'window') {
    const sillH = 0.78;
    const winH = 1.34;
    const topH = Math.max(0.18, height - sillH - winH);

    addBox(group, effLen, sillH, t, cx, sillH / 2, 0, wallMat);
    addBox(group, effLen, 0.09, t + 0.025, cx, 0.045, 0, trimMat);
    addBox(group, effLen, topH, t, cx, sillH + winH + topH / 2, 0, wallMat);
    if (sideW > 0.01) {
      addBox(group, sideW, winH, t, leftPierX, sillH + winH / 2, 0, wallMat);
      addBox(group, sideW, winH, t, rightPierX, sillH + winH / 2, 0, wallMat);
    }

    // Window sill + slim steel frame + mullion + glass
    addBox(group, innerW + 0.05, 0.045, t + 0.055, cx, sillH + 0.0225, 0, trimMat);
    addBox(group, innerW, 0.04, t * 0.75, cx, sillH + winH - 0.02, 0, frameMat);
    addBox(group, 0.034, winH - 0.04, t * 0.75, cx - innerW / 2 + 0.017, sillH + winH / 2, 0, frameMat);
    addBox(group, 0.034, winH - 0.04, t * 0.75, cx + innerW / 2 - 0.017, sillH + winH / 2, 0, frameMat);
    addBox(group, 0.024, winH - 0.04, t * 0.55, cx, sillH + winH / 2, 0, frameMat);
    const glass = addBox(group, innerW - 0.06, winH - 0.08, 0.018, cx, sillH + winH / 2, 0, glassMat);
    glass.castShadow = false;
  } else if (opening === 'curtain_window') {
    const sillH = 0.62;
    const winH = Math.min(1.52, Math.max(0.95, height - sillH - 0.24));
    const topH = Math.max(0.18, height - sillH - winH);

    addBox(group, effLen, sillH, t, cx, sillH / 2, 0, wallMat);
    addBox(group, effLen, 0.09, t + 0.025, cx, 0.045, 0, trimMat);
    addBox(group, effLen, topH, t, cx, sillH + winH + topH / 2, 0, wallMat);
    if (sideW > 0.01) {
      addBox(group, sideW, winH, t, leftPierX, sillH + winH / 2, 0, wallMat);
      addBox(group, sideW, winH, t, rightPierX, sillH + winH / 2, 0, wallMat);
    }

    // Window frame & glass
    addBox(group, innerW + 0.05, 0.045, t + 0.055, cx, sillH + 0.0225, 0, trimMat);
    addBox(group, innerW, 0.036, t * 0.75, cx, sillH + winH - 0.018, 0, frameMat);
    addBox(group, 0.03, winH - 0.04, t * 0.75, cx - innerW / 2 + 0.015, sillH + winH / 2, 0, frameMat);
    addBox(group, 0.03, winH - 0.04, t * 0.75, cx + innerW / 2 - 0.015, sillH + winH / 2, 0, frameMat);
    const glass = addBox(group, innerW - 0.06, winH - 0.08, 0.018, cx, sillH + winH / 2, 0, glassMat);
    glass.castShadow = false;

    // Cozy pleated linen curtains on twin brass rods (both interior/exterior faces softly draped)
    const curtainMat = makeMat('#EAE0D0', 0.92, 0.0);
    const rodY = sillH + winH + 0.08;
    const rodW = Math.min(effLen - 0.04, innerW + 0.22);
    for (const faceSign of [-1, 1]) {
      const cz = faceSign * (t / 2 + 0.055);
      addCyl(group, 0.01, 0.01, rodW, cx, rodY, cz, brassMat, 10).rotation.z = Math.PI / 2;
      const panelW = Math.max(0.14, innerW * 0.24);
      const curtainH = rodY - 0.14;
      addBox(group, panelW, curtainH, 0.042, cx - rodW / 2 + panelW / 2, 0.14 + curtainH / 2, cz, curtainMat);
      addBox(group, panelW, curtainH, 0.042, cx + rodW / 2 - panelW / 2, 0.14 + curtainH / 2, cz, curtainMat);
    }
  } else if (opening === 'bath_vent') {
    // High privacy bouvenlight / bathroom louver window
    const sillH = Math.min(height - 0.65, 1.66);
    const winH = 0.44;
    const topH = Math.max(0.16, height - sillH - winH);

    addBox(group, effLen, sillH, t, cx, sillH / 2, 0, wallMat);
    addBox(group, effLen, 0.09, t + 0.025, cx, 0.045, 0, trimMat);
    addBox(group, effLen, topH, t, cx, sillH + winH + topH / 2, 0, wallMat);
    if (sideW > 0.01) {
      addBox(group, sideW, winH, t, leftPierX, sillH + winH / 2, 0, wallMat);
      addBox(group, sideW, winH, t, rightPierX, sillH + winH / 2, 0, wallMat);
    }

    // Perimeter aluminum frame + 3 angled frosted glass louver slats
    addBox(group, innerW, 0.032, t * 0.8, cx, sillH + 0.016, 0, frameMat);
    addBox(group, innerW, 0.032, t * 0.8, cx, sillH + winH - 0.016, 0, frameMat);
    addBox(group, 0.032, winH, t * 0.8, cx - innerW / 2 + 0.016, sillH + winH / 2, 0, frameMat);
    addBox(group, 0.032, winH, t * 0.8, cx + innerW / 2 - 0.016, sillH + winH / 2, 0, frameMat);
    const frostedMat = makeMat('#DCE6EC', 0.42, 0.06, { transparent: true, opacity: 0.72 });
    for (let i = 0; i < 3; i++) {
      const slat = addBox(
        group,
        innerW - 0.06,
        0.1,
        0.014,
        cx,
        sillH + 0.1 + i * 0.12,
        0,
        frostedMat,
      );
      slat.rotation.x = 0.38;
      slat.castShadow = false;
    }
  } else if (opening === 'arched_window') {
    const sillH = 0.74;
    const archR = innerW / 2;
    const straightWinH = 1.02;
    const archSpringY = sillH + straightWinH;
    const topH = Math.max(0.16, height - (archSpringY + archR));

    addBox(group, effLen, sillH, t, cx, sillH / 2, 0, wallMat);
    addBox(group, effLen, 0.09, t + 0.025, cx, 0.045, 0, trimMat);
    if (sideW > 0.01) {
      addBox(group, sideW, straightWinH, t, leftPierX, sillH + straightWinH / 2, 0, wallMat);
      addBox(group, sideW, straightWinH, t, rightPierX, sillH + straightWinH / 2, 0, wallMat);
    }
    const archHeader = buildArchHeaderMesh(effLen, topH, archR, t, wallMat);
    archHeader.position.set(cx, archSpringY, 0);
    group.add(archHeader);

    // Sill + curved mullion frame + glass
    addBox(group, innerW + 0.05, 0.045, t + 0.055, cx, sillH + 0.0225, 0, trimMat);
    addBox(group, innerW, 0.028, t * 0.62, cx, archSpringY, 0, frameMat);
    addBox(group, 0.024, straightWinH + archR - 0.04, t * 0.6, cx, sillH + (straightWinH + archR) / 2, 0, frameMat);
    addBox(group, 0.03, straightWinH, t * 0.7, cx - innerW / 2 + 0.015, sillH + straightWinH / 2, 0, frameMat);
    addBox(group, 0.03, straightWinH, t * 0.7, cx + innerW / 2 - 0.015, sillH + straightWinH / 2, 0, frameMat);
    const glass = addBox(group, innerW - 0.06, straightWinH - 0.04, 0.018, cx, sillH + straightWinH / 2, 0, glassMat);
    glass.castShadow = false;
    const archGlassGeo = new THREE.CircleGeometry(archR - 0.02, 20, 0, Math.PI);
    const archGlass = new THREE.Mesh(archGlassGeo, glassMat);
    archGlass.position.set(cx, archSpringY, 0);
    archGlass.material = glassMat;
    (archGlass.material as THREE.Material).side = THREE.DoubleSide;
    group.add(archGlass);
  } else if (opening === 'door') {
    const doorH = 2.12;
    const topH = Math.max(0.18, height - doorH);

    addBox(group, effLen, topH, t, cx, doorH + topH / 2, 0, wallMat);
    if (sideW > 0.01) {
      addBox(group, sideW, doorH, t, leftPierX, doorH / 2, 0, wallMat);
      addBox(group, sideW, doorH, t, rightPierX, doorH / 2, 0, wallMat);
      addBox(group, sideW, 0.09, t + 0.025, leftPierX, 0.045, 0, trimMat);
      addBox(group, sideW, 0.09, t + 0.025, rightPierX, 0.045, 0, trimMat);
    }

    // Door casing frame
    addBox(group, innerW + 0.04, 0.048, t + 0.036, cx, doorH - 0.024, 0, oakDoorMat);
    addBox(group, 0.042, doorH - 0.048, t + 0.036, cx - innerW / 2 + 0.021, (doorH - 0.048) / 2, 0, oakDoorMat);
    addBox(group, 0.042, doorH - 0.048, t + 0.036, cx + innerW / 2 - 0.021, (doorH - 0.048) / 2, 0, oakDoorMat);

    // Slightly ajar architectural oak leaf + brass lever handle
    const leafGroup = new THREE.Group();
    leafGroup.position.set(cx - innerW / 2 + 0.042, 0, 0);
    leafGroup.rotation.y = 0.28;
    const leafW = innerW - 0.084;
    addBox(leafGroup, leafW, doorH - 0.06, 0.044, leafW / 2, (doorH - 0.06) / 2, 0, oakDoorMat);
    addBox(leafGroup, 0.11, 0.02, 0.09, leafW - 0.12, 0.96, 0, brassMat);
    group.add(leafGroup);
  } else if (opening === 'double_door') {
    const doorH = 2.18;
    const topH = Math.max(0.18, height - doorH);

    addBox(group, effLen, topH, t, cx, doorH + topH / 2, 0, wallMat);
    if (sideW > 0.01) {
      addBox(group, sideW, doorH, t, leftPierX, doorH / 2, 0, wallMat);
      addBox(group, sideW, doorH, t, rightPierX, doorH / 2, 0, wallMat);
      addBox(group, sideW, 0.09, t + 0.025, leftPierX, 0.045, 0, trimMat);
      addBox(group, sideW, 0.09, t + 0.025, rightPierX, 0.045, 0, trimMat);
    }

    // Grand double casing
    addBox(group, innerW + 0.05, 0.055, t + 0.04, cx, doorH - 0.028, 0, oakDoorMat);
    addBox(group, 0.046, doorH - 0.055, t + 0.04, cx - innerW / 2 + 0.023, (doorH - 0.055) / 2, 0, oakDoorMat);
    addBox(group, 0.046, doorH - 0.055, t + 0.04, cx + innerW / 2 - 0.023, (doorH - 0.055) / 2, 0, oakDoorMat);

    const leafW = (innerW - 0.1) / 2;
    // Left leaf slightly open
    const leftLeaf = new THREE.Group();
    leftLeaf.position.set(cx - innerW / 2 + 0.046, 0, 0);
    leftLeaf.rotation.y = 0.22;
    addBox(leftLeaf, leafW, doorH - 0.065, 0.046, leafW / 2, (doorH - 0.065) / 2, 0, oakDoorMat);
    addBox(leftLeaf, 0.024, 0.36, 0.085, leafW - 0.07, 1.02, 0, brassMat);
    group.add(leftLeaf);

    // Right leaf symmetrical
    const rightLeaf = new THREE.Group();
    rightLeaf.position.set(cx + innerW / 2 - 0.046, 0, 0);
    rightLeaf.rotation.y = -0.18;
    addBox(rightLeaf, leafW, doorH - 0.065, 0.046, -leafW / 2, (doorH - 0.065) / 2, 0, oakDoorMat);
    addBox(rightLeaf, 0.024, 0.36, 0.085, -leafW + 0.07, 1.02, 0, brassMat);
    group.add(rightLeaf);
  } else if (opening === 'wood_slider') {
    const doorH = 2.14;
    const topH = Math.max(0.18, height - doorH);

    addBox(group, effLen, topH, t, cx, doorH + topH / 2, 0, wallMat);
    if (sideW > 0.01) {
      addBox(group, sideW, doorH, t, leftPierX, doorH / 2, 0, wallMat);
      addBox(group, sideW, doorH, t, rightPierX, doorH / 2, 0, wallMat);
      addBox(group, sideW, 0.09, t + 0.025, leftPierX, 0.045, 0, trimMat);
      addBox(group, sideW, 0.09, t + 0.025, rightPierX, 0.045, 0, trimMat);
    }

    // Minimalist timber casing + exposed matte-black barn/Japanese top rail
    addBox(group, innerW + 0.04, 0.04, t + 0.024, cx, doorH - 0.02, 0, oakDoorMat);
    addBox(group, 0.036, doorH - 0.04, t + 0.024, cx - innerW / 2 + 0.018, (doorH - 0.04) / 2, 0, oakDoorMat);
    addBox(group, 0.036, doorH - 0.04, t + 0.024, cx + innerW / 2 - 0.018, (doorH - 0.04) / 2, 0, oakDoorMat);
    addBox(group, Math.min(effLen, innerW + 0.35), 0.032, 0.03, cx, doorH + 0.06, t / 2 + 0.04, frameMat);

    // Slatted wooden sliding door panel offset slightly open on track
    const panelW = innerW * 0.72;
    const panelX = cx + innerW * 0.18;
    const panelZ = t / 2 + 0.042;
    addBox(group, panelW, doorH - 0.04, 0.04, panelX, (doorH - 0.04) / 2, panelZ, oakDoorMat);
    // Frosted shoji glass insert + slim dark handle
    const insetGlass = addBox(
      group,
      panelW * 0.64,
      doorH * 0.56,
      0.046,
      panelX,
      doorH * 0.56,
      panelZ,
      makeMat('#EFE8DC', 0.45, 0.05, { transparent: true, opacity: 0.76 }),
    );
    insetGlass.castShadow = false;
    addBox(group, 0.022, 0.28, 0.065, panelX - panelW * 0.38, 1.0, panelZ + 0.01, frameMat);
  } else if (opening === 'archway') {
    const archR = innerW / 2;
    const straightH = 1.72;
    const topH = Math.max(0.16, height - (straightH + archR));

    if (sideW > 0.01) {
      addBox(group, sideW, straightH, t, leftPierX, straightH / 2, 0, wallMat);
      addBox(group, sideW, straightH, t, rightPierX, straightH / 2, 0, wallMat);
      addBox(group, sideW, 0.09, t + 0.025, leftPierX, 0.045, 0, trimMat);
      addBox(group, sideW, 0.09, t + 0.025, rightPierX, 0.045, 0, trimMat);
    }
    const archHeader = buildArchHeaderMesh(effLen, topH, archR, t, wallMat);
    archHeader.position.set(cx, straightH, 0);
    group.add(archHeader);
  } else if (opening === 'glass_slider') {
    const doorH = 2.24;
    const topH = Math.max(0.18, height - doorH);
    addBox(group, effLen, topH, t, cx, doorH + topH / 2, 0, wallMat);
    if (sideW > 0.01) {
      addBox(group, sideW, doorH, t, leftPierX, doorH / 2, 0, wallMat);
      addBox(group, sideW, doorH, t, rightPierX, doorH / 2, 0, wallMat);
      addBox(group, sideW, 0.09, t + 0.025, leftPierX, 0.045, 0, trimMat);
      addBox(group, sideW, 0.09, t + 0.025, rightPierX, 0.045, 0, trimMat);
    }
    addBox(group, 0.045, doorH, t * 0.9, cx - innerW / 2 + 0.0225, doorH / 2, 0, frameMat);
    addBox(group, 0.045, doorH, t * 0.9, cx + innerW / 2 - 0.0225, doorH / 2, 0, frameMat);
    addBox(group, innerW - 0.09, 0.036, t * 0.9, cx, 0.018, 0, frameMat);
    addBox(group, innerW - 0.09, 0.036, t * 0.9, cx, doorH - 0.018, 0, frameMat);

    const g1 = addBox(group, innerW * 0.52, doorH - 0.08, 0.018, cx - innerW * 0.21, doorH / 2, -0.022, glassMat);
    g1.castShadow = false;
    const g2 = addBox(group, innerW * 0.52, doorH - 0.08, 0.018, cx + innerW * 0.21, doorH / 2, 0.022, glassMat);
    g2.castShadow = false;
    addBox(group, 0.024, 0.34, 0.056, cx + 0.02, 1.05, 0.032, brassMat);
  }

  // Exact flush top cap trim (zero overlap with adjacent segments)
  addBox(group, effLen, 0.035, t + 0.02, cx, height + 0.0175, 0, trimMat);
  return group;
}

