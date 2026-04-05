import React from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { Trophy, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  <SEO title={'Page Not Found'} />

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150" />
        <div className="relative bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shrink-0">
          <Trophy className="w-16 h-16 text-emerald-500 opacity-50" />
        </div>
      </div>
      
      <h1 className="text-7xl font-display font-black text-transparent bg-clip-text bg-linear-to-br from-white to-zinc-500 mb-4 tracking-tighter">
        404
      </h1>
      <h2 className="text-2xl font-bold text-white mb-3">Red Card Issued!</h2>
      <p className="text-zinc-400 max-w-sm mx-auto mb-8 text-sm leading-relaxed">
        It looks like the page you were looking for has been benched or doesn't exist anymore on TambuaTips.
      </p>
      
      <Link 
        to="/" 
        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Go Back Home
      </Link>
    </div>
  );
}
