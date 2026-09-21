// app/api/process-video/route.js
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import ffmpegPath from "ffmpeg-static";
import youtubeDl from "yt-dlp-exec";
import { createAssSubtitleFile } from "@/utils/generateAss";

const execAsync = promisify(exec);

// Convert timestamp strings (HH:MM:SS or MM:SS) to total seconds
function timeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(timeStr) || 0;
}

// Format seconds to HH:MM:SS for yt-dlp section fetching
function formatSecondsToTimestamp(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Generate an FFmpeg filter_complex string to jump-cut silent pauses
function buildSilenceCutFilter(words, minSilenceGapSec = 0.4) {
  if (!words || words.length === 0) return null;

  const speechSegments = [];
  let currentStart = words[0].start;
  let currentEnd = words[0].end;

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const gap = word.start - currentEnd;

    if (gap > minSilenceGapSec) {
      speechSegments.push({ start: currentStart, end: currentEnd });
      currentStart = word.start;
    }
    currentEnd = word.end;
  }
  speechSegments.push({ start: currentStart, end: currentEnd });

  if (speechSegments.length <= 1) return null;

  let videoSelects = "";
  let audioSelects = "";
  let concatInputs = "";

  speechSegments.forEach((seg, index) => {
    videoSelects += `[0:v]trim=start=${seg.start.toFixed(2)}:end=${seg.end.toFixed(2)},setpts=PTS-STARTPTS[v${index}];`;
    audioSelects += `[0:a]atrim=start=${seg.start.toFixed(2)}:end=${seg.end.toFixed(2)},asetpts=PTS-STARTPTS[a${index}];`;
    concatInputs += `[v${index}][a${index}]`;
  });

  return {
    filterComplex: `${videoSelects}${audioSelects}${concatInputs}concat=n=${speechSegments.length}:v=1:a=1[outv][outa]`,
    segmentCount: speechSegments.length,
  };
}

export async function POST(req) {
  let assPath = null;
  try {
    const body = await req.json();
    const {
      url,
      trim,
      enhancements,
      typographyStyle,
      fontSize,
      colorGradePreset,
    } = body;

    if (!url) {
      return NextResponse.json(
        { error: "YouTube URL is required." },
        { status: 400 }
      );
    }

    const startSec = trim?.start ? timeToSeconds(trim.start) : 0;
    const endSec = trim?.end ? timeToSeconds(trim.end) : startSec + 60;

    if (endSec <= startSec) {
      return NextResponse.json(
        { error: "End time must be greater than start time." },
        { status: 400 }
      );
    }

    const jobId = `job_${Date.now()}`;
    const tmpDir = path.join(process.cwd(), "tmp");
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const rawVideoPath = path.join(tmpDir, `${jobId}_raw.mp4`);
    const outputVideoFile = `${jobId}.mp4`;
    const outputFilePath = path.join(tmpDir, outputVideoFile);

    const startTimestamp = formatSecondsToTimestamp(startSec);
    const endTimestamp = formatSecondsToTimestamp(endSec);

    // 1. Download raw YouTube segment
    await youtubeDl(url, {
      output: rawVideoPath,
      format: "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
      downloadSections: `*${startTimestamp}-${endTimestamp}`,
      ffmpegLocation: ffmpegPath,
      forceOverwrites: true,
    });

    if (!fs.existsSync(rawVideoPath)) {
      throw new Error("Failed to download raw video segment from YouTube.");
    }

    let transcriptWords = [];

    // 2. Fetch transcript if Auto-Edit or Subtitles are enabled
    if (enhancements?.kineticTypography || enhancements?.autoEditClips) {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const transcribeRes = await fetch(`${siteUrl}/api/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoFile: `${jobId}_raw.mp4` }),
      });

      const transcribeData = await transcribeRes.json();
      transcriptWords = transcribeData.words || [];
    }

    // 3. Assemble unified single-pass FFmpeg filter list
    let vfFilters = [];
    let silenceCutResult = null;

    // Silence Removal
    if (enhancements?.autoEditClips && transcriptWords.length > 0) {
      silenceCutResult = buildSilenceCutFilter(transcriptWords, 0.4);
    }

    // Color Grade Filter
    if (enhancements?.colorGrading) {
      const selectedPreset = colorGradePreset || "cinematic";
      if (selectedPreset === "cinematic") {
        vfFilters.push("eq=contrast=1.18:brightness=-0.02:saturation=1.25");
      } else if (selectedPreset === "warm") {
        vfFilters.push("eq=contrast=1.1:brightness=0.03:saturation=1.35");
      } else if (selectedPreset === "monochrome") {
        vfFilters.push("eq=contrast=1.25:saturation=0");
      }
    }

    // Subtitle Burn-In Filter
    if (enhancements?.kineticTypography && transcriptWords.length > 0) {
      assPath = path.join(tmpDir, `${jobId}.ass`);
      createAssSubtitleFile(
        assPath,
        transcriptWords,
        typographyStyle || "hormozi",
        fontSize || 60
      );
      const escapedAssPath = assPath.replace(/\\/g, "/").replace(":", "\\:");
      vfFilters.push(`subtitles='${escapedAssPath}'`);
    }

    // 4. Run Single-Pass Multi-Thread Capped Command (-threads 2 prevents machine freezing)
    let ffmpegCmd = `"${ffmpegPath}" -y -threads 2 -i "${rawVideoPath}"`;

    if (silenceCutResult) {
      let filterComplexStr = silenceCutResult.filterComplex;
      if (vfFilters.length > 0) {
        filterComplexStr += `;[outv]${vfFilters.join(",")}[outv_final]`;
        ffmpegCmd += ` -filter_complex "${filterComplexStr}" -map "[outv_final]" -map "[outa]"`;
      } else {
        ffmpegCmd += ` -filter_complex "${filterComplexStr}" -map "[outv]" -map "[outa]"`;
      }
    } else if (vfFilters.length > 0) {
      ffmpegCmd += ` -vf "${vfFilters.join(",")}"`;
    }

    ffmpegCmd += ` -c:v libx264 -preset superfast -crf 26 -c:a aac -b:a 128k "${outputFilePath}"`;
    await execAsync(ffmpegCmd);

    // Clean up intermediate files
    if (fs.existsSync(rawVideoPath)) fs.unlinkSync(rawVideoPath);
    if (assPath && fs.existsSync(assPath)) fs.unlinkSync(assPath);

    return NextResponse.json({
      success: true,
      videoFile: outputVideoFile,
      words: transcriptWords,
    });
  } catch (err) {
    console.error("[PROCESS VIDEO ERROR]:", err);
    // Cleanup on fail
    if (assPath && fs.existsSync(assPath)) fs.unlinkSync(assPath);
    return NextResponse.json(
      { error: err.message || "Failed to process video." },
      { status: 500 }
    );
  }
}