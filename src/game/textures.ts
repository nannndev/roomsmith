import * as THREE from 'three';
import { FLOOR_MATERIALS, WALL_MATERIALS } from './catalog';
import { FloorMaterialId, WallMaterialId } from './types';

function createCanvas(size = 512): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

function seededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function finalizeColorTexture(canvas: HTMLCanvasElement, anisotropy: number, repeat = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function finalizeDataTexture(canvas: HTMLCanvasElement, anisotropy: number, repeat = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export interface ProceduralTextureLibrary {
  floorMaterials: Record<FloorMaterialId, THREE.MeshStandardMaterial>;
  wallMaterials: Record<WallMaterialId, THREE.MeshStandardMaterial>;
  getFloorMaterial: (id: FloorMaterialId, tint?: string) => THREE.MeshStandardMaterial;
  getWallMaterial: (id: WallMaterialId, tint?: string) => THREE.MeshStandardMaterial;
  contactShadowTex: THREE.CanvasTexture;
  rugTex: THREE.CanvasTexture;
  tvScreenTex: THREE.CanvasTexture;
  artTextures: THREE.CanvasTexture[];
  clockDialTex: THREE.CanvasTexture;
  botanicalPrintTex: THREE.CanvasTexture;
  tapestryTex: THREE.CanvasTexture;
  dispose: () => void;
}

function buildFloorMaps(id: FloorMaterialId, anisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const { canvas, ctx } = createCanvas(size);
  const { canvas: bCanvas, ctx: bCtx } = createCanvas(size);
  const rand = seededRand(id.length * 1337 + id.charCodeAt(0) * 31);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  if (id === 'herringbone_oak' || id === 'pale_ash') {
    const isPale = id === 'pale_ash';
    const baseColors = isPale
      ? ['#DECDB4', '#D4C1A4', '#E3D4BE', '#CCB798']
      : ['#BA8E5F', '#A97C4E', '#C49A6B', '#9E7043'];
    ctx.fillStyle = baseColors[0];
    ctx.fillRect(0, 0, size, size);

    const plankW = isPale ? 64 : 64;
    const plankH = isPale ? 256 : 128;

    for (let row = 0; row < size / plankH; row++) {
      for (let col = 0; col < size / plankW; col++) {
        const x = col * plankW;
        const y = row * plankH + (isPale ? (col % 2) * (plankH / 2) : 0);
        const color = baseColors[Math.floor(rand() * baseColors.length)];
        ctx.fillStyle = color;
        ctx.fillRect(x, y % size, plankW - 2, plankH - 2);

        // Wood grain streaks
        ctx.strokeStyle = isPale ? 'rgba(130, 102, 72, 0.14)' : 'rgba(68, 42, 20, 0.18)';
        ctx.lineWidth = 1.2;
        for (let g = 0; g < 12; g++) {
          const gx = x + 3 + rand() * (plankW - 8);
          ctx.beginPath();
          ctx.moveTo(gx, y % size);
          ctx.bezierCurveTo(
            gx + (rand() - 0.5) * 6,
            (y % size) + plankH * 0.35,
            gx + (rand() - 0.5) * 6,
            (y % size) + plankH * 0.7,
            gx,
            (y % size) + plankH - 2,
          );
          ctx.stroke();
        }

        // Grout/seam in bump
        bCtx.fillStyle = '#a0a0a0';
        bCtx.fillRect(x + 1, (y % size) + 1, plankW - 3, plankH - 3);
        bCtx.strokeStyle = '#383838';
        bCtx.lineWidth = 2;
        bCtx.strokeRect(x, y % size, plankW, plankH);

        ctx.strokeStyle = 'rgba(42, 28, 16, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y % size, plankW, plankH);
      }
    }
    if (!isPale) {
      // Subtle diagonal chevron accent lines for herringbone read
      ctx.strokeStyle = 'rgba(72, 46, 22, 0.22)';
      ctx.lineWidth = 2;
      for (let i = -size; i < size * 2; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 64, 64);
        ctx.lineTo(i, 128);
        ctx.lineTo(i + 64, 192);
        ctx.lineTo(i, 256);
        ctx.lineTo(i + 64, 320);
        ctx.lineTo(i, 384);
        ctx.lineTo(i + 64, 448);
        ctx.lineTo(i, 512);
        ctx.stroke();
      }
    }
  } else if (id === 'carrara_marble') {
    ctx.fillStyle = '#F2F0EC';
    ctx.fillRect(0, 0, size, size);
    // Subtle marble veining
    for (let v = 0; v < 24; v++) {
      ctx.strokeStyle = v % 3 === 0 ? 'rgba(130, 134, 142, 0.24)' : 'rgba(168, 170, 176, 0.16)';
      ctx.lineWidth = 1 + rand() * 4.5;
      let vx = rand() * size;
      let vy = rand() * size;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      for (let s = 0; s < 6; s++) {
        vx += (rand() - 0.3) * 90;
        vy += (rand() - 0.2) * 80;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }
    // Large marble slab grid lines
    ctx.strokeStyle = 'rgba(165, 162, 155, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size / 2, size / 2);
    ctx.strokeRect(size / 2, 0, size / 2, size / 2);
    ctx.strokeRect(0, size / 2, size / 2, size / 2);
    ctx.strokeRect(size / 2, size / 2, size / 2, size / 2);
    bCtx.strokeStyle = '#505050';
    bCtx.lineWidth = 2;
    bCtx.strokeRect(0, 0, size / 2, size / 2);
    bCtx.strokeRect(size / 2, size / 2, size / 2, size / 2);
  } else if (id === 'warm_terrazzo') {
    ctx.fillStyle = '#DDD4C7';
    ctx.fillRect(0, 0, size, size);
    const chips = ['#B87C5B', '#6E7D72', '#4E5359', '#EFEBE3', '#C9A46B', '#8E8579'];
    for (let i = 0; i < 380; i++) {
      const cx = rand() * size;
      const cy = rand() * size;
      const r = 3 + rand() * 11;
      ctx.fillStyle = chips[Math.floor(rand() * chips.length)];
      ctx.beginPath();
      const sides = 4 + Math.floor(rand() * 3);
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2 + rand() * 0.5;
        const rr = r * (0.65 + rand() * 0.45);
        const px = cx + Math.cos(a) * rr;
        const py = cy + Math.sin(a) * rr;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(120, 112, 100, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  } else if (id === 'polished_concrete') {
    ctx.fillStyle = '#A4A7AA';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 600; i++) {
      const shade = 148 + Math.floor(rand() * 36);
      ctx.fillStyle = `rgba(${shade}, ${shade}, ${shade + 2}, 0.14)`;
      ctx.beginPath();
      ctx.arc(rand() * size, rand() * size, 8 + rand() * 32, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(70, 74, 78, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  } else if (id === 'slate_tile') {
    ctx.fillStyle = '#4B525A';
    ctx.fillRect(0, 0, size, size);
    const tile = 128;
    for (let y = 0; y < size; y += tile) {
      for (let x = 0; x < size; x += tile) {
        const d = Math.floor((rand() - 0.5) * 18);
        ctx.fillStyle = `rgb(${75 + d}, ${82 + d}, ${90 + d})`;
        ctx.fillRect(x + 2, y + 2, tile - 4, tile - 4);
        bCtx.fillStyle = `rgb(${120 + d}, ${120 + d}, ${120 + d})`;
        bCtx.fillRect(x + 3, y + 3, tile - 6, tile - 6);
      }
    }
  } else if (id === 'bistro_checker') {
    const step = 128;
    for (let y = 0; y < size; y += step) {
      for (let x = 0; x < size; x += step) {
        const dark = ((x / step) + (y / step)) % 2 === 0;
        ctx.fillStyle = dark ? '#35383E' : '#EAE5DB';
        ctx.fillRect(x, y, step, step);
        ctx.strokeStyle = 'rgba(130, 126, 120, 0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, step, step);
        bCtx.strokeStyle = '#454545';
        bCtx.lineWidth = 2;
        bCtx.strokeRect(x, y, step, step);
      }
    }
  } else if (id === 'woven_tatami') {
    // woven_tatami
    ctx.fillStyle = '#C9C096';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? 'rgba(155, 145, 98, 0.28)' : 'rgba(224, 218, 178, 0.25)';
      ctx.fillRect(0, y, size, 2);
      bCtx.fillStyle = y % 8 === 0 ? '#686868' : '#9c9c9c';
      bCtx.fillRect(0, y, size, 2);
    }
    // Dark cloth border tape
    ctx.fillStyle = '#3B463F';
    ctx.fillRect(0, 0, size, 14);
    ctx.fillRect(0, size - 14, size, 14);
  } else if (id === 'plush_carpet') {
    ctx.fillStyle = '#E6E1D7';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4200; i++) {
      const px = rand() * size;
      const py = rand() * size;
      const s = 212 + Math.floor((rand() - 0.5) * 28);
      ctx.fillStyle = `rgba(${s}, ${s - 2}, ${s - 6}, 0.42)`;
      ctx.fillRect(px, py, 3, 3);
      const b = 110 + Math.floor(rand() * 44);
      bCtx.fillStyle = `rgb(${b},${b},${b})`;
      bCtx.fillRect(px, py, 3, 3);
    }
  } else if (id === 'asphalt_parking') {
    ctx.fillStyle = '#3F4349';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4800; i++) {
      const px = rand() * size;
      const py = rand() * size;
      const v = 46 + Math.floor(rand() * 44);
      ctx.fillStyle = `rgba(${v}, ${v + 2}, ${v + 5}, 0.45)`;
      ctx.fillRect(px, py, 2 + rand() * 2, 2 + rand() * 2);
      const b = 95 + Math.floor(rand() * 65);
      bCtx.fillStyle = `rgb(${b},${b},${b})`;
      bCtx.fillRect(px, py, 3, 3);
    }
  } else if (id === 'garden_grass') {
    ctx.fillStyle = '#6E8F56';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 3600; i++) {
      const px = rand() * size;
      const py = rand() * size;
      const g = 118 + Math.floor(rand() * 48);
      const r = 82 + Math.floor(rand() * 34);
      ctx.fillStyle = `rgba(${r}, ${g}, ${66 + Math.floor(rand() * 24)}, 0.45)`;
      ctx.fillRect(px, py, 2, 5 + rand() * 5);
      const b = 100 + Math.floor(rand() * 52);
      bCtx.fillStyle = `rgb(${b},${b},${b})`;
      bCtx.fillRect(px, py, 2, 4);
    }
  } else if (id === 'cobblestone_path') {
    ctx.fillStyle = '#7A7267';
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * 38;
      let x = -offset;
      while (x < size) {
        const w = 54 + Math.floor(rand() * 36);
        const shade = 148 + Math.floor((rand() - 0.5) * 34);
        ctx.fillStyle = `rgb(${shade + 8}, ${shade + 2}, ${shade - 8})`;
        ctx.fillRect(x + 3, r * rowH + 3, w - 6, rowH - 6);
        bCtx.fillStyle = '#b4b4b4';
        bCtx.fillRect(x + 4, r * rowH + 4, w - 8, rowH - 8);
        x += w;
      }
    }
  } else if (id === 'deck_slats') {
    const base = ['#9E6F47', '#8F623D', '#AB7B52', '#855A37'];
    ctx.fillStyle = '#3B281A';
    ctx.fillRect(0, 0, size, size);
    const slatH = 64;
    for (let row = 0; row < size / slatH; row++) {
      const y = row * slatH;
      ctx.fillStyle = base[row % base.length];
      ctx.fillRect(0, y + 3, size, slatH - 6);
      ctx.strokeStyle = 'rgba(58, 36, 18, 0.22)';
      ctx.lineWidth = 1.2;
      for (let g = 0; g < 8; g++) {
        const gy = y + 7 + rand() * (slatH - 14);
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(size, gy + (rand() - 0.5) * 4);
        ctx.stroke();
      }
      bCtx.fillStyle = '#a8a8a8';
      bCtx.fillRect(0, y + 4, size, slatH - 8);
      bCtx.fillStyle = '#282828';
      bCtx.fillRect(0, y, size, 3);
    }
  } else {
    // geometric_mosaic
    ctx.fillStyle = '#E6E3DC';
    ctx.fillRect(0, 0, size, size);
    const cell = 64;
    for (let y = 0; y < size; y += cell) {
      for (let x = 0; x < size; x += cell) {
        const cx = x + cell / 2;
        const cy = y + cell / 2;
        ctx.fillStyle = ((x / cell + y / cell) % 2 === 0) ? '#D8DDD9' : '#ECE9E1';
        ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
        // Diamond accent center
        ctx.fillStyle = '#8FA098';
        ctx.beginPath();
        ctx.moveTo(cx, y + 10);
        ctx.lineTo(x + cell - 10, cy);
        ctx.lineTo(cx, y + cell - 10);
        ctx.lineTo(x + 10, cy);
        ctx.closePath();
        ctx.fill();
        bCtx.strokeStyle = '#484848';
        bCtx.lineWidth = 2;
        bCtx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
      }
    }
  }

  return {
    map: finalizeColorTexture(canvas, anisotropy, 1),
    bumpMap: finalizeDataTexture(bCanvas, anisotropy, 1),
  };
}

function buildWallMaps(id: WallMaterialId, anisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 512;
  const { canvas, ctx } = createCanvas(size);
  const { canvas: bCanvas, ctx: bCtx } = createCanvas(size);
  const rand = seededRand(id.length * 911 + id.charCodeAt(2) * 53);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  if (id === 'matte_paint') {
    // Pure subtle micro-textured paintable base so any custom paint tint looks clean & luminous
    ctx.fillStyle = '#F6F4EF';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 600; i++) {
      const v = 238 + Math.floor((rand() - 0.5) * 10);
      ctx.fillStyle = `rgba(${v},${v},${v},0.22)`;
      ctx.fillRect(rand() * size, rand() * size, 16, 16);
    }
  } else if (id === 'botanical_wallpaper') {
    ctx.fillStyle = '#EDF0E9';
    ctx.fillRect(0, 0, size, size);
    // Subtle linen paper weave
    for (let y = 0; y < size; y += 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.02)';
      ctx.fillRect(0, y, size, 1);
    }
    // Illustrated botanical frond branches
    const drawBranch = (ox: number, oy: number, flip: number) => {
      ctx.strokeStyle = 'rgba(84, 114, 92, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ox, oy + 120);
      ctx.quadraticCurveTo(ox + flip * 25, oy + 40, ox + flip * 6, oy - 70);
      ctx.stroke();

      for (let i = 0; i < 7; i++) {
        const ly = oy + 85 - i * 24;
        const lx = ox + flip * (12 + Math.sin(i * 0.6) * 8);
        const side = i % 2 === 0 ? 1 : -1;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(116, 145, 118, 0.55)' : 'rgba(82, 115, 90, 0.48)';
        ctx.beginPath();
        ctx.ellipse(lx + side * 24, ly, 26, 10, side * 0.45, 0, Math.PI * 2);
        ctx.fill();
        bCtx.fillStyle = '#9c9c9c';
        bCtx.beginPath();
        bCtx.ellipse(lx + side * 24, ly, 24, 9, side * 0.45, 0, Math.PI * 2);
        bCtx.fill();
      }
    };
    drawBranch(128, 128, 1);
    drawBranch(384, 384, -1);
    drawBranch(384, 110, -1);
    drawBranch(128, 390, 1);
  } else if (id === 'art_deco_wallpaper') {
    ctx.fillStyle = '#ECE6DA';
    ctx.fillRect(0, 0, size, size);
    // Crisp Art Deco gold fan arches
    const step = 128;
    ctx.strokeStyle = 'rgba(189, 146, 76, 0.72)';
    ctx.lineWidth = 2.6;
    bCtx.strokeStyle = '#bcbcbc';
    bCtx.lineWidth = 3;
    for (let row = 0; row <= size / (step / 2) + 1; row++) {
      const cy = row * (step / 2);
      const offset = (row % 2) * (step / 2);
      for (let col = -1; col <= size / step + 1; col++) {
        const cx = col * step + offset;
        for (const r of [60, 44, 28, 14]) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, Math.PI, 0);
          ctx.stroke();
          bCtx.beginPath();
          bCtx.arc(cx, cy, r, Math.PI, 0);
          bCtx.stroke();
        }
        // Center fan ray
        ctx.beginPath();
        ctx.moveTo(cx, cy - 60);
        ctx.lineTo(cx, cy);
        ctx.stroke();
      }
    }
  } else if (id === 'nordic_stripe_wallpaper') {
    ctx.fillStyle = '#F2EFE8';
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 64) {
      ctx.fillStyle = 'rgba(128, 134, 140, 0.22)';
      ctx.fillRect(x, 0, 26, size);
      ctx.fillStyle = 'rgba(128, 134, 140, 0.36)';
      ctx.fillRect(x + 30, 0, 3, size);
      bCtx.fillStyle = '#929292';
      bCtx.fillRect(x, 0, 26, size);
    }
  } else if (id === 'limewash_plaster' || id === 'sage_matte' || id === 'venetian_terracotta') {
    const base =
      id === 'limewash_plaster'
        ? [239, 234, 225]
        : id === 'sage_matte'
          ? [180, 192, 176]
          : [196, 138, 113];
    ctx.fillStyle = `rgb(${base[0]}, ${base[1]}, ${base[2]})`;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 420; i++) {
      const delta = (rand() - 0.5) * 18;
      ctx.fillStyle = `rgba(${Math.round(base[0] + delta)}, ${Math.round(base[1] + delta)}, ${Math.round(base[2] + delta)}, 0.18)`;
      ctx.beginPath();
      ctx.ellipse(
        rand() * size,
        rand() * size,
        24 + rand() * 55,
        12 + rand() * 28,
        rand() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      const bVal = Math.round(128 + delta * 1.4);
      bCtx.fillStyle = `rgba(${bVal}, ${bVal}, ${bVal}, 0.2)`;
      bCtx.fillRect(rand() * size, rand() * size, 28, 12);
    }
  } else if (id === 'midnight_paneling' || id === 'cream_wainscot') {
    const isDark = id === 'midnight_paneling';
    ctx.fillStyle = isDark ? '#2D3A4D' : '#EBE4D6';
    ctx.fillRect(0, 0, size, size);

    // Classic architectural wall molding panels
    const panelBorder = isDark ? '#1F2A3A' : '#CFC5B3';
    const panelHi = isDark ? '#3F5068' : '#F8F4EC';
    for (let col = 0; col < 2; col++) {
      const px = col * 256 + 26;
      // Upper panel
      ctx.strokeStyle = panelBorder;
      ctx.lineWidth = 8;
      ctx.strokeRect(px, 34, 204, 250);
      ctx.strokeStyle = panelHi;
      ctx.lineWidth = 3;
      ctx.strokeRect(px + 6, 40, 192, 238);

      // Lower dado panel
      ctx.strokeStyle = panelBorder;
      ctx.lineWidth = 8;
      ctx.strokeRect(px, 326, 204, 152);
      ctx.strokeStyle = panelHi;
      ctx.lineWidth = 3;
      ctx.strokeRect(px + 6, 332, 192, 140);

      bCtx.strokeStyle = '#d4d4d4';
      bCtx.lineWidth = 10;
      bCtx.strokeRect(px, 34, 204, 250);
      bCtx.strokeRect(px, 326, 204, 152);
    }
    // Chair rail
    ctx.fillStyle = panelHi;
    ctx.fillRect(0, 298, size, 14);
    bCtx.fillStyle = '#e0e0e0';
    bCtx.fillRect(0, 298, size, 14);
  } else if (id === 'walnut_slats') {
    ctx.fillStyle = '#241B16';
    ctx.fillRect(0, 0, size, size);
    const slatW = 24;
    const gap = 8;
    for (let x = 0; x < size; x += slatW + gap) {
      const shade = Math.floor((rand() - 0.5) * 18);
      ctx.fillStyle = `rgb(${115 + shade}, ${82 + shade}, ${58 + shade})`;
      ctx.fillRect(x, 0, slatW, size);
      ctx.fillStyle = 'rgba(255, 224, 190, 0.1)';
      ctx.fillRect(x + 2, 0, 4, size);
      bCtx.fillStyle = '#dcdcdc';
      bCtx.fillRect(x, 0, slatW, size);
      bCtx.fillStyle = '#252525';
      bCtx.fillRect(x + slatW, 0, gap, size);
    }
  } else if (id === 'loft_brick') {
    ctx.fillStyle = '#C6BEB2'; // mortar
    ctx.fillRect(0, 0, size, size);
    bCtx.fillStyle = '#383838';
    bCtx.fillRect(0, 0, size, size);
    const bw = 128;
    const bh = 44;
    for (let row = 0; row < Math.ceil(size / bh); row++) {
      const offset = (row % 2) * (bw / 2);
      for (let col = -1; col < size / bw + 1; col++) {
        const bx = col * bw + offset;
        const by = row * bh;
        const r = 148 + Math.floor((rand() - 0.5) * 34);
        const g = 90 + Math.floor((rand() - 0.5) * 22);
        const b = 70 + Math.floor((rand() - 0.5) * 18);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(bx + 3, by + 3, bw - 6, bh - 6);
        bCtx.fillStyle = '#c8c8c8';
        bCtx.fillRect(bx + 4, by + 4, bw - 8, bh - 8);
      }
    }
  } else {
    // raw_concrete
    ctx.fillStyle = '#ACB0B5';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 450; i++) {
      const s = 152 + Math.floor(rand() * 34);
      ctx.fillStyle = `rgba(${s},${s},${s + 2},0.16)`;
      ctx.fillRect(rand() * size, rand() * size, 36 + rand() * 44, 14 + rand() * 24);
    }
    // Architectural formwork seam & tie-rod dots
    ctx.strokeStyle = 'rgba(72, 76, 82, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size, size / 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(72, 76, 82, 0.45)';
    for (const px of [96, 256, 416]) {
      for (const py of [128, 384]) {
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return {
    map: finalizeColorTexture(canvas, anisotropy, 1),
    bumpMap: finalizeDataTexture(bCanvas, anisotropy, 1),
  };
}

function buildContactShadowTexture(): THREE.CanvasTexture {
  const { canvas, ctx } = createCanvas(256);
  const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 122);
  grad.addColorStop(0, 'rgba(18, 16, 14, 0.46)');
  grad.addColorStop(0.55, 'rgba(18, 16, 14, 0.22)');
  grad.addColorStop(1, 'rgba(18, 16, 14, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function buildRugTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = '#EFECE6';
  ctx.fillRect(0, 0, size, size);

  // Subtle woven linen grain
  for (let y = 0; y < size; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, y, size, 1.5);
  }
  for (let x = 0; x < size; x += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.035)';
    ctx.fillRect(x, 0, 1.5, size);
  }

  // Modernist architectural geometric border & lines
  ctx.strokeStyle = 'rgba(60, 52, 44, 0.28)';
  ctx.lineWidth = 8;
  ctx.strokeRect(28, 28, size - 56, size - 56);
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, size - 96, size - 96);

  // Mid-century geometric arc motif
  ctx.strokeStyle = 'rgba(60, 52, 44, 0.22)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(size * 0.35, size * 0.5, 92, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size * 0.65, size * 0.5, 92, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();

  return finalizeColorTexture(canvas, anisotropy, 1);
}

