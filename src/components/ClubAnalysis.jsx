import React from 'react';
import { ChevronLeft, BarChart3 } from 'lucide-react';

export default function ClubAnalysis({ onBack }) {
  return (
    <div className="animate-slide-up">
      <div className="p-6 flex items-center justify-between">
        <button onClick={onBack} className="p-2"><ChevronLeft className="w-6 h-6" /></button>
        <h1 className="font-display text-3xl">CLUB ANALYSE</h1>
        <div className="w-10" />
      </div>
      <div className="px-6">
        <div className="glass-card rounded-2xl p-8 text-center">
          <BarChart3 className="w-16 h-16 text-emerald-400/50 mx-auto mb-4" />
          <div className="font-body text-emerald-200/60">Speel meer rondes om gedetailleerde club statistieken te zien</div>
        </div>
      </div>
    </div>
  );
}
