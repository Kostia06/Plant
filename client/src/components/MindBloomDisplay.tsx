'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface MindBloomDisplayProps {
    currentScore: number;
}

const STAGES = [
    { threshold: 0, src: '/sprites/seedling.png', name: 'Seedling' },
    { threshold: 100, src: '/sprites/sappling.png', name: 'Sapling' },
    { threshold: 300, src: '/sprites/subtree.png', name: 'Young Tree' },
    { threshold: 600, src: '/sprites/tree.png', name: 'Mature Tree' },
    { threshold: 1000, src: '/sprites/treepro.png', name: 'Ancient Tree' },
    { threshold: 2000, src: '/sprites/final.png', name: 'MindBloom' },
];

export default function MindBloomDisplay({ currentScore }: MindBloomDisplayProps) {
    const [stageIndex, setStageIndex] = useState(0);
    const [isEvolving, setIsEvolving] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    const isWithered = currentScore < 0;

    // Ref for the evolution sound
    // Refs for audio
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const degrowthAudioRef = useRef<HTMLAudioElement | null>(null);


    // Initialize Audio
    useEffect(() => {
        audioRef.current = new Audio('/audio/growup.mp3');
        degrowthAudioRef.current = new Audio('/audio/growdown.mp3');
    }, []);

    // Determine target stage based on score
    const targetStageIndex = STAGES.reduce((acc, stage, index) => {
        return currentScore >= stage.threshold ? index : acc;
    }, 0);

    const triggerEvolution = React.useCallback((newStage: number) => {
        setIsEvolving(true);

        // 1. Build Up (Flash/Shake) - handled by CSS class 'animate-pulse-fast'

        // 2. The Pop (after delay)
        setTimeout(() => {
            // Play Sound
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.error("Audio play failed", e));
            }

            // Flash Screen (Overlay) - Restore "Mario Style" Intensity
            const flashOverlay = document.getElementById('evolution-flash');
            if (flashOverlay) {
                flashOverlay.style.transition = 'none'; // Instant on
                flashOverlay.style.backgroundColor = 'white';
                flashOverlay.style.mixBlendMode = 'screen';
                flashOverlay.style.opacity = '1';

                // Fade out
                setTimeout(() => {
                    flashOverlay.style.transition = 'opacity 1s ease-out';
                    flashOverlay.style.opacity = '0';
                }, 100);
            }

            // Change Sprite
            setStageIndex(newStage);
            setIsEvolving(false);

            // 3. Post-Evolution Bounce

        }, 2000); // 2 second build up
    }, []);

    const triggerDegrowth = React.useCallback((newStage: number) => {
        // Immediate feedback for loss
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);

        // Play Sound
        if (degrowthAudioRef.current) {
            degrowthAudioRef.current.currentTime = 0;
            degrowthAudioRef.current.play().catch(e => console.error("Audio play failed", e));
        }

        // Flash Screen (Red tint for bad news) - Intense "Damage" Flash
        const flashOverlay = document.getElementById('evolution-flash');
        if (flashOverlay) {
            flashOverlay.style.transition = 'none'; // Instant on
            flashOverlay.style.backgroundColor = '#ef4444'; // Red-500
            flashOverlay.style.mixBlendMode = 'multiply'; // Darken/Tint
            flashOverlay.style.opacity = '0.8';

            // Fade out
            setTimeout(() => {
                flashOverlay.style.transition = 'opacity 0.5s ease-out';
                flashOverlay.style.opacity = '0';
            }, 100);
        }
        setStageIndex(newStage);
    }, []);

    // Handle Evolution
    useEffect(() => {
        // Wrap in timeout to avoid "setState during render" lint error
        const timer = setTimeout(() => {
            // Special case: Transitioning TO Withered state (Score < 0)
            if (isWithered && stageIndex !== -1) {
                // We use -1 or just let the score drive it, but we need the effect
                triggerDegrowth(-1); // Use a dummy index or handle logic to just play sound/flash
                return;
            }

            if (isWithered) return; // If already withered, do nothing

            if (targetStageIndex > stageIndex) {
                triggerEvolution(targetStageIndex);
            } else if (targetStageIndex < stageIndex) {
                // Degrowth logic with feedback
                triggerDegrowth(targetStageIndex);
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [currentScore, targetStageIndex, stageIndex, isWithered, triggerEvolution, triggerDegrowth]);


    const handleInteract = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const currentSprite = isWithered ? '/sprites/withered tree.png' : STAGES[stageIndex].src;
    const currentName = isWithered ? 'WITHERED' : STAGES[stageIndex].name;

    return (
        <div className="relative flex flex-col items-center justify-center w-full h-[800px] bg-sky-100 overflow-hidden rounded-xl border-4 border-slate-700 shadow-2xl">

            {/* Background Pattern (Subtle) */}
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

            {/* Evolution Flash Overlay */}
            <div
                id="evolution-flash"
                className="absolute inset-0 bg-white opacity-0 pointer-events-none transition-opacity duration-300 z-50 mix-blend-screen"
            ></div>
            {/* Status Text (Retro Style) */}
            <div className="absolute top-4 left-4 text-slate-800 font-mono z-10 p-3 bg-white/80 rounded-lg backdrop-blur-md shadow-lg border border-white/50">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Status</p>
                <p className={`text-2xl font-bold uppercase tracking-widest leading-none ${currentScore < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {currentName}
                </p>
            </div>

            <div className="absolute top-4 right-4 text-slate-800 font-mono z-10 p-3 bg-white/80 rounded-lg backdrop-blur-md shadow-lg border border-white/50 text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Growth</p>
                <p className={`text-3xl font-mono font-bold leading-none ${currentScore < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {currentScore}
                </p>
            </div>

            {isEvolving && <p className="absolute bottom-8 right-8 text-yellow-500 animate-pulse font-bold tracking-widest text-xl z-20 bg-white/50 px-4 py-2 rounded-full backdrop-blur-sm shadow-xl border-2 border-yellow-400">EVOLVING...</p>}

            {/* The Tree Sprite */}
            <div
                className={`relative z-20 transition-all duration-500 flex items-end justify-center pb-0 h-full w-full
          ${isShaking ? 'animate-shake' : ''} 
          ${isEvolving ? 'animate-flash-fast scale-110' : 'animate-breath'}
        `}
                onClick={handleInteract}
            >
                <Image
                    src={currentSprite}
                    alt={currentName}
                    width={800}
                    height={800}
                    priority
                    className={`object-contain max-h-[90%] max-w-[95%] transition-all duration-500 drop-shadow-xl ${stageIndex === 5 ? 'scale-125 translate-y-4' : ''}`}
                    style={{ imageRendering: 'pixelated' }}
                />
            </div>

            {/* Styles for custom animations (since Tailwind arbitrary values can be messy) */}
            <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
          75% { transform: rotate(-5deg); }
        }
        @keyframes breath {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.03); transform-origin: bottom center; }
        }
        @keyframes flash-fast {
          0%, 100% { filter: brightness(1) sepia(0); }
          50% { filter: brightness(2) sepia(1) hue-rotate(-50deg); }
        }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-breath { animation: breath 6s ease-in-out infinite; }
        .animate-flash-fast { animation: flash-fast 0.1s infinite; }
      `}</style>
        </div>
    );
}
