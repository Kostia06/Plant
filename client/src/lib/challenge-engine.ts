"use client";

// ── Challenge Engine (Offline, no network required) ─────────
// Used for Lock Gate challenges only. Separate from puzzle-engine.ts
// which uses Gemini AI for the Teasers page.

const ADAPTIVE_KEY = "challenge_adaptive_state";

export type Difficulty = "easy" | "medium" | "hard";
export type ChallengeType = "arithmetic" | "pattern" | "memory" | "logic" | "intent";

export interface Challenge {
    id: string;
    type: ChallengeType;
    difficulty: Difficulty;
    prompt: string;
    options: string[];
    correctAnswer: number; // index into options
    timeLimitSec: number;
    pointsReward: number;
}

export interface AdaptiveState {
    results: boolean[]; // last N results (true=correct)
    solveTimes: number[]; // last N solve times in ms
}

// ── Easy Challenges (5-15 seconds) ──────────────────────────

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleWithAnswer(
    correct: string,
    distractors: string[]
): { options: string[]; correctAnswer: number } {
    const all = [correct, ...distractors];
    for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
    }
    return { options: all, correctAnswer: all.indexOf(correct) };
}

function generateEasyArithmetic(): Challenge {
    const a = randomInt(2, 20);
    const b = randomInt(2, 20);
    const ops = [
        { sym: "+", result: a + b },
        { sym: "-", result: a - b },
        { sym: "×", result: a * b },
    ];
    const op = ops[randomInt(0, ops.length - 1)];
    const correct = String(op.result);
    const distractors = new Set<string>();
    while (distractors.size < 3) {
        const d = String(op.result + randomInt(-5, 5));
        if (d !== correct) distractors.add(d);
    }
    const { options, correctAnswer } = shuffleWithAnswer(correct, [...distractors]);
    return {
        id: `easy_arith_${Date.now()}`,
        type: "arithmetic",
        difficulty: "easy",
        prompt: `What is ${a} ${op.sym} ${b}?`,
        options,
        correctAnswer,
        timeLimitSec: 15,
        pointsReward: 1,
    };
}

function generateEasyLargest(): Challenge {
    const nums = Array.from({ length: 6 }, () => randomInt(10, 999));
    const max = Math.max(...nums);
    const correct = String(max);
    const others = nums.filter((n) => n !== max).slice(0, 3).map(String);
    const { options, correctAnswer } = shuffleWithAnswer(correct, others);
    return {
        id: `easy_largest_${Date.now()}`,
        type: "pattern",
        difficulty: "easy",
        prompt: `Tap the largest number: ${nums.join(", ")}`,
        options,
        correctAnswer,
        timeLimitSec: 10,
        pointsReward: 1,
    };
}

function generateEasyReflection(): Challenge {
    const prompts = [
        "What are you opening this for?",
        "Do you really need this right now?",
        "Is this a mindful choice?",
        "What could you do instead?",
    ];
    const prompt = prompts[randomInt(0, prompts.length - 1)];
    return {
        id: `easy_reflect_${Date.now()}`,
        type: "intent",
        difficulty: "easy",
        prompt,
        options: ["Just browsing", "I have a purpose", "Bored", "Need info"],
        correctAnswer: 1, // any answer accepted, but "I have a purpose" is the "right" one
        timeLimitSec: 15,
        pointsReward: 1,
    };
}

// ── Medium Challenges (30-60 seconds) ───────────────────────

function generateMediumMultiStep(): Challenge {
    const a = randomInt(10, 50);
    const b = randomInt(2, 10);
    const c = randomInt(1, 20);
    const result = a * b + c;
    const correct = String(result);
    const distractors = new Set<string>();
    while (distractors.size < 3) {
        const d = String(result + randomInt(-15, 15));
        if (d !== correct) distractors.add(d);
    }
    const { options, correctAnswer } = shuffleWithAnswer(correct, [...distractors]);
    return {
        id: `med_multi_${Date.now()}`,
        type: "arithmetic",
        difficulty: "medium",
        prompt: `(${a} × ${b}) + ${c} = ?`,
        options,
        correctAnswer,
        timeLimitSec: 45,
        pointsReward: 3,
    };
}

