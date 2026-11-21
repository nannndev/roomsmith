import React, { useMemo, useState } from 'react';
import { Building2, Check, Layers, LayoutGrid, Search, Sofa, Sparkles, X } from 'lucide-react';
import {
  createStarterTemplateBlueprint,
  ROOM_ZONES,
  STARTER_TEMPLATES,
  TEMPLATE_CATEGORY_LABELS,
  TemplateCatalogItem,
} from '../game/catalog';
import { getSiteBounds } from '../game/scoring';
import {
  FloorTile,
  RoomBlueprint,
  RoomZoneId,
  StarterTemplateId,
  TemplateCategory,
  WallOpeningType,
} from '../game/types';

interface TemplateGalleryModalProps {
  onClose: () => void;
  onSelectTemplate: (templateId: StarterTemplateId, includeFurniture: boolean) => void;
}

const ZONE_FILL: Record<RoomZoneId, string> = Object.fromEntries(
  ROOM_ZONES.map((z) => [z.id, z.color]),
) as Record<RoomZoneId, string>;

const WINDOW_OPENINGS: Set<WallOpeningType> = new Set([
  'window',
  'arched_window',
  'curtain_window',
  'bath_vent',
]);

interface FloorPlanSlice {
  tiles: Record<string, FloorTile>;
  interiorWalls: Record<string, boolean>;
  openings: Record<string, WallOpeningType>;
}

function getFloorSlice(bp: RoomBlueprint, floorIdx: number): FloorPlanSlice {
  if (floorIdx > 0 && bp.otherFloors && bp.otherFloors[floorIdx]) {
    const f = bp.otherFloors[floorIdx];
    return {
      tiles: f.tiles,
      interiorWalls: f.interiorWalls,
      openings: f.openings,
    };
  }
  return {
    tiles: bp.tiles,
    interiorWalls: bp.interiorWalls,
    openings: bp.openings,
  };
}

