// app/api/process-video/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { url, trim } = body;

    const workerUrl =
      process.env.NEXT_PUBLIC_WORKER_URL || "https://clipscut-worker.onrender.com";

    // Format request payload to match Render index.js requirements
    const payload = {
      videoUrl: url,
      startTime: trim?.start || "00:00:00",
      endTime: trim?.end || "00:00:10",
    };

    console.log(`[PROXY] Sending request to: ${workerUrl}/api/process`);

    // Fetch from Render's /api/process endpoint
    const response = await fetch(`${workerUrl}/api/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[RENDER ERROR]:", errorText);
      return NextResponse.json(
        { error: `Render processing failed with HTTP ${response.status}` },
        { status: response.status }
      );
    }

    // Convert video binary stream from Render into a blob to send back to UI
    const videoBuffer = await response.arrayBuffer();

    return new NextResponse(videoBuffer, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="trimmed_video.mp4"',
      },
    });
  } catch (err) {
    console.error("[NEXT PROXY ERROR]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reach processing worker." },
      { status: 500 }
    );
  }
}