function generateMediumSequence(): Challenge {
    const startVal = randomInt(2, 10);
    const step = randomInt(2, 7);
    const kind = randomInt(0, 1); // 0=add, 1=multiply
    const seq: number[] = [];
    let v = startVal;
    for (let i = 0; i < 5; i++) {
        seq.push(v);
        v = kind === 0 ? v + step : v * step;
    }
    const next = v;
    const correct = String(next);
    const distractors = new Set<string>();
    while (distractors.size < 3) {
        const d = String(next + randomInt(-step * 3, step * 3));
        if (d !== correct) distractors.add(d);
    }
    const { options, correctAnswer } = shuffleWithAnswer(correct, [...distractors]);
    return {
        id: `med_seq_${Date.now()}`,
        type: "pattern",
        difficulty: "medium",
        prompt: `What comes next? ${seq.join(", ")}, ?`,
        options,
        correctAnswer,
        timeLimitSec: 45,
        pointsReward: 3,
    };
}

function generateMediumLogic(): Challenge {
    const logicProblems = [
        {
            prompt: 'If all Bloops are Razzies, and all Razzies are Lazzies, are all Bloops Lazzies?',
            options: ["Yes", "No", "Maybe", "Not enough info"],
            correct: 0,
        },
        {
            prompt: "A is taller than B. B is taller than C. Who is shortest?",
            options: ["A", "B", "C", "Cannot tell"],
            correct: 2,
        },
        {
            prompt: "If it rains, the ground gets wet. The ground is wet. Did it rain?",
            options: ["Yes", "No", "Not necessarily", "Always"],
            correct: 2,
        },
        {
            prompt: "Every cat has a tail. Tom has a tail. Is Tom a cat?",
            options: ["Yes", "No", "Not necessarily", "Always"],
            correct: 2,
        },
        {
            prompt: "If today is Monday, what day is it 3 days from now?",
            options: ["Wednesday", "Thursday", "Friday", "Tuesday"],
            correct: 1,
        },
        {
            prompt: "A clock shows 3:15. What is the angle between hour and minute hands?",
            options: ["7.5°", "0°", "15°", "90°"],
            correct: 0,
        },
    ];
    const p = logicProblems[randomInt(0, logicProblems.length - 1)];
    return {
        id: `med_logic_${Date.now()}`,
        type: "logic",
        difficulty: "medium",
        prompt: p.prompt,
        options: p.options,
        correctAnswer: p.correct,
        timeLimitSec: 60,
        pointsReward: 3,
    };
}

// ── Hard Challenges (60-90 seconds) ─────────────────────────

function generateHardPuzzle(): Challenge {
    const puzzles = [
        {
            prompt: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
            options: ["Echo", "Shadow", "Cloud", "Fire"],
            correct: 0,
        },
        {
            prompt: "A man has 53 socks: 21 blue, 15 black, 17 red. Lights are off. Minimum socks to guarantee a matching pair?",
            options: ["2", "3", "4", "21"],
            correct: 2,
        },
        {
            prompt: "If you rearrange 'CIFAIPC', you get the name of a(n):",
            options: ["Ocean", "Country", "Animal", "City"],
            correct: 0,
        },
        {
            prompt: "A farmer has 17 sheep. All but 9 run away. How many sheep remain?",
            options: ["8", "9", "17", "0"],
            correct: 1,
        },
        {
            prompt: "Three light switches control 3 bulbs in another room. You can enter the room once. How do you determine which switch controls which bulb?",
            options: [
                "Turn on 1, wait, turn on 2, enter",
                "Turn all on, enter",
                "Use a mirror",
                "Impossible"
            ],
            correct: 0,
        },
        {
            prompt: "What has 13 hearts but no organs?",
            options: ["A deck of cards", "A hospital", "A clock", "A tree"],
            correct: 0,
        },
    ];
    const p = puzzles[randomInt(0, puzzles.length - 1)];
    return {
        id: `hard_puzzle_${Date.now()}`,
        type: "logic",
        difficulty: "hard",
        prompt: p.prompt,
        options: p.options,
        correctAnswer: p.correct,
        timeLimitSec: 90,
        pointsReward: 5,
    };
}

