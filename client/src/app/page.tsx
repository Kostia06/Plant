'use client';

import React, { useState } from 'react';
import MindBloomDisplay from '@/components/MindBloomDisplay';

export default function Home() {
  const [score, setScore] = useState(0);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-black text-white">
      <h1 className="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
        MINDBLOOM
      </h1>

      <div className="w-full max-w-4xl">
        <MindBloomDisplay currentScore={score} />
      </div>

      {/* Mock Controls for Demo */}
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl bg-zinc-900 p-6 rounded-lg border border-zinc-800">
        <div className="col-span-full mb-2 text-center text-zinc-500 text-sm font-mono">DEV CONTROLS</div>

        <button
          onClick={() => setScore(s => s - 50)}
          className="px-4 py-2 bg-red-900/50 hover:bg-red-900 text-red-200 rounded transition"
        >
          -50 Pts (Test Wither)
        </button>

        <button
          onClick={() => setScore(s => s + 50)}
          className="px-4 py-2 bg-green-900/50 hover:bg-green-900 text-green-200 rounded transition"
        >
          +50 Pts
        </button>

        <button
          onClick={() => setScore(s => s + 200)}
          className="px-4 py-2 bg-blue-900/50 hover:bg-blue-900 text-blue-200 rounded transition"
        >
          +200 Pts (Boost)
        </button>

        <button
          onClick={() => setScore(0)}
          className="px-4 py-2 bg-orange-600/50 hover:bg-orange-600 text-white rounded transition"
        >
          Reset (0 Pts)
        </button>

        <div className="col-span-full flex justify-between px-2 mt-2 text-xs text-zinc-600 font-mono">
          <span>Wither: &lt; 0</span>
          <span>Sapling: 100</span>
          <span>Tree: 600</span>
          <span>Final: 2000</span>
        </div>
      </div>
    </main>
  );
}
