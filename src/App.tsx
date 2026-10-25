import React, { useState, useEffect, useRef } from 'react';
import { MainMenu } from './components/MainMenu';
import { PlayerHUD } from './components/PlayerHUD';
import { StationModal } from './components/StationModal';
import { TeacherDashboard } from './components/TeacherDashboard';
import { TeacherMaterialEditor } from './components/TeacherMaterialEditor';
import { TeacherPasscodeModal } from './components/TeacherPasscodeModal';
import { MiniMap } from './components/MiniMap';
import { InviteModal } from './components/InviteModal';
import { MusicWorld } from './game3d/MusicWorld';
import { MultiplayerService } from './multiplayer/multiplayerService';
import { StationConfig, StationId, PlayerAnim, PlayerData } from './types/game';
import { soundEngine } from './audio/soundEngine';
import { DEFAULT_STATIONS, loadStoredStations, saveStoredStations, mergeWithDefaultStations } from './data/defaultStations';
import { Bell, AlertCircle, Sparkles } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');
  const [playerProfile, setPlayerProfile] = useState<{
    avatarId: number;
    playerName: string;
    email: string;
    roomCode: string;
    role: 'student' | 'teacher';
  }>({
    avatarId: 1,
    playerName: 'Pengembara Cilik',
    email: '',
    roomCode: 'REALM-101',
    role: 'student'
  });

  // Stations and Progression State - initialized from local persistent storage with default fallback
  const [stations, setStations] = useState<StationConfig[]>(() => loadStoredStations());
  const [unlockedStations, setUnlockedStations] = useState<number[]>([1]);
  const [completedStations, setCompletedStations] = useState<number[]>([]);
  const [activeStationModal, setActiveStationModal] = useState<StationConfig | null>(null);

  // Teacher 7770 Security State
  const [showTeacherPasscodeModal, setShowTeacherPasscodeModal] = useState<boolean>(false);
  const [isTeacherAuthorized, setIsTeacherAuthorized] = useState<boolean>(false);
  const [editorTargetStation, setEditorTargetStation] = useState<StationId>(1);

  // Multiplayer State
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [progressionMode, setProgressionMode] = useState<'individual' | 'class'>('individual');

  // Interactive UI overlays
  const [nearbyStation, setNearbyStation] = useState<{ id: StationId; name: string } | null>(null);
  const [showTeacherDashboard, setShowTeacherDashboard] = useState<boolean>(false);
  const [showTeacherMaterialEditor, setShowTeacherMaterialEditor] = useState<boolean>(false);
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteRoomCode, setInviteRoomCode] = useState<string>('REALM-101');
  const [showMiniMap, setShowMiniMap] = useState<boolean>(false);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 0 });

  // Notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'info' | 'warning' | 'success' } | null>(null);

  // References
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<MusicWorld | null>(null);
  const mpServiceRef = useRef<MultiplayerService | null>(null);

  // Attempt to sync station curriculum from server if available; fallback smoothly on Netlify
  useEffect(() => {
    fetch('/api/stations')
      .then(res => {
        if (!res.ok) throw new Error('API server unavailable');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data.stations) && data.stations.length > 0) {
          const merged = mergeWithDefaultStations(data.stations);
          setStations(merged);
          saveStoredStations(merged);
        }
      })
      .catch(err => {
        console.info('Running in client-side persistence mode (Netlify / Static):', err);
      });
  }, []);

  const showToast = (text: string, type: 'info' | 'warning' | 'success' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 4000);
  };

  // Start adventure from Main Menu
  const handleStartAdventure = (data: {
    avatarId: number;
    playerName: string;
    email: string;
    roomCode: string;
    role: 'student' | 'teacher';
  }) => {
    setPlayerProfile(data);
    setGameState('playing');
  };

  // Mount 3D Scene & Multiplayer when gameState becomes 'playing'
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (!canvasMountRef.current) return;

    // 1. Initialize Multiplayer Service
    const mp = new MultiplayerService({
      onWelcome: (welcomeData) => {
        setOnlineCount(welcomeData.players.length + 1);
        if (welcomeData.mode) {
          setProgressionMode(welcomeData.mode);
        }
        if (welcomeData.mode === 'class' && Array.isArray(welcomeData.unlockedStations)) {
          setUnlockedStations(prev => Array.from(new Set([...prev, ...welcomeData.unlockedStations])));
          worldRef.current?.updateUnlockedStations(welcomeData.unlockedStations);
        }
        // Spawn existing remote players
        welcomeData.players.forEach(p => {
          worldRef.current?.updateRemotePlayer(p.id, {
            name: p.name,
            email: p.email,
            avatarId: p.avatarId,
            x: p.x,
            y: p.y,
            z: p.z,
            rotY: p.rotY,
            anim: p.anim
          });
        });
      },
      onPlayerJoined: (player, total) => {
        setOnlineCount(total);
        showToast(`${player.name} telah memasuki Music Realms! ✨`, 'info');
        worldRef.current?.updateRemotePlayer(player.id, {
          name: player.name,
          email: player.email,
          avatarId: player.avatarId,
          x: player.x,
          y: player.y,
          z: player.z,
          rotY: player.rotY,
          anim: player.anim
        });
      },
      onPlayerMoved: (moveData) => {
        worldRef.current?.updateRemotePlayer(moveData.id, moveData as any);
      },
      onPlayerLeft: (id, total) => {
        setOnlineCount(total);
        worldRef.current?.removeRemotePlayer(id);
      },
      onPlayerEmote: (id, emote) => {
        worldRef.current?.showEmoteBubble(id, emote);
      },
      onPlayerChat: (id, text, name) => {
        worldRef.current?.showChatBubble(id, text);
        showToast(`${name}: "${text}"`, 'info');
      },
      onClassStationUnlocked: (stationId, msg) => {
        setUnlockedStations(prev => {
          const next = Array.from(new Set([...prev, stationId]));
          worldRef.current?.updateUnlockedStations(next);
          return next;
        });
        showToast(msg, 'success');
        soundEngine.playStationUnlock();
      },
      onError: (code, msg) => {
        showToast(msg, 'warning');
      }
    });

    mpServiceRef.current = mp;

    // 2. Initialize 3D World
    const world = new MusicWorld(
      canvasMountRef.current,
      playerProfile.avatarId,
      playerProfile.playerName,
      playerProfile.role,
      unlockedStations,
      {
        onNearStation: (stationId, name) => {
          if (stationId) {
            setNearbyStation({ id: stationId, name });
          } else {
            setNearbyStation(null);
          }
        },
        onLockedBridgeBlocked: (nextStationId) => {
          soundEngine.playWrong();
          showToast(`Selesaikan Stesen ${nextStationId - 1} untuk membuka jambatan ini! 🔒`, 'warning');
        },
        onPlayerMoved: (x, y, z, rotY, anim) => {
          setPlayerPosition({ x, z });
          mp.sendMove(x, y, z, rotY, anim);
        }
      }
    );

    worldRef.current = world;

    // Connect WebSocket
    mp.connect(playerProfile.roomCode, {
      name: playerProfile.playerName,
      email: playerProfile.email,
      avatarId: playerProfile.avatarId,
      role: playerProfile.role
    });

    return () => {
      world.dispose();
      worldRef.current = null;
      mp.disconnect();
      mpServiceRef.current = null;
    };
  }, [gameState]);

  // Handle Station Completion
  const handleCompleteStation = (stationId: StationId) => {
    if (!completedStations.includes(stationId)) {
      const nextCompleted = [...completedStations, stationId];
      setCompletedStations(nextCompleted);

      // Progression logic:
      // Station 1 completed -> unlocks Station 2
      // Station 2 completed -> unlocks Station 3, 6, 7 (All Game Stations)
      // Station 3, 6, or 7 completed -> unlocks Station 4 (Quiz Constellation)
      // Station 4 completed -> unlocks Station 5 (Emoji Feedback Cloud)
      let newUnlocked = [...unlockedStations];
      if (stationId === 1) {
        newUnlocked.push(2);
      } else if (stationId === 2) {
        newUnlocked.push(3, 6, 7);
      } else if (stationId === 3 || stationId === 6 || stationId === 7) {
        newUnlocked.push(4);
      } else if (stationId === 4) {
        newUnlocked.push(5);
      }

      const uniqueUnlocked = Array.from(new Set(newUnlocked));
      if (uniqueUnlocked.length > unlockedStations.length) {
        setUnlockedStations(uniqueUnlocked);
        worldRef.current?.updateUnlockedStations(uniqueUnlocked);
        showToast('Stesen seterusnya berjaya dibuka! Jambatan cahaya telah aktif ✨', 'success');
      }
    }
  };

  const handleOpenStation = (id: StationId) => {
    const st = stations.find(s => s.id === id) || DEFAULT_STATIONS.find(s => s.id === id);
    if (st) {
      soundEngine.playInteract();
      setActiveStationModal(st);
    }
  };

  const handleSendEmote = (emote: string) => {
    worldRef.current?.showEmoteBubble('local', emote);
    mpServiceRef.current?.sendEmote(emote);
  };

  const handleSendChat = (text: string) => {
    worldRef.current?.showChatBubble('local', text);
    mpServiceRef.current?.sendChat(text);
  };

  const handleTriggerAnim = (anim: 'dance' | 'wave') => {
    worldRef.current?.triggerEmoteAnim(anim);
  };

  const handleChangeCamera = (view: 'follow' | 'top' | 'cinematic') => {
    worldRef.current?.setCameraView(view);
  };

  const handleLeaveGame = () => {
    soundEngine.stopBgm();
    setActiveStationModal(null);
    setShowTeacherDashboard(false);
    setShowTeacherMaterialEditor(false);
    setShowTeacherPasscodeModal(false);
    setShowInviteModal(false);
    setShowMiniMap(false);
    setNearbyStation(null);
    setGameState('menu');
  };

  const handleRequestOpenTeacherPlatform = (stationId?: StationId) => {
    if (stationId) {
      setEditorTargetStation(stationId);
    }
    if (isTeacherAuthorized) {
      setShowTeacherMaterialEditor(true);
    } else {
      setShowTeacherPasscodeModal(true);
    }
  };

  const handlePasscodeSuccess = () => {
    setIsTeacherAuthorized(true);
    setShowTeacherPasscodeModal(false);
    setShowTeacherMaterialEditor(true);
    showToast('Akses Guru Diterima! Selamat datang ke Platform Bahan. ✨', 'success');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-['Nunito',sans-serif]">
      {gameState === 'menu' ? (
        <>
          <MainMenu
            onStartAdventure={handleStartAdventure}
            onOpenTeacherEditor={() => handleRequestOpenTeacherPlatform(1)}
            onOpenInvite={(code) => {
              setInviteRoomCode(code);
              setShowInviteModal(true);
            }}
          />
          {showTeacherMaterialEditor && (
            <TeacherMaterialEditor
              stations={stations}
              initialStationId={editorTargetStation}
              onSave={(updated) => {
                setStations(updated);
                saveStoredStations(updated);
                showToast('Bahan stesen berjaya dikemaskini dan disimpan! ✨', 'success');
              }}
              onClose={() => setShowTeacherMaterialEditor(false)}
            />
          )}
          {showInviteModal && (
            <InviteModal
              roomCode={inviteRoomCode}
              onClose={() => setShowInviteModal(false)}
            />
          )}
        </>
      ) : (
        <div className="relative w-full h-full">
          {/* 3D WebGL Canvas Container */}
          <div ref={canvasMountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Low-Occlusion Player HUD */}
          <PlayerHUD
            playerName={playerProfile.playerName}
            avatarId={playerProfile.avatarId}
            role={playerProfile.role}
            roomCode={playerProfile.roomCode}
            onlineCount={onlineCount}
            unlockedStations={unlockedStations}
            completedStations={completedStations}
            nearbyStation={nearbyStation}
            onOpenStation={handleOpenStation}
            onSendEmote={handleSendEmote}
            onSendChat={handleSendChat}
            onTriggerAnim={handleTriggerAnim}
            onChangeCamera={handleChangeCamera}
            onToggleMiniMap={() => setShowMiniMap(prev => !prev)}
            onOpenTeacherDashboard={() => setShowTeacherDashboard(true)}
            onOpenTeacherEditor={() => handleRequestOpenTeacherPlatform(nearbyStation?.id || 1)}
            onOpenInvite={() => {
              setInviteRoomCode(playerProfile.roomCode);
              setShowInviteModal(true);
            }}
            onLeaveGame={handleLeaveGame}
            onJoystickMove={(x, y) => worldRef.current?.setJoystickInput(x, y)}
            onJump={() => worldRef.current?.triggerJump()}
            onRotateCamera={(dTheta) => worldRef.current?.rotateCamera(dTheta)}
          />

          {/* Active Station Learning Modal */}
          {activeStationModal && (
            <StationModal
              station={activeStationModal}
              roomCode={playerProfile.roomCode}
              playerName={playerProfile.playerName}
              avatarId={playerProfile.avatarId}
              role={playerProfile.role}
              isCompleted={completedStations.includes(activeStationModal.id)}
              onComplete={handleCompleteStation}
              onClose={() => setActiveStationModal(null)}
              onOpenTeacherEditor={() => handleRequestOpenTeacherPlatform(activeStationModal.id)}
            />
          )}

          {/* Dedicated Teacher Material Editor Modal */}
          {showTeacherMaterialEditor && (
            <TeacherMaterialEditor
              stations={stations}
              initialStationId={editorTargetStation}
              onSave={(updated) => {
                setStations(updated);
                saveStoredStations(updated);
                // Also update active station modal if currently open
                if (activeStationModal) {
                  const refreshed = updated.find(s => s.id === activeStationModal.id);
                  if (refreshed) setActiveStationModal(refreshed);
                }
                showToast('Bahan stesen berjaya dikemaskini dan disimpan! ✨', 'success');
              }}
              onClose={() => setShowTeacherMaterialEditor(false)}
            />
          )}

          {/* Invite / Share Modal in Game */}
          {showInviteModal && (
            <InviteModal
              roomCode={inviteRoomCode}
              onClose={() => setShowInviteModal(false)}
            />
          )}

          {/* Teacher Management Dashboard */}
          {showTeacherDashboard && (
            <TeacherDashboard
              roomCode={playerProfile.roomCode}
              stations={stations}
              unlockedStations={unlockedStations}
              mode={progressionMode}
              connectedPlayersCount={onlineCount}
              onSaveStations={(updated) => {
                setStations(updated);
                saveStoredStations(updated);
                showToast('Bahan stesen berjaya disimpan! ✨', 'success');
              }}
              onUnlockClassStation={(stId) => {
                mpServiceRef.current?.sendTeacherUnlock(stId);
                setUnlockedStations(prev => {
                  const next = Array.from(new Set([...prev, stId]));
                  worldRef.current?.updateUnlockedStations(next);
                  return next;
                });
                showToast(`Stesen ${stId} telah dibuka untuk seluruh kelas! ✨`, 'success');
              }}
              onToggleMode={(newMode) => {
                setProgressionMode(newMode);
                mpServiceRef.current?.sendTeacherMode(newMode);
                showToast(`Mod kemajuan ditukar kepada: ${newMode === 'individual' ? 'Rentak Kendiri' : 'Kawalan Kelas'}`, 'info');
              }}
              onClose={() => setShowTeacherDashboard(false)}
            />
          )}

          {/* Mini-Map Radar Modal */}
          {showMiniMap && (
            <MiniMap
              playerX={playerPosition.x}
              playerZ={playerPosition.z}
              unlockedStations={unlockedStations}
              completedStations={completedStations}
              onTeleport={(x, z) => {
                worldRef.current?.teleportTo(x, z);
                showToast('Teleportasi ke stesen berjaya! ✨', 'info');
                setShowMiniMap(false);
              }}
              onClose={() => setShowMiniMap(false)}
            />
          )}

          {/* Global Toast Notification */}
          {toastMessage && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
              <div
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl shadow-2xl border text-sm font-bold text-white ${
                  toastMessage.type === 'warning'
                    ? 'bg-amber-950/90 border-amber-500/60 shadow-amber-900/40'
                    : toastMessage.type === 'success'
                    ? 'bg-emerald-950/90 border-emerald-500/60 shadow-emerald-900/40'
                    : 'bg-indigo-950/90 border-indigo-500/60 shadow-indigo-900/40'
                }`}
              >
                {toastMessage.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />}
                {toastMessage.type === 'success' && <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />}
                {toastMessage.type === 'info' && <Bell className="w-5 h-5 text-indigo-400 shrink-0" />}
                <span>{toastMessage.text}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Teacher Security Passcode Modal (Code: 7770) */}
      <TeacherPasscodeModal
        isOpen={showTeacherPasscodeModal}
        onSuccess={handlePasscodeSuccess}
        onClose={() => setShowTeacherPasscodeModal(false)}
        title="Pengesahan Kod Akses Guru"
        description="Sila masukkan kod laluan keselamatan 4-digit untuk menyunting dan memasukkan bahan pengajaran stesen."
      />
    </div>
  );
}
