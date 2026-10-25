export type StationId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type PlayerAnim = 'idle' | 'walk' | 'jump' | 'dance' | 'wave';

export interface PlayerData {
  id: string;
  name: string;
  email?: string;
  avatarId: number;
  role: 'student' | 'teacher';
  x: number;
  y: number;
  z: number;
  rotY: number;
  anim: PlayerAnim;
  emote?: string;
  chatBubble?: string;
  chatExpires?: number;
}

export interface AvatarDefinition {
  id: number;
  name: string;
  title: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headwear: string;
  accessory: string;
  instrument: string;
  emoji: string;
  isTeacherOnly?: boolean;
}

export const AVATARS: AvatarDefinition[] = [
  {
    id: 1,
    name: "Aidan Melody",
    title: "Pengembara Muzik Hijau",
    description: "Murid lelaki dengan topi pengembara bulu burung, beg kembara daun dan kecapi hutan.",
    primaryColor: "#10b981", // Emerald
    secondaryColor: "#065f46",
    accentColor: "#facc15",
    headwear: "Topi Pengembara Rimba",
    accessory: "Beg Galas Muzikal",
    instrument: "Kecapi Melodi",
    emoji: "🎒"
  },
  {
    id: 2,
    name: "Maya Cadence",
    title: "Pengembara Muzik Mawar",
    description: "Murid perempuan ceria dengan pin rambut not muzik, gaun kembara karang dan loceng pelangi.",
    primaryColor: "#f43f5e", // Rose
    secondaryColor: "#9f1239",
    accentColor: "#fbbf24",
    headwear: "Pin Rambut Not Emas",
    accessory: "Beg Bahu Buruj",
    instrument: "Loceng Rentak",
    emoji: "🌟"
  },
  {
    id: 3,
    name: "Caelum Maestro",
    title: "Ahli Muzik Fantasi Biru",
    description: "Maestro cakerawala berjubah nilam bercahaya dengan tongkat kristal klef trebel.",
    primaryColor: "#3b82f6", // Azure
    secondaryColor: "#1e3a8a",
    accentColor: "#67e8f9",
    headwear: "Mahkota Nilam Angkasa",
    accessory: "Jubah Berbintang",
    instrument: "Tongkat Klef Trebel",
    emoji: "🪄"
  },
  {
    id: 4,
    name: "Lyra Virtuoso",
    title: "Ahli Muzik Fantasi Ungu",
    description: "Pakar melodi misteri berjubah ametis dengan sfera irama terapung di sekelilingnya.",
    primaryColor: "#a855f7", // Purple
    secondaryColor: "#581c87",
    accentColor: "#f472b6",
    headwear: "Tiara Kristal Ametis",
    accessory: "Selendang Nada Harmoni",
    instrument: "Sfera Irama Terapung",
    emoji: "🔮"
  },
  {
    id: 5,
    name: "Solomon Sunbard",
    title: "Pengembara Muzik Emas",
    description: "Pahlawan harmoni berzirah emas berkilau dengan seruling suria dan sayap not muzik.",
    primaryColor: "#eab308", // Gold
    secondaryColor: "#713f12",
    accentColor: "#ffffff",
    headwear: "Ketopong Emas Suria",
    accessory: "Zirah Emas Berkilau",
    instrument: "Seruling Suria Emas",
    emoji: "👑"
  },
  {
    id: 6,
    name: "Cikgu Maestro Aurora",
    title: "Maestro Diraja Cahaya Guru (Glowing)",
    description: "Avatar rasmi Guru Pendidikan Muzik dengan aura glowing neon keemasan, jubah aurora bersinar terang, halo bercahaya dan mahkota permata.",
    primaryColor: "#fbbf24", // Glowing Brilliant Gold
    secondaryColor: "#06b6d4", // Glowing Cyan
    accentColor: "#f43f5e", // Glowing Neon Rose
    headwear: "Mahkota Cahaya Suria",
    accessory: "Jubah Glowing Aurora & Halo Bersinar",
    instrument: "Tongkat Klef Diraja Guru",
    emoji: "👑✨",
    isTeacherOnly: true
  }
];

