// app/api/process-video/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    // Pull Render URL from environment variable, fallback to default Render domain
    const workerUrl =
      process.env.NEXT_PUBLIC_WORKER_URL || "https://clipscut-worker.onrender.com";

    // Forward the payload directly to the Render Express backend
    const response = await fetch(`${workerUrl}/process-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Render worker processing failed");
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[API PROCESS ERROR]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reach processing worker." },
      { status: 500 }
    );
  }
}