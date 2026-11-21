import React, { useMemo, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Download,
  FileJson,
  FolderOpen,
  Layers,
  Package,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { getEffectiveSite, getTotalProjectStats } from '../game/scoring';
import { SavedProjectRecord } from '../game/storage';
import { FurnitureDef, RoomBlueprint } from '../game/types';

interface ProjectManagerModalProps {
  activeProjectName: string;
  blueprint: RoomBlueprint;
  customDefs: Record<string, FurnitureDef>;
  savedProjects: SavedProjectRecord[];
  onClose: () => void;
  onSaveProject: (name: string, overwriteId?: string) => void;
  onLoadProject: (record: SavedProjectRecord) => void;
  onDeleteProject: (id: string) => void;
  onExportJson: (name: string) => void;
  onImportJson: (rawJson: string) => void;
  onExportScreenshotPng: () => void;
}

const CATEGORY_ID_LABELS: Record<string, string> = {
  seating: 'Kursi & Sofa',
  tables: 'Meja',
  beds: 'Kamar Tidur',
  storage: 'Lemari & Rak',
  kitchen: 'Dapur',
  bath: 'Kamar Mandi',
  lighting: 'Lampu',
  decor: 'Dekorasi',
  plants: 'Tanaman',
  garden: 'Taman & Luar',
  stairs: 'Tangga',
  vehicles: 'Kendaraan',
  custom: 'Kustom 3D',
};

function formatSavedTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  activeProjectName,
  blueprint,
  customDefs,
  savedProjects,
  onClose,
  onSaveProject,
  onLoadProject,
  onDeleteProject,
  onExportJson,
  onImportJson,
  onExportScreenshotPng,
}) => {
  const [activeTab, setActiveTab] = useState<'projects' | 'summary'>('projects');
  const [projectName, setProjectName] = useState(activeProjectName || 'Desain Utama');
  const [importError, setImportError] = useState<string | null>(null);
  const [justSavedMsg, setJustSavedMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const site = getEffectiveSite(blueprint);
  const landArea = site.landWidth * site.landDepth;
  const stats = useMemo(
    () => getTotalProjectStats(blueprint, customDefs),
    [blueprint, customDefs],
  );
  const groundArea = stats.perFloorArea[0] ?? 0;
  const kdbPct = landArea > 0 ? Math.min(100, Math.round((groundArea / landArea) * 100)) : 0;

  const triggerSavedFeedback = (msg: string) => {
    setJustSavedMsg(msg);
    window.setTimeout(() => setJustSavedMsg(null), 2200);
  };

  const handleSaveNew = () => {
    const clean = projectName.trim() || 'Desain Baru';
    onSaveProject(clean);
    triggerSavedFeedback(`Tersimpan sebagai "${clean}"`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      if (!content) {
        setImportError('File kosong atau tidak bisa dibaca.');
        return;
      }
      onImportJson(content);
    };
    reader.onerror = () => {
      setImportError('Gagal membaca file .json.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-auto bg-[#2C2018]/60 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[88vh] bg-[#FAF5EC] border border-[#D9CBB6] rounded-2xl shadow-[0_24px_54px_-12px_rgba(51,38,29,0.36)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5D9C7] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#B86B35]/14 text-[#9C5422] flex items-center justify-center shrink-0">
              <FolderOpen className="w-4.5 h-4.5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-[#33261D] truncate">
                Manajer Proyek &amp; Ringkasan
              </h2>
              <p className="text-xs text-[#6B5644] truncate">
                Simpan banyak proyek desain, ekspor/impor file .JSON, atau cek total luas &amp; daftar item.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Manajer Proyek"
            className="p-1.5 rounded-xl text-[#6B5644] hover:text-[#33261D] hover:bg-[#EFE6D7] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 shrink-0">
          <div className="grid grid-cols-2 gap-1.5 bg-[#E7DBC8] p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('projects')}
              className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'projects'
                  ? 'bg-[#FAF5EC] text-[#33261D] shadow-xs'
                  : 'text-[#6B5644] hover:text-[#33261D]'
              }`}
            >
              <Save className="w-3.5 h-3.5 text-[#B86B35]" />
              <span>Proyek Tersimpan ({savedProjects.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'summary'
                  ? 'bg-[#FAF5EC] text-[#33261D] shadow-xs'
                  : 'text-[#6B5644] hover:text-[#33261D]'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-[#467255]" />
              <span>Ringkasan &amp; Daftar Item ({stats.totalItems})</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto dock-scroll px-5 py-4 space-y-4">
          {activeTab === 'projects' ? (
            <>
              {/* Save Active Design Card */}
              <div className="bg-[#F1E8DA] border border-[#DDD0BC] rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#33261D]">
                    Simpan Desain Saat Ini
                  </span>
                  <span className="text-[11px] font-mono-num text-[#7D6754]">
                    Lahan {site.landWidth}×{site.landDepth}m · {stats.floorCount} Lt · {stats.totalFloorArea} m² · {stats.totalItems} item
                  </span>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value.slice(0, 48))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNew();
                    }}
                    placeholder="Nama proyek (mis. Rumah 2 Lantai Tropis)..."
                    className="flex-1 min-w-[180px] bg-[#FAF5EC] border border-[#D9CBB6] rounded-xl px-3 py-2 text-xs font-medium text-[#33261D] focus:outline-none focus:border-[#B86B35]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveNew}
                    className="px-3.5 py-2 rounded-xl bg-[#B86B35] hover:bg-[#A35C2B] text-[#FFFBF5] text-xs font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Proyek</span>
                  </button>
                </div>

                {justSavedMsg && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2D4F39]">
                    <Check className="w-3.5 h-3.5" />
                    <span>{justSavedMsg}</span>
                  </div>
                )}

                {/* Export / Import JSON Row */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2D6C3]">
                  <button
                    type="button"
                    onClick={() => onExportJson(projectName.trim() || 'Roomsmith Design')}
                    className="px-3 py-1.5 rounded-xl bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-xs font-medium text-[#33261D] flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-[#B86B35]" />
                    <span>Ekspor File .JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-xl bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-xs font-medium text-[#33261D] flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#467255]" />
                    <span>Impor File .JSON</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <span className="text-[11px] text-[#7D6754] ml-auto">
                    Cadangan lokal hingga 16 proyek
                  </span>
                </div>

                {importError && (
                  <p className="text-[11px] font-medium text-[#8A3229]">{importError}</p>
                )}
              </div>

              {/* Saved Projects List */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#5A4738]">Daftar Proyek Tersimpan</p>
                {savedProjects.length === 0 ? (
                  <div className="bg-[#F1E8DA]/70 border border-dashed border-[#D3C3AB] rounded-2xl p-6 text-center space-y-1.5">
                    <FileJson className="w-6 h-6 text-[#9C846E] mx-auto" />
                    <p className="text-xs font-semibold text-[#33261D]">
                      Belum ada proyek tersimpan di slot ini
                    </p>
                    <p className="text-[11px] text-[#6B5644]">
                      Masukkan nama di atas lalu klik Simpan Proyek agar kamu bisa beralih antar banyak desain rumah.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedProjects.map((proj) => (
                      <div
                        key={proj.id}
                        className="bg-[#F1E8DA] border border-[#DDD0BC] rounded-xl p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#33261D] truncate">
                              {proj.name}
                            </span>
                            <span className="text-[10px] font-mono-num text-[#7D6754] shrink-0">
                              {formatSavedTime(proj.updatedAt)}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono-num text-[#6B5644]">
                            Lahan {proj.landWidth}×{proj.landDepth}m · {proj.floorCount} Lantai ·{' '}
                            {proj.builtArea} m² · {proj.itemCount} item
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onLoadProject(proj)}
                            className="px-3 py-1.5 rounded-lg bg-[#467255] hover:bg-[#3A6047] text-[#FFFBF5] text-[11px] font-semibold cursor-pointer transition-colors"
                          >
                            Buka
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSaveProject(proj.name, proj.id);
                              triggerSavedFeedback(`Proyek "${proj.name}" diperbarui`);
                            }}
                            title="Timpa slot ini dengan desain aktif sekarang"
                            className="px-2.5 py-1.5 rounded-lg bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-[11px] font-medium text-[#33261D] cursor-pointer transition-colors"
                          >
                            Timpa
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteProject(proj.id)}
                            title="Hapus proyek ini"
                            className="p-1.5 rounded-lg bg-[#B54B40]/12 hover:bg-[#B54B40]/22 border border-[#B54B40]/30 text-[#8A3229] cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Architectural Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono-num">
                <div className="bg-[#F1E8DA] border border-[#DDD0BC] rounded-xl p-3">
                  <span className="text-[10px] text-[#7D6754] block">Luas Lahan</span>
                  <span className="text-base font-bold text-[#33261D]">{landArea} m²</span>
                  <span className="text-[10px] text-[#6B5644] block">
                    {site.landWidth} × {site.landDepth} m
                  </span>
                </div>
                <div className="bg-[#F1E8DA] border border-[#DDD0BC] rounded-xl p-3">
                  <span className="text-[10px] text-[#7D6754] block">Total Bangunan</span>
                  <span className="text-base font-bold text-[#9C5422]">{stats.totalFloorArea} m²</span>
                  <span className="text-[10px] text-[#6B5644] block">
                    KDB Lt.1 {kdbPct}%
                  </span>
                </div>
                <div className="bg-[#F1E8DA] border border-[#DDD0BC] rounded-xl p-3">
                  <span className="text-[10px] text-[#7D6754] block">Jumlah Lantai</span>
                  <span className="text-base font-bold text-[#33261D]">{stats.floorCount} Lantai</span>
                  <span className="text-[10px] text-[#6B5644] block">
                    Tinggi {(site.wallHeight ?? 2.85).toFixed(2)}m/lt
                  </span>
                </div>
                <div className="bg-[#F1E8DA] border border-[#DDD0BC] rounded-xl p-3">
                  <span className="text-[10px] text-[#7D6754] block">Total Aset 3D</span>
                  <span className="text-base font-bold text-[#2D4F39]">{stats.totalItems}</span>
                  <span className="text-[10px] text-[#6B5644] block">
                    {stats.inventory.length} jenis item
                  </span>
                </div>
              </div>

              {/* Per-Floor Area Breakdown */}
              <div className="bg-[#F1E8DA] border border-[#DDD0BC] rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#33261D]">
                  <Layers className="w-3.5 h-3.5 text-[#B86B35]" />
                  <span>Rincian Luas Per Lantai</span>
                </div>
                <div className="grid grid-cols-3 gap-2 font-mono-num">
                  {stats.perFloorArea.map((area, idx) => (
                    <div
                      key={idx}
                      className="bg-[#FAF5EC] border border-[#DFD2BE] rounded-lg px-2.5 py-2 flex items-center justify-between text-xs"
                    >
                      <span className="text-[#6B5644]">Lantai {idx + 1}</span>
                      <span className="font-semibold text-[#33261D]">{area} m²</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grouped Furniture Inventory */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#33261D]">
                    Daftar Furnitur &amp; Perlengkapan Terpasang
                  </p>
                  <span className="text-[11px] font-mono-num text-[#7D6754]">
                    Total {stats.totalItems} unit
                  </span>
                </div>

                {stats.inventory.length === 0 ? (
                  <div className="bg-[#F1E8DA]/70 border border-dashed border-[#D3C3AB] rounded-xl p-5 text-center text-xs text-[#6B5644]">
                    Belum ada furnitur atau aset 3D yang ditempatkan di proyek ini.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {stats.inventory.map((entry) => (
                      <div
                        key={entry.defId}
                        className="bg-[#F1E8DA] border border-[#DFD2BE] rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-[#33261D] block truncate">
                            {entry.name}
                          </span>
                          <span className="text-[10px] text-[#7D6754]">
                            {CATEGORY_ID_LABELS[entry.category] || entry.category}
                          </span>
                        </div>
                        <span className="font-mono-num text-xs font-bold text-[#9C5422] bg-[#FAF5EC] border border-[#D9CBB6] rounded-lg px-2 py-0.5 shrink-0">
                          ×{entry.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5D9C7] bg-[#F5EDE1] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              window.setTimeout(() => onExportScreenshotPng(), 120);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#467255] hover:bg-[#3A6047] text-[#FFFBF5] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Unduh Foto Render 3D (PNG)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#FAF5EC] hover:bg-[#E8DCC9] border border-[#D9CBB6] text-xs font-semibold text-[#33261D] cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
