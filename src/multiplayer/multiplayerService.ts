import { Peer, DataConnection } from 'peerjs';
import { PlayerData, PlayerAnim } from '../types/game';

export interface MultiplayerCallbacks {
  onWelcome: (data: { playerId: string; players: PlayerData[]; mode: 'individual' | 'class'; unlockedStations: number[] }) => void;
  onPlayerJoined: (player: PlayerData, totalCount: number) => void;
  onPlayerMoved: (data: { id: string; x: number; y: number; z: number; rotY: number; anim: PlayerAnim }) => void;
  onPlayerLeft: (id: string, totalCount: number) => void;
  onPlayerEmote: (id: string, emote: string) => void;
  onPlayerChat: (id: string, text: string, name: string) => void;
  onClassStationUnlocked: (stationId: number, message: string) => void;
  onTeacherGathering?: (data: { teacherId: string; teacherName: string; x: number; y: number; z: number }) => void;
  onError: (code: string, message: string) => void;
}

export class MultiplayerService {
  private ws: WebSocket | null = null;
  private peer: Peer | null = null;
  private hostConn: DataConnection | null = null;
  private clientConns = new Map<string, { conn: DataConnection; player: PlayerData }>();
  
  private roomCode: string = '';
  private player: Partial<PlayerData> = {};
  private callbacks: MultiplayerCallbacks;
  
  private isConnected = false;
  private isHost = false;
  private myPlayerId: string = '';
  private wsTimeoutId: number | null = null;
  private fallbackTriggered = false;

  // Throttling for smooth 20-player bandwidth
  private lastSentMove = { x: 0, y: 0, z: 0, rotY: 0, anim: 'idle' as PlayerAnim };
  private lastSentTime = 0;

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(roomCode: string, player: Partial<PlayerData>) {
    this.roomCode = roomCode.toUpperCase();
    this.player = player;
    this.fallbackTriggered = false;
    const cleanEmail = (player.email || '').trim().toLowerCase();
    const hash = cleanEmail ? cleanEmail.split('').reduce((a: number, c: string) => ((a << 5) - a) + c.charCodeAt(0), 0) >>> 0 : Math.floor(Math.random() * 1000000);
    const safeTag = cleanEmail.replace(/[^a-z0-9]/gi, '').slice(0, 8);
    this.myPlayerId = cleanEmail ? `p-${safeTag || 'usr'}-${hash.toString(36)}` : `p-${Math.random().toString(36).substring(2, 9)}`;

    // 1. First attempt native local WebSocket server
    this.tryWebSocketConnection();
  }

  private tryWebSocketConnection() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      // Safe fallback timeout (5000ms) only for static hosts (e.g. Netlify)
      this.wsTimeoutId = window.setTimeout(() => {
        if (!this.isConnected && !this.fallbackTriggered) {
          console.info('[Multiplayer] Local WS timeout. Switching to PeerJS P2P room mesh for Netlify/static.');
          this.fallbackToPeerJS();
        }
      }, 5000);