function buildTvScreenTexture(anisotropy: number): THREE.CanvasTexture {
  const { canvas, ctx } = createCanvas(512);
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#1D2B38');
  grad.addColorStop(0.55, '#35495C');
  grad.addColorStop(1, '#D8A267');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Minimalist gallery sunset arch graphic
  ctx.fillStyle = 'rgba(244, 214, 168, 0.85)';
  ctx.beginPath();
  ctx.arc(256, 210, 88, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(22, 30, 38, 0.72)';
  ctx.beginPath();
  ctx.moveTo(0, 340);
  ctx.quadraticCurveTo(160, 260, 310, 325);
  ctx.quadraticCurveTo(420, 370, 512, 290);
  ctx.lineTo(512, 512);
  ctx.lineTo(0, 512);
  ctx.closePath();
  ctx.fill();

  return finalizeColorTexture(canvas, anisotropy, 1);
}

function buildArtTextures(anisotropy: number): THREE.CanvasTexture[] {
  const variants = [
    ['#F3EFE6', '#C67B59', '#32424F', '#D9A760'],
    ['#ECEAE2', '#526D5F', '#2C3238', '#C9B393'],
    ['#F4EFE6', '#3A4E6C', '#B87C5C', '#24272D'],
  ];
  return variants.map((palette, idx) => {
    const { canvas, ctx } = createCanvas(256);
    ctx.fillStyle = palette[0];
    ctx.fillRect(0, 0, 256, 256);

    if (idx === 0) {
      ctx.fillStyle = palette[1];
      ctx.beginPath();
      ctx.arc(128, 148, 72, Math.PI, 0);
      ctx.lineTo(200, 224);
      ctx.lineTo(56, 224);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = palette[3];
      ctx.beginPath();
      ctx.arc(158, 74, 28, 0, Math.PI * 2);
      ctx.fill();
    } else if (idx === 1) {
      ctx.fillStyle = palette[1];
      ctx.fillRect(36, 44, 118, 168);
      ctx.fillStyle = palette[3];
      ctx.beginPath();
      ctx.arc(166, 136, 54, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = palette[1];
      ctx.beginPath();
      ctx.moveTo(32, 212);
      ctx.lineTo(128, 44);
      ctx.lineTo(224, 212);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = palette[2];
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.arc(128, 142, 48, 0, Math.PI * 2);
      ctx.stroke();
    }
    return finalizeColorTexture(canvas, anisotropy, 1);
  });
}

function buildClockDialTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = '#F7F4EC';
  ctx.fillRect(0, 0, size, size);

  const cx = 128;
  const cy = 128;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const inner = i % 3 === 0 ? 84 : 94;
    ctx.strokeStyle = i % 3 === 0 ? '#23262C' : '#7A766E';
    ctx.lineWidth = i % 3 === 0 ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * 112, cy + Math.sin(a) * 112);
    ctx.stroke();
  }
  // Classic 10:10 architectural watchmaker hands
  ctx.strokeStyle = '#1E2126';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx - 52, cy - 30);
  ctx.stroke();

  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + 68, cy - 42);
  ctx.stroke();

  ctx.fillStyle = '#CFA255';
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();

  return finalizeColorTexture(canvas, anisotropy, 1);
}

function buildBotanicalPrintTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = '#F4EFE6';
  ctx.fillRect(0, 0, size, size);

  // Inner mat border
  ctx.strokeStyle = 'rgba(90, 82, 72, 0.2)';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, size - 40, size - 40);

  // Botanical stem & leaves
  ctx.strokeStyle = '#3E5B47';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(128, 224);
  ctx.quadraticCurveTo(122, 140, 134, 48);
  ctx.stroke();

  const leaves: [number, number, number, number, number][] = [
    [98, 175, 34, 15, -0.55],
    [158, 162, 34, 15, 0.5],
    [94, 128, 38, 16, -0.45],
    [164, 114, 36, 15, 0.45],
    [104, 84, 30, 13, -0.5],
    [154, 74, 28, 12, 0.5],
    [134, 48, 22, 11, -1.4],
  ];
  for (const [lx, ly, rx, ry, rot] of leaves) {
    ctx.fillStyle = '#4B6F56';
    ctx.beginPath();
    ctx.ellipse(lx, ly, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
  }
  return finalizeColorTexture(canvas, anisotropy, 1);
}

function buildTapestryTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const { canvas, ctx } = createCanvas(size);
  ctx.fillStyle = '#EBE3D5';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 4) {
    ctx.fillStyle = y % 8 === 0 ? 'rgba(60, 48, 36, 0.08)' : 'rgba(255,255,255,0.1)';
    ctx.fillRect(0, y, size, 2);
  }
  // Modernist terracotta & charcoal woven mountain arch
  ctx.fillStyle = '#BA7A5A';
  ctx.beginPath();
  ctx.arc(128, 158, 74, Math.PI, 0);
  ctx.lineTo(202, 232);
  ctx.lineTo(54, 232);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#38434E';
  ctx.beginPath();
  ctx.arc(128, 72, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#F2EDE4';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(40, 194);
  ctx.lineTo(216, 194);
  ctx.stroke();

  return finalizeColorTexture(canvas, anisotropy, 1);
}

