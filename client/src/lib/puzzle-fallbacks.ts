export interface GeneratedPuzzle {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  hint: string;
  category: string;
  difficulty: string;
  tags: string[];
}

export const FALLBACK_PUZZLES: Record<string, GeneratedPuzzle[]> = {
  media_literacy: [
    {
      question:
        "A headline reads 'Scientists say chocolate cures cancer.' The study tested 12 mice for 2 weeks. What is the biggest problem?",
      options: [
        "Chocolate is unhealthy",
        "Sample size too small for human claims",
        "Scientists are unreliable",
        "Cancer can't be cured",
      ],
      correct_index: 1,
      explanation:
        "12 mice is far too small a sample to generalize to humans. Headlines often exaggerate tiny studies.",
      hint: "Think about how many subjects were studied and what species they were.",
      category: "media_literacy",
      difficulty: "easy",
      tags: ["headlines", "sample-size"],
    },
    {
      question:
        "An article uses only anonymous sources and includes no direct quotes. What should a critical reader do?",
      options: [
        "Trust it — anonymity protects whistleblowers",
        "Reject it completely",
        "Look for corroborating reports from other outlets",
        "Share it immediately to spread awareness",
      ],
      correct_index: 2,
      explanation:
        "Anonymous sources can be valid, but always cross-reference with other outlets before accepting claims.",
      hint: "Neither blind trust nor total rejection — what's the middle ground?",
      category: "critical_thinking",
      difficulty: "medium",
      tags: ["sources", "verification"],
    },
    {
      question:
        "A news site publishes a correction at the bottom of an article 3 days after publication. The original headline remains unchanged. This is an example of:",
      options: [
        "Good journalistic practice",
        "Stealth editing",
        "A buried correction that most readers will miss",
        "Libel",
      ],
      correct_index: 2,
      explanation:
        "Burying corrections while keeping viral headlines intact means the misinformation spreads faster than the fix.",
      hint: "Consider what most readers actually see versus what gets updated.",
      category: "media_literacy",
      difficulty: "medium",
      tags: ["corrections", "headlines"],
    },
    {
      question:
        "Two news outlets report the same event: one says '200 people attended' and another says 'hundreds showed up in force.' Which is more reliable?",
      options: [
        "The second — 'hundreds' is more dramatic",
        "The first — it provides a specific number",
        "Both are equally reliable",
        "Neither — you can't trust news",
      ],
      correct_index: 1,
      explanation:
        "Specific numbers are more verifiable and precise than vague language designed to create an emotional impression.",
      hint: "Which phrasing could you fact-check more easily?",
      category: "media_literacy",
      difficulty: "easy",
      tags: ["precision", "language"],
    },
    {
      question:
        "A viral social media post shows a photo of an empty grocery store with the caption 'Food shortages hit our city!' What should you check first?",
      options: [
        "Whether the photo is recent and from the claimed location",
        "How many likes it has",
        "Whether the poster has a verified account",
        "If the store is normally well-stocked",
      ],
      correct_index: 0,
      explanation:
        "Reverse image searches often reveal viral photos are old, from different countries, or taken during off-hours. Context is everything.",
      hint: "The image itself might not be what it claims to be.",
      category: "media_literacy",
      difficulty: "hard",
      tags: ["verification", "images"],
    },
  ],

  statistics_lies: [
    {
      question:
        "A graph shows Company A stock rising dramatically, but the Y-axis starts at $98 instead of $0. This is:",
      options: [
        "Normal practice for stock charts",
        "A truncated Y-axis that exaggerates change",
        "More accurate than starting at $0",
        "Illegal in financial reporting",
      ],
      correct_index: 1,
      explanation:
        "Starting the Y-axis at $98 makes a $2 change look enormous. This is a classic misleading visualization technique.",
      hint: "What happens visually when you zoom into a tiny range?",
      category: "statistics",
      difficulty: "easy",
      tags: ["graphs", "truncated-axis"],
    },
    {
      question:
        "A company reports 'Customer satisfaction increased 200%!' Going from 1% to 3%. Why is this misleading?",
      options: [
        "200% increase is wrong math",
        "Relative increase sounds impressive but the absolute numbers are tiny",
        "Customer satisfaction can't be measured",
        "They should use median instead of percentage",
      ],
      correct_index: 1,
      explanation:
        "A 200% relative increase from 1% to 3% is technically correct but hides how low both numbers are. Always ask for absolute numbers.",
      hint: "Is 3% customer satisfaction actually good?",
      category: "statistics",
      difficulty: "medium",
      tags: ["relative-vs-absolute", "percentages"],
    },
    {
      question:
        "A survey finds '9 out of 10 dentists recommend Brand X toothpaste.' Which question reveals the flaw?",
      options: [
        "Which brand do you use personally?",
        "Were dentists asked to pick only Brand X or nothing?",
        "How many dentists were surveyed total?",
        "All of the above",
      ],
      correct_index: 3,
      explanation:
        "The survey could have 10 dentists, a forced choice, or dentists who recommend many brands. All three questions expose potential manipulation.",
      hint: "There's more than one way this statistic could be gamed.",
      category: "statistics",
      difficulty: "hard",
      tags: ["surveys", "methodology"],
    },
    {
      question:
        "A city's average household income is $85,000. One billionaire moves in and the average jumps to $120,000. Which measure would better represent typical residents?",
      options: ["Mean", "Median", "Mode", "Range"],
      correct_index: 1,
      explanation:
        "The median (middle value) isn't affected by extreme outliers like a billionaire's income. The mean gets pulled up dramatically.",
      hint: "Which average type resists being skewed by a single extreme value?",
      category: "math",
      difficulty: "easy",
      tags: ["mean-vs-median", "outliers"],
    },
    {
      question:
        "Ice cream sales and drowning deaths both increase in summer. A researcher concludes ice cream causes drowning. This is:",
      options: [
        "A valid conclusion from the data",
        "Confusing correlation with causation",
        "An example of survivorship bias",
        "A type of confirmation bias",
      ],
      correct_index: 1,
      explanation:
        "Both increase due to a shared cause (hot weather), not because one causes the other. Correlation does not imply causation.",
      hint: "What third factor could explain why both things increase together?",
      category: "statistics",
      difficulty: "easy",
      tags: ["correlation-causation", "confounding"],
    },
  ],

  cognitive_biases: [
    {
      question:
        "After buying an expensive concert ticket, you feel sick on the day. You go anyway because 'I already paid.' Which bias is this?",
      options: [
        "Confirmation bias",
        "Sunk cost fallacy",
        "Anchoring effect",
        "Bandwagon effect",
      ],
      correct_index: 1,
      explanation:
        "The sunk cost fallacy means continuing something because of past investment rather than future benefit. The money is spent either way.",
      hint: "The money is gone whether you go or not. What fallacy involves 'throwing good money after bad'?",
      category: "cognitive_bias",
      difficulty: "easy",
      tags: ["sunk-cost", "decision-making"],
    },
    {
      question:
        "A car salesperson shows you a $50,000 car first, then a $30,000 car. The $30,000 car suddenly feels like a bargain. This demonstrates:",
      options: [
        "Loss aversion",
        "The anchoring effect",
        "Availability heuristic",
        "Status quo bias",
      ],
      correct_index: 1,
      explanation:
        "The first number you see (the anchor) shapes how you judge subsequent values. $30K feels cheap only relative to the $50K anchor.",
      hint: "The first price you saw changed your perception of the second.",
      category: "cognitive_bias",
      difficulty: "easy",
      tags: ["anchoring", "pricing"],
    },
    {
      question:
        "After a plane crash makes the news, people start driving instead of flying, even though driving is statistically more dangerous. This is:",
      options: [
        "Confirmation bias",
        "Dunning-Kruger effect",
        "Availability heuristic",
        "Hindsight bias",
      ],
      correct_index: 2,
      explanation:
        "The availability heuristic makes us overestimate risks that are vivid or recently in the news, regardless of actual probability.",
      hint: "Which bias makes recent or dramatic events seem more common than they are?",
      category: "cognitive_bias",
      difficulty: "medium",
      tags: ["availability-heuristic", "risk"],
    },
    {
      question:
        "You only follow news sources that agree with your views and dismiss contradicting evidence as 'biased.' This is:",
      options: [
        "Anchoring bias",
        "Confirmation bias",
        "The halo effect",
        "Recency bias",
      ],
      correct_index: 1,
      explanation:
        "Confirmation bias is seeking out information that confirms existing beliefs while dismissing contradicting evidence.",
      hint: "You're confirming what you already believe.",
      category: "cognitive_bias",
      difficulty: "easy",
      tags: ["confirmation-bias", "media"],
    },
    {
      question:
        "A doctor with 30 years of experience says 'In my practice, this treatment always works.' A clinical trial of 10,000 patients disagrees. Whose evidence is stronger?",
      options: [
        "The doctor — experience trumps studies",
        "The clinical trial — systematic evidence over anecdotes",
        "They're equally valid",
        "Neither — medical evidence is unreliable",
      ],
      correct_index: 1,
      explanation:
        "Personal experience is prone to selection bias and small sample sizes. Large clinical trials control for these biases systematically.",
      hint: "One person's observations vs. controlled data from thousands — which controls for bias?",
      category: "critical_thinking",
      difficulty: "hard",
      tags: ["anecdotal-evidence", "clinical-trials"],
    },
  ],

  logical_fallacies: [
    {
      question:
        "Someone argues: 'You can't trust her opinion on healthcare — she's not even a doctor.' This is:",
      options: [
        "Straw man",
        "Ad hominem",
        "False dilemma",
        "Red herring",
      ],
      correct_index: 1,
      explanation:
        "Ad hominem attacks the person instead of their argument. Non-doctors can still have valid, well-researched healthcare opinions.",
      hint: "The attack is on the person, not the argument itself.",
      category: "logic",
      difficulty: "easy",
      tags: ["ad-hominem", "argumentation"],
    },
    {
      question:
        "'If we allow students to use calculators, next they'll forget how to count, then civilization will collapse.' This is:",
      options: [
        "False dilemma",
        "Straw man",
        "Slippery slope",
        "Circular reasoning",
      ],
      correct_index: 2,
      explanation:
        "The slippery slope fallacy chains unlikely consequences without evidence that each step leads to the next.",
      hint: "The argument slides from a small change to an extreme outcome without justification.",
      category: "logic",
      difficulty: "easy",
      tags: ["slippery-slope", "argumentation"],
    },
    {
      question:
        "'Either you support this policy completely, or you're against the country.' This is:",
      options: [
        "Straw man",
        "Appeal to emotion",
        "False dilemma",
        "Begging the question",
      ],
      correct_index: 2,
      explanation:
        "A false dilemma presents only two extreme options when many moderate positions exist. Reality rarely has only two choices.",
      hint: "Are those really the only two options?",
      category: "logic",
      difficulty: "easy",
      tags: ["false-dilemma", "binary-thinking"],
    },
    {
      question:
        "'My opponent wants to reduce military spending. Clearly, they want our country to be defenseless!' This is:",
      options: [
        "Straw man",
        "Red herring",
        "Ad hominem",
        "Appeal to authority",
      ],
      correct_index: 0,
      explanation:
        "A straw man distorts someone's position into an extreme version that's easier to attack. Reducing ≠ eliminating.",
      hint: "Did the opponent actually say they want zero defense?",
      category: "logic",
      difficulty: "medium",
      tags: ["straw-man", "argumentation"],
    },
    {
      question:
        "'This diet must work — a famous actress uses it!' Meanwhile, no clinical studies support it. This combines which fallacies?",
      options: [
        "Ad hominem + straw man",
        "Appeal to authority + anecdotal evidence",
        "False dilemma + red herring",
        "Circular reasoning + hasty generalization",
      ],
      correct_index: 1,
      explanation:
        "Celebrity endorsement is a false appeal to authority (fame ≠ expertise), combined with anecdotal evidence (one person's experience ≠ proof).",
      hint: "Being famous doesn't make someone a nutrition expert.",
      category: "critical_thinking",
      difficulty: "hard",
      tags: ["appeal-to-authority", "anecdotal"],
    },
  ],

  science_sense: [
    {
      question:
        "A supplement company claims their product 'boosts immunity' based on a study they funded. What's the main concern?",
      options: [
        "Supplements can't affect immunity",
        "Conflict of interest — funder bias",
        "The study must be fake",
        "Only doctors can make health claims",
      ],
      correct_index: 1,
      explanation:
        "Industry-funded studies have documented bias toward favorable results. Independent replication is crucial for credibility.",
      hint: "Who paid for the study, and what did they want it to show?",
      category: "scientific_reasoning",
      difficulty: "easy",
      tags: ["funding-bias", "health-claims"],
    },
    {
      question:
        "A study finds that people who eat breakfast weigh less. Can we conclude breakfast causes weight loss?",
      options: [
        "Yes — the data clearly shows it",
        "No — observational studies can't prove causation",
        "Yes — if the sample size is large enough",
        "No — breakfast is actually unhealthy",
      ],
      correct_index: 1,
      explanation:
        "Observational studies show associations, not causes. Breakfast eaters may differ in other habits (exercise, sleep) that explain the difference.",
      hint: "There's a key difference between observational and experimental studies.",
      category: "scientific_reasoning",
      difficulty: "medium",
      tags: ["causation", "observational-studies"],
    },
    {
      question:
        "A health blog says 'This ancient remedy has been used for thousands of years, so it must work.' This is an example of:",
      options: [
        "Strong historical evidence",
        "Appeal to tradition fallacy",
        "Peer-reviewed science",
        "Anecdotal evidence",
      ],
      correct_index: 1,
      explanation:
        "Age of a practice doesn't prove effectiveness. Bloodletting was used for centuries. Efficacy requires controlled testing, not tradition.",
      hint: "Does being old automatically make something correct?",
      category: "scientific_reasoning",
      difficulty: "easy",
      tags: ["appeal-to-tradition", "pseudoscience"],
    },
    {
      question:
        "A study with p-value = 0.03 is called 'statistically significant.' This means:",
      options: [
        "There's a 97% chance the treatment works",
        "The result is practically meaningful",
        "If no real effect exists, there's a 3% chance of seeing this result by luck",
        "The effect size is large",
      ],
      correct_index: 2,
      explanation:
        "P-value = probability of seeing the result (or more extreme) if the null hypothesis is true. It says nothing about effect size or practical importance.",
      hint: "P-values measure surprise under the assumption of no effect.",
      category: "statistics",
      difficulty: "hard",
      tags: ["p-values", "statistics"],
    },
    {
      question:
        "A miracle cure testimonial says: 'I took the supplement and my cold went away in 7 days!' Why is this not evidence?",
      options: [
        "Colds naturally resolve in 7-10 days without treatment",
        "The person might be lying",
        "Supplements are always ineffective",
        "You need a prescription for real medicine",
      ],
      correct_index: 0,
      explanation:
        "Colds resolve on their own. Without a control group, you can't know if the supplement did anything. This is the post hoc ergo propter hoc fallacy.",
      hint: "What would have happened without the supplement?",
      category: "scientific_reasoning",
      difficulty: "medium",
      tags: ["testimonials", "natural-recovery"],
    },
  ],

  ethical_dilemmas: [
    {
      question:
        "A self-driving car must choose between hitting 1 pedestrian or swerving into 3 pedestrians. A utilitarian would argue it should:",
      options: [
        "Hit the 1 pedestrian to save 3",
        "Swerve to avoid direct action",
        "Stop immediately regardless of outcome",
        "Let the passengers decide",
      ],
      correct_index: 0,
      explanation:
        "Utilitarianism maximizes total well-being — saving 3 lives at the cost of 1 produces the greatest good for the greatest number.",
      hint: "Utilitarians focus on the outcome that produces the most total good.",
      category: "ethical_dilemma",
      difficulty: "medium",
      tags: ["trolley-problem", "utilitarianism"],
    },
    {
      question:
        "A company discovers a data breach affecting 1 million users but estimates only 100 accounts were accessed. Should they notify all users?",
      options: [
        "No — only notify the 100 affected accounts",
        "Yes — all potentially affected users deserve to know",
        "No — it would cause unnecessary panic",
        "Only if legally required",
      ],
      correct_index: 1,
      explanation:
        "Transparency builds trust. Users have a right to know their data was at risk so they can take protective action, even if probability of harm is low.",
      hint: "Would you want to know if your data was potentially exposed?",
      category: "ethical_dilemma",
      difficulty: "medium",
      tags: ["privacy", "transparency"],
    },
    {
      question:
        "An AI hiring tool screens resumes faster but studies show it discriminates against certain demographics. The company should:",
      options: [
        "Keep using it — efficiency matters",
        "Audit, fix the bias, then redeploy",
        "Ban all AI from hiring permanently",
        "Hide the bias findings",
      ],
      correct_index: 1,
      explanation:
        "AI tools can be valuable but must be audited for bias. The solution is fixing the system, not ignoring bias or abandoning useful technology.",
      hint: "Neither blind adoption nor total rejection — what's the responsible middle path?",
      category: "ethical_dilemma",
      difficulty: "hard",
      tags: ["ai-ethics", "bias"],
    },
    {
      question:
        "Is it ethical to use personal data to show users content that keeps them engaged longer, even if it increases anxiety?",
      options: [
        "Yes — users agreed to the terms of service",
        "Yes — engagement benefits the platform and advertisers",
        "No — maximizing engagement at the cost of well-being is manipulative",
        "It depends on whether the platform discloses this practice",
      ],
      correct_index: 3,
      explanation:
        "Informed consent matters. If users understand and accept the trade-off, it's different from hidden manipulation. Transparency is key.",
      hint: "Do users know what's happening and have a real choice?",
      category: "ethical_dilemma",
      difficulty: "hard",
      tags: ["dark-patterns", "consent"],
    },
    {
      question:
        "A hospital has one ventilator and two critically ill patients. A doctor must decide who receives it. Which is the most commonly accepted ethical framework for this decision?",
      options: [
        "First come, first served",
        "Give it to the younger patient",
        "Use clinical criteria to assess who benefits most",
        "Random selection (coin flip)",
      ],
      correct_index: 2,
      explanation:
        "Medical triage uses clinical criteria (likelihood of survival, benefit from treatment) to maximize lives saved — not age, status, or arbitrary order.",
      hint: "Medical ethics has a systematic approach to scarce resource allocation.",
      category: "ethical_dilemma",
      difficulty: "easy",
      tags: ["triage", "resource-allocation"],
    },
  ],

  pattern_math: [
    {
      question: "What comes next in the sequence: 2, 6, 18, 54, ___?",
      options: ["108", "162", "72", "216"],
      correct_index: 1,
      explanation:
        "Each number is multiplied by 3: 2×3=6, 6×3=18, 18×3=54, 54×3=162.",
      hint: "Look at the ratio between consecutive numbers.",
      category: "pattern_recognition",
      difficulty: "easy",
      tags: ["sequences", "multiplication"],
    },
    {
      question:
        "A bat and ball cost $1.10 total. The bat costs $1.00 more than the ball. How much does the ball cost?",
      options: ["$0.10", "$0.05", "$0.15", "$0.01"],
      correct_index: 1,
      explanation:
        "If the ball is $0.05, the bat is $1.05 ($1.00 more). Total: $1.10. Most people intuitively say $0.10, but that makes the bat only $0.90 more.",
      hint: "If the ball is $0.10, is the bat really $1.00 MORE than the ball?",
      category: "math",
      difficulty: "medium",
      tags: ["algebra", "intuition-trap"],
    },
    {
      question:
        "You flip a fair coin 5 times and get heads every time. What's the probability the next flip is heads?",
      options: ["1/64", "50%", "Less than 50%", "More than 50%"],
      correct_index: 1,
      explanation:
        "Each coin flip is independent. Past results don't affect future flips. The probability is always 50%, regardless of the streak.",
      hint: "Does the coin remember what happened before?",
      category: "math",
      difficulty: "medium",
      tags: ["probability", "gamblers-fallacy"],
    },
    {
      question:
        "A lily pad doubles in size every day. If it covers the whole pond on day 30, on which day did it cover half the pond?",
      options: ["Day 15", "Day 29", "Day 20", "Day 25"],
      correct_index: 1,
      explanation:
        "Since it doubles each day, it was half the size on day 29. Exponential growth is counterintuitive — most growth happens at the end.",
      hint: "Work backwards: if it doubles to fill the pond on day 30...",
      category: "math",
      difficulty: "medium",
      tags: ["exponential-growth", "reasoning"],
    },
    {
      question:
        "There are 23 people in a room. What's the approximate probability that at least two share a birthday?",
      options: ["About 6%", "About 25%", "About 50%", "About 75%"],
      correct_index: 2,
      explanation:
        "The birthday paradox: with just 23 people, there's a ~50.7% chance of a shared birthday. We underestimate because we think of specific dates, not any match.",
      hint: "This famous result is counterintuitively high.",
      category: "math",
      difficulty: "hard",
      tags: ["birthday-paradox", "probability"],
    },
  ],

  logic_games: [
    {
      question:
        "You meet two guards. One always tells the truth, one always lies. You can ask one question to find the safe door. What do you ask?",
      options: [
        "'Are you the truth-teller?'",
        "'Which door would the other guard say is safe?'",
        "'Is the left door safe?'",
        "'Do you lie?'",
      ],
      correct_index: 1,
      explanation:
        "Asking what the OTHER guard would say creates a double negation. Both guards will point to the dangerous door, so pick the opposite.",
      hint: "Use one guard's answer to cancel out the other's nature.",
      category: "logic",
      difficulty: "hard",
      tags: ["knights-knaves", "deduction"],
    },
    {
      question:
        "All roses are flowers. Some flowers fade quickly. Therefore:",
      options: [
        "All roses fade quickly",
        "Some roses fade quickly",
        "No valid conclusion about roses fading can be drawn",
        "Roses never fade",
      ],
      correct_index: 2,
      explanation:
        "'Some flowers fade' doesn't specify which. Roses might or might not be among those that fade. No valid deduction is possible.",
      hint: "Does 'some flowers' necessarily include roses?",
      category: "logic",
      difficulty: "medium",
      tags: ["syllogisms", "deduction"],
    },
    {
      question:
        "In a race, you overtake the person in 2nd place. What position are you now in?",
      options: ["1st", "2nd", "3rd", "It depends"],
      correct_index: 1,
      explanation:
        "Overtaking the 2nd place person puts you in 2nd, not 1st. You took their position; the 1st place person is still ahead.",
      hint: "You replaced the person you passed, you didn't jump ahead of everyone.",
      category: "logic",
      difficulty: "easy",
      tags: ["trick-question", "reasoning"],
    },
    {
      question:
        "A farmer has 17 sheep. All but 9 run away. How many sheep does the farmer have left?",
      options: ["8", "9", "17", "0"],
      correct_index: 1,
      explanation:
        "'All but 9' means 9 remain. The phrasing tricks you into subtracting, but it directly states 9 stayed.",
      hint: "Read the sentence very carefully — 'all but 9' tells you the answer directly.",
      category: "logic",
      difficulty: "easy",
      tags: ["trick-question", "careful-reading"],
    },
    {
      question:
        "Three boxes are labeled 'Apples,' 'Oranges,' and 'Mixed.' Every label is wrong. You pick one fruit from 'Mixed.' It's an apple. What's in the 'Oranges' box?",
      options: ["Oranges", "Apples", "Mixed", "Can't determine"],
      correct_index: 2,
      explanation:
        "The 'Mixed' label is wrong, so it's all one fruit. You drew an apple, so it's all apples. 'Apples' label is wrong → it's oranges or mixed. 'Oranges' label is wrong → it must be mixed.",
      hint: "Start from what you know: 'Mixed' box is actually all apples. Now use the rule that every label is wrong.",
      category: "logic",
      difficulty: "hard",
      tags: ["deduction", "constraint-satisfaction"],
    },
  ],

  wordplay: [
    {
      question:
        "I have cities but no houses, forests but no trees, and water but no fish. What am I?",
      options: ["A dream", "A map", "A painting", "A story"],
      correct_index: 1,
      explanation:
        "A map represents cities, forests, and water without containing the actual things. It's a representation, not reality.",
      hint: "Think about something that shows the world without being the world.",
      category: "wordplay",
      difficulty: "easy",
      tags: ["riddle", "lateral-thinking"],
    },
    {
      question:
        "What word becomes shorter when you add two letters to it?",
      options: ["Long", "Short", "Brief", "Small"],
      correct_index: 1,
      explanation:
        "'Short' + 'er' = 'Shorter.' The word 'short' literally becomes 'shorter' when you add two letters.",
      hint: "The answer is literally in the question.",
      category: "wordplay",
      difficulty: "easy",
      tags: ["riddle", "wordplay"],
    },
    {
      question:
        "A man pushes his car to a hotel and loses all his money. What happened?",
      options: [
        "He was robbed",
        "He's playing Monopoly",
        "The hotel charged too much",
        "His car broke down",
      ],
      correct_index: 1,
      explanation:
        "In Monopoly, you push your car (game piece) along the board and pay when you land on a hotel.",
      hint: "This isn't about a real car or a real hotel.",
      category: "wordplay",
      difficulty: "medium",
      tags: ["lateral-thinking", "misdirection"],
    },
    {
      question:
        "Before Mount Everest was discovered, what was the tallest mountain in the world?",
      options: [
        "K2",
        "Kangchenjunga",
        "Mount Everest — it existed before discovery",
        "We don't know",
      ],
      correct_index: 2,
      explanation:
        "Mount Everest was always the tallest — discovery doesn't change physical reality. The question tricks you into thinking discovery creates the fact.",
      hint: "Does a mountain's height depend on whether humans have found it?",
      category: "logic",
      difficulty: "medium",
      tags: ["trick-question", "assumption"],
    },
    {
      question:
        "If you have it, you want to share it. If you share it, you don't have it. What is it?",
      options: ["Money", "A secret", "Love", "Knowledge"],
      correct_index: 1,
      explanation:
        "A secret is only a secret as long as you keep it. Once you share it, it's no longer a secret.",
      hint: "Sharing this particular thing destroys the very nature of the thing.",
      category: "wordplay",
      difficulty: "hard",
      tags: ["riddle", "paradox"],
    },
  ],

  digital_literacy: [
    {
      question:
        "You receive an email from 'supp0rt@amaz0n.com' asking you to verify your account. What should you do?",
      options: [
        "Click the link and enter your password",
        "Reply asking for more information",
        "Ignore it — the zeros replacing O's indicate phishing",
        "Forward it to your friends as a warning",
      ],
      correct_index: 2,
      explanation:
        "Replacing letters with similar-looking characters (O→0) is a classic phishing technique. Legitimate companies use their real domain.",
      hint: "Look very carefully at the email address — something is off.",
      category: "media_literacy",
      difficulty: "easy",
      tags: ["phishing", "email-security"],
    },
    {
      question:
        "A website URL reads 'https://paypa1.com/login.' Is this the real PayPal?",
      options: [
        "Yes — it has HTTPS",
        "No — 'paypa1' uses the number 1 instead of letter L",
        "Yes — the URL looks correct",
        "Need more information",
      ],
      correct_index: 1,
      explanation:
        "Character substitution (l→1) creates convincing fake domains. Always check the URL carefully. HTTPS only means the connection is encrypted, not that the site is legitimate.",
      hint: "Compare 'paypa1' with 'paypal' character by character.",
      category: "media_literacy",
      difficulty: "easy",
      tags: ["url-spoofing", "phishing"],
    },
    {
      question:
        "A 'free VPN' app asks for permission to access your contacts, camera, and location. This is suspicious because:",
      options: [
        "VPNs need camera access to work",
        "A VPN only needs network access — these permissions are unnecessary",
        "Free apps always need extra permissions",
        "This is normal for security software",
      ],
      correct_index: 1,
      explanation:
        "VPNs route network traffic — they have no legitimate need for contacts, camera, or location. Excess permissions suggest data harvesting.",
      hint: "What does a VPN actually do? Does it need to see your photos?",
      category: "critical_thinking",
      difficulty: "medium",
      tags: ["permissions", "privacy"],
    },
    {
      question:
        "You see a shocking video of a politician saying something outrageous. Before sharing it, what should you check?",
      options: [
        "Whether it has many views",
        "Whether the account is verified",
        "Whether it could be a deepfake or taken out of context",
        "Whether your friends would find it interesting",
      ],
      correct_index: 2,
      explanation:
        "Deepfake technology can create convincing fake videos. Always verify with original sources and check for signs of manipulation before amplifying.",
      hint: "Technology can now create very realistic fake videos.",
      category: "media_literacy",
      difficulty: "medium",
      tags: ["deepfakes", "verification"],
    },
    {
      question:
        "A password manager suggests 'j7$kQ!9mPx2' as a password. Your friend says their pet's name is safer because they'll remember it. Who's right?",
      options: [
        "Your friend — memorable passwords are used more consistently",
        "The password manager — random passwords resist brute force and dictionary attacks",
        "Both are equally secure",
        "Neither — biometrics have replaced passwords",
      ],
      correct_index: 1,
      explanation:
        "Pet names, birthdays, and dictionary words are the first things attackers try. Random strings resist all common attack patterns.",
      hint: "Would a hacker try 'Buddy123' or 'j7$kQ!9mPx2' first?",
      category: "critical_thinking",
      difficulty: "hard",
      tags: ["passwords", "security"],
    },
  ],
};
