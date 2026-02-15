import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "./supabase";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface Teaser {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  difficulty: string;
}

const FALLBACK_TEASERS: Teaser[] = [
  {
    question: "If you have 3 apples and take away 2, how many do you have?",
    options: ["1", "2", "3", "0"],
    correct_index: 1,
    explanation: "You took 2 apples, so you have 2.",
    difficulty: "easy",
  },
  {
    question: "What comes next: 2, 6, 12, 20, ?",
    options: ["28", "30", "32", "24"],
    correct_index: 1,
    explanation: "Differences are 4, 6, 8, 10. So 20 + 10 = 30.",
    difficulty: "medium",
  },
  {
    question: "A farmer has 17 sheep. All but 9 die. How many are left?",
    options: ["8", "17", "9", "0"],
    correct_index: 2,
    explanation: "'All but 9' means 9 survive.",
    difficulty: "easy",
  },
];

const PROMPT = `Generate exactly 3 brain teasers for a productivity app. Mix of logic puzzles, math problems, and critical thinking questions. They should be solvable in 30-60 seconds each.

For each teaser provide:
- question: The puzzle text
- options: Array of 4 multiple choice answers
- correct_index: Index (0-3) of the correct answer
- explanation: Brief explanation of the answer
- difficulty: "easy", "medium", or "hard"

Respond ONLY with a valid JSON array, no markdown:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0,
    "explanation": "...",
    "difficulty": "medium"
  }
]`;

function parseJson(text: string): Teaser[] {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.split("\n").slice(1).join("\n");
    cleaned = cleaned.replace(/```$/g, "");
  }
  return JSON.parse(cleaned.trim());
}

export async function getDailyTeasers(): Promise<Teaser[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data: cached } = await supabase
    .from("daily_teasers")
    .select("teasers")
    .eq("teaser_date", today)
    .single();

  if (cached) return cached.teasers as Teaser[];

  try {
    const model = genai.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(PROMPT);
    const teasers = parseJson(result.response.text());

    await supabase
      .from("daily_teasers")
      .insert({ teaser_date: today, teasers });

    return teasers;
  } catch (error) {
    console.error("Teaser generation failed, using fallback:", error);

    await supabase
      .from("daily_teasers")
      .upsert({ teaser_date: today, teasers: FALLBACK_TEASERS });

    return FALLBACK_TEASERS;
  }
}
