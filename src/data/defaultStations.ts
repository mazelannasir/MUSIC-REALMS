import { StationConfig, FeedbackSubmission } from '../types/game';

export const DEFAULT_STATIONS: StationConfig[] = [
  {
    id: 1,
    title: "Stesen 1: Slide Sanctuary",
    subtitle: "Pusat Slaid Pembelajaran Guru",
    description: "Pelajari kedudukan not muzik G, A, dan B pada garisan dan ruang baluk melalui slaid interaktif Canva guru.",
    contentType: "slides",
    contentUrl: "https://canva.link/qa14xyv3sw4tko5",
    teacherInstructions: "Sila buka dan teliti setiap helaian slaid Canva untuk memahami kedudukan not G, A, dan B pada baluk.",
    externalButtonText: "Buka Slaid Canva di Tab Baharu",
    slides: [
      {
        page: 1,
        title: "Pengenalan Baluk & Not Muzik G, A, B",
        text: "Baluk terdiri daripada 5 garisan dan 4 ruang selari. Garisan dan ruang dikira dari bawah ke atas.",
        tip: "Ingat: Garisan paling bawah ialah Garisan 1!",
        interactiveNote: "G"
      },
      {
        page: 2,
        title: "Kedudukan Not G",
        text: "Not G terletak tepat pada Garisan ke-2 pada baluk dengan klef trebel. Kepala not melingkari garis kedua.",
        tip: "Klef trebel juga dikenali sebagai Klef G kerana ia bermula dari garisan kedua!",
        interactiveNote: "G"
      },
      {
        page: 3,
        title: "Kedudukan Not A",
        text: "Not A terletak di Ruang ke-2 (antara Garisan ke-2 dan Garisan ke-3) pada baluk.",
        tip: "Bunyi not A lebih tinggi sedikit daripada not G.",
        interactiveNote: "A"
      },
      {
        page: 4,
        title: "Kedudukan Not B",
        text: "Not B terletak tepat pada Garisan ke-3 pada baluk. Garisan ketiga membahagi baluk kepada dua bahagian.",
        tip: "Not B adalah pic tertinggi antara ketiga-tiga not G, A dan B Tahun 4!",
        interactiveNote: "B"
      }
    ]
  },
  {
    id: 2,
    title: "Stesen 2: Animation Cloud Theatre",
    subtitle: "Teater Video Animasi Muzik",
    description: "Tonton video animasi pembelajaran muzik untuk menguasai konsep baluk dan pic not dengan mudah.",
    contentType: "video",
    contentUrl: "https://www.youtube.com/embed/bm67bUPEql0",
    videoTitle: "Video Pembelajaran Animasi Not Muzik",
    videoDuration: "Video Interaktif",
    videoNotes: "Fahami konsep baluk, klef trebel, dan kedudukan not G, A, B.",
    teacherInstructions: "Tonton video penerangan ini untuk memahami kedudukan not pada baluk secara visual.",
    externalButtonText: "Tonton Video di YouTube / Tab Baharu"
  },
  {
    id: 3,
    title: "Stesen Game 1: Not Whacker",
    subtitle: "Permainan Ketuk Not Pantas",
    description: "Uji kepantasan anda mengetuk not G, A, dan B yang muncul dengan betul dalam permainan Not Whacker!",
    contentType: "games",
    contentUrl: "https://not-whacker-permainan-muzik-whack-a-mole.ai.studio/",
    teacherInstructions: "Ketuk not muzik yang betul secepat mungkin untuk mengumpul markah tertinggi!",
    externalButtonText: "Main Not Whacker di Tab Baharu",
    games: []
  },
  {
    id: 6,
    title: "Stesen Game 2: Music Beams Liner",
    subtitle: "Permainan Garisan Baluk Muzik",
    description: "Kuasai kemahiran membezakan garisan dan ruang baluk dalam permainan interaktif Music Beams Liner!",
    contentType: "games",
    contentUrl: "https://musicbeamslinertestmoe.netlify.app/",
    teacherInstructions: "Kenal pasti kedudukan not pada garisan atau ruang baluk dengan tepat!",
    externalButtonText: "Main Music Beams Liner di Tab Baharu",
    games: []
  },
  {
    id: 7,
    title: "Stesen Game 3: Not Ninja",
    subtitle: "Permainan Hiris Not Muzik Tangkas",
    description: "Gunakan refleks dan ketangkasan anda untuk menghiris not muzik yang betul seperti seorang Ninja muzik!",
    contentType: "games",
    contentUrl: "https://music-not-ninja.ai.studio/",
    teacherInstructions: "Hiris not muzik yang diminta dan elakkan daripada memotong not yang salah!",
    externalButtonText: "Main Not Ninja di Tab Baharu",
    games: []
  },
  {
    id: 4,
    title: "Stesen 4: Kuiz Digital Muzik",
    subtitle: "Konstelasi Kuiz Pembelajaran",
    description: "Uji kefahaman menyeluruh anda tentang not baluk G, A, dan B melalui kuiz digital interaktif!",
    contentType: "quiz",
    contentUrl: "https://kuiztest1.netlify.app/",
    teacherInstructions: "Jawab semua soalan kuiz dengan teliti untuk melengkapkan stesen ini!",
    externalButtonText: "Mula Kuiz Digital di Tab Baharu",
    quizQuestions: [
      {
        id: 1,
        question: "Berapakah bilangan garisan pada baluk muzik?",
        options: ["3 garisan", "4 garisan", "5 garisan", "6 garisan"],
        correctIndex: 2,
        explanation: "Baluk muzik piawai mempunyai 5 garisan selari dan 4 ruang."
      },
      {
        id: 2,
        question: "Di manakah letaknya kedudukan Not G pada baluk?",
        options: ["Ruang 1", "Garisan 2", "Ruang 2", "Garisan 3"],
        correctIndex: 1,
        explanation: "Not G terletak tepat di Garisan ke-2 pada baluk."
      },
      {
        id: 3,
        question: "Di manakah letaknya kedudukan Not A pada baluk?",
        options: ["Garisan 1", "Ruang 1", "Garisan 2", "Ruang 2"],
        correctIndex: 3,
        explanation: "Not A terletak di Ruang ke-2 (antara garis 2 dan garis 3)."
      },
      {
        id: 4,
        question: "Di manakah kedudukan Not B pada baluk?",
        options: ["Garisan 2", "Ruang 2", "Garisan 3", "Ruang 3"],
        correctIndex: 2,
        explanation: "Not B terletak tepat pada Garisan ke-3 pada baluk."
      },
      {
        id: 5,
        question: "Susunan pic manakah yang betul daripada rendah ke tinggi?",
        options: ["B, A, G", "G, A, B", "A, B, G", "G, B, A"],
        correctIndex: 1,
        explanation: "Pic menaik daripada rendah ke tinggi ialah G -> A -> B."
      }
    ]
  },
  {
    id: 5,
    title: "Stesen 5: Emoji Feedback Cloud",
    subtitle: "Awan Maklum Balas Pelajar",
    description: "Kongsikan pengalaman pengembaraan anda di Music Realms menggunakan pilihan emoji dan komen kreatif!",
    contentType: "feedback",
    contentUrl: "",
    questionText: "Apakah pendapat kamu tentang pengalaman pembelajaran menggunakan Music Realms?"
  }
];

