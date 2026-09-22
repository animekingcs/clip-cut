// app/api/process-video/route.js
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();

    const workerUrl =
      process.env.NEXT_PUBLIC_WORKER_URL || "https://clipscut-worker.onrender.com";

    console.log(`[PROXY] Sending request to: ${workerUrl}/process-video`);

    const response = await fetch(`${workerUrl}/process-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // Read response as plain text first to check if it's HTML or JSON
    const rawText = await response.text();

    if (!response.ok) {
      console.error("[RENDER ERROR RESPONSE]:", rawText);
      return NextResponse.json(
        { error: `Render worker returned HTTP ${response.status}. Check terminal logs for full HTML/error details.` },
        { status: response.status }
      );
    }

    // Try parsing as JSON only if response was successful
    try {
      const data = JSON.parse(rawText);
      return NextResponse.json(data);
    } catch (parseError) {
      console.error("[JSON PARSE ERROR] Raw output was:", rawText);
      return NextResponse.json(
        { error: "Render returned non-JSON output (likely an HTML error page)." },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("[API PROCESS ERROR]:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reach processing worker." },
      { status: 500 }
    );
  }
}