export interface SlideData {
  page: number;
  title: string;
  text: string;
  tip?: string;
  interactiveNote?: 'G' | 'A' | 'B';
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface MiniGameDefinition {
  id: string;
  name: string;
  desc: string;
  mode: 'built-in' | 'external';
  url?: string;
}

export interface StationConfig {
  id: StationId;
  title: string;
  subtitle: string;
  description: string;
  contentType: 'slides' | 'video' | 'games' | 'quiz' | 'feedback';
  contentUrl?: string;
  embedMode?: 'iframe' | 'new_tab';
  teacherInstructions?: string;
  externalButtonText?: string;
  slides?: SlideData[];
  videoTitle?: string;
  videoDuration?: string;
  videoNotes?: string;
  games?: MiniGameDefinition[];
  quizQuestions?: QuizQuestion[];
  questionText?: string;
}

export interface FeedbackSubmission {
  id?: string;
  roomCode: string;
  studentName: string;
  avatarId: number;
  emoji: string;
  ratingScore: number;
  comment: string;
  timestamp?: number;
}

export interface IslandLocation {
  id: number; // 0 for Plaza, 1..5 for stations
  name: string;
  x: number;
  z: number;
  radius: number;
  color: number;
  topColor: number;
  rimColor: number;
  crystalColor: number;
  portalRotation: number;
}

export const WORLD_LOCATIONS: IslandLocation[] = [
  {
    id: 0,
    name: "Music Plaza",
    x: 0,
    z: 0,
    radius: 14,
    color: 0x18182b,
    topColor: 0x18182b,
    rimColor: 0x475569,
    crystalColor: 0xcbd5e1,
    portalRotation: 0
  },
  {
    id: 1,
    name: "Station 1: Slide Sanctuary",
    x: -28,
    z: -16,
    radius: 11,
    color: 0x1e1b4b,
    topColor: 0x1e1b4b,
    rimColor: 0x6366f1,
    crystalColor: 0xa5b4fc,
    portalRotation: Math.PI / 4
  },
  {
    id: 2,
    name: "Station 2: Animation Cloud Theatre",
    x: -24,
    z: 28,
    radius: 12,
    color: 0x9a3412,
    topColor: 0x9a3412,
    rimColor: 0xea580c,
    crystalColor: 0xfdba74,
    portalRotation: -Math.PI / 4
  },
  {
    id: 3,
    name: "Stesen Game 1: Not Whacker",
    x: 22,
    z: 26,
    radius: 11,
    color: 0x701a75,
    topColor: 0x701a75,
    rimColor: 0xc026d3,
    crystalColor: 0xf5d0fe,
    portalRotation: Math.PI * 0.75
  },
  {
    id: 6,
    name: "Stesen Game 2: Music Beams Liner",
    x: 42,
    z: 40,
    radius: 9,
    color: 0x164e63,
    topColor: 0x164e63,
    rimColor: 0x0891b2,
    crystalColor: 0x67e8f9,
    portalRotation: Math.PI * 0.9
  },
  {
    id: 7,
    name: "Stesen Game 3: Not Ninja",
    x: 10,
    z: 48,
    radius: 9,
    color: 0x451a03,
    topColor: 0x451a03,
    rimColor: 0xd97706,
    crystalColor: 0xfde68a,
    portalRotation: Math.PI * 0.6
  },
  {
    id: 4,
    name: "Station 4: Quiz Constellation",
    x: 30,
    z: -14,
    radius: 11,
    color: 0x134e4a,
    topColor: 0x134e4a,
    rimColor: 0x0d9488,
    crystalColor: 0x5eead4,
    portalRotation: -Math.PI * 0.75
  },
  {
    id: 5,
    name: "Station 5: Emoji Feedback Cloud",
    x: 2,
    z: -38,
    radius: 12,
    color: 0x4c0519,
    topColor: 0x4c0519,
    rimColor: 0x9f1239,
    crystalColor: 0xfda4af,
    portalRotation: 0
  }
];