export const STORAGE_KEY_STATIONS = 'music_realms_stations_v4';
export const STORAGE_KEY_FEEDBACK = 'music_realms_feedback_v4';

/**
 * Merge existing or loaded stations with default schema to ensure all 7 stations exist
 * and ensure user links are never overridden by empty strings
 */
export function mergeWithDefaultStations(incoming: StationConfig[]): StationConfig[] {
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return JSON.parse(JSON.stringify(DEFAULT_STATIONS));
  }

  const result: StationConfig[] = [];
  DEFAULT_STATIONS.forEach(defSt => {
    const found = incoming.find(inc => inc && inc.id === defSt.id);
    if (found) {
      result.push({
        ...defSt,
        ...found,
        title: found.title || defSt.title,
        description: found.description || defSt.description,
        // If contentUrl is empty in found, use the official default link
        contentUrl: (found.contentUrl && found.contentUrl.trim()) ? found.contentUrl : defSt.contentUrl,
        teacherInstructions: found.teacherInstructions !== undefined ? found.teacherInstructions : defSt.teacherInstructions,
        externalButtonText: found.externalButtonText || defSt.externalButtonText,
        slides: found.slides && found.slides.length > 0 ? found.slides : defSt.slides,
        quizQuestions: found.quizQuestions && found.quizQuestions.length > 0 ? found.quizQuestions : defSt.quizQuestions
      });
    } else {
      result.push(JSON.parse(JSON.stringify(defSt)));
    }
  });

  return result;
}