function generateHardMemory(): Challenge {
    const symbols = ["★", "♦", "♣", "♥", "⬡", "△", "◇", "⊕", "⊗", "☾"];
    const picked: string[] = [];
    const used = new Set<number>();
    while (picked.length < 6) {
        const idx = randomInt(0, symbols.length - 1);
        if (!used.has(idx)) {
            used.add(idx);
            picked.push(symbols[idx]);
        }
    }
    // Remove one and ask which was missing
    const removedIdx = randomInt(0, picked.length - 1);
    const removed = picked[removedIdx];
    const shown = picked.filter((_, i) => i !== removedIdx);

    const distractors = symbols
        .filter((s) => !picked.includes(s))
        .slice(0, 3);

    const { options, correctAnswer } = shuffleWithAnswer(removed, distractors);

    return {
        id: `hard_memory_${Date.now()}`,
        type: "memory",
        difficulty: "hard",
        prompt: `Memorize these symbols: ${picked.join(" ")}. Now showing: ${shown.join(" ")}. Which is missing?`,
        options,
        correctAnswer,
        timeLimitSec: 30,
        pointsReward: 5,
    };
}

// ── Generator ───────────────────────────────────────────────

const EASY_GENERATORS = [generateEasyArithmetic, generateEasyLargest, generateEasyReflection];
const MEDIUM_GENERATORS = [generateMediumMultiStep, generateMediumSequence, generateMediumLogic];
const HARD_GENERATORS = [generateHardPuzzle, generateHardMemory];

export function generateChallenge(difficulty: Difficulty): Challenge {
    const generators =
        difficulty === "easy"
            ? EASY_GENERATORS
            : difficulty === "medium"
                ? MEDIUM_GENERATORS
                : HARD_GENERATORS;

    const gen = generators[randomInt(0, generators.length - 1)];
    return gen();
}

export function checkAnswer(challenge: Challenge, answerIndex: number): boolean {
    // Easy reflection challenges accept any answer (it's about friction, not correctness)
    if (challenge.type === "intent" && challenge.difficulty === "easy") {
        return true;
    }
    return answerIndex === challenge.correctAnswer;
}

// ── Adaptive Difficulty ─────────────────────────────────────

export function loadAdaptiveState(): AdaptiveState {
    if (typeof window === "undefined") return { results: [], solveTimes: [] };
    try {
        const raw = localStorage.getItem(ADAPTIVE_KEY);
        if (!raw) return { results: [], solveTimes: [] };
        return JSON.parse(raw) as AdaptiveState;
    } catch {
        return { results: [], solveTimes: [] };
    }
}

export function saveAdaptiveResult(correct: boolean, solveTimeMs: number): void {
    const state = loadAdaptiveState();
    state.results = [...state.results.slice(-9), correct];
    state.solveTimes = [...state.solveTimes.slice(-9), solveTimeMs];
    if (typeof window !== "undefined") {
        localStorage.setItem(ADAPTIVE_KEY, JSON.stringify(state));
    }
}

export function getSuccessRate(state: AdaptiveState): number {
    if (state.results.length === 0) return 0.5;
    return state.results.filter(Boolean).length / state.results.length;
}

export function getAvgSolveTime(state: AdaptiveState): number {
    if (state.solveTimes.length === 0) return 0;
    return state.solveTimes.reduce((a, b) => a + b, 0) / state.solveTimes.length;
}

export function suggestDifficulty(
    currentDifficulty: Difficulty,
    state: AdaptiveState
): Difficulty {
    const rate = getSuccessRate(state);
    if (rate > 0.8 && state.results.length >= 5) {
        if (currentDifficulty === "easy") return "medium";
        if (currentDifficulty === "medium") return "hard";
    }
    if (rate < 0.3 && state.results.length >= 5) {
        if (currentDifficulty === "hard") return "medium";
        if (currentDifficulty === "medium") return "easy";
    }
    return currentDifficulty;
}
