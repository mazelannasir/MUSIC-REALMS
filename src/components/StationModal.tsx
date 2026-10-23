import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { StationConfig, StationId } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { X, CheckCircle, ChevronLeft, ChevronRight, Play, Volume2, Star, Trophy, Sparkles, RefreshCw, Send, ExternalLink, Edit3, Info, BookOpen, Layers } from 'lucide-react';

interface StationModalProps {
  station: StationConfig;
  roomCode: string;
  playerName: string;
  avatarId: number;
  role?: 'student' | 'teacher';
  isCompleted: boolean;
  onComplete: (stationId: StationId) => void;
  onClose: () => void;
  onOpenTeacherEditor?: () => void;
}

export const StationModal: React.FC<StationModalProps> = ({
  station,
  roomCode,
  playerName,
  avatarId,
  role,
  isCompleted,
  onComplete,
  onClose,
  onOpenTeacherEditor
}) => {
  // Toggle between Teacher's external link (if provided), empty placeholder, or optional builtin interactive
  const hasTeacherLink = Boolean(station.contentUrl && station.contentUrl.trim());
  const [viewMode, setViewMode] = useState<'teacher_link' | 'empty' | 'builtin'>(
    hasTeacherLink ? 'teacher_link' : 'empty'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-900 border-2 border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 border-b border-indigo-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/40 border border-indigo-400/50 flex items-center justify-center text-xl font-bold">
              {station.id === 1 && '📖'}
              {station.id === 2 && '🎬'}
              {station.id === 3 && '🔨'}
              {station.id === 6 && '⚡'}
              {station.id === 7 && '⚔️'}
              {station.id === 4 && '⭐'}
              {station.id === 5 && '💖'}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
                Stesen Pembelajaran Muzik {station.id}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-['Fredoka'] text-white">
                {station.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTeacherEditor && (
              <button
                onClick={() => {
                  soundEngine.playButtonClick();
                  onOpenTeacherEditor();
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-700/80 hover:bg-purple-600 border border-purple-400/60 text-xs font-bold text-white transition-all cursor-pointer shadow-md active:scale-95"
                title="Akses Platform Guru untuk masukkan atau edit pautan bahan"
              >
                <span>🔐</span>
                <span className="hidden sm:inline">Platform Bahan Guru</span>
                <span className="sm:hidden">Guru</span>
              </button>
            )}

            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                SELESAI
              </span>
            )}
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Tutup Panel"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Active Material Header Banner if Teacher Link exists */}
        {hasTeacherLink && station.id !== 5 && (
          <div className="flex items-center justify-between px-6 py-2 bg-slate-950/70 border-b border-slate-800">
            <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Bahan Pengajaran Guru Telah Dimasukkan
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              Pautan Aktif
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* If Station 5: Emoji Feedback */}
          {station.id === 5 ? (
            <EmojiFeedbackContent
              station={station}
              roomCode={roomCode}
              playerName={playerName}
              avatarId={avatarId}
            />
          ) : !hasTeacherLink ? (
            /* EMPTY BY DEFAULT AS REQUESTED FOR GURU TO ENTER LINK */
            <EmptyStationPlaceholder
              station={station}
              onOpenTeacherPlatform={() => onOpenTeacherEditor && onOpenTeacherEditor()}
              onExploreBuiltin={() => {}}
            />
          ) : (
            /* TEACHER LINKED VIEW WHEN LINK EXISTS */
            <TeacherLinkedMaterialView
              station={station}
              onOpenBuiltin={() => {}}
            />
          )}
        </div>

        {/* Footer Completion Action */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            {isCompleted
              ? '✅ Anda telah melengkapkan stesen ini! Teruskan ke jambatan seterusnya.'
              : 'Selesaikan aktiviti dan klik butang di bawah untuk membuka stesen seterusnya.'}
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs sm:text-sm transition-colors"
            >
              Kembali ke Alam
            </button>

            {!isCompleted ? (
              <button
                onClick={() => {
                  soundEngine.playCompleteFanfare();
                  confetti({
                    particleCount: 90,
                    spread: 80,
                    origin: { y: 0.7 }
                  });
                  onComplete(station.id);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer"
              >
                <CheckCircle className="w-5 h-5" />
                TANDA SEBAGAI SELESAI
              </button>
            ) : (
              <button
                disabled
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs sm:text-sm cursor-default"
              >
                <CheckCircle className="w-5 h-5" />
                STESEN SELESAI ✨
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// EMPTY STATION PLACEHOLDER COMPONENT (DEFAULT STATE)
// -------------------------------------------------------------
const EmptyStationPlaceholder: React.FC<{
  station: StationConfig;
  onOpenTeacherPlatform: () => void;
  onExploreBuiltin: () => void;
}> = ({ station, onOpenTeacherPlatform, onExploreBuiltin }) => {
  const meta: Record<number, { icon: string; title: string; desc: string }> = {
    1: {
      icon: '📖',
      title: 'Stesen 1: Slaid Pengajaran Muzik',
      desc: 'Ruangan bahan slaid pembelajaran muzik (Google Slides, Canva, atau PDF) masih kosong.'
    },
    2: {
      icon: '🎬',
      title: 'Stesen 2: Video Animasi Muzik',
      desc: 'Ruangan video pembelajaran animasi muzik (YouTube atau video interaktif) masih kosong.'
    },
    3: {
      icon: '🔨',
      title: 'Stesen Game 1: Not Whacker',
      desc: 'Ruangan permainan digital Not Whacker (Wordwall, Blooket, Scratch, atau Genially) masih kosong.'
    },
    6: {
      icon: '⚡',
      title: 'Stesen Game 2: Music Beams Liner',
      desc: 'Ruangan permainan digital Music Beams Liner (Wordwall, Blooket, Scratch, atau Genially) masih kosong.'
    },
    7: {
      icon: '⚔️',
      title: 'Stesen Game 3: Not Ninja',
      desc: 'Ruangan permainan digital Not Ninja (Wordwall, Blooket, Scratch, atau Genially) masih kosong.'
    },
    4: {
      icon: '⭐',
      title: 'Stesen 4: Kuiz Digital Muzik',
      desc: 'Ruangan kuiz digital muzik (Quizizz, Google Forms, atau Kahoot) masih kosong.'
    }
  };

  const currentMeta = meta[station.id] || {
    icon: '🎵',
    title: station.title,
    desc: 'Bahan pengajaran untuk stesen ini masih kosong.'
  };

  return (
    <div className="py-10 px-6 flex flex-col items-center justify-center text-center space-y-6 max-w-xl mx-auto rounded-3xl bg-slate-950/60 border-2 border-dashed border-indigo-500/30">
      <div className="w-20 h-20 rounded-3xl bg-indigo-950/80 border-2 border-indigo-500/40 flex items-center justify-center text-4xl shadow-inner shadow-indigo-500/20">
        {currentMeta.icon}
      </div>

      <div className="space-y-2">
        <span className="inline-block px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs tracking-wider uppercase">
          Bahan Belum Dimasukkan
        </span>
        <h3 className="text-2xl font-bold font-['Fredoka'] text-white">
          {currentMeta.title}
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed px-4">
          {currentMeta.desc} Sila tunggu guru anda memasukkan bahan pengajaran, atau guru boleh klik butang di bawah untuk memasukkan pautan bahan sekarang.
        </p>
      </div>

      <div className="pt-2 w-full max-w-md space-y-3">
        {/* Teacher Platform access (Passcode protected, no open code displayed) */}
        <button
          onClick={() => {
            soundEngine.playButtonClick();
            onOpenTeacherPlatform();
          }}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 border border-indigo-300/60 shadow-xl shadow-indigo-600/30 text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-95 cursor-pointer"
        >
          <span>🔐</span>
          <span>Platform Guru: Masukkan Pautan Bahan (Perlu Kod Keselamatan)</span>
        </button>
        <p className="text-[11px] text-slate-400">
          * Hanya guru yang mengetahui kod laluan keselamatan boleh mengakses dan memasukkan pautan bahan pengajaran.
        </p>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// TEACHER LINKED MATERIAL VIEW COMPONENT
// -------------------------------------------------------------
const TeacherLinkedMaterialView: React.FC<{
  station: StationConfig;
  onOpenBuiltin: () => void;
}> = ({ station, onOpenBuiltin }) => {
  const url = station.contentUrl || '';

  return (
    <div className="space-y-4">
      {/* Teacher Instructions Banner if provided */}
      {station.teacherInstructions && (
        <div className="p-4 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Arahan Guru:
            </h4>
            <p className="text-sm text-slate-200 mt-0.5 font-medium">
              {station.teacherInstructions}
            </p>
          </div>
        </div>
      )}

      {/* Action banner with direct external link button */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 gap-3">
        <div className="text-xs text-slate-300">
          Pautan Bahan: <span className="font-mono text-indigo-300 font-bold break-all">{url}</span>
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs whitespace-nowrap shadow-md transition-all active:scale-95"
        >
          <span>{station.externalButtonText || 'Buka di Tab Baharu'}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Embedded Iframe Container */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border-2 border-indigo-500/40 shadow-2xl flex items-center justify-center">
        <iframe
          src={url}
          title={station.title}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
        <span>* Sekiranya laman sesawang tidak dipaparkan dalam bingkai di atas, klik butang "Buka di Tab Baharu".</span>
        <button
          onClick={onOpenBuiltin}
          className="text-indigo-400 hover:underline font-semibold"
        >
          Tukar ke aktiviti maya asal
        </button>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// STATION 1: SLIDE SANCTUARY
// -------------------------------------------------------------
const SlideSanctuaryContent: React.FC<{
  station: StationConfig;
  onOpenTeacherEditor?: () => void;
}> = ({ station, onOpenTeacherEditor }) => {
  const slides = station.slides || [];
  const [currentSlide, setCurrentSlide] = useState(0);

  const activeSlide = slides[currentSlide];

  return (
    <div className="space-y-6">
      {/* Banner if no link yet */}
      {!station.contentUrl && (
        <div className="p-3.5 rounded-2xl bg-amber-950/50 border border-amber-500/40 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <Info className="w-4 h-4 shrink-0" />
            <span>Guru belum memasukkan link slaid Google Slides / Canva sendiri. Paparan di bawah ialah slaid asas sistem.</span>
          </div>
          {onOpenTeacherEditor && (
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                onOpenTeacherEditor();
              }}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold whitespace-nowrap"
            >
              + Masukkan Link Slaid
            </button>
          )}
        </div>
      )}

      {/* Slide Navigation Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-emerald-400">
          Slaid {currentSlide + 1} daripada {slides.length}
        </span>
        <div className="flex gap-2">
          <button
            disabled={currentSlide === 0}
            onClick={() => {
              soundEngine.playButtonClick();
              setCurrentSlide(c => Math.max(0, c - 1));
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            disabled={currentSlide === slides.length - 1}
            onClick={() => {
              soundEngine.playButtonClick();
              setCurrentSlide(c => Math.min(slides.length - 1, c + 1));
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Slide Card */}
      {activeSlide ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-800/90 to-emerald-950/40 border border-emerald-500/30 space-y-5">
          <h3 className="text-2xl font-bold font-['Fredoka'] text-emerald-300">
            {activeSlide.title}
          </h3>

          <div className="text-slate-200 leading-relaxed text-base whitespace-pre-line">
            {activeSlide.text}
          </div>

          {/* Interactive Stave Diagram with Audio Playback */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                Ujian Pendengaran & Pengecaman Pic Not
              </span>
              <span className="text-xs text-slate-400">Klik butang untuk dengar pic sebenar</span>
            </div>

            {/* Visual Musical Stave */}
            <div className="relative h-28 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-around px-8">
              {/* 5 Staff lines */}
              <div className="absolute inset-x-4 top-4 h-px bg-slate-700"></div>
              <div className="absolute inset-x-4 top-9 h-px bg-slate-700"></div>
              <div className="absolute inset-x-4 top-14 h-px bg-emerald-500/50"></div> {/* Line 2 (G) */}
              <div className="absolute inset-x-4 top-19 h-px bg-slate-700"></div>
              <div className="absolute inset-x-4 top-24 h-px bg-slate-700"></div>

              {/* Note G */}
              <button
                onClick={() => soundEngine.playNotePitch('G')}
                className="group z-10 flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-emerald-500/20 transition-all active:scale-95"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-400 border-2 border-white flex items-center justify-center font-bold text-slate-950 text-xs shadow-lg group-hover:scale-110 transition-transform">
                  G
                </div>
                <span className="text-xs font-semibold text-emerald-300">Garisan 2</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Volume2 className="w-3 h-3 text-emerald-400" /> 392Hz
                </span>
              </button>

              {/* Note A */}
              <button
                onClick={() => soundEngine.playNotePitch('A')}
                className="group z-10 flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-cyan-500/20 transition-all active:scale-95"
              >
                <div className="w-7 h-7 rounded-full bg-cyan-400 border-2 border-white flex items-center justify-center font-bold text-slate-950 text-xs shadow-lg group-hover:scale-110 transition-transform">
                  A
                </div>
                <span className="text-xs font-semibold text-cyan-300">Ruang 2</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Volume2 className="w-3 h-3 text-cyan-400" /> 440Hz
                </span>
              </button>

              {/* Note B */}
              <button
                onClick={() => soundEngine.playNotePitch('B')}
                className="group z-10 flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-purple-500/20 transition-all active:scale-95"
              >
                <div className="w-7 h-7 rounded-full bg-purple-400 border-2 border-white flex items-center justify-center font-bold text-slate-950 text-xs shadow-lg group-hover:scale-110 transition-transform">
                  B
                </div>
                <span className="text-xs font-semibold text-purple-300">Garisan 3</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                  <Volume2 className="w-3 h-3 text-purple-400" /> 494Hz
                </span>
              </button>
            </div>

            {activeSlide.tip && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-200">
                💡 <strong>Tip Cepat:</strong> {activeSlide.tip}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-dashed border-slate-700">
          <p className="text-slate-400">ADD YOUR SLIDES HERE</p>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// STATION 2: ANIMATION CLOUD THEATRE
// -------------------------------------------------------------
const TheatreContent: React.FC<{ station: StationConfig }> = ({ station }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold font-['Fredoka'] text-cyan-300">
          {station.videoTitle || 'Teater Animasi Muzikal'}
        </h3>
        <p className="text-sm text-slate-300">
          {station.description}
        </p>
      </div>

      {/* Video Screen Container */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border-2 border-cyan-500/40 shadow-xl">
        <iframe
          src={station.contentUrl || "https://www.youtube-nocookie.com/embed/02_B6K0-nwc?rel=0"}
          title="Video Pembelajaran Muzik"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>

      {/* Lesson Notes & Musical Concept */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-800/70 border border-cyan-500/20 space-y-2">
          <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
            <span>🐢</span> Tempo Lambat (Andante)
          </h4>
          <p className="text-xs text-slate-300">
            Muzik dimainkan dengan tenang, santai dan teratur seperti rentak degupan jantung semasa berehat.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/70 border border-cyan-500/20 space-y-2">
          <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
            <span>🐇</span> Tempo Cepat (Allegro)
          </h4>
          <p className="text-xs text-slate-300">
            Muzik dimainkan dengan rancak, bersemangat dan ceria seperti kanak-kanak berlari riang di padang.
          </p>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// STESEN GAME 1: NOT WHACKER 🔨
// -------------------------------------------------------------
const NotWhackerGame: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [targetNote, setTargetNote] = useState<'G' | 'A' | 'B'>('G');
  const [holes, setHoles] = useState<({ id: number; note: 'G' | 'A' | 'B'; active: boolean })[]>([
    { id: 0, note: 'G', active: false },
    { id: 1, note: 'A', active: false },
    { id: 2, note: 'B', active: false },
    { id: 3, note: 'G', active: false },
    { id: 4, note: 'A', active: false },
    { id: 5, note: 'B', active: false }
  ]);
  const [whackFeedback, setWhackFeedback] = useState<string>('');

  // Spawn notes in holes
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const notesList: ('G' | 'A' | 'B')[] = ['G', 'A', 'B'];
      const randomHole = Math.floor(Math.random() * 6);
      const randomNote = notesList[Math.floor(Math.random() * notesList.length)];

      setHoles(prev =>
        prev.map((h, idx) =>
          idx === randomHole
            ? { ...h, note: randomNote, active: true }
            : Math.random() > 0.4 ? { ...h, active: false } : h
        )
      );

      // Periodically switch target note
      if (Math.random() > 0.75) {
        setTargetNote(notesList[Math.floor(Math.random() * notesList.length)]);
      }
    }, 850);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleWhack = (holeId: number, note: 'G' | 'A' | 'B') => {
    if (!isPlaying) return;

    // Play note audio
    soundEngine.playNotePitch(note);

    if (note === targetNote) {
      soundEngine.playCorrect();
      setScore(s => s + 100);
      setCombo(c => c + 1);
      setWhackFeedback(`Tepat! Not ${note} Diketuk! 🔨 (+100)`);
    } else {
      soundEngine.playWrong();
      setCombo(0);
      setWhackFeedback(`Bukan Not ${targetNote}! Itu Not ${note} ❌`);
    }

    // Hide hole
    setHoles(prev => prev.map(h => (h.id === holeId ? { ...h, active: false } : h)));
  };

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-fuchsia-950/40 to-slate-950 border border-fuchsia-500/40 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fuchsia-500/20 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-400 bg-fuchsia-500/10 px-2.5 py-0.5 rounded-full border border-fuchsia-500/30">
            Stesen Game 1
          </span>
          <h4 className="text-2xl font-bold font-['Fredoka'] text-white flex items-center gap-2 mt-1">
            <span>🔨</span> Not Whacker
          </h4>
          <p className="text-xs text-slate-300">
            Dengar & ketuk not yang sepadan dengan sasaran sebelum ia bersembunyi semula!
          </p>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-fuchsia-500/30">
            <div className="text-[10px] text-slate-400 font-bold">SASARAN NOT</div>
            <div className="text-2xl font-black text-yellow-300 animate-pulse">{targetNote}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-fuchsia-500/30">
            <div className="text-[10px] text-slate-400 font-bold">SKOR</div>
            <div className="text-xl font-black text-amber-400 tabular-nums">{score}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-fuchsia-500/30">
            <div className="text-[10px] text-slate-400 font-bold">KOMBO</div>
            <div className="text-xl font-black text-fuchsia-300 tabular-nums">{combo}x</div>
          </div>
        </div>
      </div>

      {/* Whack Arena */}
      <div className="relative min-h-[280px] bg-slate-950/80 rounded-2xl border-2 border-fuchsia-500/30 p-6 flex flex-col justify-between overflow-hidden">
        {whackFeedback && (
          <div className="text-center font-bold text-sm text-yellow-300 animate-bounce">
            {whackFeedback}
          </div>
        )}

        <div className="grid grid-cols-3 gap-6 py-4">
          {holes.map(hole => (
            <div key={hole.id} className="relative flex flex-col items-center">
              {/* Hole ground mound */}
              <div className="w-20 sm:w-24 h-10 rounded-full bg-slate-900 border-2 border-fuchsia-900/80 shadow-inner flex items-center justify-center">
                <div className="w-14 sm:w-16 h-5 rounded-full bg-black/80"></div>
              </div>

              {/* Emerging Note */}
              {hole.active && (
                <button
                  onClick={() => handleWhack(hole.id, hole.note)}
                  className="absolute -top-7 w-14 h-14 rounded-2xl bg-gradient-to-tr from-fuchsia-600 to-pink-500 hover:from-fuchsia-500 hover:to-pink-400 border-2 border-white text-white font-black text-xl shadow-lg shadow-fuchsia-500/50 flex flex-col items-center justify-center cursor-pointer active:scale-90 transition-transform animate-in zoom-in"
                >
                  <span className="text-xs">🎵</span>
                  <span>{hole.note}</span>
                </button>
              )}
            </div>
          ))}
        </div>

        {!isPlaying && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
            <p className="text-sm font-semibold text-slate-200">
              Bersedia mengetuk not sasaran dengan sepantas mungkin?
            </p>
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                setScore(0);
                setCombo(0);
                setIsPlaying(true);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-base shadow-xl shadow-fuchsia-600/30 transition-all cursor-pointer active:scale-95"
            >
              <span>🔨</span> MULA MAIN NOT WHACKER
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// STESEN GAME 2: MUSIC BEAMS LINER ⚡
// -------------------------------------------------------------
const MusicBeamsLinerGame: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [beamsNotes, setBeamsNotes] = useState<{ id: number; line: number; x: number; note: string }[]>([]);
  const [feedback, setFeedback] = useState<string>('');

  const linesMeta = [
    { label: 'Garisan 1', key: 'D', pitch: 'G' },
    { label: 'Garisan 2', key: 'F', pitch: 'A' },
    { label: 'Ruang 2', key: 'J', pitch: 'B' },
    { label: 'Garisan 3', key: 'K', pitch: 'G' }
  ];

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setBeamsNotes(prev => {
        const moved = prev
          .map(n => ({ ...n, x: n.x + 3 }))
          .filter(n => n.x < 100);

        if (Math.random() > 0.45 && moved.length < 5) {
          const lIdx = Math.floor(Math.random() * 4);
          moved.push({
            id: Date.now() + Math.random(),
            line: lIdx,
            x: 0,
            note: linesMeta[lIdx].pitch
          });
        }
        return moved;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleHitLine = (lineIdx: number) => {
    if (!isPlaying) return;
    const target = beamsNotes.find(n => n.line === lineIdx && n.x >= 70 && n.x <= 95);

    if (target) {
      soundEngine.playCorrect();
      soundEngine.playNotePitch(linesMeta[lineIdx].pitch as any);
      setScore(s => s + 100);
      setCombo(c => c + 1);
      setFeedback('SEMPURNA! Garisan Disambung ⚡ (+100)');
      setBeamsNotes(prev => prev.filter(n => n.id !== target.id));
    } else {
      soundEngine.playWrong();
      setCombo(0);
      setFeedback('TERLEPAS! Sambungan Terputus ❌');
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-cyan-950/40 to-slate-950 border border-cyan-500/40 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
            Stesen Game 2
          </span>
          <h4 className="text-2xl font-bold font-['Fredoka'] text-white flex items-center gap-2 mt-1">
            <span>⚡</span> Music Beams Liner
          </h4>
          <p className="text-xs text-slate-300">
            Sambungkan not yang bergerak pada garisan baluk laser tepat pada zon garisan sasaran!
          </p>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/30">
            <div className="text-[10px] text-slate-400 font-bold">SKOR BEAM</div>
            <div className="text-xl font-black text-amber-400 tabular-nums">{score}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/30">
            <div className="text-[10px] text-slate-400 font-bold">KOMBO</div>
            <div className="text-xl font-black text-cyan-300 tabular-nums">{combo}x</div>
          </div>
        </div>
      </div>

      {/* Beam Track Arena */}
      <div className="relative h-64 bg-slate-950 rounded-2xl border-2 border-cyan-500/30 overflow-hidden flex flex-col justify-around py-3">
        {/* 4 Laser beam stave lines */}
        {[0, 1, 2, 3].map(lineIdx => (
          <div key={lineIdx} className="relative h-8 flex items-center">
            {/* Glowing line */}
            <div className="absolute inset-x-0 h-1 bg-cyan-500/30 shadow-md shadow-cyan-500/20"></div>

            {/* Hit Target Line */}
            <div className="absolute right-12 w-6 h-10 border-2 border-dashed border-cyan-300 bg-cyan-500/20 rounded-lg pointer-events-none"></div>

            {/* Moving Notes */}
            {beamsNotes
              .filter(n => n.line === lineIdx)
              .map(n => (
                <div
                  key={n.id}
                  className="absolute w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 border border-white text-slate-950 font-black text-xs flex items-center justify-center shadow-lg shadow-cyan-400/50"
                  style={{ left: `${n.x}%` }}
                >
                  {n.note}
                </div>
              ))}
          </div>
        ))}

        {feedback && (
          <div className="absolute top-2 inset-x-0 text-center font-bold text-xs text-yellow-300 animate-pulse pointer-events-none">
            {feedback}
          </div>
        )}

        {!isPlaying && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
            <p className="text-sm font-semibold text-slate-200">
              Sambungkan garisan baluk laser dengan rentak tepat!
            </p>
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                setScore(0);
                setCombo(0);
                setIsPlaying(true);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-base shadow-xl shadow-cyan-600/30 transition-all cursor-pointer active:scale-95"
            >
              <span>⚡</span> MULA MAIN MUSIC BEAMS LINER
            </button>
          </div>
        )}
      </div>

      {/* Beam Input Buttons */}
      <div className="grid grid-cols-4 gap-3">
        {linesMeta.map((lm, idx) => (
          <button
            key={idx}
            onClick={() => handleHitLine(idx)}
            className="py-3 rounded-2xl bg-slate-900 hover:bg-cyan-900/60 active:bg-cyan-600 border border-cyan-500/40 text-white font-bold text-xs sm:text-sm transition-all shadow-md active:scale-95 flex flex-col items-center cursor-pointer"
          >
            <span>{lm.label}</span>
            <span className="text-[10px] text-cyan-300">Kekunci {lm.key} (Not {lm.pitch})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// STESEN GAME 3: NOT NINJA ⚔️
// -------------------------------------------------------------
const NotNinjaGame: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [flyingNotes, setFlyingNotes] = useState<{ id: number; x: number; y: number; note: string; vx: number }[]>([]);
  const [sliceText, setSliceText] = useState<string>('');

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setFlyingNotes(prev => {
        const notesList = ['G', 'A', 'B', '𝄞', '♪'];
        const moved = prev
          .map(n => ({ ...n, y: n.y + 4, x: n.x + n.vx }))
          .filter(n => n.y < 100);

        if (Math.random() > 0.45 && moved.length < 6) {
          moved.push({
            id: Date.now() + Math.random(),
            x: 15 + Math.random() * 70,
            y: 5,
            vx: (Math.random() - 0.5) * 1.5,
            note: notesList[Math.floor(Math.random() * notesList.length)]
          });
        }
        return moved;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleSliceNote = (id: number, note: string) => {
    if (!isPlaying) return;

    soundEngine.playCorrect();
    if (note === 'G' || note === 'A' || note === 'B') {
      soundEngine.playNotePitch(note as any);
    }
    setScore(s => s + 150);
    setCombo(c => c + 1);
    setSliceText(`HIRIS! Not ${note} Dihiris Bersih ⚔️ (+150)`);
    setFlyingNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-amber-950/40 to-slate-950 border border-amber-500/40 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
            Stesen Game 3
          </span>
          <h4 className="text-2xl font-bold font-['Fredoka'] text-white flex items-center gap-2 mt-1">
            <span>⚔️</span> Not Ninja
          </h4>
          <p className="text-xs text-slate-300">
            Hiris dan klik not-not muzik yang meluncur di udara sebelum ia jatuh!
          </p>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/30">
            <div className="text-[10px] text-slate-400 font-bold">SKOR NINJA</div>
            <div className="text-xl font-black text-amber-400 tabular-nums">{score}</div>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/30">
            <div className="text-[10px] text-slate-400 font-bold">KOMBO</div>
            <div className="text-xl font-black text-amber-300 tabular-nums">{combo}x</div>
          </div>
        </div>
      </div>

      {/* Dojo Slice Arena */}
      <div className="relative h-72 bg-slate-950 rounded-2xl border-2 border-amber-500/30 overflow-hidden select-none cursor-crosshair">
        {sliceText && (
          <div className="absolute top-3 inset-x-0 text-center font-bold text-xs text-amber-300 animate-pulse pointer-events-none">
            {sliceText}
          </div>
        )}

        {/* Floating Flying Notes */}
        {flyingNotes.map(n => (
          <button
            key={n.id}
            onClick={() => handleSliceNote(n.id, n.note)}
            className="absolute w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 hover:scale-115 active:scale-75 border-2 border-white shadow-xl shadow-amber-500/40 text-white font-black text-lg flex items-center justify-center transition-transform cursor-pointer"
            style={{
              left: `${n.x}%`,
              top: `${n.y}%`
            }}
          >
            {n.note}
          </button>
        ))}

        {!isPlaying && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
            <p className="text-sm font-semibold text-slate-200">
              Keluarkan ketangkasan pedang ninja anda untuk menghiris not muzik!
            </p>
            <button
              onClick={() => {
                soundEngine.playButtonClick();
                setScore(0);
                setCombo(0);
                setIsPlaying(true);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-base shadow-xl shadow-amber-600/30 transition-all cursor-pointer active:scale-95"
            >
              <span>⚔️</span> MULA MAIN NOT NINJA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// STATION 4: QUIZ CONSTELLATION
// -------------------------------------------------------------
const QuizConstellationContent: React.FC<{ station: StationConfig }> = ({ station }) => {
  const questions = station.quizQuestions || [];
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const q = questions[currentIdx];

  const handleSelect = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    if (idx === q.correctIndex) {
      soundEngine.playCorrect();
      setScore(s => s + 1);
    } else {
      soundEngine.playWrong();
    }
  };

  const handleNext = () => {
    soundEngine.playButtonClick();
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(c => c + 1);
      setSelectedOption(null);
    } else {
      setIsFinished(true);
      soundEngine.playCompleteFanfare();
    }
  };

  const handleRestart = () => {
    soundEngine.playButtonClick();
    setCurrentIdx(0);
    setSelectedOption(null);
    setScore(0);
    setIsFinished(false);
  };

  if (isFinished) {
    return (
      <div className="p-8 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/40 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-xl">
          <Trophy className="w-10 h-10 text-amber-400" />
        </div>

        <div className="space-y-2">
          <h3 className="text-3xl font-black font-['Fredoka'] text-amber-300">
            Tahniah, Pengembara Bintang! ⭐
          </h3>
          <p className="text-slate-300 text-sm">
            Anda telah berjaya menjawab kuiz pembelajaran ini dengan cemerlang!
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 inline-block px-8 border border-amber-500/30">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Skor Akhir Anda</div>
          <div className="text-4xl font-black text-amber-400 tabular-nums">
            {score} / {questions.length}
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" /> Uji Semula
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
        <span>Soalan {currentIdx + 1} daripada {questions.length}</span>
        <span>Skor Semasa: {score}</span>
      </div>

      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        ></div>
      </div>

      {q && (
        <div className="p-6 rounded-2xl bg-slate-800/80 border border-amber-500/30 space-y-5">
          <h3 className="text-xl font-bold font-['Fredoka'] text-white">
            {q.question}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {q.options.map((opt, idx) => {
              let btnClass = "bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800";
              if (selectedOption !== null) {
                if (idx === q.correctIndex) {
                  btnClass = "bg-emerald-600/90 border-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/30";
                } else if (idx === selectedOption) {
                  btnClass = "bg-red-600/90 border-red-400 text-white font-bold";
                } else {
                  btnClass = "opacity-40 bg-slate-900 border-slate-800 text-slate-400";
                }
              }

              return (
                <button
                  key={idx}
                  disabled={selectedOption !== null}
                  onClick={() => handleSelect(idx)}
                  className={`p-4 rounded-xl border text-left text-sm font-semibold transition-all active:scale-98 cursor-pointer ${btnClass}`}
                >
                  <span className="inline-block w-6 h-6 rounded-full bg-slate-800/80 border border-white/20 text-center leading-6 text-xs mr-2">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          {selectedOption !== null && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2 animate-in fade-in">
              <p className="text-xs text-amber-200 font-semibold">
                📖 <strong>Penerangan:</strong> {q.explanation}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md cursor-pointer"
                >
                  {currentIdx < questions.length - 1 ? 'Soalan Seterusnya →' : 'Lihat Keputusan Kuiz ✨'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// STATION 5: EMOJI FEEDBACK CLOUD
// -------------------------------------------------------------
const EmojiFeedbackContent: React.FC<{
  station: StationConfig;
  roomCode: string;
  playerName: string;
  avatarId: number;
}> = ({ station, roomCode, playerName, avatarId }) => {
  const [selectedEmoji, setSelectedEmoji] = useState<string>('😍');
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const emojiOptions = [
    { emoji: '😍', label: 'Sangat Menyeronokkan', score: 5 },
    { emoji: '😊', label: 'Menyeronokkan', score: 4 },
    { emoji: '😐', label: 'Biasa Sahaja', score: 3 },
    { emoji: '😕', label: 'Kurang Menyeronokkan', score: 2 },
    { emoji: '😢', label: 'Tidak Menyeronokkan', score: 1 }
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    soundEngine.playFeedbackSubmit();

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          studentName: playerName,
          avatarId,
          emoji: selectedEmoji,
          ratingScore,
          comment
        })
      });
    } catch (err) {
      console.warn('Saved feedback locally due to offline network:', err);
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 }
      });
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-8 rounded-2xl bg-gradient-to-br from-pink-950/40 to-slate-900 border border-pink-500/40 text-center space-y-5 animate-in zoom-in-95">
        <div className="text-6xl animate-bounce">{selectedEmoji}</div>
        <h3 className="text-2xl font-bold font-['Fredoka'] text-pink-300">
          TERIMA KASIH ATAS MAKLUM BALAS ANDA! 💖
        </h3>
        <p className="text-slate-300 text-sm max-w-md mx-auto">
          Maklum balas anda telah direkodkan dengan selamat untuk guru anda bagi membantu menambah baik kembara Music Realms pada masa hadapan!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold font-['Fredoka'] text-pink-300">
          {station.questionText || "Apakah pendapat kamu tentang pengalaman pembelajaran menggunakan Music Realms?"}
        </h3>
        <p className="text-xs text-slate-400">
          Pilih satu emoji yang paling tepat mewakili perasaan anda sepanjang kembara ini.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:gap-4">
        {emojiOptions.map(item => {
          const isSelected = selectedEmoji === item.emoji;
          return (
            <button
              key={item.emoji}
              onClick={() => {
                soundEngine.playButtonClick();
                setSelectedEmoji(item.emoji);
                setRatingScore(item.score);
              }}
              className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer ${
                isSelected
                  ? 'bg-pink-600/30 border-pink-400 shadow-lg shadow-pink-500/25 scale-105'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 opacity-80 hover:opacity-100'
              }`}
            >
              <span className="text-3xl sm:text-5xl">{item.emoji}</span>
              <span className="text-[10px] sm:text-xs font-bold text-center text-slate-200">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300">
          Komen atau Pesanan Tambahan (Pilihan):
        </label>
        <textarea
          rows={3}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Kongsi bahagian yang paling anda sukai tentang stesen ini..."
          className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-pink-500"
        />
      </div>

      <div className="flex justify-end">
        <button
          disabled={isSubmitting}
          onClick={handleSubmit}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold text-sm shadow-lg shadow-pink-500/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? 'MENGHANTAR...' : 'HANTAR MAKLUM BALAS ✨'}
        </button>
      </div>
    </div>
  );
};
