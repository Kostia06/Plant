"use client";

import { useState, useRef } from "react";

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export function VoiceRecorder({ onTranscription }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribe(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setError("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const transcribe = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob);

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Transcription failed");
        return;
      }

      if (data.text) onTranscription(data.text);
    } catch {
      setError("Transcription failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="voice-container">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`voice-btn ${isRecording ? "voice-btn--recording" : ""}`}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isProcessing ? "..." : isRecording ? "||" : "mic"}
      </button>
      {isRecording && <span className="voice-status">Listening...</span>}
      {isProcessing && <span className="voice-status">Transcribing...</span>}
      {error && <span className="voice-error">{error}</span>}
    </div>
  );
}
