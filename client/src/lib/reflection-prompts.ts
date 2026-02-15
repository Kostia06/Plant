export const REFLECTION_PROMPTS = [
  // Gratitude (6)
  "What are three things you're grateful for today?",
  "Who made a positive impact on your day and why?",
  "What's a small comfort you enjoyed today that you usually overlook?",
  "What ability or skill are you thankful to have?",
  "What's something in your environment right now that you appreciate?",
  "What challenge from the past are you now grateful for?",

  // Learning (6)
  "What did you learn today that surprised you?",
  "What's a mistake you made recently and what did it teach you?",
  "What topic are you curious about right now and why?",
  "What's something you read or watched today that made you think differently?",
  "What skill are you currently trying to improve?",
  "What did you learn about yourself this week?",

  // Challenges (5)
  "What challenged you today and how did you handle it?",
  "What's something difficult you've been avoiding? Why?",
  "What obstacle are you currently facing and what's one step forward?",
  "When did you feel frustrated today? What triggered it?",
  "What's a hard truth you've recently accepted?",

  // Growth (5)
  "What's one thing you did today that your past self would be proud of?",
  "How are you different from who you were a year ago?",
  "What habit are you trying to build and how is it going?",
  "What would you attempt if you knew you couldn't fail?",
  "What's one area of your life that needs more attention?",

  // Mindfulness (4)
  "How are you feeling right now, honestly? No filter.",
  "What moment today were you fully present and engaged?",
  "What's been occupying your mind the most lately?",
  "What do you need to let go of?",

  // Goals (4)
  "What progress did you make on your goals today?",
  "What's your top priority for tomorrow?",
  "What's one thing you can do tomorrow to move closer to your biggest goal?",
  "If you could only accomplish one thing this week, what would it be?",
] as const;

export function getTodaysPrompt(): string {
  const today = new Date().toISOString().split("T")[0];
  const hash = today
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return REFLECTION_PROMPTS[hash % REFLECTION_PROMPTS.length];
}
