import { PlayerData, PlayerAnim } from '../types/game';

export interface MultiplayerCallbacks {
  onWelcome: (data: { playerId: string; players: PlayerData[]; mode: 'individual' | 'class'; unlockedStations: number[] }) => void;
  onPlayerJoined: (player: PlayerData, totalCount: number) => void;
  onPlayerMoved: (data: { id: string; x: number; y: number; z: number; rotY: number; anim: PlayerAnim }) => void;
  onPlayerLeft: (id: string, totalCount: number) => void;
  onPlayerEmote: (id: string, emote: string) => void;
  onPlayerChat: (id: string, text: string, name: string) => void;
  onClassStationUnlocked: (stationId: number, message: string) => void;
  onError: (code: string, message: string) => void;
}

export class MultiplayerService {
  private ws: WebSocket | null = null;
  private roomCode: string = '';
  private player: Partial<PlayerData> = {};
  private callbacks: MultiplayerCallbacks;
  private isConnected = false;
  private reconnectTimeout: number | null = null;

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(roomCode: string, player: Partial<PlayerData>) {
    this.roomCode = roomCode.toUpperCase();
    this.player = player;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.send({
          type: 'join',
          roomCode: this.roomCode,
          player: this.player
        });
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
        this.isConnected = false;
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error, operating in offline fallback:', err);
      };
    } catch (err) {
      console.warn('Could not establish WebSocket, fallback active:', err);
    }
  }

  private handleMessage(msg: any) {
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
      case 'error':
        this.callbacks.onError(msg.code, msg.message);
        break;
    }
  }

  public sendMove(x: number, y: number, z: number, rotY: number, anim: PlayerAnim) {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
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
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'emote',
        emote
      });
    }
  }

  public sendChat(text: string) {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'chat',
        text
      });
    }
  }

  public sendTeacherUnlock(stationId: number) {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'teacher_control',
        action: 'unlock_station',
        stationId
      });
    }
  }

  public sendTeacherMode(mode: 'individual' | 'class') {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'teacher_control',
        action: 'set_mode',
        mode
      });
    }
  }

  private send(data: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
