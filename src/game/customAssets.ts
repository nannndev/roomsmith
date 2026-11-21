import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

export interface ImportedAssetRecord {
  id: string;
  name: string;
  template: THREE.Group;
  widthM: number;
  depthM: number;
  heightM: number;
}

/**
 * Runtime registry for user-imported 3D models (.glb, .gltf, .obj) and custom uploaded
 * image textures (for custom framed wall art / posters). Runs 100% locally in-browser
 * with zero external network dependencies.
 */
class CustomAssetRegistry {
  private models = new Map<string, ImportedAssetRecord>();
  private textures = new Map<string, THREE.Texture>();
  private gltfLoader = new GLTFLoader();
  private objLoader = new OBJLoader();
  private counter = 1;

  public async importModelFile(
    file: File,
    targetHeightM: number,
    customName?: string,
  ): Promise<ImportedAssetRecord> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let root: THREE.Object3D;

    if (ext === 'glb' || ext === 'gltf') {
      const buffer = await file.arrayBuffer();
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        this.gltfLoader.parse(
          buffer,
          '',
          (parsed) => resolve(parsed),
          (err) => reject(err instanceof Error ? err : new Error('Failed to parse GLTF/GLB model.')),
        );
      });
      root = gltf.scene;
    } else if (ext === 'obj') {
      const text = await file.text();
      root = this.objLoader.parse(text);
      // Ensure OBJ meshes have a clean default PBR material
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
      throw new Error('Unsupported 3D format. Please import a .glb, .gltf, or .obj file.');
    }

    // Wrap, normalize scale to requested height, center X/Z, and ground bottom flush at y = 0
    const wrapper = new THREE.Group();
    wrapper.add(root);
    wrapper.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxY = Math.max(0.001, size.y);
    const clampedTargetH = Math.max(0.15, Math.min(3.0, targetHeightM));
    const scaleFactor = clampedTargetH / maxY;

    root.scale.multiplyScalar(scaleFactor);
    root.position.set(
      -center.x * scaleFactor,
      -box.min.y * scaleFactor,
      -center.z * scaleFactor,
    );

    wrapper.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData.isSupportSurface = true;
        child.geometry?.computeBoundingSphere();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        for (const m of mats) {
          if (!m) continue;
          for (const val of Object.values(m)) {
            if (val && typeof val === 'object' && 'isTexture' in val && (val as THREE.Texture).isTexture) {
              (val as THREE.Texture).userData.isSharedTexture = true;
            }
          }
        }
      }
    });

    wrapper.updateMatrixWorld(true);
    const finalBox = new THREE.Box3().setFromObject(wrapper);
    const finalSize = new THREE.Vector3();
    finalBox.getSize(finalSize);

    const id = `imp_${Date.now()}_${this.counter++}`;
    const cleanName =
      (customName || file.name.replace(/\.[^/.]+$/, '')).trim().slice(0, 28) || 'Imported 3D';

    const record: ImportedAssetRecord = {
      id,
      name: cleanName,
      template: wrapper,
      widthM: Math.max(0.2, Number(finalSize.x.toFixed(2))),
      depthM: Math.max(0.2, Number(finalSize.z.toFixed(2))),
      heightM: Math.max(0.15, Number(finalSize.y.toFixed(2))),
    };
    this.models.set(id, record);
    return record;
  }

  public cloneImportedModel(assetId: string, tintHex?: string): THREE.Group | null {
    const rec = this.models.get(assetId);
    if (!rec) return null;

    const cloned = rec.template.clone(true);
    // Deep-clone materials so per-instance color tinting and disposal never mutate the cached template
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((m) => m.clone());
        } else if (obj.material) {
          obj.material = obj.material.clone();
        }
        // Only tint if user chose a non-white tint color
        if (tintHex && tintHex.toUpperCase() !== '#FFFFFF') {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhysicalMaterial) {
              m.color.set(tintHex);
            }
          }
        }
        obj.userData.isImportedMesh = true;
      }
    });
    return cloned;
  }

  public async registerImageTexture(file: File): Promise<string> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });

    const loader = new THREE.TextureLoader();
    const tex = await loader.loadAsync(dataUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData.isSharedTexture = true;
    tex.needsUpdate = true;

    const id = `img_${Date.now()}_${this.counter++}`;
    this.textures.set(id, tex);
    return id;
  }

  public getImageTexture(id?: string): THREE.Texture | null {
    if (!id) return null;
    return this.textures.get(id) || null;
  }
}

export const customAssetRegistry = new CustomAssetRegistry();
