import { getSiteBounds } from './scoring';
import {
  DEFAULT_SITE_CONFIG,
  FloorLevelData,
  FloorMaterialId,
  FloorTile,
  PlacedFurniture,
  RoomBlueprint,
  RoomModuleId,
  RoomZoneId,
  SiteConfig,
  StarterTemplateId,
  TemplateCategory,
  WallMaterialId,
  WallOpeningType,
} from './types';

export interface TemplateCatalogItem {
  id: StarterTemplateId;
  name: string;
  subtitle: string;
  category: TemplateCategory;
  sizeLabel: string;
  floors: number;
  bedrooms: number;
  bathrooms: number;
  tags: string[];
}

export interface RoomModuleDef {
  id: RoomModuleId;
  name: string;
  subtitle: string;
  width: number;
  depth: number;
  zone: RoomZoneId;
  accentColor: string;
}

export const TEMPLATE_CATEGORY_LABELS: { id: 'all' | TemplateCategory; label: string }[] = [
  { id: 'all', label: 'Semua' },
  { id: 'house', label: 'Rumah' },
  { id: 'kos', label: 'Kos-Kosan' },
  { id: 'apartment', label: 'Apartemen' },
  { id: 'villa', label: 'Villa & Ruko' },
];

export const ROOM_MODULE_PRESETS: RoomModuleDef[] = [
  {
    id: 'mod_bedroom',
    name: 'Kamar Tidur',
    subtitle: 'Kasur, lemari, nakas, AC & gorden',
    width: 3,
    depth: 4,
    zone: 'bedroom',
    accentColor: '#9E85B8',
  },
  {
    id: 'mod_kos_ensuite',
    name: 'Kamar Kos + KM',
    subtitle: 'Kamar 3×3m + KM dalam 3×2m',
    width: 3,
    depth: 5,
    zone: 'bedroom',
    accentColor: '#B86B35',
  },
  {
    id: 'mod_bathroom',
    name: 'Kamar Mandi',
    subtitle: 'Kloset, shower, wastafel & bouvenlight',
    width: 2,
    depth: 3,
    zone: 'bath',
    accentColor: '#6BA7B8',
  },
  {
    id: 'mod_kitchen',
    name: 'Dapur & Makan',
    subtitle: 'Kitchen set L, kompor, kulkas, makan',
    width: 4,
    depth: 3,
    zone: 'kitchen',
    accentColor: '#6E9F8B',
  },
  {
    id: 'mod_living',
    name: 'Ruang Tamu',
    subtitle: 'Sofa L, meja kopi, karpet & TV',
    width: 4,
    depth: 4,
    zone: 'living',
    accentColor: '#D99B4E',
  },
  {
    id: 'mod_study',
    name: 'Ruang Kerja',
    subtitle: 'Meja arsitek, kursi, rak buku & lampu',
    width: 3,
    depth: 3,
    zone: 'study',
    accentColor: '#5E85A8',
  },
];

export const STARTER_TEMPLATES: TemplateCatalogItem[] = [
  {
    id: 'rumah_tipe_36',
    name: 'Rumah Tipe 36 (2 KT)',
    subtitle: '2 kamar tidur, ruang tamu, dapur, KM, carport & taman belakang',
    category: 'house',
    sizeLabel: '6×12m',
    floors: 1,
    bedrooms: 2,
    bathrooms: 1,
    tags: ['2 KT', 'Carport', 'Taman'],
  },
  {
    id: 'rumah_tipe_45',
    name: 'Rumah Tipe 45 (2 KT)',
    subtitle: 'Lebih lega dengan dapur L, ruang makan, teras pilar & carport mobil',
    category: 'house',
    sizeLabel: '8×12m',
    floors: 1,
    bedrooms: 2,
    bathrooms: 1,
    tags: ['2 KT', 'Dapur L', 'Teras'],
  },
  {
    id: 'rumah_tipe_60',
    name: 'Rumah Tipe 60 (3 KT)',
    subtitle: '3 kamar tidur (1 kamar utama + KM dalam), ruang keluarga & carport',
    category: 'house',
    sizeLabel: '10×12m',
    floors: 1,
    bedrooms: 3,
    bathrooms: 2,
    tags: ['3 KT', '2 KM', 'Keluarga'],
  },
  {
    id: 'rumah_sempit_2lt',
    name: 'Rumah 5×12m (2 Lantai)',
    subtitle: 'Solusi lahan perkotaan sempit: Lt.1 ruang tamu & dapur, Lt.2 2 kamar + balkon',
    category: 'house',
    sizeLabel: '5×12m',
    floors: 2,
    bedrooms: 2,
    bathrooms: 2,
    tags: ['2 Lantai', 'Lahan Sempit', 'Balkon'],
  },
  {
    id: 'rumah_2lt_modern',
    name: 'Rumah 2 Lantai (3 KT)',
    subtitle: 'Rumah keluarga 2 lantai lengkap tangga, 3 KT, ruang santai atas & balkon',
    category: 'house',
    sizeLabel: '8×14m',
    floors: 2,
    bedrooms: 3,
    bathrooms: 2,
    tags: ['2 Lantai', '3 KT', 'Carport'],
  },
  {
    id: 'rumah_panjang_courtyard',
    name: 'Rumah 6×20m Taman Tengah',
    subtitle: 'Denah lahan memanjang dengan inner courtyard terbuka, 3 KT & 2 KM',
    category: 'house',
    sizeLabel: '6×20m',
    floors: 1,
    bedrooms: 3,
    bathrooms: 2,
    tags: ['3 KT', 'Taman Tengah', '6×20m'],
  },
  {
    id: 'house_garage',
    name: 'Rumah Tropis + Gazebo',
    subtitle: 'Rumah luas dengan carport SUV, tangga, gazebo kayu & kolam ikan',
    category: 'house',
    sizeLabel: '16×14m',
    floors: 1,
    bedrooms: 1,
    bathrooms: 1,
    tags: ['Carport', 'Gazebo', 'Kolam'],
  },
  {
    id: 'kos_4',
    name: 'Kos-Kosan 4 Kamar',
    subtitle: '4 kamar sejajar + koridor teras + parkiran motor & mobil',
    category: 'kos',
    sizeLabel: '14×16m',
    floors: 1,
    bedrooms: 4,
    bathrooms: 0,
    tags: ['4 Kamar', 'Koridor', 'Parkir'],
  },
  {
    id: 'kos_6_lorong',
    name: 'Kos 6 Kamar + KM Dalam',
    subtitle: '3 kiri & 3 kanan lorong tengah, tiap kamar ada KM dalam, dapur bersama & parkir',
    category: 'kos',
    sizeLabel: '12×16m',
    floors: 1,
    bedrooms: 6,
    bathrooms: 6,
    tags: ['6 Kamar', 'KM Dalam', 'Dapur Bersama'],
  },
  {
    id: 'kos_2lt_8kamar',
    name: 'Kos 2 Lantai (8 Kamar)',
    subtitle: '4 kamar Lt.1 + 4 kamar Lt.2, semua KM dalam, tangga, balkon & parkiran luas',
    category: 'kos',
    sizeLabel: '14×16m',
    floors: 2,
    bedrooms: 8,
    bathrooms: 8,
    tags: ['2 Lantai', '8 Kamar', 'KM Dalam'],
  },
  {
    id: 'kontrakan_3pintu',
    name: 'Kontrakan 3 Pintu',
    subtitle: '3 unit petakan sejajar: masing-masing ada R. Tamu, 1 KT, Dapur & KM',
    category: 'kos',
    sizeLabel: '12×12m',
    floors: 1,
    bedrooms: 3,
    bathrooms: 3,
    tags: ['3 Unit', 'Petakan', 'Lengkap'],
  },
  {
    id: 'studio_apt',
    name: 'Apartemen Studio 1BR',
    subtitle: 'Denah studio modern: area duduk, sudut kerja, kasur & KM',
    category: 'apartment',
    sizeLabel: '10×10m',
    floors: 1,
    bedrooms: 1,
    bathrooms: 1,
    tags: ['Studio', 'Modern', 'Kompak'],
  },
  {
    id: 'apt_2br',
    name: 'Apartemen 2 Kamar (2BR)',
    subtitle: '2 kamar tidur, ruang keluarga dengan pintu geser balkon, dapur & KM',
    category: 'apartment',
    sizeLabel: '12×10m',
    floors: 1,
    bedrooms: 2,
    bathrooms: 1,
    tags: ['2 KT', 'Balkon', 'Apartemen'],
  },
  {
    id: 'villa_pool',
    name: 'Villa + Kolam Renang',
    subtitle: '2 kamar tidur, ruang santai terbuka ke kolam renang, gazebo & atap Joglo',
    category: 'villa',
    sizeLabel: '16×16m',
    floors: 1,
    bedrooms: 2,
    bathrooms: 1,
    tags: ['Kolam Renang', 'Joglo', '2 KT'],
  },
  {
    id: 'ruko_2lt',
    name: 'Ruko 2 Lantai (Usaha)',
    subtitle: 'Lt.1 area toko/kafe + parkir depan, Lt.2 hunian 2 kamar tidur & balkon',
    category: 'villa',
    sizeLabel: '6×16m',
    floors: 2,
    bedrooms: 2,
    bathrooms: 2,
    tags: ['2 Lantai', 'Toko/Kafe', 'Hunian'],
  },
  {
    id: 'garden_park',
    name: 'Taman & Gazebo',
    subtitle: 'Taman santai dengan gazebo kayu, 2 kolam koi, jalan batu & pepohonan',
    category: 'villa',
    sizeLabel: '14×14m',
    floors: 1,
    bedrooms: 0,
    bathrooms: 0,
    tags: ['Gazebo', '2 Kolam', 'Taman'],
  },
];

// ============================================================================
// LOCAL LOT FLOOR BUILDER (Zero off-by-one guarantee for any landWidth × landDepth)
// ============================================================================

class FloorSketch {
  readonly ox: number;
  readonly oz: number;
  readonly tiles: Record<string, FloorTile> = {};
  readonly interiorWalls: Record<string, boolean> = {};
  readonly openings: Record<string, WallOpeningType> = {};
  readonly furniture: PlacedFurniture[] = [];
  readonly roomNames: Record<string, string> = {};
  private uidIdx = 0;

  constructor(
    private readonly prefix: string,
    ox: number,
    oz: number,
  ) {
    this.ox = ox;
    this.oz = oz;
  }

