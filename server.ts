import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// In-memory state
interface PlayerState {
  id: string;
  name: string;
  avatarId: number;
  role: 'student' | 'teacher';
  x: number;
  y: number;
  z: number;
  rotY: number;
  anim: 'idle' | 'walk' | 'jump' | 'dance' | 'wave';
  lastSeen: number;
}

interface Room {
  code: string;
  hostId?: string;
  mode: 'individual' | 'class';
  unlockedStations: number[]; // For class mode
  players: Map<string, { ws: WebSocket; data: PlayerState }>;
}

const rooms = new Map<string, Room>();

// Initial station content (starts empty so teacher inputs their own materials)
let stationData = [
  {
    id: 1,
    title: "Station 1: Slide Sanctuary",
    subtitle: "Pusat Slaid Pembelajaran Guru",
    description: "Ruangan untuk guru memasukkan bahan slaid pengajaran (Google Slides, Canva atau PDF).",
    contentType: "slides",
    contentUrl: "",
    teacherInstructions: "",
    externalButtonText: "Buka Slaid di Tab Baharu",
    slides: []
  },
  {
    id: 2,
    title: "Station 2: Animation Cloud Theatre",
    subtitle: "Teater Video Animasi Muzik",
    description: "Ruangan untuk guru memasukkan pautan video animasi pembelajaran muzik (YouTube / MP4).",
    contentType: "video",
    contentUrl: "",
    videoTitle: "",
    videoDuration: "",
    videoNotes: "",
    teacherInstructions: "",
    externalButtonText: "Tonton Video di Tab Baharu"
  },
  {
    id: 3,
    title: "Stesen Game 1: Not Whacker",
    subtitle: "Permainan Ketuk Not Pantas",
    description: "Ruangan untuk guru memasukkan pautan permainan Not Whacker (Wordwall, Blooket, Scratch, atau pautan web interaktif).",
    contentType: "games",
    contentUrl: "",
    teacherInstructions: "",
    externalButtonText: "Buka Permainan di Tab Baharu",
    games: []
  },
  {
    id: 6,
    title: "Stesen Game 2: Music Beams Liner",
    subtitle: "Permainan Garisan Baluk Muzik",
    description: "Ruangan untuk guru memasukkan pautan permainan Music Beams Liner (Wordwall, Blooket, Scratch, atau pautan web interaktif).",
    contentType: "games",
    contentUrl: "",
    teacherInstructions: "",
    externalButtonText: "Buka Permainan di Tab Baharu",
    games: []
  },
  {
    id: 7,
    title: "Stesen Game 3: Not Ninja",
    subtitle: "Permainan Hiris Not Muzik Tangkas",
    description: "Ruangan untuk guru memasukkan pautan permainan Not Ninja (Wordwall, Blooket, Scratch, atau pautan web interaktif).",
    contentType: "games",
    contentUrl: "",
    teacherInstructions: "",
    externalButtonText: "Buka Permainan di Tab Baharu",
    games: []
  },
  {
    id: 4,
    title: "Station 4: Quiz Constellation",
    subtitle: "Konstelasi Kuiz Pembelajaran",
    description: "Ruangan untuk guru memasukkan pautan kuiz digital (Quizizz, Google Forms, Kahoot).",
    contentType: "quiz",
    contentUrl: "",
    teacherInstructions: "",
    externalButtonText: "Mula Kuiz di Tab Baharu",
    quizQuestions: []
  },
  {
    id: 5,
    title: "Station 5: Emoji Feedback Cloud",
    subtitle: "Awan Maklum Balas Pelajar",
    description: "Kongsikan pengalaman pengembaraan anda di Music Realms menggunakan pilihan emoji dan komen kreatif!",
    contentType: "feedback",
    contentUrl: "",
    questionText: "Apakah pendapat kamu tentang pengalaman pembelajaran menggunakan Music Realms?"
  }
];

interface FeedbackRecord {
  id: string;
  roomCode: string;
  studentName: string;
  avatarId: number;
  emoji: string;
  ratingScore: number;
  comment: string;
  timestamp: number;
}

const feedbackStore: FeedbackRecord[] = [];

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), totalRooms: rooms.size });
});

app.get('/api/stations', (req, res) => {
  res.json({ stations: stationData });
});

app.put('/api/stations', (req, res) => {
  if (Array.isArray(req.body.stations)) {
    stationData = req.body.stations;
    res.json({ success: true, stations: stationData });
  } else {
    res.status(400).json({ error: 'Invalid stations format' });
  }
});

app.get('/api/feedback', (req, res) => {
  const room = (req.query.room as string) || '';
  const filtered = room ? feedbackStore.filter(f => f.roomCode.toUpperCase() === room.toUpperCase()) : feedbackStore;
  res.json({ feedback: filtered });
});

app.post('/api/feedback', (req, res) => {
  const { roomCode, studentName, avatarId, emoji, ratingScore, comment } = req.body;
  if (!studentName || !emoji) {
    res.status(400).json({ error: 'Missing required feedback fields' });
    return;
  }
  const entry: FeedbackRecord = {
    id: 'fb_' + Math.random().toString(36).substring(2, 9),
    roomCode: (roomCode || 'PUBLIC').toUpperCase(),
    studentName,
    avatarId: avatarId || 1,
    emoji,
    ratingScore: ratingScore || 5,
    comment: comment || '',
    timestamp: Date.now()
  };
  feedbackStore.push(entry);
  res.json({ success: true, entry });
});

// WebSocket Server for Real-Time Multiplayer
const MAX_PLAYERS_PER_ROOM = 15;

