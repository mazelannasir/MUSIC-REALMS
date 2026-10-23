import React from 'react';
import { WORLD_LOCATIONS, StationId } from '../types/game';
import { soundEngine } from '../audio/soundEngine';
import { X, Lock, CheckCircle, Navigation, Compass } from 'lucide-react';

interface MiniMapProps {
  playerX: number;
  playerZ: number;
  unlockedStations: number[];
  completedStations: number[];
  onTeleport?: (x: number, z: number) => void;
  onClose: () => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  playerX,
  playerZ,
  unlockedStations,
  completedStations,
  onTeleport,
  onClose
}) => {
  // Map world coordinate [-45, 48] to SVG canvas [20, 280]
  const mapScale = 2.5;
  const mapCenter = 150;

  const toSvgX = (x: number) => mapCenter + x * mapScale;
  const toSvgY = (z: number) => mapCenter + z * mapScale;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md p-6 rounded-3xl bg-slate-900 border-2 border-indigo-500/50 shadow-2xl text-white space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold font-['Fredoka'] text-lg text-white">
              Peta Alam Semesta Music Realms
            </h3>
          </div>
          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Radar Map Graphic */}
        <div className="relative w-full aspect-square bg-[#0c081e] rounded-2xl border border-indigo-500/30 overflow-hidden shadow-inner flex items-center justify-center">
          {/* Background grid rings */}
          <svg className="w-full h-full" viewBox="0 0 300 300">
            <circle cx="150" cy="150" r="130" fill="none" stroke="#312e81" strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="150" cy="150" r="85" fill="none" stroke="#1e1b4b" strokeWidth="1" />
            <circle cx="150" cy="150" r="40" fill="none" stroke="#1e1b4b" strokeWidth="1" />
            <line x1="150" y1="10" x2="150" y2="290" stroke="#1e1b4b" strokeWidth="1" />
            <line x1="10" y1="150" x2="290" y2="150" stroke="#1e1b4b" strokeWidth="1" />

            {/* Connecting Bridge lines - 6 and 7 connect ONLY to 3 */}
            {[
              { from: 0, to: 1, req: 1 },
              { from: 1, to: 2, req: 2 },
              { from: 2, to: 3, req: 3 },
              { from: 3, to: 6, req: 3 }, // Dedicated to Stesen Game 2
              { from: 3, to: 7, req: 3 }, // Dedicated to Stesen Game 3
              { from: 3, to: 4, req: 4 },
              { from: 4, to: 5, req: 5 }
            ].map(b => {
              const f = WORLD_LOCATIONS.find(l => l.id === b.from);
              const t = WORLD_LOCATIONS.find(l => l.id === b.to);
              if (!f || !t) return null;
              const isUnlocked = unlockedStations.includes(b.req);
              return (
                <line
                  key={`${b.from}-${b.to}`}
                  x1={toSvgX(f.x)}
                  y1={toSvgY(f.z)}
                  x2={toSvgX(t.x)}
                  y2={toSvgY(t.z)}
                  stroke={isUnlocked ? '#38bdf8' : '#475569'}
                  strokeWidth={isUnlocked ? "3" : "1.5"}
                  strokeDasharray={isUnlocked ? undefined : "3 3"}
                />
              );
            })}

            {/* Floating Islands */}
            {WORLD_LOCATIONS.map(loc => {
              const isPlaza = loc.id === 0;
              const isComp = completedStations.includes(loc.id);
              const isUnl = isPlaza || unlockedStations.includes(loc.id);
              const cx = toSvgX(loc.x);
              const cy = toSvgY(loc.z);
              const r = loc.radius * 1.15;

              return (
                <g key={loc.id} className="cursor-pointer" onClick={() => onTeleport && onTeleport(loc.x, loc.z)}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={isComp ? '#059669' : isUnl ? (isPlaza ? '#4f46e5' : '#0284c7') : '#1e293b'}
                    stroke={isComp ? '#34d399' : isUnl ? '#60a5fa' : '#475569'}
                    strokeWidth="2"
                    opacity={isUnl ? "0.9" : "0.5"}
                  />
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={isPlaza ? "9" : "9"}
                    fontWeight="bold"
                  >
                    {isPlaza
                      ? 'PLAZA'
                      : loc.id === 3
                      ? 'G1'
                      : loc.id === 6
                      ? 'G2'
                      : loc.id === 7
                      ? 'G3'
                      : `S${loc.id}`}
                  </text>
                </g>
              );
            })}

            {/* Current Player Position Dot */}
            <g transform={`translate(${toSvgX(playerX)}, ${toSvgY(playerZ)})`}>
              <circle r="7" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
              <circle r="12" fill="#f43f5e" opacity="0.3" className="animate-ping" />
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            <span>Selesai (✓)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
            <span>Terbuka (Aktif)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-700"></span>
            <span>Terkunci (Gembok)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