export function createProceduralTextureLibrary(
  renderer: THREE.WebGLRenderer,
): ProceduralTextureLibrary {
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const disposables: (THREE.Texture | THREE.Material)[] = [];
  const registerSharedTex = <T extends THREE.Texture>(tex: T): T => {
    tex.userData.isSharedTexture = true;
    disposables.push(tex);
    return tex;
  };
  const registerSharedMat = <T extends THREE.Material>(mat: T): T => {
    mat.userData.isSharedMaterial = true;
    disposables.push(mat);
    return mat;
  };

  const floorMaterials = {} as Record<FloorMaterialId, THREE.MeshStandardMaterial>;
  for (const fm of FLOOR_MATERIALS) {
    const { map, bumpMap } = buildFloorMaps(fm.id, anisotropy);
    registerSharedTex(map);
    registerSharedTex(bumpMap);
    const mat = registerSharedMat(
      new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.018,
        roughness: fm.roughness,
        metalness: fm.metalness,
      }),
    );
    floorMaterials[fm.id] = mat;
  }

  const wallMaterials = {} as Record<WallMaterialId, THREE.MeshStandardMaterial>;
  for (const wm of WALL_MATERIALS) {
    const { map, bumpMap } = buildWallMaps(wm.id, anisotropy);
    registerSharedTex(map);
    registerSharedTex(bumpMap);
    const mat = registerSharedMat(
      new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.022,
        roughness: wm.roughness,
        metalness: wm.metalness,
      }),
    );
    wallMaterials[wm.id] = mat;
  }

  const tintedFloorCache = new Map<string, THREE.MeshStandardMaterial>();
  const tintedWallCache = new Map<string, THREE.MeshStandardMaterial>();

  const getFloorMaterial = (id: FloorMaterialId, tint?: string): THREE.MeshStandardMaterial => {
    const base = floorMaterials[id] || floorMaterials.herringbone_oak;
    const normTint = tint ? tint.toUpperCase() : '#FFFFFF';
    if (normTint === '#FFFFFF') return base;
    const key = `${id}|${normTint}`;
    let mat = tintedFloorCache.get(key);
    if (!mat) {
      mat = registerSharedMat(base.clone());
      mat.color.set(normTint);
      tintedFloorCache.set(key, mat);
    }
    return mat;
  };

  const getWallMaterial = (id: WallMaterialId, tint?: string): THREE.MeshStandardMaterial => {
    const base = wallMaterials[id] || wallMaterials.limewash_plaster;
    const normTint = tint ? tint.toUpperCase() : '#FFFFFF';
    if (normTint === '#FFFFFF') return base;
    const key = `${id}|${normTint}`;
    let mat = tintedWallCache.get(key);
    if (!mat) {
      mat = registerSharedMat(base.clone());
      mat.color.set(normTint);
      tintedWallCache.set(key, mat);
    }
    return mat;
  };

  const contactShadowTex = registerSharedTex(buildContactShadowTexture());
  const rugTex = registerSharedTex(buildRugTexture(anisotropy));
  const tvScreenTex = registerSharedTex(buildTvScreenTexture(anisotropy));
  const artTextures = buildArtTextures(anisotropy).map((t) => registerSharedTex(t));
  const clockDialTex = registerSharedTex(buildClockDialTexture(anisotropy));
  const botanicalPrintTex = registerSharedTex(buildBotanicalPrintTexture(anisotropy));
  const tapestryTex = registerSharedTex(buildTapestryTexture(anisotropy));

  return {
    floorMaterials,
    wallMaterials,
    getFloorMaterial,
    getWallMaterial,
    contactShadowTex,
    rugTex,
    tvScreenTex,
    artTextures,
    clockDialTex,
    botanicalPrintTex,
    tapestryTex,
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
}
