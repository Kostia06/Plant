import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.PYTHON_API_URL || "http://localhost:8000";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const { jobId } = await params;

    const res = await fetch(`${API_URL}/api/status/${jobId}`);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.detail || "Status check failed" },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Analysis server is not reachable" },
      { status: 502 },
    );
  }
}