/**
 * Load stations with robust Netlify / static fallback:
 * 1. URL encoded payload (?st=...)
 * 2. LocalStorage
 * 3. Default stations
 */
export function loadStoredStations(): StationConfig[] {
  if (typeof window === 'undefined') {
    return DEFAULT_STATIONS;
  }

  // 1. Check if URL has station parameters
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('st') || urlParams.get('config');
    if (encodedData) {
      try {
        const decodedStr = decodeURIComponent(atob(encodedData));
        const parsed = JSON.parse(decodedStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = mergeWithDefaultStations(parsed);
          localStorage.setItem(STORAGE_KEY_STATIONS, JSON.stringify(merged));
          return merged;
        }
      } catch (e) {
        console.warn('Could not decode URL station params:', e);
      }
    }
  } catch (err) {
    console.warn('URL parsing error:', err);
  }

  // 2. Check localStorage
  try {
    const local = localStorage.getItem(STORAGE_KEY_STATIONS);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeWithDefaultStations(parsed);
      }
    }
  } catch (err) {
    console.warn('LocalStorage stations load error:', err);
  }

  return JSON.parse(JSON.stringify(DEFAULT_STATIONS));
}

/**
 * Save stations persistently to localStorage and try server PUT
 */
export async function saveStoredStations(stations: StationConfig[]): Promise<boolean> {
  const merged = mergeWithDefaultStations(stations);

  // 1. Always save locally immediately
  try {
    localStorage.setItem(STORAGE_KEY_STATIONS, JSON.stringify(merged));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }

  // 2. Try saving to server if available (e.g. Node dev server)
  try {
    await fetch('/api/stations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stations: merged })
    });
  } catch (err) {
    // Expected on static hosts like Netlify
    console.info('Operating in client persistence mode (Netlify/Offline):', err);
  }

  return true;
}

/**
 * Generate a shareable URL containing the teacher's materials for students
 * This allows students on Netlify to open the exact classroom link with all links active!
 */
export function generateShareableStudentUrl(stations: StationConfig[]): string {
  try {
    const minimalData = stations.map(s => ({
      id: s.id,
      title: s.title,
      contentUrl: s.contentUrl || '',
      teacherInstructions: s.teacherInstructions || '',
      externalButtonText: s.externalButtonText || ''
    }));

    const jsonStr = JSON.stringify(minimalData);
    const encoded = btoa(encodeURIComponent(jsonStr));
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?st=${encoded}`;
  } catch (err) {
    console.error('Error creating shareable URL:', err);
    return window.location.href;
  }
}

/**
 * Export stations configuration as formatted JSON
 */
export function exportStationsJSON(stations: StationConfig[]): string {
  return JSON.stringify(stations, null, 2);
}

/**
 * Import stations configuration from JSON string
 */
export function importStationsJSON(jsonString: string): StationConfig[] | null {
  try {
    const parsed = JSON.parse(jsonString.trim());
    if (Array.isArray(parsed) && parsed.length > 0) {
      const merged = mergeWithDefaultStations(parsed);
      saveStoredStations(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Failed to parse station JSON:', err);
  }
  return null;
}

/**
 * Save student feedback locally (ensures feedback works on Netlify)
 */
export function saveLocalFeedback(submission: FeedbackSubmission): void {
  try {
    const existing = loadLocalFeedback();
    const newRecord: FeedbackSubmission = {
      ...submission,
      id: submission.id || `fb-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now()
    };
    existing.unshift(newRecord);
    localStorage.setItem(STORAGE_KEY_FEEDBACK, JSON.stringify(existing.slice(0, 50)));
  } catch (err) {
    console.warn('LocalStorage feedback save error:', err);
  }
}

/**
 * Load student feedback from localStorage
 */
export function loadLocalFeedback(): FeedbackSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FEEDBACK);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('LocalStorage feedback load error:', err);
  }
  return [];
}
