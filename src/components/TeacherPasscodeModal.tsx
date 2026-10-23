import React, { useState, useEffect } from 'react';
import { soundEngine } from '../audio/soundEngine';
import { Lock, KeyRound, X, Check, AlertCircle, Sparkles } from 'lucide-react';

interface TeacherPasscodeModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

export const TeacherPasscodeModal: React.FC<TeacherPasscodeModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
  title = "Pengesahan Kod Guru",
  description = "Sila masukkan kod laluan 4-digit untuk mengakses Platform Bahan Pengajaran Guru."
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setError('');
      setIsShaking(false);
    }
  }, [isOpen]);

  // Physical keyboard handling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          handleDigitPress(e.key);
        }
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, pin]);

  if (!isOpen) return null;

  const handleDigitPress = (digit: string) => {
    soundEngine.playFootstep();
    setError('');
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    soundEngine.playFootstep();
    setError('');
    setPin(prev => prev.slice(0, -1));
  };

  const verifyPin = (candidatePin: string) => {
    if (candidatePin === '7770') {
      soundEngine.playCorrect();
      setError('');
      setTimeout(() => {
        onSuccess();
      }, 250);
    } else {
      soundEngine.playWrong();
      setError('Kod keselamatan tidak sah! Akses ditolak. Sila masukkan kod akses guru yang sah.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
    }
  };

  const handleSubmit = () => {
    if (pin.length === 4) {
      verifyPin(pin);
    } else {
      setError('Sila lengkapkan 4-digit kod keselamatan.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in select-none">
      <div
        className={`relative w-full max-w-sm p-6 sm:p-7 rounded-3xl bg-slate-900 border-2 border-indigo-500/50 shadow-2xl text-white space-y-5 transition-transform duration-200 ${
          isShaking ? 'translate-x-2 border-red-500 scale-[0.99]' : ''
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            soundEngine.playButtonClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock Icon and Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 border border-indigo-300 shadow-xl flex items-center justify-center text-3xl">
            🔐
          </div>
          <div className="space-y-1">
            <div className="text-[11px] uppercase tracking-widest font-black text-indigo-400">
              KESELAMATAN GURU
            </div>
            <h3 className="text-xl font-bold font-['Fredoka'] text-white">
              {title}
            </h3>
            <p className="text-xs text-slate-300 px-2 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* 4-Digit Display Boxes */}
        <div className="flex justify-center items-center gap-3 py-2">
          {[0, 1, 2, 3].map(idx => {
            const hasDigit = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-14 h-16 rounded-2xl border-2 flex items-center justify-center text-3xl font-black font-mono transition-all ${
                  hasDigit
                    ? 'border-indigo-400 bg-indigo-950/80 text-amber-300 shadow-lg shadow-indigo-500/20 scale-105'
                    : 'border-slate-700 bg-slate-950/70 text-slate-600'
                }`}
              >
                {hasDigit ? '•' : ''}
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Interactive Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleDigitPress(num)}
              className="py-3 rounded-2xl bg-slate-800/80 hover:bg-indigo-600/50 border border-slate-700/80 hover:border-indigo-400 text-xl font-bold font-mono text-white transition-all active:scale-95 cursor-pointer shadow-md"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            className="py-3 rounded-2xl bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300 transition-all active:scale-95 cursor-pointer"
          >
            Padam
          </button>
          <button
            onClick={() => handleDigitPress('0')}
            className="py-3 rounded-2xl bg-slate-800/80 hover:bg-indigo-600/50 border border-slate-700/80 hover:border-indigo-400 text-xl font-bold font-mono text-white transition-all active:scale-95 cursor-pointer shadow-md"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            className="py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer shadow-md flex items-center justify-center gap-1"
          >
            <Check className="w-4 h-4" /> Masuk
          </button>
        </div>

        {/* Security Note */}
        <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 pt-1">
          <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
          <span>Akses dilindungi kod keselamatan guru</span>
        </div>
      </div>
    </div>
  );
};
