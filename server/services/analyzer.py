import json
import logging
import time

import google.generativeai as genai

from config import GEMINI_API_KEY
from models.schemas import AnalysisResult

logger = logging.getLogger(__name__)

genai.configure(api_key=GEMINI_API_KEY)

PROMPT = """You are a world-class video fact-checker and media literacy analyst for an app called Yggdrasil.

You are given the audio track and key visual frames from a video posted on social media.

Your job is to analyze BOTH the spoken/audio content AND the visual content thoroughly.

## Instructions:

1. **Transcribe** the audio content fully.

2. **Extract every verifiable claim** made in the video, whether spoken or shown visually (text overlays, graphs, statistics, images, screenshots). For each claim provide:
   - The exact claim
   - Whether it was "spoken", "visual", or "both"
   - Approximate timestamp if possible
   - Verdict: "true", "misleading", "false", or "unverified"
   - Confidence score from 0.0 to 1.0
   - Clear explanation of why you gave that verdict
   - Evidence supporting the claim
   - Evidence contradicting the claim
   - Source URLs you are confident about (real, well-known sources only — do NOT fabricate URLs)

3. **Identify bias and manipulation tactics** used in the video:
   - Overall political/ideological bias: "left", "lean_left", "center", "lean_right", "right", or "none"
   - List any manipulation tactics: emotional_language, cherry_picked_stats, misleading_visuals, appeal_to_authority, false_equivalence, straw_man, fear_mongering, bandwagon, ad_hominem, out_of_context
   - Flag any misleading visuals with timestamp and description

4. **Provide three perspectives** on the video's main topic:
   - How left-leaning sources typically frame this topic
   - A neutral, centrist, factual framing
   - How right-leaning sources typically frame this topic

5. **Write a brief 2-3 sentence summary** of the video's content and main message.

## CRITICAL RULES:
- Be objective and evidence-based
- If you cannot verify a claim, mark it "unverified" — do NOT guess
- Do NOT fabricate source URLs. Only include URLs you are confident are real.
- If the video is non-political (cooking, entertainment, etc.), set bias to "none" and perspectives can reflect different viewpoints on the topic rather than political leanings
- Always provide the full transcript

Respond ONLY with valid JSON matching this exact structure (no markdown, no backticks, no preamble):
{
  "title": "descriptive title for this video",
  "summary": "2-3 sentence summary",
  "transcript": "full transcript",
  "claims": [
    {
      "claim": "the claim text",
      "type": "spoken|visual|both",
      "timestamp": "M:SS or null",
      "verdict": "true|misleading|false|unverified",
      "confidence": 0.0,
      "explanation": "why this verdict",
      "evidence_for": ["supporting evidence"],
      "evidence_against": ["contradicting evidence"],
      "sources": ["https://real-source-url.com"]
    }
  ],
  "perspectives": {
    "left": "left perspective",
    "center": "center perspective",
    "right": "right perspective"
  },
  "bias_analysis": {
    "overall_bias": "none|left|lean_left|center|lean_right|right",
    "manipulation_tactics": ["tactic1", "tactic2"],
    "misleading_visuals": [
      {"timestamp": "M:SS", "description": "what is misleading"}
    ]
  }
}"""


def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]
    return json.loads(text)


def _calculate_points(claims: list[dict]) -> int:
    for claim in claims:
        if claim.get("verdict") in ("misleading", "false"):
            return 10
    return 5


def _upload_audio(audio_path: str) -> genai.types.File:
    audio_file = genai.upload_file(audio_path, mime_type="audio/mpeg")
    while audio_file.state.name == "PROCESSING":
        time.sleep(2)
        audio_file = genai.get_file(audio_file.name)
    if audio_file.state.name == "FAILED":
        raise RuntimeError("Audio file processing failed")
    return audio_file


def analyze(audio_path: str, keyframe_paths: list[str]) -> AnalysisResult:
    audio_file = _upload_audio(audio_path)

    image_parts = []
    for path in keyframe_paths:
        with open(path, "rb") as f:
            image_parts.append({"mime_type": "image/jpeg", "data": f.read()})

    model = genai.GenerativeModel("gemini-2.0-flash")
    contents = [audio_file, *image_parts, PROMPT]
    gen_config = genai.GenerationConfig(response_mime_type="application/json")

    result = None
    try:
        for attempt in range(2):
            try:
                response = model.generate_content(
                    contents, generation_config=gen_config
                )
                result = _parse_json(response.text)
                break
            except json.JSONDecodeError:
                if attempt == 1:
                    raise
                logger.warning("JSON parse failed, retrying Gemini call...")
    finally:
        try:
            genai.delete_file(audio_file.name)
        except Exception:
            pass

    if result is None:
        raise RuntimeError("Gemini returned no valid response")

    points = _calculate_points(result.get("claims", []))
    result["points_awarded"] = points

    return AnalysisResult(**result)