  room(
    lx: number,
    lz: number,
    w: number,
    d: number,
    zone: RoomZoneId,
    floorMat: FloorMaterialId,
    wallMat: WallMaterialId,
    label?: string,
  ): this {
    let firstKey: string | null = null;
    for (let x = lx; x < lx + w; x++) {
      for (let z = lz; z < lz + d; z++) {
        const gx = this.ox + x;
        const gz = this.oz + z;
        const key = `${gx},${gz}`;
        if (!firstKey || key < firstKey) firstKey = key;
        this.tiles[key] = {
          x: gx,
          z: gz,
          zone,
          floorMat,
          wallMat,
        };
      }
    }
    if (label && firstKey) {
      this.roomNames[firstKey] = label;
    }
    return this;
  }

  /** Vertical interior partition along local x = lx, spanning local z from lz to lz + len - 1 */
  vWall(lx: number, lz: number, len: number): this {
    for (let i = 0; i < len; i++) {
      this.interiorWalls[`v:${this.ox + lx}:${this.oz + lz + i}`] = true;
    }
    return this;
  }

  /** Horizontal interior partition along local z = lz, spanning local x from lx to lx + len - 1 */
  hWall(lx: number, lz: number, len: number): this {
    for (let i = 0; i < len; i++) {
      this.interiorWalls[`h:${this.ox + lx + i}:${this.oz + lz}`] = true;
    }
    return this;
  }

  openV(lx: number, lz: number, kind: WallOpeningType): this {
    this.openings[`v:${this.ox + lx}:${this.oz + lz}`] = kind;
    return this;
  }

  openH(lx: number, lz: number, kind: WallOpeningType): this {
    this.openings[`h:${this.ox + lx}:${this.oz + lz}`] = kind;
    return this;
  }

  item(
    defId: string,
    lx: number,
    lz: number,
    rotation: 0 | 1 | 2 | 3 = 0,
    color = '#D8CFC2',
    wy?: number,
  ): this {
    this.uidIdx += 1;
    this.furniture.push({
      uid: `${this.prefix}_${this.uidIdx}`,
      defId,
      gx: this.ox + lx,
      gz: this.oz + lz,
      rotation,
      color,
      ...(wy !== undefined ? { wy } : {}),
    });
    return this;
  }

  toLevelData(): FloorLevelData {
    return {
      tiles: this.tiles,
      interiorWalls: this.interiorWalls,
      openings: this.openings,
      wallStyles: {},
      customWalls: [],
      furniture: this.furniture,
      roomNames: this.roomNames,
    };
  }
}

function makeBlueprint(
  landWidth: number,
  landDepth: number,
  siteOverrides: Partial<SiteConfig>,
  exteriorWallMat: WallMaterialId,
  floor1: FloorSketch,
  floor2?: FloorSketch,
): RoomBlueprint {
  const gridSize = Math.max(landWidth, landDepth);
  const f1 = floor1.toLevelData();
  const otherFloors: Record<number, FloorLevelData> = {};
  if (floor2) {
    otherFloors[1] = floor2.toLevelData();
  }
  return {
    gridSize,
    site: {
      ...DEFAULT_SITE_CONFIG,
      landWidth,
      landDepth,
      ...siteOverrides,
    },
    tiles: f1.tiles,
    interiorWalls: f1.interiorWalls,
    openings: f1.openings,
    wallStyles: {},
    customWalls: [],
    furniture: f1.furniture,
    roomNames: f1.roomNames,
    exteriorWallMat,
    activeFloor: 0,
    floorCount: floor2 ? 2 : 1,
    otherFloors,
  };
}

function lotOrigin(landWidth: number, landDepth: number): { ox: number; oz: number } {
  const gridSize = Math.max(landWidth, landDepth);
  return {
    ox: Math.floor((gridSize - landWidth) / 2),
    oz: Math.floor((gridSize - landDepth) / 2),
  };
}

function stripFurnitureIfRequested(bp: RoomBlueprint, includeFurniture: boolean): RoomBlueprint {
  if (includeFurniture) return bp;
  const nextOther: NonNullable<RoomBlueprint['otherFloors']> = {};
  if (bp.otherFloors) {
    for (const [k, fl] of Object.entries(bp.otherFloors)) {
      if (fl) nextOther[Number(k)] = { ...fl, furniture: [] };
    }
  }
  return {
    ...bp,
    furniture: [],
    otherFloors: nextOther,
  };
}

export function createStarterTemplateBlueprint(
  templateId: StarterTemplateId,
  includeFurniture = true,
): RoomBlueprint {
  const bp = buildTemplateRaw(templateId);
  return stripFurnitureIfRequested(bp, includeFurniture);
}