function getOrCreateRoom(code: string): Room {
  const upper = code.trim().toUpperCase() || 'PLAZA-1';
  let room = rooms.get(upper);
  if (!room) {
    room = {
      code: upper,
      mode: 'individual',
      unlockedStations: [1],
      players: new Map()
    };
    rooms.set(upper, room);
  }
  return room;
}

function broadcastToRoom(room: Room, message: object, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  for (const [, player] of room.players) {
    if (player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
      try {
        player.ws.send(data);
      } catch (err) {
        // ignore send error
      }
    }
  }
}

wss.on('connection', (ws) => {
  let currentRoom: Room | null = null;
  let playerId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());

      if (msg.type === 'join') {
        const { roomCode, player } = msg;
        const targetRoom = getOrCreateRoom(roomCode);

        if (targetRoom.players.size >= MAX_PLAYERS_PER_ROOM) {
          ws.send(JSON.stringify({
            type: 'error',
            code: 'ROOM_FULL',
            message: `Bilik ini telah penuh (${MAX_PLAYERS_PER_ROOM}/${MAX_PLAYERS_PER_ROOM} pemain). Sila cuba kod bilik lain atau tunggu pemain keluar.`
          }));
          return;
        }

        currentRoom = targetRoom;
        const validPlayerId: string = player.id || 'p_' + Math.random().toString(36).substring(2, 8);
        playerId = validPlayerId;

        const newPlayerData: PlayerState = {
          id: validPlayerId,
          name: player.name || 'Pengembara Muzik',
          avatarId: player.avatarId || 1,
          role: player.role || 'student',
          x: player.x ?? 0,
          y: player.y ?? 1.2,
          z: player.z ?? 0,
          rotY: player.rotY ?? 0,
          anim: player.anim || 'idle',
          lastSeen: Date.now()
        };

        currentRoom.players.set(validPlayerId, { ws, data: newPlayerData });

        // Send existing players to newly joined client
        const existingPlayers: PlayerState[] = [];
        for (const [id, p] of currentRoom.players) {
          if (id !== playerId) {
            existingPlayers.push(p.data);
          }
        }

        ws.send(JSON.stringify({
          type: 'welcome',
          playerId,
          roomCode: currentRoom.code,
          mode: currentRoom.mode,
          unlockedStations: currentRoom.unlockedStations,
          maxPlayers: MAX_PLAYERS_PER_ROOM,
          currentPlayers: currentRoom.players.size,
          players: existingPlayers
        }));

        // Broadcast new player to everyone else in room
        broadcastToRoom(currentRoom, {
          type: 'player_joined',
          player: newPlayerData,
          totalCount: currentRoom.players.size
        }, ws);

      } else if (msg.type === 'move' && currentRoom && playerId) {
        const p = currentRoom.players.get(playerId);
        if (p) {
          p.data.x = msg.x;
          p.data.y = msg.y;
          p.data.z = msg.z;
          p.data.rotY = msg.rotY;
          p.data.anim = msg.anim || 'walk';
          p.data.lastSeen = Date.now();

          broadcastToRoom(currentRoom, {
            type: 'player_moved',
            id: playerId,
            x: msg.x,
            y: msg.y,
            z: msg.z,
            rotY: msg.rotY,
            anim: msg.anim
          }, ws);
        }

      } else if (msg.type === 'emote' && currentRoom && playerId) {
        broadcastToRoom(currentRoom, {
          type: 'player_emote',
          id: playerId,
          emote: msg.emote
        });

      } else if (msg.type === 'chat' && currentRoom && playerId) {
        broadcastToRoom(currentRoom, {
          type: 'player_chat',
          id: playerId,
          text: msg.text,
          name: currentRoom.players.get(playerId)?.data.name || 'Pemain'
        });

      } else if (msg.type === 'teacher_control' && currentRoom && playerId) {
        // Teacher toggles class mode or unlocks a station for everyone
        if (msg.action === 'unlock_station' && typeof msg.stationId === 'number') {
          if (!currentRoom.unlockedStations.includes(msg.stationId)) {
            currentRoom.unlockedStations.push(msg.stationId);
          }
          broadcastToRoom(currentRoom, {
            type: 'class_station_unlocked',
            stationId: msg.stationId,
            message: `Guru telah membuka Stesen ${msg.stationId} untuk seluruh kelas! ✨`
          });
        } else if (msg.action === 'set_mode') {
          currentRoom.mode = msg.mode;
          broadcastToRoom(currentRoom, {
            type: 'mode_changed',
            mode: msg.mode
          });
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  const cleanup = () => {
    if (currentRoom && playerId) {
      currentRoom.players.delete(playerId);
      broadcastToRoom(currentRoom, {
        type: 'player_left',
        id: playerId,
        totalCount: currentRoom.players.size
      });
      if (currentRoom.players.size === 0) {
        rooms.delete(currentRoom.code);
      }
      currentRoom = null;
      playerId = null;
    }
  };

  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

// Periodic ping / cleanup idle players
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    for (const [id, player] of room.players) {
      if (now - player.data.lastSeen > 60000) {
        try {
          player.ws.terminate();
        } catch (_) {}
        room.players.delete(id);
        broadcastToRoom(room, {
          type: 'player_left',
          id,
          totalCount: room.players.size
        });
      }
    }
    if (room.players.size === 0) {
      rooms.delete(code);
    }
  }
}, 30000);

// Mount Vite middleware for dev or serve dist in production
async function startServer() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`🎵 MUSIC REALMS server active on http://0.0.0.0:${port}`);
  });
}

startServer();
