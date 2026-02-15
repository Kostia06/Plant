export interface PuzzleTopic {
  id: string;
  name: string;
  description: string;
  icon: string;
  categories: string[];
  sampleContext: string;
}

export const PUZZLE_TOPICS: PuzzleTopic[] = [
  {
    id: "media_literacy",
    name: "Media Literacy",
    description: "Spotting fake news, biased reporting, misleading headlines",
    icon: "\uD83D\uDCF0",
    categories: ["media_literacy", "critical_thinking"],
    sampleContext:
      "Identifying misinformation, evaluating news sources, recognizing propaganda techniques, understanding editorial bias, and spotting clickbait.",
  },
  {
    id: "statistics_lies",
    name: "Lies & Statistics",
    description: "Misleading graphs, cherry-picked data, bad surveys",
    icon: "\uD83D\uDCCA",
    categories: ["statistics", "math"],
    sampleContext:
      "Truncated axes, survivorship bias in data, misleading averages, cherry-picked timeframes, confusing correlation with causation, and bad polling methodology.",
  },
  {
    id: "cognitive_biases",
    name: "Cognitive Biases",
    description: "Confirmation bias, anchoring, sunk cost, framing effect",
    icon: "\uD83E\uDDE0",
    categories: ["cognitive_bias", "critical_thinking"],
    sampleContext:
      "Recognizing and naming cognitive biases like anchoring, confirmation bias, availability heuristic, Dunning-Kruger effect, sunk cost fallacy, bandwagon effect, and framing effect.",
  },
  {
    id: "logical_fallacies",
    name: "Logical Fallacies",
    description: "Ad hominem, straw man, false dilemma, slippery slope",
    icon: "\u2696\uFE0F",
    categories: ["logic", "critical_thinking"],
    sampleContext:
      "Identifying logical fallacies in arguments: ad hominem, straw man, false dilemma, slippery slope, appeal to authority, red herring, tu quoque, begging the question.",
  },
  {
    id: "science_sense",
    name: "Science Sense",
    description: "Evaluating studies, peer review, pseudoscience, health claims",
    icon: "\uD83D\uDD2C",
    categories: ["scientific_reasoning", "statistics"],
    sampleContext:
      "Evaluating scientific claims, understanding sample sizes, recognizing pseudoscience, interpreting p-values, understanding peer review, and spotting health misinformation.",
  },
  {
    id: "ethical_dilemmas",
    name: "Ethical Dilemmas",
    description: "Trolley problems, privacy vs security, AI ethics",
    icon: "\uD83E\uDD14",
    categories: ["ethical_dilemma", "critical_thinking"],
    sampleContext:
      "Analyzing ethical trade-offs, trolley problems, privacy vs security, AI decision-making ethics, utilitarian vs deontological reasoning, and corporate responsibility.",
  },
  {
    id: "pattern_math",
    name: "Pattern & Numbers",
    description: "Sequences, algebra, probability, estimation",
    icon: "\uD83D\uDD22",
    categories: ["math", "pattern_recognition"],
    sampleContext:
      "Number sequences, probability puzzles, mental math shortcuts, Fermi estimation, combinatorics, and algebraic reasoning.",
  },
  {
    id: "logic_games",
    name: "Logic Games",
    description: "Truth-tellers/liars, deduction, river crossing, syllogisms",
    icon: "\uD83E\uDDE9",
    categories: ["logic", "pattern_recognition"],
    sampleContext:
      "Classic logic puzzles: knights and knaves, river crossing, syllogisms, grid logic, process of elimination, and constraint satisfaction.",
  },
  {
    id: "wordplay",
    name: "Word Play",
    description: "Riddles, lateral thinking, trick questions",
    icon: "\uD83D\uDCAC",
    categories: ["wordplay", "logic"],
    sampleContext:
      "Riddles, lateral thinking puzzles, trick questions that test careful reading, double meanings, and creative reasoning.",
  },
  {
    id: "digital_literacy",
    name: "Digital Literacy",
    description: "Phishing, deepfakes, scams, privacy",
    icon: "\uD83D\uDD12",
    categories: ["media_literacy", "critical_thinking"],
    sampleContext:
      "Identifying phishing emails, recognizing deepfakes, understanding privacy policies, spotting online scams, evaluating URLs, and password security.",
  },
];

export function getTopicById(id: string): PuzzleTopic | undefined {
  return PUZZLE_TOPICS.find((t) => t.id === id);
}

export function getAllTopicIds(): string[] {
  return PUZZLE_TOPICS.map((t) => t.id);
}
