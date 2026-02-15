export interface PuzzleTopic {
  id: string;
  name: string;
  description: string;
  icon: string;
  categories: string[];
  sampleContext: string;
}

export interface GeneratedPuzzle {
  topic: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options: [string, string, string, string];
  correct_index: number;
  explanation: string;
  hint: string;
  tags: string[];
}

export const PUZZLE_CATEGORIES = [
  "logic", "math", "critical_thinking", "media_literacy",
  "statistics", "cognitive_bias", "scientific_reasoning",
  "ethical_dilemma", "pattern_recognition", "wordplay",
] as const;

export type PuzzleCategory = (typeof PUZZLE_CATEGORIES)[number];

export const PUZZLE_TOPICS: PuzzleTopic[] = [
  {
    id: "media_literacy",
    name: "Media Literacy",
    description: "Spot fake news, biased reporting, and misleading headlines",
    icon: "[N]",
    categories: ["media_literacy", "critical_thinking"],
    sampleContext: "news articles, social media posts, headlines, source credibility, bias detection",
  },
  {
    id: "statistics_lies",
    name: "Lies & Statistics",
    description: "See through misleading graphs, cherry-picked data, and bad surveys",
    icon: "[%]",
    categories: ["statistics", "math"],
    sampleContext: "misleading graphs, sampling bias, correlation vs causation, p-hacking, survivorship bias, percentage tricks",
  },
  {
    id: "cognitive_biases",
    name: "Cognitive Biases",
    description: "Recognize the mental shortcuts that trick your brain",
    icon: "[B]",
    categories: ["cognitive_bias", "critical_thinking"],
    sampleContext: "confirmation bias, anchoring, bandwagon effect, dunning-kruger, sunk cost fallacy, availability heuristic, framing effect",
  },
  {
    id: "logical_fallacies",
    name: "Logical Fallacies",
    description: "Identify flawed arguments and reasoning errors",
    icon: "[L]",
    categories: ["logic", "critical_thinking"],
    sampleContext: "ad hominem, straw man, false dilemma, slippery slope, appeal to authority, red herring, circular reasoning",
  },
  {
    id: "science_sense",
    name: "Science Sense",
    description: "Evaluate scientific claims, studies, and health misinformation",
    icon: "[S]",
    categories: ["scientific_reasoning", "statistics"],
    sampleContext: "peer review, sample size, control groups, placebo effect, scientific method, health claims, pseudoscience",
  },
  {
    id: "ethical_dilemmas",
    name: "Ethical Dilemmas",
    description: "Navigate tricky moral questions with no easy answers",
    icon: "[E]",
    categories: ["ethical_dilemma", "critical_thinking"],
    sampleContext: "trolley problem variations, privacy vs security, AI ethics, environmental tradeoffs, whistleblowing",
  },
  {
    id: "pattern_math",
    name: "Pattern & Numbers",
    description: "Classic math puzzles and number pattern challenges",
    icon: "[0]",
    categories: ["math", "pattern_recognition"],
    sampleContext: "number sequences, algebra puzzles, geometry, probability, combinatorics, estimation",
  },
  {
    id: "logic_games",
    name: "Logic Games",
    description: "Pure logic puzzles, deduction, and reasoning",
    icon: "[#]",
    categories: ["logic", "pattern_recognition"],
    sampleContext: "truth-tellers and liars, grid puzzles, syllogisms, set theory, deduction, river crossing",
  },
  {
    id: "wordplay",
    name: "Word Play",
    description: "Riddles, lateral thinking, and linguistic tricks",
    icon: "[W]",
    categories: ["wordplay", "logic"],
    sampleContext: "riddles, lateral thinking, double meanings, trick questions, word puzzles",
  },
  {
    id: "digital_literacy",
    name: "Digital Literacy",
    description: "Online safety, privacy, scams, and digital citizenship",
    icon: "[D]",
    categories: ["media_literacy", "critical_thinking"],
    sampleContext: "phishing, deepfakes, online privacy, data tracking, scam detection, password security, digital footprint",
  },
];

export function getTopicById(id: string): PuzzleTopic | undefined {
  return PUZZLE_TOPICS.find((t) => t.id === id);
}

export function getAllTopicIds(): string[] {
  return PUZZLE_TOPICS.map((t) => t.id);
}
