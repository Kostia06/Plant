import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface Teaser {
  question: string;
  options: [string, string, string, string];
  correct_index: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  category: "logic" | "math" | "critical_thinking";
}

const GENERATION_PROMPT = `Generate exactly 3 brain teasers for a media literacy and critical thinking app called Mind Bloom.

Include this exact mix:
1. One logic puzzle (difficulty: easy or medium)
2. One math/number problem (difficulty: medium)
3. One critical thinking / media literacy question — this should test the user's ability to evaluate claims, spot logical fallacies, identify bias, or question statistics. Examples: misleading statistics, correlation vs causation, loaded questions, sampling bias. (difficulty: medium or hard)

Each teaser must have:
- question: Clear, concise puzzle text (max 200 characters)
- options: Exactly 4 multiple choice answers
- correct_index: Index 0-3 of the correct answer
- explanation: Brief explanation (max 150 characters)
- difficulty: easy, medium, or hard
- category: logic, math, or critical_thinking

The critical thinking teaser is the most important — it should teach users to think skeptically about information they see online.

Respond ONLY with a valid JSON array. No markdown, no backticks, no preamble.`;

const FALLBACK_TEASERS: Teaser[][] = [
  [
    {
      question:
        "If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops definitely Lazzies?",
      options: ["Yes", "No", "Only some", "Cannot determine"],
      correct_index: 0,
      explanation: "Transitive property: if A⊂B and B⊂C, then A⊂C.",
      difficulty: "easy",
      category: "logic",
    },
    {
      question:
        "A study finds ice cream sales and drowning deaths both increase in summer. What's the flaw?",
      options: [
        "Sample size too small",
        "Correlation isn't causation",
        "Data is outdated",
        "No control group",
      ],
      correct_index: 1,
      explanation: "Both are caused by hot weather, not by each other.",
      difficulty: "medium",
      category: "critical_thinking",
    },
    {
      question:
        "I have 6 eggs. I broke 2, cooked 2, and ate 2. How many eggs do I have left?",
      options: ["0", "2", "4", "6"],
      correct_index: 2,
      explanation:
        "You broke 2 (then cooked those 2, then ate those 2). You still have 4.",
      difficulty: "medium",
      category: "math",
    },
  ],
  [
    {
      question:
        "A bat and ball cost $1.10 total. The bat costs $1.00 more than the ball. How much is the ball?",
      options: ["$0.10", "$0.05", "$0.15", "$0.01"],
      correct_index: 1,
      explanation: "If ball = $0.05, bat = $1.05. Total = $1.10.",
      difficulty: "medium",
      category: "math",
    },
    {
      question:
        "Door A has a sign that's always true. Door B has a sign that's always false. Door A says 'At least one door is safe.' Which is safe?",
      options: ["Door A only", "Door B only", "Both doors", "Neither door"],
      correct_index: 2,
      explanation:
        "Door A's true sign means at least one is safe. If B were unsafe, A's sign is still true, but the puzzle setup requires both.",
      difficulty: "hard",
      category: "logic",
    },
    {
      question:
        "A headline says '9 out of 10 doctors recommend Product X.' What's the biggest red flag?",
      options: [
        "Only 10 doctors surveyed",
        "Doctors were paid",
        "No peer review",
        "All of the above",
      ],
      correct_index: 3,
      explanation:
        "Small sample, financial incentive, and lack of peer review are all red flags.",
      difficulty: "medium",
      category: "critical_thinking",
    },
  ],
  [
    {
      question:
        "You overtake the person in 2nd place in a race. What position are you now in?",
      options: ["1st", "2nd", "3rd", "Depends on the race"],
      correct_index: 1,
      explanation: "Overtaking 2nd place puts you in 2nd, not 1st.",
      difficulty: "easy",
      category: "logic",
    },
    {
      question:
        "A politician says 'Crime has doubled since my opponent took office.' What should you check first?",
      options: [
        "The politician's record",
        "The actual crime statistics",
        "What types of crime",
        "Population changes",
      ],
      correct_index: 1,
      explanation:
        "Always verify the underlying data before accepting a claim.",
      difficulty: "medium",
      category: "critical_thinking",
    },
    {
      question:
        "If 5 machines make 5 widgets in 5 minutes, how long for 100 machines to make 100 widgets?",
      options: ["100 minutes", "5 minutes", "20 minutes", "1 minute"],
      correct_index: 1,
      explanation:
        "Each machine makes 1 widget in 5 min. 100 machines make 100 widgets in 5 min.",
      difficulty: "medium",
      category: "math",
    },
  ],
];

function parseJson(text: string): Teaser[] {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.split("\n").slice(1).join("\n");
    cleaned = cleaned.replace(/```$/g, "");
  }
  return JSON.parse(cleaned.trim());
}

async function generateTeasers(): Promise<Teaser[]> {
  const model = genai.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(GENERATION_PROMPT);
  const teasers = parseJson(result.response.text());

  if (!Array.isArray(teasers) || teasers.length !== 3) {
    throw new Error("Invalid teaser count from Gemini");
  }

  for (const t of teasers) {
    if (
      !t.question ||
      !Array.isArray(t.options) ||
      t.options.length !== 4 ||
      typeof t.correct_index !== "number" ||
      t.correct_index < 0 ||
      t.correct_index > 3
    ) {
      throw new Error("Invalid teaser structure from Gemini");
    }
  }

  return teasers;
}

function getFallbackForDate(dateStr: string): Teaser[] {
  const hash = dateStr
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return FALLBACK_TEASERS[hash % FALLBACK_TEASERS.length];
}

export async function getTodaysTeasers(): Promise<Teaser[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data: cached } = await supabase
    .from("daily_teasers")
    .select("teasers")
    .eq("teaser_date", today)
    .single();

  if (cached) return cached.teasers as Teaser[];

  try {
    const teasers = await generateTeasers();

    await supabase
      .from("daily_teasers")
      .insert({ teaser_date: today, teasers });

    return teasers;
  } catch (error) {
    console.error("Teaser generation failed, using fallback:", error);

    const fallback = getFallbackForDate(today);

    await supabase
      .from("daily_teasers")
      .upsert({ teaser_date: today, teasers: fallback });

    return fallback;
  }
}
