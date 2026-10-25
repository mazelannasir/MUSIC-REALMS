import React, { useState, useEffect } from 'react';
import { AVATARS, AvatarDefinition } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { Volume2, VolumeX, Music, HelpCircle, Info, Sparkles, User, ShieldCheck, Compass, ArrowRight } from 'lucide-react';

interface MainMenuProps {
  onStartAdventure: (data: {
    avatarId: number;
    playerName: string;
    email: string;
    roomCode: string;
    role: 'student' | 'teacher';
  }) => void;
  onOpenTeacherEditor?: () => void;
  onOpenInvite?: (roomCode: string) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartAdventure, onOpenTeacherEditor, onOpenInvite }) => {
  const [email, setEmail] = useState<string>(() => {
    try {
      return localStorage.getItem('music_realms_last_email') || '';
    } catch {
      return '';
    }
  });
  const [emailError, setEmailError] = useState<string>('');
  const [isAvatarBound, setIsAvatarBound] = useState<boolean>(false);

  const [selectedAvatarId, setSelectedAvatarId] = useState<number>(() => {
    try {
      const savedEmail = (localStorage.getItem('music_realms_last_email') || '').trim().toLowerCase();
      if (savedEmail) {
        const storedAvatar = localStorage.getItem(`music_realms_user_avatar_${savedEmail}`);
        if (storedAvatar) {
          const num = parseInt(storedAvatar, 10);
          if (num >= 1 && num <= 5) return num;
        }
      }
    } catch {}
    return 1;
  });

  const [playerName, setPlayerName] = useState<string>(() => {
    try {
      return localStorage.getItem('music_realms_last_player_name') || 'Pengembara Cilik';
    } catch {
      return 'Pengembara Cilik';
    }
  });

  const [roomCode, setRoomCode] = useState<string>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const r = p.get('room');
      return r ? r.toUpperCase() : 'REALM-101';
    } catch {
      return 'REALM-101';
    }
  });
  const [isJoinedFromInvite, setIsJoinedFromInvite] = useState<boolean>(() => {
    try {
      return Boolean(new URLSearchParams(window.location.search).get('room'));
    } catch {
      return false;
    }
  });
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [musicEnabled, setMusicEnabled] = useState<boolean>(true);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(false);
  const [showAbout, setShowAbout] = useState<boolean>(false);

  // Sync avatar when email changes
  useEffect(() => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setIsAvatarBound(false);
      return;
    }
    try {
      const stored = localStorage.getItem(`music_realms_user_avatar_${cleanEmail}`);
      if (stored) {
        const id = parseInt(stored, 10);
        if (id >= 1 && id <= 5) {
          setSelectedAvatarId(id);
          setIsAvatarBound(true);
          return;
        }
      }
      setIsAvatarBound(false);
    } catch {
      setIsAvatarBound(false);
    }
  }, [email]);

  useEffect(() => {
    // Listen for Enter key to start adventure
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !showHowToPlay && !showAbout) {
        handleStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAvatarId, playerName, email, roomCode, role, showHowToPlay, showAbout]);

  const handleStart = () => {
    const cleanEmail = email.trim().toLowerCase();
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setEmailError('Sila masukkan alamat emel yang sah (Contoh: m-1234567@moe-dl.edu.my atau nama@gmail.com) terlebih dahulu.');
      soundEngine.playWrong();
      return;
    }
    setEmailError('');

    soundEngine.playButtonClick();
    soundEngine.setMusicEnabled(musicEnabled);
    soundEngine.setSfxEnabled(sfxEnabled);
    if (musicEnabled) {
      soundEngine.startBgm();
    }

    const cleanName = playerName.trim() || cleanEmail.split('@')[0] || 'Pengembara Muzik';
    const cleanRoom = roomCode.trim().toUpperCase() || 'REALM-101';

    // Strictly bind this avatar to this email so reloads and re-entries automatically resume it
    try {
      localStorage.setItem(`music_realms_user_avatar_${cleanEmail}`, String(selectedAvatarId));
      localStorage.setItem('music_realms_last_email', cleanEmail);
      localStorage.setItem('music_realms_last_player_name', cleanName);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    onStartAdventure({
      avatarId: selectedAvatarId,
      playerName: cleanName,
      email: cleanEmail,
      roomCode: cleanRoom,
      role
    });
  };

  const toggleMusic = () => {
    soundEngine.playButtonClick();
    const next = !musicEnabled;
    setMusicEnabled(next);
    soundEngine.setMusicEnabled(next);
  };

  const toggleSfx = () => {
    soundEngine.playButtonClick();
    const next = !sfxEnabled;
    setSfxEnabled(next);
    soundEngine.setSfxEnabled(next);
  };

  const selectedAvatar = AVATARS.find(a => a.id === selectedAvatarId) || AVATARS[0];

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-between p-4 sm:p-8 bg-gradient-to-b from-[#130d2d] via-[#1e1346] to-[#0c081e] text-white overflow-x-hidden select-none">
      {/* Ambient Celestial Glows */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header / Audio & Info Bar */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between py-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <span className="text-xs uppercase tracking-widest font-bold text-indigo-300">
            Kembara Pembelajaran Maya Muzik 3D
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMusic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
              musicEnabled
                ? 'bg-purple-950/80 border-purple-500/50 text-purple-200'
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Muzik {musicEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={toggleSfx}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
              sfxEnabled
                ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-200'
                : 'bg-slate-900 border-slate-700 text-slate-500'
            }`}
          >
            {sfxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Kesan Bunyi</span>
          </button>

          {onOpenInvite && (
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onOpenInvite(roomCode);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 border border-pink-400 text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>🔗</span>
              <span className="hidden sm:inline">Jemput Murid / Kongsi Link</span>
              <span className="sm:hidden">Kongsi</span>
            </button>
          )}

          {onOpenTeacherEditor && (
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onOpenTeacherEditor();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 border border-purple-400 text-xs font-bold text-white transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>🔐</span>
              <span className="hidden sm:inline">Platform Bahan Guru</span>
              <span className="sm:hidden">Bahan Guru</span>
            </button>
          )}

          <button
            onClick={() => {
              soundEngine.playButtonClick();
              setShowHowToPlay(true);
            }}
            className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Cara Bermain"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              soundEngine.playButtonClick();
              setShowAbout(true);
            }}
            className="p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Mengenai Aplikasi"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="relative z-10 w-full max-w-4xl my-auto py-6 flex flex-col items-center gap-6">
        {/* Title Lockup with Bespoke SVG & Neon Glow */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-indigo-500/20 border border-purple-400/40 text-xs font-bold text-pink-300 uppercase tracking-widest shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            Magical Musical Sky Kingdom
          </div>

          <div className="relative">
            <h1 className="text-5xl sm:text-7xl font-black font-['Fredoka'] tracking-tight bg-gradient-to-r from-amber-300 via-pink-400 to-cyan-300 bg-clip-text text-transparent drop-shadow-[0_10px_25px_rgba(236,72,153,0.35)]">
              MUSIC REALMS
            </h1>
            <div className="flex items-center justify-center gap-3 text-lg font-bold text-indigo-200 mt-1">
              <span>🎵</span>
              <span className="tracking-wide">Penerokaan Dunia Fantasi Pendidikan Muzik</span>
              <span>🎶</span>
            </div>
          </div>
        </div>

        {/* Avatar Selection Deck */}
        <div className="w-full space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <User className="w-4 h-4 text-pink-400" /> Pilih Watak Avatar Anda (5 Pilihan):
            </span>
            <span className="text-xs font-semibold text-pink-300">
              {selectedAvatar.title}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {AVATARS.map(avatar => {
              const isSelected = avatar.id === selectedAvatarId;
              return (
                <button
                  key={avatar.id}
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setSelectedAvatarId(avatar.id);
                  }}
                  className={`group relative flex flex-col items-center p-3 rounded-2xl border-2 transition-all active:scale-95 text-center ${
                    isSelected
                      ? 'bg-slate-800/95 border-pink-400 shadow-xl shadow-pink-500/20 scale-105'
                      : 'bg-slate-900/70 border-slate-700/60 hover:border-slate-500 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Avatar Icon Badge */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner mb-2 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${avatar.primaryColor}33`, borderColor: avatar.primaryColor, borderWidth: '2px' }}
                  >
                    <span>{avatar.emoji}</span>
                  </div>

                  <div className="text-sm font-bold font-['Fredoka'] text-white">
                    {avatar.name.split(' ')[0]}
                  </div>

                  <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                    {avatar.instrument}
                  </div>

                  {/* Active selection dot */}
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-pink-500 border-2 border-slate-950 flex items-center justify-center text-[10px] font-black text-white shadow-md">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Avatar Lore Snippet */}
          <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
            <span className="text-xl">{selectedAvatar.emoji}</span>
            <p className="flex-1">
              <strong>{selectedAvatar.name}:</strong> {selectedAvatar.description} Dilengkapi dengan <em>{selectedAvatar.instrument}</em> dan <em>{selectedAvatar.headwear}</em>.
            </p>
          </div>
        </div>

        {/* Inputs: Email (Mandatory), Player Name, Room Code, Role */}
        <div className="w-full space-y-3">
          {/* Email Input (Wajib) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-md space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>📧</span> Alamat Emel Murid / Guru <span className="text-pink-400 font-extrabold">(Wajib Diisi):</span>
              </label>
              <span className="text-[11px] text-slate-400">
                1 Emel = 1 Avatar Kekal (Auto-Sambung jika re-entry)
              </span>
            </div>

            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                placeholder="Contoh: m-1234567@moe-dl.edu.my atau pengembara@gmail.com"
                className={`w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border text-white font-medium text-sm focus:outline-none transition-all shadow-inner ${
                  emailError ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-slate-700 focus:border-pink-500'
                }`}
              />
            </div>

            {emailError && (
              <p className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                <span>⚠️</span> {emailError}
              </p>
            )}

            {isAvatarBound && (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-950/50 border border-purple-500/40 text-xs text-purple-200">
                <span className="text-base">✨</span>
                <span>
                  Selamat kembali! Emel ini terikat dengan avatar <strong>{selectedAvatar.name}</strong>. Anda akan terus menyambung dengan avatar ini tanpa membuat avatar baharu!
                </span>
              </div>
            )}
          </div>

          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nama Samaran Pemain:
              </label>
              <input
                type="text"
                maxLength={16}
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder="Masukkan nama anda..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-semibold text-sm focus:outline-none focus:border-pink-500 shadow-inner"
              />
            </div>

            {/* Room Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Kod Bilik Multiplayer:</span>
                <span className="text-[10px] text-indigo-300 font-bold bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-700/50">Maks 20 Pemain</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  maxLength={12}
                  value={roomCode}
                  onChange={e => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Cth: REALM-101"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-mono font-bold text-sm focus:outline-none focus:border-pink-500 shadow-inner"
                />
                {onOpenInvite && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playButtonClick();
                      onOpenInvite(roomCode);
                    }}
                    className="px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-md active:scale-95 cursor-pointer"
                    title="Kongsi pautan bilik ini"
                  >
                    <span>🔗</span>
                    <span className="hidden sm:inline">Kongsi</span>
                  </button>
                )}
              </div>
            </div>

            {/* Role Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Peranan Pengguna:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setRole('student');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    role === 'student'
                      ? 'bg-emerald-600/40 border-emerald-400 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🎒 Murid
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playButtonClick();
                    setRole('teacher');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    role === 'teacher'
                      ? 'bg-indigo-600/40 border-indigo-400 text-indigo-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🎓 Guru
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Start Adventure Big CTA */}
        <div className="w-full flex flex-col items-center gap-2 pt-2">
          <button
            onClick={handleStart}
            className="group relative w-full sm:w-auto min-w-[320px] px-8 py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:via-purple-500 hover:to-indigo-500 text-white font-black font-['Fredoka'] text-xl tracking-wide shadow-2xl shadow-purple-600/40 hover:shadow-purple-500/60 hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer"
          >
            <Sparkles className="w-6 h-6 text-yellow-300 group-hover:rotate-12 transition-transform" />
            <span>MASUK MUSIC REALMS</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
          </button>

          <p className="text-xs text-slate-400">
            Tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-mono">ENTER</kbd> atau klik butang di atas untuk memulakan kembara
          </p>
        </div>
      </main>

      {/* Flat Control Hints Footer */}
      <footer className="relative z-10 w-full max-w-5xl py-2 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 gap-2">
        <div className="flex items-center gap-4">
          <span>🎮 <strong>WASD / Anak Panah</strong> Gerak</span>
          <span>•</span>
          <span><strong>SPACE</strong> Lompat</span>
          <span>•</span>
          <span><strong>E / Enter</strong> Interaksi</span>
          <span>•</span>
          <span><strong>H</strong> Sembunyi HUD</span>
        </div>

        <div className="text-[11px] text-slate-500">
          Music Realms v1.0 • Platform Maya Pendidikan Muzik Sekolah Rendah
        </div>
      </footer>

      {/* How To Play Modal */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border-2 border-indigo-500/40 text-white space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold font-['Fredoka'] text-indigo-300 flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-400" /> Panduan Bermain Music Realms
            </h3>
            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <p><strong>1. Kawalan Avatar:</strong> Gunakan kekunci W, A, S, D atau butang anak panah untuk berjalan di atas pulau terapung. Pada telefon, gunakan joystick maya di skrin.</p>
              <p><strong>2. Aliran Pembelajaran:</strong> Anda bermula di <em>Music Plaza</em>. Terokai 5 stesen mengikut turutan:</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-300">
                <li>Stesen 1: Slide Sanctuary (Belajar Baluk & Not G, A, B)</li>
                <li>Stesen 2: Animation Cloud Theatre (Video Animasi Irama)</li>
                <li>Stesen 3: Game Galaxy (Permainan Arkad Irama)</li>
                <li>Stesen 4: Quiz Constellation (Kuiz Bintang Pengetahuan)</li>
                <li>Stesen 5: Emoji Feedback Cloud (Maklum Balas Emoji)</li>
              </ul>
              <p><strong>3. Membuka Jambatan:</strong> Setiap jambatan akan terbuka selepas anda melengkapkan stesen sebelumnya dan menekan "Tanda Sebagai Selesai".</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  setShowHowToPlay(false);
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Faham & Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border-2 border-indigo-500/40 text-white space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold font-['Fredoka'] text-indigo-300 flex items-center gap-2">
              <Info className="w-5 h-5 text-indigo-400" /> Mengenai MUSIC REALMS
            </h3>
            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <p><strong>Music Realms</strong> ialah platform pembelajaran maya 3D berasaskan penerokaan alam fantasi terapung untuk murid sekolah rendah yang mempelajari modul Pendidikan Muzik.</p>
              <p>Menyokong sehingga 20 pemain serentak dalam satu bilik maya, membolehkan murid meneroka bersama rakan sekelas dan guru memantau kemajuan serta maklum balas secara langsung.</p>
              <p>Dilengkapi sintesis audio Web Audio API berketepatan tinggi untuk pembelajaran pic not G (392Hz), A (440Hz), dan B (494Hz).</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  setShowAbout(false);
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
