// app/api/transcribe/route.js
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import Groq from "groq-sdk";

const execAsync = promisify(exec);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    const { videoFile } = await req.json();
    if (!videoFile) {
      return NextResponse.json({ error: "Missing videoFile" }, { status: 400 });
    }

    const tmpDir = path.join(process.cwd(), "tmp");
    const videoPath = path.join(tmpDir, videoFile);
    const audioPath = path.join(tmpDir, `${videoFile}.mp3`);

    if (!fs.existsSync(videoPath)) {
      return NextResponse.json({ error: "Video file not found" }, { status: 404 });
    }

    // 1. Extract audio stream for Groq
    const ffmpegPath = (await import("ffmpeg-static")).default;
    await execAsync(`"${ffmpegPath}" -y -i "${videoPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 "${audioPath}"`);

    // 2. Call Groq Whisper API
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-large-v3-turbo",
      response_format: "verbose_json",
      timestamp_granularities: ["word"],
    });

    // Clean up temporary MP3
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);

    return NextResponse.json({
      success: true,
      words: transcription.words || [],
    });
  } catch (err) {
    console.error("[TRANSCRIBE API ERROR]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}