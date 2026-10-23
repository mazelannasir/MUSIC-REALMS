import React, { useState } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { X, Copy, Check, Share2, Users, QrCode, Sparkles, MessageCircle, Send } from 'lucide-react';

interface InviteModalProps {
  roomCode: string;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ roomCode, onClose }) => {
  const [copied, setCopied] = useState(false);

  // Generate shareable URL with room parameter
  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(roomCode)}`;

  const handleCopy = async () => {
    soundEngine.playButtonClick();
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      soundEngine.playCorrect();
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      // Fallback
      const input = document.createElement('input');
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      soundEngine.playCorrect();
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleNativeShare = async () => {
    soundEngine.playButtonClick();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Sertai Kembara Music Realms!',
          text: `Jom sertai saya meneroka dunia maya pendidikan muzik MUSIC REALMS! Kod Bilik: ${roomCode}`,
          url: inviteUrl,
        });
      } catch (err) {
        // User cancelled or not supported
      }
    } else {
      handleCopy();
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`Jom sertai saya meneroka dunia maya Pendidikan Muzik MUSIC REALMS!\n\nKod Bilik: ${roomCode}\nKlik pautan ini untuk terus masuk bersama saya:\n${inviteUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareTelegram = () => {
    const text = encodeURIComponent(`Jom sertai saya meneroka dunia maya Pendidikan Muzik MUSIC REALMS! Kod Bilik: ${roomCode}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-slate-900 border-2 border-indigo-500/50 shadow-2xl text-white space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400 flex items-center justify-center text-xl">
              🔗
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
                Jemput Murid & Rakan Sesi
              </div>
              <h3 className="text-xl font-bold font-['Fredoka'] text-white">
                Kongsi Pautan Music Realms
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playButtonClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Code Display Badge */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-slate-900 border border-indigo-500/40 text-center space-y-1 shadow-inner">
          <div className="text-xs uppercase font-bold tracking-widest text-slate-400">
            KOD BILIK ANDA (SEHINGGA 15 PEMAIN)
          </div>
          <div className="text-3xl sm:text-4xl font-black font-mono tracking-wider text-amber-300 select-all">
            {roomCode}
          </div>
          <p className="text-xs text-indigo-200">
            Murid boleh memasukkan kod ini di halaman utama atau terus klik pautan di bawah.
          </p>
        </div>

        {/* Shareable Link Box */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Pautan Terus (Direct Join Link):</span>
            {copied && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" /> Disalin ke Papan Keratan!
              </span>
            )}
          </label>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={inviteUrl}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs select-all focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Disalin' : 'Salin'}</span>
            </button>
          </div>
        </div>

        {/* Social / Class Sharing Buttons */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Hantar Terus Kepada Murid:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={shareWhatsApp}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 border border-emerald-500/40 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>💬</span> WhatsApp
            </button>
            <button
              onClick={shareTelegram}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-700/80 hover:bg-sky-600 border border-sky-500/40 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <span>✈️</span> Telegram
            </button>
            <button
              onClick={handleNativeShare}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-purple-700/80 hover:bg-purple-600 border border-purple-500/40 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" /> Kongsi
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
          <p>
            Apabila murid menekan pautan jemputan ini, kod bilik <strong>{roomCode}</strong> akan diisi secara automatik. Mereka hanya perlu memilih avatar dan nama untuk terus muncul di <em>Music Plaza</em> bersama anda!
          </p>
        </div>
      </div>
    </div>
  );
};
