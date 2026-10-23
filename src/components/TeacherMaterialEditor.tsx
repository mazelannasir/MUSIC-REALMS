import React, { useState } from 'react';
import { StationConfig, StationId } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { X, Save, ExternalLink, Eye, RefreshCw, CheckCircle, HelpCircle, Link as LinkIcon, BookOpen, Film, Gamepad2, Award, Heart, Zap, Swords } from 'lucide-react';

interface TeacherMaterialEditorProps {
  stations: StationConfig[];
  initialStationId?: StationId;
  onSave: (updatedStations: StationConfig[]) => void;
  onClose: () => void;
}

export const TeacherMaterialEditor: React.FC<TeacherMaterialEditorProps> = ({
  stations,
  initialStationId = 1,
  onSave,
  onClose
}) => {
  const [selectedStationId, setSelectedStationId] = useState<StationId>(initialStationId);
  const [editedStations, setEditedStations] = useState<StationConfig[]>(JSON.parse(JSON.stringify(stations)));
  const [previewActive, setPreviewActive] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const activeStation = editedStations.find(s => s.id === selectedStationId) || editedStations[0];

  const updateActiveStation = (field: keyof StationConfig, value: any) => {
    setEditedStations(prev =>
      prev.map(s => s.id === selectedStationId ? { ...s, [field]: value } : s)
    );
  };

  // Convert regular YouTube watch links to embed links automatically for teacher convenience
  const formatUrlForEmbed = (url: string, type: string) => {
    if (!url) return '';
    let formatted = url.trim();
    if (type === 'video') {
      if (formatted.includes('youtube.com/watch?v=')) {
        const id = formatted.split('v=')[1]?.split('&')[0];
        if (id) formatted = `https://www.youtube.com/embed/${id}`;
      } else if (formatted.includes('youtu.be/')) {
        const id = formatted.split('youtu.be/')[1]?.split('?')[0];
        if (id) formatted = `https://www.youtube.com/embed/${id}`;
      }
    }
    return formatted;
  };

  const handleSave = async () => {
    soundEngine.playButtonClick();
    setIsSaving(true);
    setNotification(null);

    try {
      const res = await fetch('/api/stations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stations: editedStations })
      });

      if (res.ok) {
        onSave(editedStations);
        setNotification({
          message: 'Bahan pengajaran stesen berjaya disimpan dan disegerakkan! 🎉',
          type: 'success'
        });
        soundEngine.playCorrect();
      } else {
        throw new Error('Gagal menyimpan');
      }
    } catch (err) {
      setNotification({
        message: 'Ralat semasa menyimpan ke pelayan. Sila cuba lagi.',
        type: 'error'
      });
      soundEngine.playWrong();
    } finally {
      setIsSaving(false);
    }
  };

  const stationIcons: Record<StationId, { icon: React.ReactNode; label: string; color: string }> = {
    1: { icon: <BookOpen className="w-4 h-4" />, label: 'Stesen 1: Slaid', color: 'from-indigo-600 to-indigo-800' },
    2: { icon: <Film className="w-4 h-4" />, label: 'Stesen 2: Video', color: 'from-orange-600 to-amber-700' },
    3: { icon: <Gamepad2 className="w-4 h-4" />, label: 'Game 1: Not Whacker', color: 'from-fuchsia-600 to-pink-700' },
    6: { icon: <Zap className="w-4 h-4" />, label: 'Game 2: Beams Liner', color: 'from-cyan-600 to-teal-800' },
    7: { icon: <Swords className="w-4 h-4" />, label: 'Game 3: Not Ninja', color: 'from-amber-600 to-orange-800' },
    4: { icon: <Award className="w-4 h-4" />, label: 'Stesen 4: Kuiz', color: 'from-teal-600 to-cyan-800' },
    5: { icon: <Heart className="w-4 h-4" />, label: 'Stesen 5: Maklum Balas', color: 'from-rose-800 to-rose-950' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border-2 border-indigo-500/50 rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 border-b border-indigo-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400 flex items-center justify-center text-xl">
              ✏️
            </div>
            <div>
              <div className="text-xs uppercase font-bold text-indigo-300 tracking-wider">
                Panel Pengurusan Bahan Guru
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-['Fredoka'] text-white">
                Edit & Masukkan Bahan Stesen Pembelajaran
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Station Select Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 sm:px-6 gap-2 overflow-x-auto py-2">
          {([1, 2, 3, 6, 7, 4, 5] as StationId[]).map(id => {
            const meta = stationIcons[id];
            const isSelected = selectedStationId === id;
            return (
              <button
                key={id}
                onClick={() => {
                  soundEngine.playButtonClick();
                  setSelectedStationId(id);
                  setPreviewActive(false);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                  isSelected
                    ? `bg-gradient-to-r ${meta.color} text-white shadow-lg`
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {meta.icon}
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-red-950/80 border-red-500 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="underline text-[10px]">Tutup</button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Form Settings */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Maklumat Asas Stesen
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Stesen {activeStation.id}
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Tajuk Paparan Stesen:</label>
                  <input
                    type="text"
                    value={activeStation.title}
                    onChange={e => updateActiveStation('title', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Penerangan / Objektif:</label>
                  <textarea
                    rows={2}
                    value={activeStation.description}
                    onChange={e => updateActiveStation('description', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Arahan Khas Guru untuk Murid:</label>
                  <input
                    type="text"
                    value={activeStation.teacherInstructions || ''}
                    placeholder="Cth: Sila tonton video ini dan rekodkan 3 not yang anda dengar."
                    onChange={e => updateActiveStation('teacherInstructions', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Station Specific Input */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                  {activeStation.id === 1 && 'Pautan Slaid Pengajaran (Google Slides / Canva / PDF)'}
                  {activeStation.id === 2 && 'Pautan Video Animasi Pembelajaran (YouTube / MP4)'}
                  {activeStation.id === 3 && 'Pautan Permainan Stesen 1: Not Whacker (Wordwall / Blooket / Scratch)'}
                  {activeStation.id === 6 && 'Pautan Permainan Stesen 2: Music Beams Liner (Wordwall / Blooket / Scratch)'}
                  {activeStation.id === 7 && 'Pautan Permainan Stesen 3: Not Ninja (Wordwall / Blooket / Scratch)'}
                  {activeStation.id === 4 && 'Pautan Kuiz Interaktif (Quizizz / Google Forms / Kahoot)'}
                  {activeStation.id === 5 && 'Soalan Refleksi & Maklum Balas'}
                </span>

                {activeStation.id !== 5 ? (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                        <span>URL Bahan Pengajaran:</span>
                        <span className="text-[10px] text-slate-400">Tampal pautan penuh (https://...)</span>
                      </label>
                      <div className="relative mt-1">
                        <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                          type="url"
                          value={activeStation.contentUrl || ''}
                          placeholder={
                            activeStation.id === 1 ? 'https://docs.google.com/presentation/d/.../embed' :
                            activeStation.id === 2 ? 'https://www.youtube.com/watch?v=...' :
                            activeStation.id === 3 ? 'https://wordwall.net/play/... (Pautan Game 1: Not Whacker)' :
                            activeStation.id === 6 ? 'https://wordwall.net/play/... (Pautan Game 2: Music Beams Liner)' :
                            activeStation.id === 7 ? 'https://wordwall.net/play/... (Pautan Game 3: Not Ninja)' :
                            'https://quizizz.com/join?... atau pautan kuiz'
                          }
                          onChange={e => {
                            const val = e.target.value;
                            const formatted = formatUrlForEmbed(val, activeStation.contentType);
                            updateActiveStation('contentUrl', formatted);
                          }}
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Embed vs External Tab Option */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => updateActiveStation('embedMode', 'iframe')}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          activeStation.embedMode !== 'new_tab'
                            ? 'bg-indigo-600/40 border-indigo-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        📺 Paparan Terbenam (Iframe)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveStation('embedMode', 'new_tab')}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          activeStation.embedMode === 'new_tab'
                            ? 'bg-indigo-600/40 border-indigo-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        ↗️ Buka di Tab Baharu
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300">Teks Butang Luaran:</label>
                      <input
                        type="text"
                        value={activeStation.externalButtonText || ''}
                        placeholder="Cth: Buka Bahan di Tab Baharu"
                        onChange={e => updateActiveStation('externalButtonText', e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Soalan Maklum Balas:</label>
                    <textarea
                      rows={3}
                      value={activeStation.questionText || ''}
                      onChange={e => updateActiveStation('questionText', e.target.value)}
                      placeholder="Apakah pendapat kamu tentang pengalaman pembelajaran menggunakan Music Realms?"
                      className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons: Preview & Save */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setPreviewActive(prev => !prev);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  <span>{previewActive ? 'Tutup Pratonton' : 'Pratonton Paparan'}</span>
                </button>

                {activeStation.contentUrl && (
                  <a
                    href={activeStation.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Uji Buka URL di Tab Baharu"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Right Column: Live Interactive Preview & Guide */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-indigo-400" /> Pratonton Langsung Bahan Stesen:
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {activeStation.contentUrl ? 'URL Ditetapkan' : 'Belum Ada URL'}
                  </span>
                </div>

                <div className="mt-3">
                  {activeStation.contentUrl ? (
                    <div className="space-y-3">
                      <div className="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-200">
                        Pautan aktif: <span className="font-mono text-white underline break-all">{activeStation.contentUrl}</span>
                      </div>

                      {/* Iframe Preview Box */}
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-700 shadow-inner flex items-center justify-center">
                        <iframe
                          src={activeStation.contentUrl}
                          title="Pratonton Bahan Stesen"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                        />
                      </div>

                      <p className="text-[10px] text-slate-400">
                        * Nota: Jika laman sesawang luaran menyekat paparan iframe (seperti X-Frame-Options), sistem akan secara automatik memaparkan butang kemas untuk murid membukanya di tab baharu.
                      </p>
                    </div>
                  ) : (
                    <div className="py-16 text-center space-y-3">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 border border-dashed border-slate-700 flex items-center justify-center text-2xl">
                        📁
                      </div>
                      <h4 className="text-sm font-bold text-slate-300">Belum Ada Pautan Dimasukkan</h4>
                      <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        Tampalkan link Google Slides, video YouTube, permainan Wordwall, atau kuiz Quizizz anda di sebelah kiri.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Guidance helper */}
              <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <div className="font-bold text-indigo-300 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Panduan Pantas Guru:
                </div>
                <p>• <strong>Google Slides:</strong> Fail → Kongsi → Terbitkan ke web → Pilih 'Semat' (Embed) dan salin URL.</p>
                <p>• <strong>YouTube:</strong> Anda boleh tampal pautan video biasa; sistem akan memformatnya ke pemain video secara automatik.</p>
                <p>• <strong>Wordwall / Quizizz:</strong> Salin pautan 'Share with students' atau 'Play'.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-t border-slate-800">
          <div className="text-xs text-slate-400">
            Perubahan akan disegerakkan terus kepada semua murid dalam bilik pembelajaran.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundEngine.playButtonClick();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-400 hover:via-purple-500 hover:to-pink-400 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'SIMPAN SEMUA BAHAN ✨'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
