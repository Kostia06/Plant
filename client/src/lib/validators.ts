import { createHash } from "crypto";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const RECOGNIZED_DOMAINS = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "instagram.com",
  "www.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
  "facebook.com",
  "www.facebook.com",
  "fb.watch",
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.x.com",
  "reddit.com",
  "www.reddit.com",
]);

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface UrlValidationResult extends ValidationResult {
  platform?: string;
}

export function validateUserId(userId: string): ValidationResult {
  if (!userId) {
    return { valid: false, error: "user_id is required" };
  }
  if (!UUID_REGEX.test(userId)) {
    return { valid: false, error: "user_id must be a valid UUID" };
  }
  return { valid: true };
}

export function validateReflection(response: string): ValidationResult {
  if (!response || typeof response !== "string") {
    return { valid: false, error: "response is required" };
  }

  const trimmed = response.trim();

  if (trimmed.length < 50) {
    return {
      valid: false,
      error: "Reflection must be at least 50 characters",
    };
  }

  if (trimmed.length > 5000) {
    return {
      valid: false,
      error: "Reflection must be at most 5000 characters",
    };
  }

  const uniqueChars = new Set(trimmed.toLowerCase());
  if (uniqueChars.size <= 3) {
    return {
      valid: false,
      error: "Reflection appears to be gibberish",
    };
  }

  const words = new Set(trimmed.toLowerCase().split(/\s+/).filter(Boolean));
  if (words.size < 3) {
    return {
      valid: false,
      error: "Reflection must contain at least 3 distinct words",
    };
  }

  return { valid: true };
}

export function validateGoalTitle(title: string): ValidationResult {
  if (!title || typeof title !== "string") {
    return { valid: false, error: "title is required" };
  }

  const trimmed = title.trim();

  if (trimmed.length < 10) {
    return {
      valid: false,
      error: "Goal title must be at least 10 characters",
    };
  }

  if (trimmed.length > 200) {
    return {
      valid: false,
      error: "Goal title must be at most 200 characters",
    };
  }

  return { valid: true };
}

export function validateUrl(url: string): UrlValidationResult {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "url is required" };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!RECOGNIZED_DOMAINS.has(hostname)) {
    return {
      valid: false,
      error: "URL must be from a recognized platform",
    };
  }

  const platformMap: Record<string, string> = {
    "youtube.com": "youtube",
    "www.youtube.com": "youtube",
    "youtu.be": "youtube",
    "instagram.com": "instagram",
    "www.instagram.com": "instagram",
    "tiktok.com": "tiktok",
    "www.tiktok.com": "tiktok",
    "facebook.com": "facebook",
    "www.facebook.com": "facebook",
    "fb.watch": "facebook",
    "twitter.com": "twitter",
    "www.twitter.com": "twitter",
    "x.com": "twitter",
    "www.x.com": "twitter",
    "reddit.com": "reddit",
    "www.reddit.com": "reddit",
  };

  return { valid: true, platform: platformMap[hostname] };
}

export function hashText(text: string): string {
  return createHash("sha256")
    .update(text.toLowerCase().trim())
    .digest("hex");
}
