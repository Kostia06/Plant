import { NextRequest, NextResponse } from "next/server";

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en";

export async function POST(request: NextRequest) {
  try {
    if (!DEEPGRAM_API_KEY) {
      return NextResponse.json(
        { error: "Transcription service not configured" },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const audio = formData.get("audio") as Blob | null;

    if (!audio) {
      return NextResponse.json(
        { error: "No audio provided" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await audio.arrayBuffer());

    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "Empty audio file" },
        { status: 400 },
      );
    }

    const response = await fetch(DEEPGRAM_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/webm",
      },
      body: buffer,
    });

    if (!response.ok) {
      console.error("Deepgram error:", response.status, await response.text());
      return NextResponse.json(
        { error: "Transcription service error" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const transcript =
      data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return NextResponse.json({ text: transcript });
  } catch (error) {
    console.error("Transcribe error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
