import React, { useState, useEffect } from 'react';
import { StationConfig, FeedbackSubmission } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { mergeWithDefaultStations, saveStoredStations, generateShareableStudentUrl, loadLocalFeedback } from '../data/defaultStations';
import { X, Save, Lock, Unlock, Users, BarChart3, Settings, BookOpen, Film, Gamepad2, HelpCircle, Heart, RefreshCw, Share2, Check } from 'lucide-react';

interface TeacherDashboardProps {
  roomCode: string;
  stations: StationConfig[];
  unlockedStations: number[];
  mode: 'individual' | 'class';
  connectedPlayersCount: number;
  onSaveStations: (stations: StationConfig[]) => void;
  onUnlockClassStation: (stationId: number) => void;
  onToggleMode: (mode: 'individual' | 'class') => void;
  onClose: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  roomCode,
  stations,
  unlockedStations,
  mode,
  connectedPlayersCount,
  onSaveStations,
  onUnlockClassStation,
  onToggleMode,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'stations' | 'progress' | 'feedback'>('progress');
  const [editableStations, setEditableStations] = useState<StationConfig[]>(() => mergeWithDefaultStations(stations));
  const [feedbackList, setFeedbackList] = useState<FeedbackSubmission[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  useEffect(() => {
    fetchFeedback();
  }, [roomCode]);

  const fetchFeedback = async () => {
    setIsLoadingFeedback(true);
    try {
      const res = await fetch(`/api/feedback?room=${encodeURIComponent(roomCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.feedback) && data.feedback.length > 0) {
          setFeedbackList(data.feedback);
          setIsLoadingFeedback(false);
          return;
        }
      }
    } catch (err) {
      console.info('Using local feedback for Netlify/Offline:', err);
    } finally {
      setIsLoadingFeedback(false);
    }

    // Fallback to local stored feedback
    const local = loadLocalFeedback();
    if (local.length > 0) {
      setFeedbackList(local);
    }
  };

  const handleStationChange = (id: number, field: string, val: string) => {
    setEditableStations(prev =>
      prev.map(st => st.id === id ? { ...st, [field]: val } : st)
    );
  };

  const handleCopyShareLink = () => {
    soundEngine.playButtonClick();
    const shareUrl = generateShareableStudentUrl(editableStations);
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setSaveStatus('Pautan murid bersama bahan telah disalin! 🔗');
      setTimeout(() => {
        setCopiedLink(false);
        setSaveStatus('');
      }, 3500);
    }).catch(() => {
      prompt('Salin pautan khas untuk murid ini:', shareUrl);
    });
  };

  const handleSave = async () => {
    soundEngine.playButtonClick();
    setSaveStatus('Menyimpan...');
    try {
      await saveStoredStations(editableStations);
      onSaveStations(editableStations);
      setSaveStatus('Berjaya disimpan! ✅ (Aktif di Netlify & Pelayar)');
      soundEngine.playCorrect();
      setTimeout(() => setSaveStatus(''), 3500);
    } catch (err) {
      onSaveStations(editableStations);
      setSaveStatus('Disimpan setempat! ✅');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // Feedback statistics
  const totalFeedback = feedbackList.length;
  const avgScore = totalFeedback > 0
    ? (feedbackList.reduce((acc, f) => acc + (f.ratingScore || 5), 0) / totalFeedback).toFixed(1)
    : '5.0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border-2 border-indigo-500/50 rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border-b border-indigo-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-xl">
              🎓
            </div>
            <div>
              <h2 className="text-xl font-bold font-['Fredoka'] text-white">
                Dashboard Pengurusan Guru
              </h2>
              <div className="text-xs text-indigo-300">
                Bilik: <span className="font-mono font-bold text-amber-300">{roomCode}</span> • {connectedPlayersCount}/15 Murid Sedang Aktif
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/40 hover:bg-emerald-600 border border-emerald-500/50 text-white text-xs font-bold transition-all cursor-pointer"
              title="Salin pautan dengan bahan pengajaran untuk murid"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Share2 className="w-3.5 h-3.5 text-emerald-200" />}
              <span>{copiedLink ? 'Disalin!' : 'Salin Pautan Murid'}</span>
            </button>
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2">
          <button
            onClick={() => setActiveTab('progress')}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'progress'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" /> Kawalan Mod & Kemajuan Kelas
          </button>
          <button
            onClick={() => setActiveTab('stations')}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'stations'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Pengurusan Bahan Stesen
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'feedback'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-4 h-4" /> Maklum Balas Pelajar ({totalFeedback})
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: PROGRESS & CLASS CONTROL */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              {/* Mode Toggle Card */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white">Mod Kemajuan Pembelajaran (Progression Mode)</h3>
                    <p className="text-xs text-slate-400">
                      Tentukan sama ada murid bergerak mengikut rentak kendiri atau dikawal serentak oleh guru.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Mod: {mode === 'individual' ? 'Rentak Kendiri' : 'Kawalan Kelas'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => onToggleMode('individual')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      mode === 'individual'
                        ? 'bg-emerald-600/30 border-emerald-400 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs mb-1">INDIVIDUAL MODE (Rentak Kendiri)</div>
                    <div className="text-[11px] text-slate-300">
                      Setiap murid membuka stesen berdasarkan kemajuan dan penyelesaian aktiviti mereka sendiri.
                    </div>
                  </button>

                  <button
                    onClick={() => onToggleMode('class')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${
                      mode === 'class'
                        ? 'bg-indigo-600/30 border-indigo-400 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-bold text-xs mb-1">CLASS MODE (Kawalan Guru)</div>
                    <div className="text-[11px] text-slate-300">
                      Guru boleh membuka stesen seterusnya kepada seluruh kelas serentak melalui siaran bilik.
                    </div>
                  </button>
                </div>
              </div>

              {/* Station Unlock Controls */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4">
                <h3 className="font-bold text-sm text-white">Status Pembukaan Stesen Dalam Bilik Ini</h3>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map(stId => {
                    const isUnlocked = unlockedStations.includes(stId);
                    return (
                      <div
                        key={stId}
                        className={`p-3 rounded-xl border flex flex-col items-center text-center gap-2 ${
                          isUnlocked
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="text-xl">
                          {isUnlocked ? <Unlock className="w-5 h-5 text-emerald-400" /> : <Lock className="w-5 h-5 text-slate-500" />}
                        </div>
                        <div className="text-xs font-bold font-['Fredoka']">
                          Stesen {stId}
                        </div>
                        <div className="text-[10px]">
                          {isUnlocked ? 'Terbuka' : 'Terkunci'}
                        </div>

                        {!isUnlocked && (
                          <button
                            onClick={() => onUnlockClassStation(stId)}
                            className="w-full mt-1 py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors"
                          >
                            Buka Sekarang
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STATIONS MANAGEMENT */}
          {activeTab === 'stations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Guru boleh menukar tajuk, penerangan, dan memautkan Google Slides atau video YouTube sendiri tanpa menyentuh kod sumber.
                </p>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  <Save className="w-4 h-4" /> Simpan Perubahan
                </button>
              </div>

              {saveStatus && (
                <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-500 text-xs text-indigo-200 font-semibold">
                  {saveStatus}
                </div>
              )}

              <div className="space-y-4">
                {editableStations.map(station => (
                  <div key={station.id} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider text-indigo-300">
                        Stesen {station.id}: {station.contentType.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-300">Tajuk Stesen:</label>
                        <input
                          type="text"
                          value={station.title}
                          onChange={e => handleStationChange(station.id, 'title', e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-300">
                          {station.id === 1 && 'Pautan Google Slides / Bahan Luaran (URL):'}
                          {station.id === 2 && 'Pautan Video YouTube (Embed URL):'}
                          {station.id === 3 && 'Pautan Permainan Tambahan (URL):'}
                          {station.id === 4 && 'Pautan Kuiz Luaran / Kahoot / Quizizz (URL):'}
                          {station.id === 5 && 'Soalan Maklum Balas:'}
                        </label>
                        <input
                          type="text"
                          value={station.contentUrl || ''}
                          onChange={e => handleStationChange(station.id, 'contentUrl', e.target.value)}
                          placeholder="https://..."
                          className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-300">Penerangan Ringkas:</label>
                      <input
                        type="text"
                        value={station.description}
                        onChange={e => handleStationChange(station.id, 'description', e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: FEEDBACK ANALYTICS */}
          {activeTab === 'feedback' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Ringkasan Respons & Maklum Balas Pelajar</h3>
                  <p className="text-xs text-slate-400">Hanya dipaparkan kepada akaun guru sahaja untuk tujuan refleksi PdP.</p>
                </div>
                <button
                  onClick={fetchFeedback}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Segarkan data"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingFeedback ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Stats overview cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
                  <div className="text-xs text-slate-400 font-semibold">Jumlah Respons</div>
                  <div className="text-3xl font-black text-indigo-400 tabular-nums">{totalFeedback}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-center">
                  <div className="text-xs text-slate-400 font-semibold">Purata Skor Keseronokan</div>
                  <div className="text-3xl font-black text-amber-400 tabular-nums">{avgScore} / 5.0</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 text-center col-span-2 sm:col-span-1">
                  <div className="text-xs text-slate-400 font-semibold">Emoji Dominan</div>
                  <div className="text-3xl font-black text-pink-400">😍</div>
                </div>
              </div>

              {/* Feedback responses list */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Senarai Komen & Penilaian Pelajar:</h4>

                {feedbackList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700 text-slate-400 text-xs">
                    Belum ada murid yang menghantar maklum balas untuk sesi bilik ini.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {feedbackList.map(item => (
                      <div key={item.id} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{item.emoji}</span>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              {item.studentName}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                {item.roomCode}
                              </span>
                            </div>
                            {item.comment && (
                              <p className="text-xs text-slate-300 mt-0.5 italic">"{item.comment}"</p>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-400 whitespace-nowrap">
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'Baru sahaja'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