      this.ws.onopen = () => {
        if (this.wsTimeoutId) clearTimeout(this.wsTimeoutId);
        this.isConnected = true;
        this.sendWS({
          type: 'join',
          roomCode: this.roomCode,
          player: this.player
        });
        console.info('[Multiplayer] Connected via WebSocket server.');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onclose = () => {
        if (!this.isConnected && !this.fallbackTriggered) {
          this.fallbackToPeerJS();
        }
        this.isConnected = false;
      };

      this.ws.onerror = () => {
        if (!this.fallbackTriggered) {
          console.info('[Multiplayer] Native WS unavailable (Static/Netlify host). Launching PeerJS P2P mesh.');
          this.fallbackToPeerJS();
        }
      };
    } catch {
      this.fallbackToPeerJS();
    }
  }

  // -------------------------------------------------------------
  // PEERJS P2P ROOM MESH (STATIC HOSTING & NETLIFY ZERO-SERVER)
  // -------------------------------------------------------------
  private fallbackToPeerJS() {
    if (this.fallbackTriggered) return;
    this.fallbackTriggered = true;

    if (this.wsTimeoutId) clearTimeout(this.wsTimeoutId);
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    const cleanRoom = this.roomCode.toLowerCase().replace(/[^a-z0-9]/g, '') || 'utama';
    const hostPeerId = `mr-host-${cleanRoom}`;
    const cleanEmail = (this.player.email || '').trim().toLowerCase();
    const hash = cleanEmail ? cleanEmail.split('').reduce((a: number, c: string) => ((a << 5) - a) + c.charCodeAt(0), 0) >>> 0 : Math.floor(Math.random() * 1000000);
    const safeTag = cleanEmail.replace(/[^a-z0-9]/gi, '').slice(0, 8);
    const sessionSalt = Math.random().toString(36).substring(2, 6);
    this.myPlayerId = cleanEmail ? `mr-${cleanRoom}-${safeTag || 'usr'}-${hash.toString(36)}-${sessionSalt}` : `mr-${cleanRoom}-${Math.random().toString(36).substring(2, 8)}`;

    // Try claiming the host role for this room code first
    this.initAsPotentialHost(hostPeerId, cleanRoom);
  }

  private initAsPotentialHost(hostPeerId: string, cleanRoom: string) {
    try {
      this.peer = new Peer(hostPeerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        // Successfully registered as Host!
        this.isHost = true;
        this.isConnected = true;
        console.info(`[Multiplayer P2P] Room Host active for [${this.roomCode}] (ID: ${id})`);

        const selfData: PlayerData = {
          id: id,
          name: this.player.name || 'Hos Bilik',
          email: this.player.email || '',
          avatarId: this.player.avatarId || 1,
          role: this.player.role || 'teacher',
          x: 0,
          y: 0,
          z: 0,
          rotY: 0,
          anim: 'idle'
        };

        this.callbacks.onWelcome({
          playerId: id,
          players: [selfData],
          mode: 'individual',
          unlockedStations: [1]
        });

        // Listen for peer students joining this host
        this.peer?.on('connection', (conn) => {
          this.handleHostIncomingConnection(conn);
        });
      });

      this.peer.on('error', (err: any) => {
        // If host ID is already taken, someone else is already hosting this room!
        if (err.type === 'unavailable-id') {
          console.info(`[Multiplayer P2P] Host already active for [${this.roomCode}]. Connecting as Client.`);
          this.peer?.destroy();
          this.initAsClient(hostPeerId);
        } else {
          console.warn('[Multiplayer P2P] Peer error:', err);
        }
      });
    } catch (e) {
      console.warn('[Multiplayer P2P] Setup error:', e);
    }
  }

  private initAsClient(hostPeerId: string) {
    try {
      this.peer = new Peer(this.myPlayerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', (clientId) => {
        this.myPlayerId = clientId;
        console.info(`[Multiplayer P2P] Client Peer online (${clientId}), connecting to host ${hostPeerId}...`);

        this.hostConn = this.peer!.connect(hostPeerId, {
          reliable: true
        });

        this.hostConn.on('open', () => {
          this.isConnected = true;
          this.isHost = false;
          console.info('[Multiplayer P2P] Connected to Room Host successfully!');

          // Send join payload to host
          this.hostConn!.send({
            type: 'join',
            roomCode: this.roomCode,
            player: {
              ...this.player,
              id: clientId
            }
          });
        });

        this.hostConn.on('data', (data: any) => {
          this.handleMessage(data);
        });

        this.hostConn.on('close', () => {
          console.warn('[Multiplayer P2P] Host connection closed.');
          this.isConnected = false;
        });

        this.hostConn.on('error', (err) => {
          console.warn('[Multiplayer P2P] Host conn error:', err);
        });
      });

      this.peer.on('error', (err: any) => {
        if (err.type === 'unavailable-id') {
          const freshId = `${this.myPlayerId}-${Math.random().toString(36).substring(2, 5)}`;
          this.myPlayerId = freshId;
          try { this.peer?.destroy(); } catch {}
          this.initAsClient(hostPeerId);
        } else {
          console.warn('[Multiplayer P2P] Client peer error:', err);
        }
      });
    } catch (e) {
      console.warn('[Multiplayer P2P] Client init error:', e);
    }
  }

  // --- HOST RELAY LOGIC ---
  private handleHostIncomingConnection(conn: DataConnection) {
    conn.on('open', () => {
      conn.on('data', (raw: any) => {
        const msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!msg || !msg.type) return;

        if (msg.type === 'join') {
          const incomingEmail = (msg.player?.email || '').trim().toLowerCase();

          // Deduplicate: If another peer is already connected with this exact same email, evict old connection
          let peerToEvict: string | null = null;
          if (incomingEmail) {
            for (const [peerId, clientData] of this.clientConns.entries()) {
              const stored = (clientData.player.email || '').trim().toLowerCase();
              if (stored === incomingEmail && peerId !== conn.peer) {
                peerToEvict = peerId;
                break;
              }
            }
          }

          if (peerToEvict) {
            const staleClient = this.clientConns.get(peerToEvict);
            if (staleClient) {
              try { staleClient.conn.close(); } catch {}
            }
            this.clientConns.delete(peerToEvict);
            this.broadcastToClientsExcept('', {
              type: 'player_left',
              id: peerToEvict,
              totalCount: this.clientConns.size + 1
            });
            this.callbacks.onPlayerLeft(peerToEvict, this.clientConns.size + 1);
          }

          // Enforce 20 players room capacity (1 host + 19 clients)
          if (this.clientConns.size >= 19) {
            conn.send({
              type: 'error',
              code: 'ROOM_FULL',
              message: 'Bilik ini telah penuh (20/20 pemain).'
            });
            conn.close();
            return;
          }

          const newPlayer: PlayerData = {
            id: conn.peer,
            name: msg.player?.name || 'Murid',
            email: incomingEmail,
            avatarId: msg.player?.avatarId || 1,
            role: msg.player?.role || 'student',
            x: 0,
            y: 0,
            z: 0,
            rotY: 0,
            anim: 'idle'
          };

          this.clientConns.set(conn.peer, { conn, player: newPlayer });

          // 1. Send welcome to this newcomer with all current players (host + clients)
          const allPlayers: PlayerData[] = [
            {
              id: this.peer!.id,
              name: this.player.name || 'Hos Bilik',
              email: this.player.email || '',
              avatarId: this.player.avatarId || 1,
              role: this.player.role || 'teacher',
              x: 0,
              y: 0,
              z: 0,
              rotY: 0,
              anim: 'idle'
            },
            ...Array.from(this.clientConns.values()).map(c => c.player)
          ];

          conn.send({
            type: 'welcome',
            playerId: conn.peer,
            players: allPlayers,
            mode: 'individual',
            unlockedStations: [1]
          });

          // 2. Broadcast player_joined to all other clients
          const totalCount = this.clientConns.size + 1;
          this.broadcastToClientsExcept(conn.peer, {
            type: 'player_joined',
            player: newPlayer,
            totalCount
          });

          // 3. Notify host local UI
          this.callbacks.onPlayerJoined(newPlayer, totalCount);
        } else if (msg.type === 'move') {
          const clientData = this.clientConns.get(conn.peer);
          if (clientData) {
            clientData.player.x = msg.x;
            clientData.player.y = msg.y;
            clientData.player.z = msg.z;
            clientData.player.rotY = msg.rotY;
            clientData.player.anim = msg.anim;
          }

          // Relay movement to all other clients
          this.broadcastToClientsExcept(conn.peer, {
            type: 'player_moved',
            id: conn.peer,
            x: msg.x,
            y: msg.y,
            z: msg.z,
            rotY: msg.rotY,
            anim: msg.anim
          });

          // Notify host local UI
          this.callbacks.onPlayerMoved({
            id: conn.peer,
            x: msg.x,
            y: msg.y,
            z: msg.z,
            rotY: msg.rotY,
            anim: msg.anim
          });
        } else if (msg.type === 'emote') {
          this.broadcastToClientsExcept(conn.peer, {
            type: 'player_emote',
            id: conn.peer,
            emote: msg.emote
          });
          this.callbacks.onPlayerEmote(conn.peer, msg.emote);
        } else if (msg.type === 'chat') {
          const client = this.clientConns.get(conn.peer);
          const name = client?.player.name || 'Pemain';
          this.broadcastToClientsExcept(conn.peer, {
            type: 'player_chat',
            id: conn.peer,
            text: msg.text,
            name
          });
          this.callbacks.onPlayerChat(conn.peer, msg.text, name);
        } else if (msg.type === 'teacher_control') {
          if (msg.action === 'unlock_station') {
            this.broadcastToClientsExcept('', {
              type: 'class_station_unlocked',
              stationId: msg.stationId,
              message: `Guru telah membuka Stesen ${msg.stationId} untuk semua!`
            });
            this.callbacks.onClassStationUnlocked(msg.stationId, `Guru telah membuka Stesen ${msg.stationId}!`);
          }
        } else if (msg.type === 'teacher_gathering') {
          this.broadcastToClientsExcept(conn.peer, msg);
          this.callbacks.onTeacherGathering?.(msg);
        }
      });

      conn.on('close', () => {
        this.clientConns.delete(conn.peer);
        const total = this.clientConns.size + 1;
        this.broadcastToClientsExcept('', {
          type: 'player_left',
          id: conn.peer,
          totalCount: total
        });
        this.callbacks.onPlayerLeft(conn.peer, total);
      });
    });
  }

  private broadcastToClientsExcept(excludePeerId: string, payload: any) {
    this.clientConns.forEach(({ conn }, peerId) => {
      if (peerId !== excludePeerId && conn.open) {
        try {
          conn.send(payload);
        } catch (e) {
          console.warn('[Multiplayer P2P] Send error:', e);
        }
      }
    });
  }

  // --- MESSAGE DISPATCHER ---
  private handleMessage(msg: any) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'welcome':
        this.callbacks.onWelcome(msg);
        break;
      case 'player_joined':
        this.callbacks.onPlayerJoined(msg.player, msg.totalCount);
        break;
      case 'player_moved':
        this.callbacks.onPlayerMoved(msg);
        break;
      case 'player_left':
        this.callbacks.onPlayerLeft(msg.id, msg.totalCount);
        break;
      case 'player_emote':
        this.callbacks.onPlayerEmote(msg.id, msg.emote);
        break;
      case 'player_chat':
        this.callbacks.onPlayerChat(msg.id, msg.text, msg.name);
        break;
      case 'class_station_unlocked':
        this.callbacks.onClassStationUnlocked(msg.stationId, msg.message);
        break;
      case 'teacher_gathering':
        this.callbacks.onTeacherGathering?.(msg);
        break;
      case 'error':
        this.callbacks.onError(msg.code, msg.message);
        break;
    }
  }

  // --- OUTGOING ACTIONS ---
  public sendMove(x: number, y: number, z: number, rotY: number, anim: PlayerAnim) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const timeSinceLast = now - this.lastSentTime;

    // Throttle frequency to ~20Hz (max once per 45ms)
    if (timeSinceLast < 45) {
      return;
    }

    const dx = x - this.lastSentMove.x;
    const dy = y - this.lastSentMove.y;
    const dz = z - this.lastSentMove.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dRot = Math.abs(rotY - this.lastSentMove.rotY);

    const isSignificantMove = distSq > 0.0016 || dRot > 0.04 || anim !== this.lastSentMove.anim;
    const isPeriodicHeartbeat = timeSinceLast > 1200;

    if (!isSignificantMove && !isPeriodicHeartbeat) {
      return;
    }

    this.lastSentTime = now;
    this.lastSentMove = { x, y, z, rotY, anim };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendWS({ type: 'move', x, y, z, rotY, anim });
      return;
    }

    if (this.isHost && this.peer) {
      // Host broadcasts own movement to all connected peers
      this.broadcastToClientsExcept('', {
        type: 'player_moved',
        id: this.peer.id,
        x,
        y,
        z,
        rotY,
        anim
      });
    } else if (this.hostConn && this.hostConn.open) {
      // Client sends move to Host
      this.hostConn.send({
        type: 'move',
        x,
        y,
        z,
        rotY,
        anim
      });
    }
  }

  public sendEmote(emote: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendWS({ type: 'emote', emote });
      return;
    }

    if (this.isHost && this.peer) {
      this.broadcastToClientsExcept('', {
        type: 'player_emote',
        id: this.peer.id,
        emote
      });
    } else if (this.hostConn && this.hostConn.open) {
      this.hostConn.send({ type: 'emote', emote });
    }
  }

  public sendChat(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendWS({ type: 'chat', text });
      return;
    }

    const myName = this.player.name || 'Pemain';
    if (this.isHost && this.peer) {
      this.broadcastToClientsExcept('', {
        type: 'player_chat',
        id: this.peer.id,
        text,
        name: myName
      });
    } else if (this.hostConn && this.hostConn.open) {
      this.hostConn.send({ type: 'chat', text });
    }
  }

  public sendTeacherUnlock(stationId: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendWS({
        type: 'teacher_control',
        action: 'unlock_station',
        stationId
      });
      return;
    }

    const payload = {
      type: 'class_station_unlocked',
      stationId,
      message: `Guru telah membuka Stesen ${stationId} untuk semua!`
    };

    if (this.isHost) {
      this.broadcastToClientsExcept('', payload);
    } else if (this.hostConn && this.hostConn.open) {
      this.hostConn.send({
        type: 'teacher_control',
        action: 'unlock_station',
        stationId
      });
    }
  }

  public sendTeacherMode(mode: 'individual' | 'class') {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendWS({
        type: 'teacher_control',
        action: 'set_mode',
        mode
      });
      return;
    }

    if (this.isHost) {
      this.broadcastToClientsExcept('', {
        type: 'mode_change',
        mode
      });
    } else if (this.hostConn && this.hostConn.open) {
      this.hostConn.send({
        type: 'teacher_control',
        action: 'set_mode',
        mode
      });
    }
  }

  public sendTeacherGathering(teacherName: string, x: number, y: number, z: number) {
    const payload = {
      type: 'teacher_gathering',
      teacherName,
      x,
      y,
      z
    };
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendWS(payload);
      return;
    }
    if (this.isHost && this.peer) {
      this.broadcastToClientsExcept('', payload);
      this.callbacks.onTeacherGathering?.({
        teacherId: this.peer.id,
        teacherName,
        x,
        y,
        z
      });
    } else if (this.hostConn && this.hostConn.open) {
      this.hostConn.send(payload);
    }
  }

  private sendWS(data: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public getMyPlayerId(): string {
    return this.myPlayerId;
  }

  public disconnect() {
    if (this.wsTimeoutId) clearTimeout(this.wsTimeoutId);

    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    if (this.hostConn) {
      try { this.hostConn.close(); } catch {}
      this.hostConn = null;
    }

    this.clientConns.forEach(({ conn }) => {
      try { conn.close(); } catch {}
    });
    this.clientConns.clear();

    if (this.peer) {
      try { this.peer.destroy(); } catch {}
      this.peer = null;
    }

    this.isConnected = false;
    this.isHost = false;
  }
}