function buildTemplateRaw(templateId: StarterTemplateId): RoomBlueprint {
  // --------------------------------------------------------------------------
  // 1. RUMAH TIPE 36 (6×12m — 2 KT, R. Tamu, Dapur, KM, Carport & Taman Belakang)
  // --------------------------------------------------------------------------
  if (templateId === 'rumah_tipe_36') {
    const { ox, oz } = lotOrigin(6, 12);
    const f1 = new FloorSketch('t36', ox, oz);
    // Back yard: z=0..1 (open grass)
    // House body: z=2..7 (6×6m = 36 m²)
    f1.room(0, 2, 3, 3, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Anak');
    f1.room(0, 5, 3, 3, 'bedroom', 'pale_ash', 'limewash_plaster', 'Kamar Utama');
    f1.room(3, 2, 3, 2, 'kitchen', 'warm_terrazzo', 'cream_wainscot', 'Dapur');
    f1.room(3, 4, 3, 1, 'bath', 'carrara_marble', 'limewash_plaster', 'Kamar Mandi');
    f1.room(3, 5, 3, 3, 'living', 'herringbone_oak', 'limewash_plaster', 'Ruang Tamu');
    f1.vWall(3, 2, 6)
      .hWall(0, 5, 3)
      .hWall(3, 4, 3)
      .hWall(3, 5, 3)
      // Openings
      .openH(4, 8, 'door')
      .openH(5, 8, 'curtain_window')
      .openH(1, 8, 'curtain_window')
      .openH(1, 2, 'window')
      .openH(4, 2, 'door')
      .openV(3, 3, 'door')
      .openV(3, 6, 'door')
      .openH(4, 4, 'door')
      .openV(6, 4, 'bath_vent')
      // Furniture
      .item('king_bed', 0, 5, 0, '#E5DFD5')
      .item('sliding_wardrobe', 1, 7, 2, '#9A7452')
      .item('ac_split', 1, 5, 0, '#F5F3EE')
      .item('king_bed', 0, 2, 0, '#D8CFC2')
      .item('architect_desk', 2, 3, 3, '#9E734E')
      .item('kitchen_l_set', 4, 2, 0, '#D6CCB9')
      .item('double_fridge', 3, 2, 0, '#C7CCD1')
      .item('toilet_modern', 5, 4, 3, '#F4F2EE')
      .item('compact_sink', 3, 4, 1, '#F4F2EE')
      .item('l_sofa', 3, 5, 1, '#5A6D63')
      .item('wall_tv', 4, 7, 2, '#2B2D30')
      .item('parking_bay', 0, 8, 0, '#43484F')
      .item('sedan_car', 0, 8, 0, '#D8CFC2')
      .item('terrace_canopy', 0, 8, 0, '#4A4E55')
      .item('garden_tree', 5, 10, 0, '#5B804B')
      .item('flower_bed', 4, 11, 0, '#D47B6A')
      .item('drying_rack', 1, 0, 0, '#B9C0C7');
    return makeBlueprint(
      6,
      12,
      {
        foundationStyle: 'concrete',
        foundationHeight: 0.28,
        wallHeight: 2.7,
        roofStyle: 'gable',
        roofColor: '#A8583B',
        roofPitch: 1.5,
      },
      'limewash_plaster',
      f1,
    );
  }

  // --------------------------------------------------------------------------
  // 2. RUMAH TIPE 45 (8×12m — 2 KT, R. Tamu & Makan, Dapur L, KM, Teras & Carport)
  // --------------------------------------------------------------------------
  if (templateId === 'rumah_tipe_45') {
    const { ox, oz } = lotOrigin(8, 12);
    const f1 = new FloorSketch('t45', ox, oz);
    // Built area: z=2..7 (8×6m = 48m² approx Tipe 45)
    f1.room(0, 2, 4, 3, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Anak');
    f1.room(0, 5, 4, 3, 'bedroom', 'pale_ash', 'limewash_plaster', 'Kamar Utama');
    f1.room(4, 2, 4, 2, 'kitchen', 'warm_terrazzo', 'cream_wainscot', 'Dapur & Makan');
    f1.room(4, 4, 2, 2, 'bath', 'carrara_marble', 'limewash_plaster', 'Kamar Mandi');
    f1.room(6, 4, 2, 2, 'living', 'herringbone_oak', 'limewash_plaster', 'Ruang Tamu');
    f1.room(4, 6, 4, 2, 'living', 'herringbone_oak', 'limewash_plaster');
    f1.vWall(4, 2, 6)
      .hWall(0, 5, 4)
      .hWall(4, 4, 2)
      .vWall(6, 4, 2)
      .hWall(4, 6, 2)
      // Openings
      .openH(5, 8, 'double_door')
      .openH(6, 8, 'curtain_window')
      .openH(1, 8, 'curtain_window')
      .openH(2, 8, 'curtain_window')
      .openH(1, 2, 'window')
      .openH(6, 2, 'glass_slider')
      .openV(4, 3, 'door')
      .openV(4, 6, 'door')
      .openV(6, 5, 'door')
      .openV(0, 4, 'window')
      // Furniture
      .item('king_bed', 0, 5, 0, '#E5DFD5')
      .item('sliding_wardrobe', 2, 7, 2, '#8F6A4A')
      .item('ac_split', 1, 5, 0, '#F5F3EE')
      .item('king_bed', 0, 2, 0, '#D8CFC2')
      .item('architect_desk', 2, 2, 0, '#9E734E')
      .item('kitchen_l_set', 4, 2, 0, '#DED6C8')
      .item('stove_hood', 6, 2, 0, '#3C4047')
      .item('double_fridge', 7, 2, 0, '#C7CCD1')
      .item('water_dispenser', 7, 3, 3, '#ECE9E2')
      .item('toilet_modern', 4, 4, 0, '#F4F2EE')
      .item('glass_shower', 5, 4, 0, '#DCE8EC')
      .item('compact_sink', 4, 5, 1, '#F4F2EE')
      .item('l_sofa', 4, 6, 2, '#C8B9A6')
      .item('marble_coffee_table', 5, 6, 0, '#E5DDD0')
      .item('wall_tv', 7, 5, 3, '#2B2D30')
      .item('terrace_pillar', 4, 8, 0, '#EFEAE1')
      .item('terrace_pillar', 7, 8, 0, '#EFEAE1')
      .item('parking_bay', 0, 8, 0, '#43484F')
      .item('carport_canopy', 0, 8, 0, '#3C4047')
      .item('city_suv', 0, 8, 0, '#4E6359')
      .item('scooter_bike', 3, 9, 0, '#C96D52')
      .item('garden_tree', 6, 10, 0, '#5B804B')
      .item('flower_bed', 5, 11, 0, '#D47B6A')
      .item('garden_lamp', 4, 10, 0, '#33363C')
      .item('park_bench', 1, 0, 0, '#9E6E47')
      .item('garden_tree', 6, 0, 0, '#5B804B');
    return makeBlueprint(
      8,
      12,
      {
        foundationStyle: 'concrete',
        foundationHeight: 0.3,
        wallHeight: 2.75,
        roofStyle: 'hip',
        roofColor: '#A8583B',
        roofPitch: 1.6,
      },
      'limewash_plaster',
      f1,
    );
  }

  // --------------------------------------------------------------------------
  // 3. RUMAH TIPE 60 (10×12m — 3 KT, 2 KM, R. Keluarga, Dapur & Carport)
  // --------------------------------------------------------------------------
  if (templateId === 'rumah_tipe_60') {
    const { ox, oz } = lotOrigin(10, 12);
    const f1 = new FloorSketch('t60', ox, oz);
    // Built: x=0..9, z=2..7 (60 m²)
    f1.room(0, 2, 4, 3, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Utama');
    f1.room(0, 5, 2, 3, 'bath', 'carrara_marble', 'limewash_plaster', 'KM Utama');
    f1.room(2, 5, 5, 3, 'living', 'herringbone_oak', 'limewash_plaster', 'Ruang Keluarga');
    f1.room(4, 2, 3, 3, 'kitchen', 'warm_terrazzo', 'cream_wainscot', 'Dapur & Makan');
    f1.room(7, 2, 3, 3, 'bedroom', 'pale_ash', 'limewash_plaster', 'Kamar Anak 1');
    f1.room(7, 5, 3, 3, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Anak 2');
    // Small shared bath inside kitchen back corner? Better: put KM Bersama at (4,2,2,2) or keep Dapur (4,2,3,3) & add KM Bersama at back (5,0,2,2)
    f1.room(4, 0, 3, 2, 'bath', 'carrara_marble', 'limewash_plaster', 'KM Bersama');
    f1.vWall(4, 2, 3)
      .hWall(0, 5, 4)
      .vWall(2, 5, 3)
      .vWall(7, 2, 6)
      .hWall(7, 5, 3)
      .hWall(4, 2, 3)
      // Openings
      .openH(4, 8, 'double_door')
      .openH(5, 8, 'curtain_window')
      .openH(8, 8, 'curtain_window')
      .openH(1, 2, 'curtain_window')
      .openH(8, 2, 'window')
      .openH(3, 5, 'door')
      .openV(2, 6, 'door')
      .openV(7, 3, 'door')
      .openV(7, 6, 'door')
      .openH(5, 2, 'door')
      .openH(5, 0, 'bath_vent')
      .openH(0, 8, 'bath_vent')
      // Furniture
      .item('king_bed', 0, 2, 0, '#E5DFD5')
      .item('sliding_wardrobe', 2, 2, 0, '#8F6A4A')
      .item('ac_split', 1, 2, 0, '#F5F3EE')
      .item('toilet_modern', 0, 5, 0, '#F4F2EE')
      .item('glass_shower', 0, 7, 0, '#DCE8EC')
      .item('marble_vanity', 1, 6, 3, '#ECE9E2')
      .item('l_sofa', 3, 5, 0, '#4D5E57')
      .item('marble_coffee_table', 4, 6, 0, '#E5DDD0')
      .item('wall_tv', 5, 5, 0, '#2B2D30')
      .item('kitchen_l_set', 4, 2, 0, '#DED6C8')
      .item('double_fridge', 6, 2, 0, '#C7CCD1')
      .item('round_bistro_table', 5, 4, 0, '#A87C52')
      .item('toilet_modern', 4, 0, 0, '#F4F2EE')
      .item('glass_shower', 6, 0, 0, '#DCE8EC')
      .item('compact_sink', 5, 0, 0, '#F4F2EE')
      .item('king_bed', 8, 2, 0, '#D8CFC2')
      .item('bunk_bed', 8, 6, 0, '#A97B52')
      .item('ac_split', 8, 5, 0, '#F5F3EE')
      .item('parking_bay', 0, 8, 0, '#43484F')
      .item('carport_canopy', 0, 8, 0, '#3C4047')
      .item('city_suv', 0, 8, 0, '#4E6359')
      .item('sliding_gate', 0, 11, 0, '#3C4047')
      .item('iron_fence', 4, 11, 0, '#3C4047')
      .item('iron_fence', 6, 11, 0, '#3C4047')
      .item('iron_fence', 8, 11, 0, '#3C4047')
      .item('garden_tree', 8, 9, 0, '#5B804B')
      .item('flower_bed', 5, 9, 0, '#D47B6A');
    return makeBlueprint(
      10,
      12,
      {
        foundationStyle: 'stone',
        foundationHeight: 0.3,
        wallHeight: 2.8,
        roofStyle: 'hip',
        roofColor: '#7A4634',
        roofPitch: 1.7,
      },
      'limewash_plaster',
      f1,
    );
  }

  // --------------------------------------------------------------------------
  // 4. RUMAH MINIMALIS LAHAN SEMPIT 5×12m (2 LANTAI — 2 KT, 2 KM, Balkon)
  // --------------------------------------------------------------------------
  if (templateId === 'rumah_sempit_2lt') {
    const { ox, oz } = lotOrigin(5, 12);
    const f1 = new FloorSketch('rs1', ox, oz);
    f1.room(0, 1, 3, 3, 'kitchen', 'warm_terrazzo', 'cream_wainscot', 'Dapur & Makan');
    f1.room(3, 1, 2, 3, 'bath', 'carrara_marble', 'limewash_plaster', 'KM Lt.1');
    f1.room(0, 4, 5, 4, 'living', 'herringbone_oak', 'limewash_plaster', 'Ruang Tamu');
    f1.vWall(3, 1, 3)
      .hWall(0, 4, 5)
      .openH(2, 8, 'door')
      .openH(3, 8, 'curtain_window')
      .openH(1, 4, 'archway')
      .openH(3, 4, 'door')
      .openH(4, 1, 'bath_vent')
      .openH(1, 1, 'window')
      // Furniture Lt.1
      .item('straight_stairs', 0, 4, 0, '#A97B52')
      .item('l_sofa', 2, 5, 2, '#D8CFC2')
      .item('wall_tv', 4, 5, 3, '#2B2D30')
      .item('kitchen_l_set', 0, 1, 0, '#DED6C8')
      .item('double_fridge', 2, 1, 0, '#C7CCD1')
      .item('toilet_modern', 4, 1, 0, '#F4F2EE')
      .item('glass_shower', 4, 2, 0, '#DCE8EC')
      .item('compact_sink', 3, 2, 1, '#F4F2EE')
      .item('parking_bay', 0, 8, 0, '#43484F')
      .item('sedan_car', 0, 8, 0, '#D8CFC2')
      .item('scooter_bike', 3, 9, 0, '#C96D52')
      .item('garden_lamp', 4, 10, 0, '#33363C');

    const f2 = new FloorSketch('rs2', ox, oz);
    f2.room(0, 1, 5, 3, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Belakang');
    f2.room(0, 4, 3, 2, 'living', 'herringbone_oak', 'limewash_plaster', 'Koridor Lt.2');
    f2.room(3, 4, 2, 2, 'bath', 'carrara_marble', 'limewash_plaster', 'KM Lt.2');
    f2.room(0, 6, 5, 3, 'bedroom', 'pale_ash', 'limewash_plaster', 'Kamar Utama Lt.2');
    f2.room(0, 9, 5, 1, 'terrace', 'deck_slats', 'raw_concrete', 'Balkon');
    f2.hWall(0, 4, 5)
      .vWall(3, 4, 2)
      .hWall(0, 6, 5)
      .hWall(0, 9, 5)
      .openH(1, 4, 'door')
      .openV(3, 5, 'door')
      .openH(1, 6, 'door')
      .openH(2, 9, 'glass_slider')
      .openH(3, 9, 'glass_slider')
      .openH(2, 1, 'curtain_window')
      .openV(5, 4, 'bath_vent')
      .openH(1, 10, 'archway')
      .openH(2, 10, 'archway')
      .openH(3, 10, 'archway')
      // Furniture Lt.2
      .item('king_bed', 1, 1, 0, '#D8CFC2')
      .item('ac_split', 3, 1, 0, '#F5F3EE')
      .item('toilet_modern', 4, 4, 0, '#F4F2EE')
      .item('compact_sink', 3, 4, 0, '#F4F2EE')
      .item('king_bed', 1, 6, 0, '#E5DFD5')
      .item('sliding_wardrobe', 3, 6, 0, '#8F6A4A')
      .item('ac_split', 1, 6, 0, '#F5F3EE')
      .item('balcony_railing', 0, 9, 0, '#3C4047')
      .item('balcony_railing', 3, 9, 0, '#3C4047');

    return makeBlueprint(
      5,
      12,
      {
        foundationStyle: 'concrete',
        foundationHeight: 0.28,
        wallHeight: 2.75,
        roofStyle: 'shed',
        roofColor: '#484D54',
        roofPitch: 1.3,
      },
      'limewash_plaster',
      f1,
      f2,
    );
  }

  // --------------------------------------------------------------------------
  // 5. RUMAH 2 LANTAI MODERN (8×14m — 3 KT, 2 KM, Tangga, Balkon & Carport)
  // --------------------------------------------------------------------------
  if (templateId === 'rumah_2lt_modern') {
    const { ox, oz } = lotOrigin(8, 14);
    const f1 = new FloorSketch('r2m1', ox, oz);
    // Built Lt.1: z=2..8 (8×7m = 56m²)
    f1.room(0, 2, 4, 3, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Tamu');
    f1.room(4, 2, 4, 3, 'kitchen', 'warm_terrazzo', 'cream_wainscot', 'Dapur & Makan');
    f1.room(0, 5, 2, 2, 'bath', 'carrara_marble', 'limewash_plaster', 'KM Lt.1');
    f1.room(2, 5, 6, 4, 'living', 'herringbone_oak', 'limewash_plaster', 'Ruang Keluarga');
    f1.room(0, 7, 2, 2, 'living', 'herringbone_oak', 'limewash_plaster');
    f1.vWall(4, 2, 3)
      .hWall(0, 5, 4)
      .vWall(2, 5, 2)
      .hWall(0, 7, 2)
      // Openings Lt.1
      .openH(4, 9, 'double_door')
      .openH(5, 9, 'curtain_window')
      .openH(6, 9, 'curtain_window')
      .openH(1, 2, 'curtain_window')
      .openH(5, 2, 'glass_slider')
      .openH(6, 2, 'glass_slider')
      .openH(2, 5, 'door')
      .openV(2, 6, 'door')
      .openV(0, 5, 'bath_vent')
      // Furniture Lt.1
      .item('king_bed', 0, 2, 0, '#D8CFC2')
      .item('ac_split', 2, 2, 0, '#F5F3EE')
      .item('kitchen_l_set', 6, 2, 0, '#DED6C8')
      .item('stove_hood', 4, 2, 0, '#3C4047')
      .item('double_fridge', 5, 2, 0, '#C7CCD1')
      .item('oak_dining_table', 5, 4, 0, '#9E734E')
      .item('toilet_modern', 0, 5, 0, '#F4F2EE')
      .item('glass_shower', 0, 6, 0, '#DCE8EC')
      .item('compact_sink', 1, 5, 0, '#F4F2EE')
      .item('l_stairs', 0, 7, 0, '#A97B52')
      .item('l_sofa', 3, 6, 0, '#5A6D63')
      .item('marble_coffee_table', 4, 7, 0, '#E5DDD0')
      .item('wall_tv', 7, 6, 3, '#2B2D30')
      .item('parking_bay', 0, 9, 0, '#43484F')
      .item('carport_canopy', 0, 9, 0, '#3C4047')
      .item('city_suv', 0, 9, 0, '#4E6359')
      .item('scooter_bike', 3, 10, 0, '#C96D52')
      .item('sliding_gate', 0, 13, 0, '#3C4047')
      .item('garden_tree', 6, 11, 0, '#5B804B')
      .item('flower_bed', 5, 12, 0, '#D47B6A')
      .item('garden_pond', 1, 0, 0, '#5D9EA8')
      .item('park_bench', 5, 0, 0, '#9E6E47');

    const f2 = new FloorSketch('r2m2', ox, oz);
    f2.room(0, 2, 4, 4, 'bedroom', 'pale_ash', 'limewash_plaster', 'Kamar Utama');
    f2.room(4, 2, 4, 3, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Anak');
    f2.room(4, 5, 2, 2, 'bath', 'carrara_marble', 'limewash_plaster', 'KM Lt.2');
    f2.room(0, 6, 4, 3, 'living', 'herringbone_oak', 'limewash_plaster', 'Ruang Santai');
    f2.room(6, 5, 2, 4, 'study', 'herringbone_oak', 'midnight_paneling', 'Ruang Kerja');
    f2.room(4, 7, 2, 2, 'living', 'herringbone_oak', 'limewash_plaster');
    f2.room(0, 9, 8, 2, 'terrace', 'deck_slats', 'raw_concrete', 'Balkon Depan');
    f2.vWall(4, 2, 5)
      .hWall(0, 6, 4)
      .hWall(4, 5, 4)
      .vWall(6, 5, 4)
      .hWall(4, 7, 2)
      .hWall(0, 9, 8)
      // Openings Lt.2
      .openH(2, 6, 'door')
      .openH(5, 5, 'door')
      .openH(5, 7, 'door')
      .openV(6, 7, 'archway')
      .openH(2, 9, 'glass_slider')
      .openH(3, 9, 'glass_slider')
      .openH(1, 2, 'curtain_window')
      .openH(5, 2, 'curtain_window')
      .openH(1, 11, 'archway')
      .openH(2, 11, 'archway')
      .openH(5, 11, 'archway')
      .openH(6, 11, 'archway')
      // Furniture Lt.2
      .item('king_bed', 0, 2, 0, '#E5DFD5')
      .item('sliding_wardrobe', 2, 2, 0, '#8F6A4A')
      .item('ac_split', 1, 2, 0, '#F5F3EE')
      .item('king_bed', 5, 2, 0, '#D8CFC2')
      .item('ac_split', 6, 2, 0, '#F5F3EE')
      .item('toilet_modern', 4, 5, 0, '#F4F2EE')
      .item('glass_shower', 5, 5, 0, '#DCE8EC')
      .item('l_sofa', 0, 7, 1, '#C8B9A6')
      .item('cozy_pc_setup', 6, 6, 3, '#8F6544')
      .item('balcony_railing', 0, 10, 0, '#3C4047')
      .item('balcony_railing', 3, 10, 0, '#3C4047')
      .item('balcony_railing', 6, 10, 0, '#3C4047');

    return makeBlueprint(
      8,
      14,
      {
        foundationStyle: 'concrete',
        foundationHeight: 0.3,
        wallHeight: 2.8,
        roofStyle: 'gable',
        roofColor: '#565C63',
        roofPitch: 1.6,
      },
      'limewash_plaster',
      f1,
      f2,
    );
  }

  // --------------------------------------------------------------------------
  // 6. RUMAH LAHAN MEMANJANG 6×20m (3 KT + INNER COURTYARD TAMAN TENGAH)
  // --------------------------------------------------------------------------
  if (templateId === 'rumah_panjang_courtyard') {
    const { ox, oz } = lotOrigin(6, 20);
    const f1 = new FloorSketch('rpc', ox, oz);
    // Back wing (z=1..6): Master Bedroom + Back Kitchen + Bath
    f1.room(0, 1, 4, 4, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Utama');
    f1.room(4, 1, 2, 3, 'bath', 'carrara_marble', 'limewash_plaster', 'KM Utama');
    f1.room(4, 4, 2, 3, 'kitchen', 'warm_terrazzo', 'cream_wainscot', 'Dapur');
    f1.room(0, 5, 4, 2, 'kitchen', 'warm_terrazzo', 'cream_wainscot');
    // Middle corridor on left (x=0..1, z=7..10) + Open Inner Courtyard Garden on right (x=2..5, z=7..10 — no tiles!)
    f1.room(0, 7, 2, 4, 'terrace', 'deck_slats', 'limewash_plaster', 'Selasar Taman');
    // Front wing (z=11..15): 2 Kids Bedrooms + Shared Bath + Living Room
    f1.room(0, 11, 3, 3, 'bedroom', 'pale_ash', 'limewash_plaster', 'Kamar Anak 1');
    f1.room(3, 11, 3, 3, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Anak 2');
    f1.room(0, 14, 2, 2, 'bath', 'carrara_marble', 'limewash_plaster', 'KM Depan');
    f1.room(2, 14, 4, 2, 'living', 'herringbone_oak', 'limewash_plaster', 'Ruang Tamu');
    f1.vWall(4, 1, 4)
      .hWall(0, 5, 4)
      .hWall(4, 4, 2)
      .hWall(0, 7, 2)
      .hWall(0, 11, 2)
      .vWall(3, 11, 3)
      .hWall(0, 14, 6)
      .vWall(2, 14, 2)
      // Openings
      .openH(3, 16, 'double_door')
      .openH(4, 16, 'curtain_window')
      .openH(1, 14, 'door')
      .openV(2, 15, 'door')
      .openH(4, 14, 'door')
      .openH(1, 11, 'door')
      .openH(1, 7, 'glass_slider')
      .openV(2, 8, 'glass_slider')
      .openV(2, 9, 'glass_slider')
      .openH(2, 5, 'door')
      .openV(4, 2, 'door')
      .openH(5, 1, 'bath_vent')
      .openH(0, 16, 'bath_vent')
      .openH(1, 1, 'curtain_window')
      // Furniture
      .item('king_bed', 0, 1, 0, '#E5DFD5')
      .item('sliding_wardrobe', 2, 1, 0, '#8F6A4A')
      .item('toilet_modern', 4, 1, 0, '#F4F2EE')
      .item('glass_shower', 5, 2, 0, '#DCE8EC')
      .item('kitchen_l_set', 4, 5, 0, '#DED6C8')
      .item('double_fridge', 2, 5, 0, '#C7CCD1')
      .item('oak_dining_table', 0, 5, 0, '#9E734E')
      // Inner Courtyard Garden (open lot at x=2..5, z=7..10)
      .item('garden_pond', 3, 7, 0, '#5D9EA8')
      .item('garden_tree', 5, 9, 0, '#5B804B')
      .item('stepping_stones', 2, 9, 0, '#B5AEA2')
      .item('garden_lamp', 2, 7, 0, '#33363C')
      // Front rooms
      .item('king_bed', 0, 11, 0, '#D8CFC2')
      .item('bunk_bed', 4, 11, 0, '#A97B52')
      .item('toilet_modern', 0, 14, 0, '#F4F2EE')
      .item('compact_sink', 1, 14, 0, '#F4F2EE')
      .item('l_sofa', 3, 14, 0, '#5A6D63')
      // Front Carport (z=16..19)
      .item('parking_bay', 0, 15, 0, '#43484F')
      .item('sedan_car', 0, 16, 0, '#D8CFC2')
      .item('terrace_canopy', 0, 16, 0, '#3C4047')
      .item('scooter_bike', 3, 17, 0, '#C96D52')
      .item('garden_tree', 5, 18, 0, '#5B804B');

    return makeBlueprint(
      6,
      20,
      {
        foundationStyle: 'concrete',
        foundationHeight: 0.28,
        wallHeight: 2.8,
        roofStyle: 'gable',
        roofColor: '#A8583B',
        roofPitch: 1.5,
      },
      'limewash_plaster',
      f1,
    );
  }

  // --------------------------------------------------------------------------
  // 7. RUMAH TROPIS + CARPORT & GAZEBO (16×14m — Existing upgraded with roomNames)
  // --------------------------------------------------------------------------
  if (templateId === 'house_garage') {
    const { ox, oz } = lotOrigin(16, 14);
    const f1 = new FloorSketch('hg', ox, oz);
    f1.room(2, 1, 6, 6, 'living', 'herringbone_oak', 'limewash_plaster', 'Ruang Keluarga');
    f1.room(8, 1, 4, 4, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Utama');
    f1.room(8, 5, 4, 2, 'kitchen', 'warm_terrazzo', 'cream_wainscot', 'Dapur');
    f1.vWall(8, 1, 6)
      .hWall(8, 5, 4)
      .openH(4, 7, 'double_door')
      .openH(5, 7, 'curtain_window')
      .openH(6, 7, 'curtain_window')
      .openH(3, 1, 'window')
      .openH(9, 1, 'curtain_window')
      .openV(8, 3, 'door')
      .openV(8, 5, 'archway')
      .openH(9, 7, 'glass_slider')
      .item('l_sofa', 3, 4, 2, '#4D5E57')
      .item('marble_coffee_table', 4, 2, 0, '#E5DDD0')
      .item('straight_stairs', 2, 1, 0, '#A97B52')
      .item('area_rug', 3, 2, 0, '#D6CBB9')
      .item('king_bed', 9, 1, 0, '#E5DFD5')
      .item('kitchen_l_set', 10, 5, 0, '#DED6C8')
      .item('double_fridge', 8, 5, 0, '#C7CCD1')
      .item('parking_bay', 12, 7, 0, '#43484F')
      .item('carport_canopy', 12, 7, 0, '#3C4047')
      .item('city_suv', 12, 7, 0, '#4E6359')
      .item('scooter_bike', 12, 3, 0, '#C96D52')
      .item('gazebo_wood', 2, 9, 0, '#96653E')
      .item('garden_pond', 6, 9, 0, '#5D9EA8')
      .item('stepping_stones', 4, 7, 0, '#B5AEA2')
      .item('park_bench', 9, 9, 0, '#9E6E47')
      .item('garden_tree', 9, 11, 0, '#5B804B')
      .item('pine_tree', 1, 8, 0, '#436946')
      .item('garden_lamp', 5, 8, 0, '#33363C')
      .item('flower_bed', 6, 12, 0, '#D47B6A');
    return makeBlueprint(
      16,
      14,
      {
        foundationStyle: 'stone',
        foundationHeight: 0.3,
        wallHeight: 2.75,
        roofStyle: 'hip',
        roofColor: '#A8583B',
        roofPitch: 1.7,
      },
      'limewash_plaster',
      f1,
    );
  }

  // --------------------------------------------------------------------------
  // 8. KOS-KOSAN 4 KAMAR (14×16m — 4 Kamar + Koridor + Parkir Motor & Mobil)
  // --------------------------------------------------------------------------
  if (templateId === 'kos_4') {
    const { ox, oz } = lotOrigin(14, 16);
    const f1 = new FloorSketch('k4', ox, oz);
    for (let i = 0; i < 4; i++) {
      const rx = 1 + i * 3;
      f1.room(
        rx,
        2,
        3,
        4,
        'bedroom',
        'pale_ash',
        i % 2 === 0 ? 'limewash_plaster' : 'sage_matte',
        `Kamar Kos ${i + 1}`,
      );
      if (i > 0) f1.vWall(rx, 2, 4);
      f1.openH(rx, 6, 'door')
        .openH(rx + 1, 6, 'window')
        .openH(rx + 1, 2, 'curtain_window')
        .item('king_bed', rx, 2, 0, i % 2 === 0 ? '#E5DFD5' : '#D8CFC2')
        .item('architect_desk', rx + 1, 4, 2, '#9E734E')
        .item('ac_split', rx + 1, 2, 0, '#F5F3EE');
    }
    f1.room(1, 6, 12, 2, 'terrace', 'warm_terrazzo', 'cream_wainscot', 'Koridor Teras')
      .hWall(1, 6, 12)
      .openH(2, 8, 'archway')
      .openH(5, 8, 'archway')
      .openH(8, 8, 'archway')
      .openH(11, 8, 'archway')
      .item('parking_bay', 1, 10, 0, '#43484F')
      .item('carport_canopy', 1, 10, 0, '#3C4047')
      .item('sedan_car', 1, 10, 0, '#D8CFC2')
      .item('bike_parking', 5, 11, 0, '#484D54')
      .item('scooter_bike', 5, 11, 0, '#C96D52')
      .item('scooter_bike', 6, 11, 0, '#5E7C6B')
      .item('scooter_bike', 7, 11, 0, '#EFE8DC')
      .item('park_bench', 10, 10, 0, '#9E6E47')
      .item('garden_tree', 11, 12, 0, '#5B804B')
      .item('garden_lamp', 9, 10, 0, '#33363C')
      .item('flower_bed', 9, 13, 0, '#D47B6A');
    return makeBlueprint(
      14,
      16,
      {
        foundationStyle: 'concrete',
        foundationHeight: 0.3,
        wallHeight: 2.7,
        roofStyle: 'gable',
        roofColor: '#A8583B',
        roofPitch: 1.6,
      },
      'cream_wainscot',
      f1,
    );
  }

  // --------------------------------------------------------------------------
  // 9. KOS-KOSAN 6 KAMAR + KM DALAM + LORONG TENGAH + DAPUR BERSAMA (12×16m)
  // --------------------------------------------------------------------------
  if (templateId === 'kos_6_lorong') {
    const { ox, oz } = lotOrigin(12, 16);
    const f1 = new FloorSketch('k6', ox, oz);
    // Shared kitchen at back center (x=4..7, z=0..2)
    f1.room(4, 0, 4, 2, 'kitchen', 'warm_terrazzo', 'cream_wainscot', 'Dapur Bersama');
    // Central corridor (x=5..6, z=2..10)
    f1.room(5, 2, 2, 9, 'terrace', 'warm_terrazzo', 'limewash_plaster', 'Lorong Tengah');
    // Left 3 rooms (x=0..4, each 3m tall: z=2..4, z=5..7, z=8..10) -> bedroom x=2..4 (3×3), ensuite bath x=0..1 (2×3)
    for (let i = 0; i < 3; i++) {
      const rz = 2 + i * 3;
      f1.room(0, rz, 2, 3, 'bath', 'carrara_marble', 'limewash_plaster', `KM ${i + 1}`);
      f1.room(2, rz, 3, 3, 'bedroom', 'pale_ash', i % 2 === 0 ? 'sage_matte' : 'limewash_plaster', `Kamar ${i + 1}`);
      f1.vWall(2, rz, 3)
        .vWall(5, rz, 3)
        .openV(2, rz + 1, 'door')
        .openV(5, rz + 1, 'door')
        .openV(0, rz + 1, 'bath_vent')
        .item('toilet_modern', 0, rz, 0, '#F4F2EE')
        .item('glass_shower', 0, rz + 2, 0, '#DCE8EC')
        .item('king_bed', 2, rz, 0, '#E5DFD5')
        .item('architect_desk', 3, rz + 2, 2, '#9E734E')
        .item('ac_split', 3, rz, 0, '#F5F3EE');
      if (i > 0) f1.hWall(0, rz, 5);
    }
    // Right 3 rooms (x=7..11): bedroom x=7..9 (3×3), ensuite bath x=10..11 (2×3)
    for (let i = 0; i < 3; i++) {
      const rz = 2 + i * 3;
      f1.room(7, rz, 3, 3, 'bedroom', 'pale_ash', i % 2 === 0 ? 'limewash_plaster' : 'sage_matte', `Kamar ${i + 4}`);
      f1.room(10, rz, 2, 3, 'bath', 'carrara_marble', 'limewash_plaster', `KM ${i + 4}`);
      f1.vWall(7, rz, 3)
        .vWall(10, rz, 3)
        .openV(7, rz + 1, 'door')
        .openV(10, rz + 1, 'door')
        .openV(12, rz + 1, 'bath_vent')
        .item('king_bed', 8, rz, 0, '#D8CFC2')
        .item('architect_desk', 7, rz + 2, 2, '#9E734E')
        .item('ac_split', 8, rz, 0, '#F5F3EE')
        .item('toilet_modern', 11, rz, 0, '#F4F2EE')
        .item('glass_shower', 11, rz + 2, 0, '#DCE8EC');
      if (i > 0) f1.hWall(7, rz, 5);
    }
    // Corridor connections
    f1.hWall(5, 2, 2)
      .openH(5, 2, 'archway')
      .openH(6, 2, 'archway')
      .openH(5, 11, 'double_door')
      // Shared kitchen furniture
      .item('kitchen_l_set', 4, 0, 0, '#DED6C8')
      .item('double_fridge', 7, 0, 0, '#C7CCD1')
      .item('water_dispenser', 6, 0, 0, '#ECE9E2')
      // Front motorbike parking lot (z=12..15)
      .item('bike_parking', 1, 13, 0, '#484D54')
      .item('scooter_bike', 1, 13, 0, '#C96D52')
      .item('scooter_bike', 2, 13, 0, '#5E7C6B')
      .item('scooter_bike', 3, 13, 0, '#EFE8DC')
      .item('bike_parking', 7, 13, 0, '#484D54')
      .item('scooter_bike', 7, 13, 0, '#3C4047')
      .item('scooter_bike', 8, 13, 0, '#D47B6A')
      .item('terrace_canopy', 1, 13, 0, '#3C4047')
      .item('terrace_canopy', 7, 13, 0, '#3C4047')
      .item('sliding_gate', 4, 15, 0, '#3C4047')
      .item('garden_lamp', 5, 12, 0, '#33363C');

    return makeBlueprint(
      12,
      16,
      {
        foundationStyle: 'concrete',
        foundationHeight: 0.3,
        wallHeight: 2.75,
        roofStyle: 'gable',
        roofColor: '#A8583B',
        roofPitch: 1.7,
      },
      'limewash_plaster',
      f1,
    );
  }

  // --------------------------------------------------------------------------
  // 10. KOS-KOSAN 2 LANTAI (8 KAMAR EKSKLUSIF + KM DALAM — 14×16m)
  // --------------------------------------------------------------------------
  if (templateId === 'kos_2lt_8kamar') {
    const { ox, oz } = lotOrigin(14, 16);
    const buildKosFloor = (prefix: string, floorNum: 1 | 2): FloorSketch => {
      const f = new FloorSketch(prefix, ox, oz);
      for (let i = 0; i < 4; i++) {
        const rx = 1 + i * 3;
        const roomNo = (floorNum - 1) * 4 + i + 1;
        // Back ensuite bathroom (3×2m at z=1..2)
        f.room(rx, 1, 3, 2, 'bath', 'carrara_marble', 'limewash_plaster', `KM ${roomNo}`);
        // Bedroom (3×4m at z=3..6)
        f.room(
          rx,
          3,
          3,
          4,
          'bedroom',
          'pale_ash',
          i % 2 === 0 ? 'limewash_plaster' : 'sage_matte',
          `Kamar ${roomNo}`,
        );
        if (i > 0) f.vWall(rx, 1, 6);
        f.hWall(rx, 3, 3)
          .openH(rx + 1, 3, 'door')
          .openH(rx + 1, 1, 'bath_vent')
          .openH(rx, 7, 'door')
          .openH(rx + 1, 7, 'curtain_window')
          .item('toilet_modern', rx, 1, 0, '#F4F2EE')
          .item('glass_shower', rx + 2, 1, 0, '#DCE8EC')
          .item('compact_sink', rx + 1, 1, 0, '#F4F2EE')
          .item('king_bed', rx, 3, 0, i % 2 === 0 ? '#E5DFD5' : '#D8CFC2')
          .item('architect_desk', rx + 1, 5, 2, '#9E734E')
          .item('ac_split', rx + 1, 3, 0, '#F5F3EE');
      }
      // Front corridor (x=1..12, z=7..8)
      f.room(
        1,
        7,
        12,
        2,
        'terrace',
        floorNum === 1 ? 'warm_terrazzo' : 'deck_slats',
        'cream_wainscot',
        floorNum === 1 ? 'Teras Lt.1' : 'Balkon Lt.2',
      )
        .hWall(1, 7, 12)
        .openH(2, 9, 'archway')
        .openH(5, 9, 'archway')
        .openH(8, 9, 'archway')
        .openH(11, 9, 'archway');

      if (floorNum === 1) {
        f.item('straight_stairs', 12, 7, 1, '#A97B52')
          .item('parking_bay', 1, 10, 0, '#43484F')
          .item('carport_canopy', 1, 10, 0, '#3C4047')
          .item('sedan_car', 1, 10, 0, '#D8CFC2')
          .item('bike_parking', 5, 11, 0, '#484D54')
          .item('scooter_bike', 5, 11, 0, '#C96D52')
          .item('scooter_bike', 6, 11, 0, '#5E7C6B')
          .item('scooter_bike', 7, 11, 0, '#EFE8DC')
          .item('bike_parking', 9, 11, 0, '#484D54')
          .item('scooter_bike', 9, 11, 0, '#3C4047')
          .item('scooter_bike', 10, 11, 0, '#D47B6A')
          .item('sliding_gate', 5, 15, 0, '#3C4047')
          .item('garden_tree', 12, 13, 0, '#5B804B');
      } else {
        f.item('balcony_railing', 1, 8, 0, '#3C4047')
          .item('balcony_railing', 4, 8, 0, '#3C4047')
          .item('balcony_railing', 7, 8, 0, '#3C4047')
          .item('balcony_railing', 10, 8, 0, '#3C4047');
      }
      return f;
    };

    return makeBlueprint(
      14,
      16,
      {
        foundationStyle: 'concrete',
        foundationHeight: 0.3,
        wallHeight: 2.75,
        roofStyle: 'hip',
        roofColor: '#A8583B',
        roofPitch: 1.8,
      },
      'cream_wainscot',
      buildKosFloor('k8f1', 1),
      buildKosFloor('k8f2', 2),
    );
  }

  // --------------------------------------------------------------------------
  // 11. KONTRAKAN 3 PINTU / PETAKAN (12×12m — 3 Unit Lengkap)
  // --------------------------------------------------------------------------
  if (templateId === 'kontrakan_3pintu') {
    const { ox, oz } = lotOrigin(12, 12);
    const f1 = new FloorSketch('kp3', ox, oz);
    // 3 units × 4m wide each (x=0..3, 4..7, 8..11), built z=1..8
    for (let i = 0; i < 3; i++) {
      const ux = i * 4;
      // Back row z=1..2: Kitchen (2×2) + Bathroom (2×2)
      f1.room(ux, 1, 2, 2, 'kitchen', 'warm_terrazzo', 'cream_wainscot', `Dapur ${i + 1}`);
      f1.room(ux + 2, 1, 2, 2, 'bath', 'carrara_marble', 'limewash_plaster', `KM ${i + 1}`);
      // Middle row z=3..5: Bedroom (4×3)
      f1.room(
        ux,
        3,
        4,
        3,
        'bedroom',
        'pale_ash',
        i % 2 === 0 ? 'sage_matte' : 'limewash_plaster',
        `Kamar ${i + 1}`,
      );
      // Front row z=6..8: Living Room (4×3)
      f1.room(ux, 6, 4, 3, 'living', 'herringbone_oak', 'limewash_plaster', `R. Tamu ${i + 1}`);
      if (i > 0) f1.vWall(ux, 1, 8);
      f1.vWall(ux + 2, 1, 2)
        .hWall(ux, 3, 4)
        .hWall(ux, 6, 4)
        .openH(ux + 1, 9, 'door')
        .openH(ux + 2, 9, 'curtain_window')
        .openH(ux + 1, 6, 'door')
        .openH(ux + 1, 3, 'door')
        .openV(ux + 2, 2, 'door')
        .openH(ux + 3, 1, 'bath_vent')
        .openH(ux, 1, 'window')
        // Furniture per unit
        .item('stove_hood', ux, 1, 0, '#3C4047')
        .item('double_fridge', ux + 1, 1, 0, '#C7CCD1')
        .item('toilet_modern', ux + 3, 1, 0, '#F4F2EE')
        .item('compact_sink', ux + 2, 1, 0, '#F4F2EE')
        .item('king_bed', ux, 3, 0, '#E5DFD5')
        .item('sliding_wardrobe', ux + 2, 3, 0, '#8F6A4A')
        .item('l_sofa', ux, 6, 0, i === 1 ? '#5A6D63' : '#C8B9A6')
        .item('scooter_bike', ux + 1, 10, 0, i === 0 ? '#C96D52' : i === 1 ? '#5E7C6B' : '#EFE8DC');
    }
    f1.item('garden_tree', 0, 10, 0, '#5B804B')
      .item('garden_lamp', 4, 10, 0, '#33363C')
      .item('garden_lamp', 8, 10, 0, '#33363C');
    return makeBlueprint(
      12,
      12,
      {
        foundationStyle: 'concrete',
        foundationHeight: 0.28,
        wallHeight: 2.7,
        roofStyle: 'gable',
        roofColor: '#A8583B',
        roofPitch: 1.5,
      },
      'cream_wainscot',
      f1,
    );
  }

  // --------------------------------------------------------------------------
  // 12. APARTEMEN STUDIO 1BR (10×10m)
  // --------------------------------------------------------------------------
  if (templateId === 'studio_apt') {
    const { ox, oz } = lotOrigin(10, 10);
    const f1 = new FloorSketch('apt1', ox, oz);
    f1.room(1, 2, 5, 6, 'living', 'herringbone_oak', 'limewash_plaster', 'Ruang Studio');
    f1.room(6, 2, 3, 4, 'bedroom', 'pale_ash', 'sage_matte', 'Area Tidur');
    f1.room(6, 6, 3, 2, 'bath', 'carrara_marble', 'limewash_plaster', 'Kamar Mandi');
    f1.vWall(6, 2, 6)
      .hWall(6, 6, 3)
      .openH(2, 2, 'curtain_window')
      .openH(3, 2, 'curtain_window')
      .openH(7, 2, 'window')
      .openH(3, 8, 'door')
      .openV(6, 4, 'wood_slider')
      .openV(6, 7, 'door')
      .item('l_sofa', 1, 5, 2, '#D8CFC2')
      .item('marble_coffee_table', 2, 3, 0, '#E5DDD0')
      .item('stove_hood', 4, 2, 0, '#3E464D')
      .item('double_fridge', 5, 2, 0, '#D8D3C8')
      .item('king_bed', 7, 2, 0, '#E5DFD5')
      .item('ac_split', 7, 2, 0, '#F5F3EE')
      .item('architect_desk', 1, 2, 0, '#8F6544')
      .item('soaking_tub', 7, 6, 0, '#F2EFE9')
      .item('toilet_modern', 6, 6, 0, '#F4F2EE')
      .item('fiddle_tree', 5, 7, 0, '#B87654')
      .item('arc_lamp', 1, 7, 1, '#D1A75A');
    return makeBlueprint(
      10,
      10,
      {
        foundationStyle: 'concrete',
        foundationHeight: 0.24,
        wallHeight: 2.65,
        roofStyle: 'flat',
        roofColor: '#565C63',
        roofPitch: 1.0,
      },
      'limewash_plaster',
      f1,
    );
  }

  // --------------------------------------------------------------------------
  // 13. APARTEMEN 2 KAMAR (2BR — 12×10m)
  // --------------------------------------------------------------------------
  if (templateId === 'apt_2br') {
    const { ox, oz } = lotOrigin(12, 10);
    const f1 = new FloorSketch('apt2', ox, oz);
    f1.room(1, 1, 4, 4, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Utama');
    f1.room(1, 5, 4, 3, 'bedroom', 'pale_ash', 'limewash_plaster', 'Kamar Anak');
    f1.room(5, 1, 4, 5, 'living', 'herringbone_oak', 'limewash_plaster', 'Ruang Keluarga');
    f1.room(5, 6, 4, 2, 'kitchen', 'warm_terrazzo', 'cream_wainscot', 'Dapur & Makan');
    f1.room(9, 1, 2, 5, 'terrace', 'deck_slats', 'raw_concrete', 'Balkon');
    f1.room(9, 6, 2, 2, 'bath', 'carrara_marble', 'limewash_plaster', 'Kamar Mandi');
    f1.vWall(5, 1, 7)
      .hWall(1, 5, 4)
      .vWall(9, 1, 7)
      .hWall(9, 6, 2)
      .openH(6, 8, 'door')
      .openV(5, 3, 'door')
      .openV(5, 6, 'door')
      .openV(9, 2, 'glass_slider')
      .openV(9, 3, 'glass_slider')
      .openV(9, 7, 'door')
      .openH(2, 1, 'curtain_window')
      .openH(2, 8, 'curtain_window')
      .openV(11, 2, 'archway')
      .openV(11, 3, 'archway')
      .openV(11, 4, 'archway')
      .item('king_bed', 1, 1, 0, '#E5DFD5')
      .item('sliding_wardrobe', 3, 1, 0, '#8F6A4A')
      .item('ac_split', 2, 1, 0, '#F5F3EE')
      .item('king_bed', 1, 5, 0, '#D8CFC2')
      .item('architect_desk', 3, 6, 2, '#9E734E')
      .item('l_sofa', 6, 2, 0, '#5A6D63')
      .item('marble_coffee_table', 6, 4, 0, '#E5DDD0')
      .item('wall_tv', 5, 2, 1, '#2B2D30')
      .item('kitchen_l_set', 7, 6, 0, '#DED6C8')
      .item('double_fridge', 5, 6, 0, '#C7CCD1')
      .item('toilet_modern', 10, 6, 0, '#F4F2EE')
      .item('glass_shower', 10, 7, 0, '#DCE8EC')
      .item('washing_machine', 9, 6, 0, '#F0EDE7')
      .item('balcony_railing', 10, 1, 1, '#3C4047')
      .item('balcony_railing', 10, 3, 1, '#3C4047');
    return makeBlueprint(
      12,
      10,
      {
        foundationStyle: 'concrete',
        foundationHeight: 0.24,
        wallHeight: 2.7,
        roofStyle: 'flat',
        roofColor: '#565C63',
        roofPitch: 1.0,
      },
      'limewash_plaster',
      f1,
    );
  }

  // --------------------------------------------------------------------------
  // 14. VILLA TROPIS + KOLAM RENANG (16×16m — 2 KT, Joglo, Kolam & Gazebo)
  // --------------------------------------------------------------------------
  if (templateId === 'villa_pool') {
    const { ox, oz } = lotOrigin(16, 16);
    const f1 = new FloorSketch('vp', ox, oz);
    // L-shaped tropical villa wrapping around a private swimming pool!
    f1.room(1, 1, 5, 5, 'bedroom', 'herringbone_oak', 'walnut_slats', 'Suite Utama');
    f1.room(6, 1, 6, 5, 'living', 'warm_terrazzo', 'limewash_plaster', 'Paviliun Santai');
    f1.room(12, 1, 3, 3, 'bath', 'carrara_marble', 'limewash_plaster', 'Spa & KM');
    f1.room(12, 4, 3, 2, 'kitchen', 'warm_terrazzo', 'cream_wainscot', 'Pantry');
    f1.room(1, 6, 4, 4, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Tamu');
    f1.vWall(6, 1, 5)
      .vWall(12, 1, 5)
      .hWall(12, 4, 3)
      .hWall(1, 6, 4)
      // Wide glass sliders opening toward the swimming pool
      .openH(7, 6, 'glass_slider')
      .openH(8, 6, 'glass_slider')
      .openH(9, 6, 'glass_slider')
      .openH(10, 6, 'glass_slider')
      .openV(5, 7, 'glass_slider')
      .openV(5, 8, 'glass_slider')
      .openV(6, 3, 'wood_slider')
      .openV(12, 2, 'door')
      .openV(12, 4, 'archway')
      .openH(3, 1, 'curtain_window')
      .openH(13, 1, 'bath_vent')
      // Furniture
      .item('king_bed', 2, 2, 0, '#E5DFD5')
      .item('sliding_wardrobe', 1, 1, 0, '#8F6A4A')
      .item('ac_split', 3, 1, 0, '#F5F3EE')
      .item('l_sofa', 7, 2, 0, '#D8CFC2')
      .item('marble_coffee_table', 8, 4, 0, '#E5DDD0')
      .item('oak_dining_table', 10, 2, 0, '#9E734E')
      .item('soaking_tub', 13, 1, 0, '#F2EFE9')
      .item('toilet_modern', 12, 1, 0, '#F4F2EE')
      .item('kitchen_l_set', 13, 4, 0, '#DED6C8')
      .item('king_bed', 1, 7, 0, '#D8CFC2')
      // Outdoor Pool, Gazebo & Tropical Garden
      .item('swimming_pool', 7, 8, 0, '#4FA7BE')
      .item('gazebo_wood', 12, 8, 0, '#96653E')
      .item('park_bench', 8, 12, 0, '#9E6E47')
      .item('stepping_stones', 6, 7, 0, '#B5AEA2')
      .item('garden_tree', 1, 12, 0, '#5B804B')
      .item('garden_tree', 13, 13, 0, '#72945B')
      .item('pine_tree', 14, 12, 0, '#436946')
      .item('flower_bed', 3, 13, 0, '#D47B6A')
      .item('garden_lamp', 6, 11, 0, '#33363C')
      .item('garden_lamp', 11, 11, 0, '#33363C');
    return makeBlueprint(
      16,
      16,
      {
        foundationStyle: 'timber',
        foundationHeight: 0.3,
        wallHeight: 2.9,
        roofStyle: 'joglo',
        roofColor: '#7A4634',
        roofPitch: 2.0,
      },
      'limewash_plaster',
      f1,
    );
  }

  // --------------------------------------------------------------------------
  // 15. RUKO 2 LANTAI (6×16m — Lt.1 Toko/Kafe + Parkir, Lt.2 Hunian 2 KT)
  // --------------------------------------------------------------------------
  if (templateId === 'ruko_2lt') {
    const { ox, oz } = lotOrigin(6, 16);
    const f1 = new FloorSketch('rk1', ox, oz);
    // Lt.1: z=1..10 (6×10m = 60m² shop/cafe) + front parking z=11..15
    f1.room(0, 1, 2, 2, 'bath', 'carrara_marble', 'limewash_plaster', 'KM Toko');
    f1.room(2, 1, 4, 2, 'kitchen', 'warm_terrazzo', 'loft_brick', 'Bar / Kasir');
    f1.room(0, 3, 6, 8, 'living', 'polished_concrete', 'loft_brick', 'Area Toko / Kafe');
    f1.vWall(2, 1, 2)
      .hWall(0, 3, 2)
      .openH(2, 11, 'glass_slider')
      .openH(3, 11, 'glass_slider')
      .openH(4, 11, 'double_door')
      .openH(1, 3, 'door')
      .openH(0, 1, 'bath_vent')
      // Cafe / Shop Interior
      .item('straight_stairs', 0, 4, 0, '#A97B52')
      .item('kitchen_island', 3, 2, 0, '#5E4B3C')
      .item('espresso_bar', 4, 1, 0, '#3C4047')
      .item('double_fridge', 2, 1, 0, '#C7CCD1')
      .item('toilet_modern', 0, 1, 0, '#F4F2EE')
      .item('compact_sink', 1, 1, 0, '#F4F2EE')
      .item('round_bistro_table', 2, 5, 0, '#9E734E')
      .item('round_bistro_table', 4, 5, 0, '#9E734E')
      .item('round_bistro_table', 2, 8, 0, '#9E734E')
      .item('round_bistro_table', 4, 8, 0, '#9E734E')
      .item('ac_split', 3, 3, 0, '#F5F3EE')
      .item('parking_bay', 0, 11, 0, '#43484F')
      .item('sedan_car', 0, 11, 0, '#D8CFC2')
      .item('scooter_bike', 4, 12, 0, '#C96D52')
      .item('scooter_bike', 5, 12, 0, '#5E7C6B');

    const f2 = new FloorSketch('rk2', ox, oz);
    f2.room(0, 1, 3, 4, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Utama');
    f2.room(3, 1, 3, 4, 'bedroom', 'pale_ash', 'limewash_plaster', 'Kamar Anak');
    f2.room(0, 5, 2, 2, 'bath', 'carrara_marble', 'limewash_plaster', 'KM Hunian');
    f2.room(2, 5, 4, 2, 'kitchen', 'warm_terrazzo', 'cream_wainscot', 'Dapur');
    f2.room(0, 7, 6, 3, 'living', 'herringbone_oak', 'limewash_plaster', 'Ruang Keluarga');
    f2.room(0, 10, 6, 1, 'terrace', 'deck_slats', 'raw_concrete', 'Balkon Ruko');
    f2.vWall(3, 1, 4)
      .hWall(0, 5, 6)
      .vWall(2, 5, 2)
      .hWall(0, 7, 2)
      .hWall(0, 10, 6)
      .openH(1, 5, 'door')
      .openH(4, 5, 'door')
      .openV(2, 6, 'door')
      .openH(2, 10, 'glass_slider')
      .openH(3, 10, 'glass_slider')
      .openH(1, 1, 'curtain_window')
      .openH(4, 1, 'curtain_window')
      .openH(1, 11, 'archway')
      .openH(2, 11, 'archway')
      .openH(4, 11, 'archway')
      .item('king_bed', 0, 1, 0, '#E5DFD5')
      .item('king_bed', 4, 1, 0, '#D8CFC2')
      .item('toilet_modern', 0, 5, 0, '#F4F2EE')
      .item('glass_shower', 0, 6, 0, '#DCE8EC')
      .item('kitchen_l_set', 4, 5, 0, '#DED6C8')
      .item('l_sofa', 1, 7, 0, '#5A6D63')
      .item('wall_tv', 5, 8, 3, '#2B2D30')
      .item('balcony_railing', 0, 10, 0, '#3C4047')
      .item('balcony_railing', 2, 10, 0, '#3C4047')
      .item('balcony_railing', 4, 10, 0, '#3C4047');

    return makeBlueprint(
      6,
      16,
      {
        foundationStyle: 'concrete',
        foundationHeight: 0.28,
        wallHeight: 2.9,
        roofStyle: 'flat',
        roofColor: '#484D54',
        roofPitch: 1.0,
      },
      'raw_concrete',
      f1,
      f2,
    );
  }

  // --------------------------------------------------------------------------
  // 16. TAMAN & GAZEBO SANCTUARY (14×14m)
  // --------------------------------------------------------------------------
  const { ox, oz } = lotOrigin(14, 14);
  const f1 = new FloorSketch('gp', ox, oz);
  f1.room(5, 5, 4, 4, 'terrace', 'deck_slats', 'raw_concrete', 'Pendopo Gazebo')
    .openH(6, 5, 'archway')
    .openH(7, 5, 'archway')
    .openH(6, 9, 'archway')
    .openH(7, 9, 'archway')
    .openV(5, 6, 'archway')
    .openV(5, 7, 'archway')
    .openV(9, 6, 'archway')
    .openV(9, 7, 'archway')
    .item('gazebo_wood', 5, 5, 0, '#96653E')
    .item('garden_pond', 10, 5, 0, '#5D9EA8')
    .item('garden_pond', 2, 5, 0, '#5D9EA8')
    .item('stepping_stones', 6, 3, 0, '#B5AEA2')
    .item('stepping_stones', 6, 9, 0, '#B5AEA2')
    .item('stepping_stones', 6, 11, 0, '#B5AEA2')
    .item('park_bench', 3, 10, 0, '#9E6E47')
    .item('park_bench', 9, 10, 0, '#9E6E47')
    .item('garden_tree', 1, 1, 0, '#5B804B')
    .item('garden_tree', 11, 1, 0, '#72945B')
    .item('garden_tree', 1, 11, 0, '#5B804B')
    .item('pine_tree', 12, 11, 0, '#436946')
    .item('pine_tree', 12, 9, 0, '#567D52')
    .item('flower_bed', 3, 2, 0, '#D47B6A')
    .item('flower_bed', 9, 2, 0, '#E2B45A')
    .item('flower_bed', 3, 12, 0, '#9F80B8')
    .item('garden_lamp', 5, 10, 0, '#33363C')
    .item('garden_lamp', 8, 10, 0, '#33363C')
    .item('garden_lamp', 5, 3, 0, '#33363C')
    .item('garden_lamp', 8, 3, 0, '#33363C');
  return makeBlueprint(
    14,
    14,
    {
      foundationStyle: 'timber',
      foundationHeight: 0.16,
      showCeiling: false,
      wallHeight: 2.6,
      roofStyle: 'none',
      roofColor: '#A8583B',
      roofPitch: 1.5,
    },
    'raw_concrete',
    f1,
  );
}

// ============================================================================
// STAMP READY-MADE ROOM MODULE ONTO ACTIVE FLOOR WITHOUT WIPING EXISTING ROOMS
// ============================================================================

export function stampRoomModuleOntoBlueprint(
  bp: RoomBlueprint,
  moduleId: RoomModuleId,
  includeFurniture = true,
): { ok: boolean; reason?: string; blueprint: RoomBlueprint; anchorGx?: number; anchorGz?: number } {
  const mod = ROOM_MODULE_PRESETS.find((m) => m.id === moduleId);
  if (!mod) return { ok: false, reason: 'Modul tidak ditemukan.', blueprint: bp };

  const bounds = getSiteBounds(bp);
  if (mod.width > bounds.landWidth || mod.depth > bounds.landDepth) {
    return {
      ok: false,
      reason: `Lahan terlalu kecil untuk modul ${mod.name} (${mod.width}×${mod.depth}m). Perbesar ukuran lahan dulu.`,
      blueprint: bp,
    };
  }

  // Find a free rectangle inside land bounds (prefer spots adjacent to existing rooms, or centered if lot is empty)
  const hasExisting = Object.keys(bp.tiles).length > 0;
  let bestX = -1;
  let bestZ = -1;
  let bestScore = Infinity;

  const centerGx = (bounds.minGx + bounds.maxGx - mod.width + 1) / 2;
  const centerGz = (bounds.minGz + bounds.maxGz - mod.depth + 1) / 2;

  for (let gx = bounds.minGx; gx <= bounds.maxGx - mod.width + 1; gx++) {
    for (let gz = bounds.minGz; gz <= bounds.maxGz - mod.depth + 1; gz++) {
      let overlaps = false;
      for (let x = gx; x < gx + mod.width && !overlaps; x++) {
        for (let z = gz; z < gz + mod.depth; z++) {
          if (bp.tiles[`${x},${z}`]) {
            overlaps = true;
            break;
          }
        }
      }
      if (overlaps) continue;

      // Score candidate: if existing tiles exist, strongly prefer touching an existing edge so rooms snap cleanly together!
      let touchesExisting = 0;
      if (hasExisting) {
        for (let x = gx; x < gx + mod.width; x++) {
          if (bp.tiles[`${x},${gz - 1}`]) touchesExisting++;
          if (bp.tiles[`${x},${gz + mod.depth}`]) touchesExisting++;
        }
        for (let z = gz; z < gz + mod.depth; z++) {
          if (bp.tiles[`${gx - 1},${z}`]) touchesExisting++;
          if (bp.tiles[`${gx + mod.width},${z}`]) touchesExisting++;
        }
      }
      const distCenter = Math.hypot(gx - centerGx, gz - centerGz);
      const score = hasExisting
        ? (touchesExisting > 0 ? -touchesExisting * 20 : 100) + distCenter
        : distCenter;
      if (score < bestScore) {
        bestScore = score;
        bestX = gx;
        bestZ = gz;
      }
    }
  }

  if (bestX === -1) {
    return {
      ok: false,
      reason: `Tidak ada ruang kosong ${mod.width}×${mod.depth}m tersisa di lahan ini. Perbesar lahan di tab Denah.`,
      blueprint: bp,
    };
  }

  const nextTiles = { ...bp.tiles };
  const nextInteriorWalls = { ...bp.interiorWalls };
  const nextOpenings = { ...bp.openings };
  const nextRoomNames = { ...(bp.roomNames || {}) };
  const nextFurniture = [...bp.furniture];
  const uidBase = `mod_${Date.now().toString(36)}`;
  let itemSeq = 0;
  const pushItem = (
    defId: string,
    dx: number,
    dz: number,
    rotation: 0 | 1 | 2 | 3 = 0,
    color = '#D8CFC2',
  ) => {
    if (!includeFurniture) return;
    itemSeq += 1;
    nextFurniture.push({
      uid: `${uidBase}_${itemSeq}`,
      defId,
      gx: bestX + dx,
      gz: bestZ + dz,
      rotation,
      color,
    });
  };

  const addRect = (
    dx: number,
    dz: number,
    w: number,
    d: number,
    zone: RoomZoneId,
    floorMat: FloorMaterialId,
    wallMat: WallMaterialId,
    name?: string,
  ) => {
    let firstKey: string | null = null;
    for (let x = bestX + dx; x < bestX + dx + w; x++) {
      for (let z = bestZ + dz; z < bestZ + dz + d; z++) {
        const k = `${x},${z}`;
        if (!firstKey || k < firstKey) firstKey = k;
        nextTiles[k] = { x, z, zone, floorMat, wallMat };
      }
    }
    if (name && firstKey) nextRoomNames[firstKey] = name;
  };

  // Add interior dividing walls where this new module touches existing tiles (and add a connecting door!)
  let addedConnectingDoor = false;
  for (let x = bestX; x < bestX + mod.width; x++) {
    if (bp.tiles[`${x},${bestZ - 1}`]) {
      const ek = `h:${x}:${bestZ}`;
      nextInteriorWalls[ek] = true;
      if (!addedConnectingDoor) {
        nextOpenings[ek] = 'door';
        addedConnectingDoor = true;
      }
    }
    if (bp.tiles[`${x},${bestZ + mod.depth}`]) {
      const ek = `h:${x}:${bestZ + mod.depth}`;
      nextInteriorWalls[ek] = true;
      if (!addedConnectingDoor) {
        nextOpenings[ek] = 'door';
        addedConnectingDoor = true;
      }
    }
  }
  for (let z = bestZ; z < bestZ + mod.depth; z++) {
    if (bp.tiles[`${bestX - 1},${z}`]) {
      const ek = `v:${bestX}:${z}`;
      nextInteriorWalls[ek] = true;
      if (!addedConnectingDoor) {
        nextOpenings[ek] = 'door';
        addedConnectingDoor = true;
      }
    }
    if (bp.tiles[`${bestX + mod.width},${z}`]) {
      const ek = `v:${bestX + mod.width}:${z}`;
      nextInteriorWalls[ek] = true;
      if (!addedConnectingDoor) {
        nextOpenings[ek] = 'door';
        addedConnectingDoor = true;
      }
    }
  }

  if (moduleId === 'mod_bedroom') {
    addRect(0, 0, 3, 4, 'bedroom', 'pale_ash', 'sage_matte', 'Kamar Tidur');
    if (!addedConnectingDoor) nextOpenings[`h:${bestX + 1}:${bestZ + 4}`] = 'door';
    nextOpenings[`h:${bestX + 1}:${bestZ}`] = 'curtain_window';
    pushItem('king_bed', 0, 0, 0, '#E5DFD5');
    pushItem('nightstand', 2, 0, 0, '#9E734E');
    pushItem('sliding_wardrobe', 1, 3, 2, '#8F6A4A');
    pushItem('ac_split', 1, 0, 0, '#F5F3EE');
  } else if (moduleId === 'mod_kos_ensuite') {
    addRect(0, 0, 3, 2, 'bath', 'carrara_marble', 'limewash_plaster', 'KM Dalam');
    addRect(0, 2, 3, 3, 'bedroom', 'pale_ash', 'limewash_plaster', 'Kamar Kos');
    nextInteriorWalls[`h:${bestX}:${bestZ + 2}`] = true;
    nextInteriorWalls[`h:${bestX + 1}:${bestZ + 2}`] = true;
    nextInteriorWalls[`h:${bestX + 2}:${bestZ + 2}`] = true;
    nextOpenings[`h:${bestX + 1}:${bestZ + 2}`] = 'door';
    nextOpenings[`h:${bestX + 1}:${bestZ}`] = 'bath_vent';
    if (!addedConnectingDoor) nextOpenings[`h:${bestX}:${bestZ + 5}`] = 'door';
    nextOpenings[`h:${bestX + 1}:${bestZ + 5}`] = 'window';
    pushItem('toilet_modern', 0, 0, 0, '#F4F2EE');
    pushItem('compact_sink', 1, 0, 0, '#F4F2EE');
    pushItem('glass_shower', 2, 0, 0, '#DCE8EC');
    pushItem('king_bed', 0, 2, 0, '#E5DFD5');
    pushItem('architect_desk', 1, 4, 2, '#9E734E');
    pushItem('ac_split', 1, 2, 0, '#F5F3EE');
  } else if (moduleId === 'mod_bathroom') {
    addRect(0, 0, 2, 3, 'bath', 'carrara_marble', 'limewash_plaster', 'Kamar Mandi');
    if (!addedConnectingDoor) nextOpenings[`h:${bestX}:${bestZ + 3}`] = 'door';
    nextOpenings[`h:${bestX + 1}:${bestZ}`] = 'bath_vent';
    pushItem('toilet_modern', 0, 0, 0, '#F4F2EE');
    pushItem('glass_shower', 1, 0, 0, '#DCE8EC');
    pushItem('marble_vanity', 0, 2, 1, '#ECE9E2');
    pushItem('towel_warmer', 1, 2, 3, '#C7CCD1');
  } else if (moduleId === 'mod_kitchen') {
    addRect(0, 0, 4, 3, 'kitchen', 'warm_terrazzo', 'cream_wainscot', 'Dapur & Makan');
    if (!addedConnectingDoor) nextOpenings[`h:${bestX + 1}:${bestZ + 3}`] = 'archway';
    nextOpenings[`h:${bestX + 2}:${bestZ}`] = 'window';
    pushItem('kitchen_l_set', 0, 0, 0, '#DED6C8');
    pushItem('stove_hood', 2, 0, 0, '#3C4047');
    pushItem('double_fridge', 3, 0, 0, '#C7CCD1');
    pushItem('water_dispenser', 3, 1, 3, '#ECE9E2');
    pushItem('round_bistro_table', 1, 2, 0, '#9E734E');
  } else if (moduleId === 'mod_living') {
    addRect(0, 0, 4, 4, 'living', 'herringbone_oak', 'limewash_plaster', 'Ruang Tamu');
    if (!addedConnectingDoor) nextOpenings[`h:${bestX + 1}:${bestZ + 4}`] = 'double_door';
    nextOpenings[`h:${bestX + 2}:${bestZ}`] = 'curtain_window';
    pushItem('l_sofa', 0, 1, 1, '#5A6D63');
    pushItem('marble_coffee_table', 2, 2, 0, '#E5DDD0');
    pushItem('area_rug', 1, 1, 0, '#D6CBB9');
    pushItem('wall_tv', 3, 1, 3, '#2B2D30');
    pushItem('arc_lamp', 0, 3, 0, '#D1A75A');
  } else if (moduleId === 'mod_study') {
    addRect(0, 0, 3, 3, 'study', 'herringbone_oak', 'midnight_paneling', 'Ruang Kerja');
    if (!addedConnectingDoor) nextOpenings[`h:${bestX + 1}:${bestZ + 3}`] = 'door';
    nextOpenings[`h:${bestX + 1}:${bestZ}`] = 'window';
    pushItem('cozy_pc_setup', 1, 0, 0, '#8F6544');
    pushItem('ergo_chair', 1, 1, 0, '#484D54');
    pushItem('bookshelf', 0, 0, 1, '#7A5438');
    pushItem('fiddle_tree', 2, 2, 0, '#B87654');
  }

  return {
    ok: true,
    anchorGx: bestX,
    anchorGz: bestZ,
    blueprint: {
      ...bp,
      tiles: nextTiles,
      interiorWalls: nextInteriorWalls,
      openings: nextOpenings,
      roomNames: nextRoomNames,
      furniture: nextFurniture,
    },
  };
}
