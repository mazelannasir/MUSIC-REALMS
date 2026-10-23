import React, { useState, useEffect, useRef } from 'react';
import { StationId, AVATARS, WORLD_LOCATIONS } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { Volume2, VolumeX, Music, MapPin, Settings, LogOut, ChevronDown, ChevronUp, Sparkles, Send, ShieldCheck, Compass, Eye } from 'lucide-react';

interface PlayerHUDProps {
  playerName: string;
  avatarId: number;
  role: 'student' | 'teacher';
  roomCode: string;
  onlineCount: number;
  unlockedStations: number[];
  completedStations: number[];
  nearbyStation: { id: StationId; name: string } | null;
  onOpenStation: (id: StationId) => void;
  onSendEmote: (emote: string) => void;
  onSendChat: (text: string) => void;
  onTriggerAnim: (anim: 'dance' | 'wave') => void;
  onChangeCamera: (view: 'follow' | 'top' | 'cinematic') => void;
  onToggleMiniMap: () => void;
  onOpenTeacherDashboard?: () => void;
  onOpenTeacherEditor?: () => void;
  onOpenInvite: () => void;
  onLeaveGame: () => void;
  onJoystickMove: (x: number, y: number) => void;
  onJump: () => void;
}

export const PlayerHUD: React.FC<PlayerHUDProps> = ({
  playerName,
  avatarId,
  role,
  roomCode,
  onlineCount,
  unlockedStations,
  completedStations,
  nearbyStation,
  onOpenStation,
  onSendEmote,
  onSendChat,
  onTriggerAnim,
  onChangeCamera,
  onToggleMiniMap,
  onOpenTeacherDashboard,
  onOpenTeacherEditor,
  onOpenInvite,
  onLeaveGame,
  onJoystickMove,
  onJump
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isMusicOn, setIsMusicOn] = useState(soundEngine.getMusicEnabled());
  const [isSfxOn, setIsSfxOn] = useState(soundEngine.getSfxEnabled());
  const [cameraView, setCameraView] = useState<'follow' | 'top' | 'cinematic'>('follow');

  // Virtual Joystick touch references
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickTouchId, setJoystickTouchId] = useState<number | null>(null);
  const [joystickThumb, setJoystickThumb] = useState({ x: 0, y: 0 });

  const avatar = AVATARS.find(a => a.id === avatarId) || AVATARS[0];

  // Shortcut 'H' to toggle dock
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'h') {
        setIsDockCollapsed(prev => !prev);
      }
      if ((e.key.toLowerCase() === 'e' || e.key === 'Enter') && nearbyStation) {
        onOpenStation(nearbyStation.id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nearbyStation, onOpenStation]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      onSendChat(chatInput.trim());
      setChatInput('');
    }
  };

  const toggleMusic = () => {
    soundEngine.playButtonClick();
    const next = !isMusicOn;
    setIsMusicOn(next);
    soundEngine.setMusicEnabled(next);
  };

  const toggleSfx = () => {
    soundEngine.playButtonClick();
    const next = !isSfxOn;
    setIsSfxOn(next);
    soundEngine.setSfxEnabled(next);
  };

  // Touch joystick handlers
  const handleJoystickStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    setJoystickTouchId(touch.identifier);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (joystickTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        updateJoystick(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleJoystickEnd = () => {
    setJoystickTouchId(null);
    setJoystickThumb({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickRef.current) return;
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2;

    const distance = Math.min(maxRadius, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);

    const thumbX = Math.cos(angle) * distance;
    const thumbY = Math.sin(angle) * distance;

    setJoystickThumb({ x: thumbX, y: thumbY });
    onJoystickMove(thumbX / maxRadius, thumbY / maxRadius);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 sm:p-5 select-none overflow-hidden">
      {/* ---------------- TOP PERIMETER STATUS CLUSTERS ---------------- */}
      <div className="w-full flex items-start justify-between gap-3">
        {/* Top-Left: Player & Room Info */}
        <div className="pointer-events-auto flex items-center gap-2.5 p-2 pr-4 rounded-2xl bg-slate-900/90 border border-indigo-500/40 shadow-xl text-white">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner border"
            style={{ backgroundColor: `${avatar.primaryColor}33`, borderColor: avatar.primaryColor }}
          >
            <span>{avatar.emoji}</span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm font-['Fredoka']">{playerName}</span>
              {role === 'teacher' && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-[10px] font-bold text-indigo-100">
                  GURU
                </span>
              )}
            </div>
            <div className="text-[11px] text-indigo-300 font-mono">
              Bilik: <span className="text-amber-300 font-bold">{roomCode}</span>
            </div>
          </div>
        </div>

        {/* Top-Center: Realm Progression Tracker (7 Badges) */}
        <div className="pointer-events-auto hidden md:flex flex-col items-center gap-1 px-4 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-xl text-white">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-yellow-300" /> KEMAJUAN REALM: {completedStations.length}/7 SELESAI
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 1, label: 'S1' },
              { id: 2, label: 'S2' },
              { id: 3, label: 'G1' },
              { id: 6, label: 'G2' },
              { id: 7, label: 'G3' },
              { id: 4, label: 'S4' },
              { id: 5, label: 'S5' }
            ].map(st => {
              const isComp = completedStations.includes(st.id);
              const isUnl = unlockedStations.includes(st.id);
              return (
                <div
                  key={st.id}
                  className={`px-2 py-1 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all ${
                    isComp
                      ? 'bg-emerald-500 border border-emerald-300 text-slate-950 font-black shadow-md shadow-emerald-500/30'
                      : isUnl
                      ? 'bg-indigo-600/60 border border-indigo-400 text-white'
                      : 'bg-slate-800 border border-slate-700 text-slate-500'
                  }`}
                  title={`Stesen ${st.label}: ${isComp ? 'Selesai' : isUnl ? 'Terbuka' : 'Terkunci'}`}
                >
                  {isComp ? '✓' : st.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Top-Right: Online Players & Quick Controls */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Online Players Readout */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="tabular-nums text-emerald-300">{onlineCount}/15</span>
            <span className="hidden sm:inline text-slate-400">ONLINE</span>
          </div>

          {/* Invite / Share Button */}
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onOpenInvite();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 border border-pink-400 text-white text-xs font-bold shadow-lg shadow-pink-600/30 transition-all cursor-pointer active:scale-95"
            title="Jemput murid atau kongsikan pautan bilik"
          >
            <span>🔗</span>
            <span className="hidden sm:inline">Jemput Murid</span>
          </button>

          {/* MiniMap Toggle */}
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onToggleMiniMap();
            }}
            className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors shadow-lg cursor-pointer"
            title="Buka Peta Alam (M)"
          >
            <MapPin className="w-4 h-4" />
          </button>

          {/* Audio Toggles */}
          <button
            onClick={toggleMusic}
            className={`p-2 rounded-xl border transition-colors shadow-lg cursor-pointer ${
              isMusicOn
                ? 'bg-purple-950/90 border-purple-500/50 text-purple-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-500'
            }`}
            title="Muzik Latar ON/OFF"
          >
            <Music className="w-4 h-4" />
          </button>

          <button
            onClick={toggleSfx}
            className={`p-2 rounded-xl border transition-colors shadow-lg cursor-pointer ${
              isSfxOn
                ? 'bg-indigo-950/90 border-indigo-500/50 text-indigo-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-500'
            }`}
            title="Kesan Bunyi ON/OFF"
          >
            {isSfxOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Teacher Platform Button (Protected by 7770) */}
          {onOpenTeacherEditor && (
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onOpenTeacherEditor();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 border border-purple-400 text-white text-xs font-bold shadow-lg shadow-purple-700/30 transition-all cursor-pointer active:scale-95"
              title="Akses Platform Guru untuk mengurus bahan stesen"
            >
              <span>🔐</span>
              <span className="hidden sm:inline">Platform Bahan Guru</span>
              <span className="sm:hidden">Guru</span>
            </button>
          )}

          {/* Teacher Dashboard if teacher role */}
          {role === 'teacher' && onOpenTeacherDashboard && (
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onOpenTeacherDashboard();
              }}
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 border border-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              title="Kawalan kelas dan statistik murid"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Panel Guru</span>
            </button>
          )}

          {/* Prominent, Bug-Free Log Out / Exit Button */}
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              setShowLeaveConfirm(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 border border-red-400 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer active:scale-95"
            title="Keluar ke Halaman Utama"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      {/* ---------------- CENTER INTERACTION PROMPT BANNER ---------------- */}
      {nearbyStation && (
        <div className="pointer-events-auto self-center animate-in zoom-in-95 duration-200 mb-4">
          <button
            onClick={() => {
              soundEngine.playInteract();
              onOpenStation(nearbyStation.id);
            }}
            className="group px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-pink-500 to-indigo-600 border-2 border-white/80 shadow-2xl shadow-pink-500/50 text-white font-black font-['Fredoka'] text-base sm:text-lg flex items-center gap-3 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <span className="w-7 h-7 rounded-lg bg-white/20 border border-white/40 flex items-center justify-center text-xs font-mono">
              E
            </span>
            <span>TEROKAI {nearbyStation.name.toUpperCase()}</span>
            <span className="text-xl group-hover:translate-x-1 transition-transform">✨</span>
          </button>
        </div>
      )}

      {/* ---------------- MOBILE TOUCH CONTROLS (JOYSTICK & ACTIONS) ---------------- */}
      <div className="pointer-events-none flex md:hidden items-end justify-between w-full px-2 mb-20">
        {/* Virtual Joystick */}
        <div
          ref={joystickRef}
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
          className="pointer-events-auto relative w-28 h-28 rounded-full bg-slate-900/60 border-2 border-slate-600/60 backdrop-blur-sm flex items-center justify-center touch-none shadow-xl"
        >
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-pink-500 border-2 border-white/80 shadow-lg pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate(${joystickThumb.x}px, ${joystickThumb.y}px)`
            }}
          />
        </div>

        {/* Action Buttons (Jump + Interact) */}
        <div className="pointer-events-auto flex flex-col gap-3">
          {nearbyStation && (
            <button
              onClick={() => {
                soundEngine.playInteract();
                onOpenStation(nearbyStation.id);
              }}
              className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-xs active:scale-90 transition-transform"
            >
              BUKA ✨
            </button>
          )}

          <button
            onClick={() => {
              onJump();
            }}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 border-2 border-indigo-300 shadow-xl flex items-center justify-center text-white font-black text-xs active:scale-90 transition-transform"
          >
            LOMPAT
          </button>
        </div>
      </div>

      {/* ---------------- COLLAPSIBLE UNIFIED BOTTOM CONTROL DOCK ---------------- */}
      <div className="pointer-events-auto self-center flex flex-col items-center max-w-full z-30 transition-transform duration-300">
        {/* Collapse / Expand Toggle Tab */}
        <button
          onClick={() => {
            soundEngine.playButtonClick();
            setIsDockCollapsed(prev => !prev);
          }}
          className="px-3 py-1 rounded-t-xl bg-slate-900/90 border-t border-x border-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center gap-1 shadow-lg cursor-pointer"
        >
          {isDockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{isDockCollapsed ? 'Tunjuk Kawalan (H)' : 'Sembunyi Kawalan (H)'}</span>
        </button>

        {/* Dock Content */}
        {!isDockCollapsed && (
          <div className="flex flex-wrap items-center justify-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl text-white max-w-full overflow-x-auto">
            {/* Quick Emotes */}
            <div className="flex items-center gap-1 px-1 border-r border-slate-800 pr-2">
              {['🎵', '🎶', '👏', '✨', '🎸', '💖'].map(em => (
                <button
                  key={em}
                  onClick={() => {
                    onSendEmote(em);
                  }}
                  className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-base hover:scale-115 active:scale-90 transition-all cursor-pointer"
                  title={`Hantar Emote ${em}`}
                >
                  {em}
                </button>
              ))}
            </div>

            {/* Avatar Animation Emotes */}
            <div className="flex items-center gap-1 px-1 border-r border-slate-800 pr-2">
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  onTriggerAnim('dance');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <span>💃</span>
                <span className="hidden sm:inline">Menari</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  onTriggerAnim('wave');
                }}
                className="px-2.5 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <span>👋</span>
                <span className="hidden sm:inline">Melambai</span>
              </button>
            </div>

            {/* Quick Speech / Chat Input */}
            <form onSubmit={handleChatSubmit} className="flex items-center gap-1">
              <input
                type="text"
                maxLength={30}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Mesej sembang..."
                className="w-28 sm:w-44 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="p-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                title="Hantar Mesej"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Camera View Switcher */}
            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-slate-800">
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  setCameraView('follow');
                  onChangeCamera('follow');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  cameraView === 'follow' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Ikut
              </button>
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  setCameraView('top');
                  onChangeCamera('top');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  cameraView === 'top' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Atas
              </button>
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  setCameraView('cinematic');
                  onChangeCamera('cinematic');
                }}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  cameraView === 'cinematic' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sinematik
              </button>
            </div>
          </div>
        )}
      </div>

      {/* In-Game Leave Confirmation Dialog (Fixes blocked window.confirm) */}
      {showLeaveConfirm && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in select-none">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border-2 border-red-500/50 shadow-2xl text-center space-y-4 text-white">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-3xl">
              🚪
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-bold font-['Fredoka'] text-white">
                Keluar ke Halaman Utama?
              </h4>
              <p className="text-xs text-slate-300">
                Kemajuan stesen anda telah direkodkan. Anda boleh menyertai semula bila-bila masa.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  setShowLeaveConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal / Teruskan
              </button>
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  setShowLeaveConfirm(false);
                  onLeaveGame();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all cursor-pointer active:scale-95"
              >
                Ya, Keluar Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