const MiniFloorplanSvg: React.FC<{
  blueprint: RoomBlueprint;
  floorIdx: number;
}> = ({ blueprint, floorIdx }) => {
  const bounds = getSiteBounds(blueprint);
  const slice = getFloorSlice(blueprint, floorIdx);
  const pad = 0.7;
  const vbW = bounds.landWidth + pad * 2;
  const vbH = bounds.landDepth + pad * 2;
  const ox = bounds.minGx;
  const oz = bounds.minGz;

  const tileList = Object.values(slice.tiles);

  // Collect exterior & interior wall edges so the plan reads like a real architectural blueprint
  const wallEdges: { x1: number; y1: number; x2: number; y2: number; opening?: WallOpeningType }[] =
    [];
  const visited = new Set<string>();

  const pushEdge = (axis: 'h' | 'v', ex: number, ez: number) => {
    const key = `${axis}:${ex}:${ez}`;
    if (visited.has(key)) return;
    visited.add(key);
    const opening = slice.openings[key];
    if (axis === 'h') {
      wallEdges.push({
        x1: ex - ox + pad,
        y1: ez - oz + pad,
        x2: ex - ox + pad + 1,
        y2: ez - oz + pad,
        opening,
      });
    } else {
      wallEdges.push({
        x1: ex - ox + pad,
        y1: ez - oz + pad,
        x2: ex - ox + pad,
        y2: ez - oz + pad + 1,
        opening,
      });
    }
  };

  for (const t of tileList) {
    if (!slice.tiles[`${t.x},${t.z - 1}`]) pushEdge('h', t.x, t.z);
    if (!slice.tiles[`${t.x},${t.z + 1}`]) pushEdge('h', t.x, t.z + 1);
    if (!slice.tiles[`${t.x - 1},${t.z}`]) pushEdge('v', t.x, t.z);
    if (!slice.tiles[`${t.x + 1},${t.z}`]) pushEdge('v', t.x + 1, t.z);
  }
  for (const edgeKey of Object.keys(slice.interiorWalls)) {
    if (!slice.interiorWalls[edgeKey]) continue;
    const [axis, xs, zs] = edgeKey.split(':');
    if (axis === 'h' || axis === 'v') {
      pushEdge(axis, Number(xs), Number(zs));
    }
  }

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      className="w-full h-full block"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Land plot lawn background */}
      <rect
        x={pad}
        y={pad}
        width={bounds.landWidth}
        height={bounds.landDepth}
        rx={0.28}
        fill="#DCE6D0"
        stroke="#A4B792"
        strokeWidth={0.14}
        strokeDasharray="0.4 0.25"
      />

      {/* Room floor tiles tinted by architectural zone */}
      {tileList.map((t) => (
        <rect
          key={`${t.x},${t.z}`}
          x={t.x - ox + pad + 0.02}
          y={t.z - oz + pad + 0.02}
          width={0.96}
          height={0.96}
          fill={ZONE_FILL[t.zone] || '#E7DBC8'}
          fillOpacity={0.72}
        />
      ))}

      {/* Crisp wall lines & openings (doors warm terracotta, windows sky glass) */}
      {wallEdges.map((e, idx) => {
        if (e.opening && e.opening !== 'none') {
          const isWin = WINDOW_OPENINGS.has(e.opening);
          return (
            <line
              key={idx}
              x1={e.x1}
              y1={e.y1}
              x2={e.x2}
              y2={e.y2}
              stroke={isWin ? '#3D84A8' : '#C26328'}
              strokeWidth={isWin ? 0.24 : 0.26}
              strokeLinecap="round"
            />
          );
        }
        return (
          <line
            key={idx}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke="#33261D"
            strokeWidth={0.2}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
};

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  onClose,
  onSelectTemplate,
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | TemplateCategory>('all');
  const [searchText, setSearchText] = useState('');
  const [includeFurniture, setIncludeFurniture] = useState(true);
  const [previewFloorMap, setPreviewFloorMap] = useState<Record<string, number>>({});

  // Precompute lightweight structure blueprints once for instant SVG floorplan previews
  const previewBlueprints = useMemo(() => {
    const map: Record<string, RoomBlueprint> = {};
    for (const tpl of STARTER_TEMPLATES) {
      map[tpl.id] = createStarterTemplateBlueprint(tpl.id, false);
    }
    return map;
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: STARTER_TEMPLATES.length };
    for (const tpl of STARTER_TEMPLATES) {
      counts[tpl.category] = (counts[tpl.category] || 0) + 1;
    }
    return counts;
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return STARTER_TEMPLATES.filter((tpl) => {
      if (activeCategory !== 'all' && tpl.category !== activeCategory) return false;
      if (!q) return true;
      const hay = `${tpl.name} ${tpl.subtitle} ${tpl.sizeLabel} ${tpl.tags.join(' ')} ${
        tpl.floors > 1 ? '2 lantai tingkat' : '1 lantai'
      }`.toLowerCase();
      return q.split(/\s+/).every((word) => hay.includes(word));
    });
  }, [activeCategory, searchText]);

  const formatSpecs = (tpl: TemplateCatalogItem) => {
    const parts: string[] = [];
    parts.push(`${tpl.floors} Lantai`);
    if (tpl.bedrooms > 0) parts.push(`${tpl.bedrooms} KT`);
    if (tpl.bathrooms > 0) parts.push(`${tpl.bathrooms} KM`);
    return parts.join(' · ');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2C2118]/55 flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl max-h-[90vh] bg-[#FAF5EC] border border-[#D4C3AA] rounded-2xl shadow-[0_24px_64px_-12px_rgba(40,28,18,0.4)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#E5D9C7] bg-[#F4ECE0] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#B86B35] text-[#FFFBF5] flex items-center justify-center shrink-0 shadow-xs">
              <LayoutGrid className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-base sm:text-lg text-[#33261D] leading-tight">
                Galeri Template Denah Bangunan
              </h2>
              <p className="text-xs text-[#6B5644] truncate">
                {STARTER_TEMPLATES.length} denah rumah, kos-kosan, kontrakan, apartemen, villa &amp; ruko — semua siap diedit 3D
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup galeri template"
            className="p-2 rounded-xl text-[#6B5644] hover:text-[#33261D] hover:bg-[#E7DBC8] transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Category Filter Strip + Search + Furniture Toggle */}
        <div className="px-5 py-3 border-b border-[#E5D9C7] bg-[#FAF5EC] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {TEMPLATE_CATEGORY_LABELS.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#B86B35] border-[#B86B35] text-[#FFFBF5] shadow-xs'
                      : 'bg-[#F1E8DA] border-[#DDD0BC] text-[#5A4738] hover:bg-[#E7DBC8] hover:text-[#33261D]'
                  }`}
                >
                  {cat.label}{' '}
                  <span className={`font-mono-num text-[11px] ${active ? 'text-[#FFE8D6]' : 'text-[#8C7561]'}`}>
                    ({categoryCounts[cat.id] || 0})
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Furnished vs Empty Floorplan Toggle */}
            <div className="flex items-center bg-[#EFE6D7] border border-[#D9CBB6] rounded-xl p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setIncludeFurniture(true)}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                  includeFurniture
                    ? 'bg-[#467255] text-[#FFFBF5] shadow-xs'
                    : 'text-[#5A4738] hover:text-[#33261D]'
                }`}
              >
                <Sofa className="w-3.5 h-3.5" />
                <span>Lengkap Furnitur</span>
              </button>
              <button
                type="button"
                onClick={() => setIncludeFurniture(false)}
                className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
                  !includeFurniture
                    ? 'bg-[#B86B35] text-[#FFFBF5] shadow-xs'
                    : 'text-[#5A4738] hover:text-[#33261D]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Denah Kosong</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-1.5 bg-[#F1E8DA] border border-[#D9CBB6] focus-within:border-[#B86B35] rounded-xl px-2.5 py-1.5 text-xs w-48 sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#8A725E] shrink-0" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Cari tipe 36, kos, 2 lantai..."
                aria-label="Cari template denah"
                className="flex-1 min-w-0 bg-transparent text-[#33261D] font-medium focus:outline-none placeholder:text-[#9A826D]"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText('')}
                  className="text-[#7D6754] hover:text-[#33261D] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Template Cards Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto dock-scroll p-5">
          {filteredTemplates.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="font-display font-semibold text-base text-[#33261D]">
                Tidak ada denah yang cocok dengan &ldquo;{searchText}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchText('');
                  setActiveCategory('all');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#B86B35] text-[#FFFBF5] text-xs font-semibold cursor-pointer"
              >
                Tampilkan Semua Denah
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((tpl) => {
                const previewBp = previewBlueprints[tpl.id];
                const shownFloor = previewFloorMap[tpl.id] ?? 0;

                return (
                  <div
                    key={tpl.id}
                    className="group bg-[#F4ECE0] border border-[#D9CBB6] hover:border-[#B86B35] rounded-2xl overflow-hidden flex flex-col transition-colors shadow-[0_6px_18px_-8px_rgba(68,48,32,0.16)]"
                  >
                    {/* Live Architectural Mini-Floorplan Preview */}
                    <div className="relative h-40 bg-[#EFE6D7] border-b border-[#DFD2BE] p-3 flex items-center justify-center">
                      {previewBp && (
                        <MiniFloorplanSvg blueprint={previewBp} floorIdx={shownFloor} />
                      )}

                      {/* Top-left Lot Dimension Readout */}
                      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-[#FAF5EC]/95 border border-[#D9CBB6] font-mono-num text-[11px] font-semibold text-[#33261D]">
                        {tpl.sizeLabel}
                      </span>

                      {/* Top-right 2-Floor Interactive Switcher */}
                      {tpl.floors > 1 && (
                        <div className="absolute top-2.5 right-2.5 flex items-center bg-[#FAF5EC]/95 border border-[#D4C3AA] rounded-lg p-0.5 text-[10px] font-mono-num font-semibold">
                          {Array.from({ length: tpl.floors }).map((_, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewFloorMap((prev) => ({ ...prev, [tpl.id]: idx }));
                              }}
                              className={`px-1.5 py-0.5 rounded-md cursor-pointer transition-colors ${
                                shownFloor === idx
                                  ? 'bg-[#B86B35] text-[#FFFBF5]'
                                  : 'text-[#6B5644] hover:text-[#33261D]'
                              }`}
                            >
                              Lt.{idx + 1}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Details */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-display font-bold text-sm text-[#33261D] leading-snug">
                            {tpl.name}
                          </h3>
                          {tpl.floors > 1 && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#467255]">
                              <Building2 className="w-3 h-3" />
                              {tpl.floors} Lt
                            </span>
                          )}
                        </div>
                        <p className="font-mono-num text-[11px] font-semibold text-[#9C5422]">
                          {formatSpecs(tpl)}
                        </p>
                        <p className="text-xs text-[#5E4B3C] leading-relaxed">
                          {tpl.subtitle}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectTemplate(tpl.id, includeFurniture)}
                        className="w-full py-2 px-3 rounded-xl bg-[#FAF5EC] group-hover:bg-[#B86B35] border border-[#D4C3AA] group-hover:border-[#B86B35] text-xs font-semibold text-[#33261D] group-hover:text-[#FFFBF5] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {includeFurniture ? (
                          <Sparkles className="w-3.5 h-3.5 text-[#B86B35] group-hover:text-[#FFFBF5]" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-[#467255] group-hover:text-[#FFFBF5]" />
                        )}
                        <span>
                          {includeFurniture ? 'Pakai Denah + Furnitur' : 'Pakai Struktur Denah Kosong'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Subtle Architectural Legend Footer */}
        <div className="px-5 py-2.5 border-t border-[#E5D9C7] bg-[#F4ECE0] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6B5644] shrink-0">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#33261D] inline-block rounded-full" />
              Dinding
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#C26328] inline-block rounded-full" />
              Pintu / Lengkungan
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#3D84A8] inline-block rounded-full" />
              Jendela / Ventilasi
            </span>
          </div>
          <span>Tips: Setelah memuat denah, gunakan tombol Balik Denah (Cermin) atau +Modul Kamar di tab Denah.</span>
        </div>
      </div>
    </div>
  );
};
