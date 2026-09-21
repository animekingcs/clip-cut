// app/dashboard/page.js
"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase";

export default function DashboardPage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState(null);

  // Typography state
  const [typographyStyle, setTypographyStyle] = useState("hormozi");
  const [fontSize, setFontSize] = useState(60);

  // Color Grade state
  const [colorGradePreset, setColorGradePreset] = useState("cinematic");

  // Time Inputs
  const [timeRange, setTimeRange] = useState({
    startHours: "00",
    startMinutes: "00",
    startSeconds: "00",
    endHours: "00",
    endMinutes: "01",
    endSeconds: "00",
  });

  // Feature Toggles
  const [features, setFeatures] = useState({
    autoEditClips: false,
    kineticTypography: false,
    colorGrading: false,
    bRoll: false,
  });

  const supabase = createClient();

  const handleTimeChange = (field, value) => {
    const cleanedValue = value.replace(/\D/g, "").slice(0, 2);
    setTimeRange((prev) => ({ ...prev, [field]: cleanedValue }));
  };

  const handleToggleFeature = (featureKey) => {
    setFeatures((prev) => ({
      ...prev,
      [featureKey]: !prev[featureKey],
    }));
  };

  const formatTime = (h, m, s) => {
    const pad = (num) => (num || "0").padStart(2, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const handleProcessVideo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage("");
    setDownloadUrl(null);

    const startTimeFormatted = formatTime(
      timeRange.startHours,
      timeRange.startMinutes,
      timeRange.startSeconds
    );
    const endTimeFormatted = formatTime(
      timeRange.endHours,
      timeRange.endMinutes,
      timeRange.endSeconds
    );

    const selectedEnhancements = Object.keys(features).filter(
      (key) => features[key]
    );

    const payload = {
      url: youtubeUrl,
      trim: {
        start: startTimeFormatted,
        end: endTimeFormatted,
      },
      enhancements: selectedEnhancements.length > 0 ? features : null,
      typographyStyle: typographyStyle,
      fontSize: Number(fontSize),
      colorGradePreset: colorGradePreset,
    };

    try {
      const response = await fetch("/api/process-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process video");
      }

      setStatusMessage("Video processed successfully!");
      if (data.videoFile) {
        setDownloadUrl(`/api/video-stream?file=${data.videoFile}`);
      }
    } catch (err) {
      setStatusMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper styles for live preview text box
  const getPreviewStyle = () => {
    const scaledSize = Math.max(14, Math.min(48, fontSize * 0.4));
    if (typographyStyle === "hormozi") {
      return {
        fontSize: `${scaledSize}px`,
        color: "#FFFF00",
        fontFamily: "Impact, sans-serif",
        WebkitTextStroke: "2px black",
        textTransform: "uppercase",
      };
    }
    if (typographyStyle === "mrbeast") {
      return {
        fontSize: `${scaledSize}px`,
        color: "#FFFFFF",
        fontFamily: "'Arial Black', sans-serif",
        backgroundColor: "#000000",
        padding: "2px 8px",
        borderRadius: "4px",
        textTransform: "uppercase",
      };
    }
    return {
      fontSize: `${scaledSize}px`,
      color: "#FFFFFF",
      fontFamily: "sans-serif",
      fontWeight: "600",
      textTransform: "uppercase",
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-2xl font-bold">Video Processing Studio</h1>
            <p className="text-slate-400 text-sm mt-1">
              Trim YouTube videos by timestamp or select optional AI effects.
            </p>
          </div>
          <button
            onClick={() =>
              supabase.auth.signOut().then(() => (window.location.href = "/"))
            }
            className="text-xs text-slate-400 hover:text-red-400 border border-slate-800 px-3 py-2 rounded-lg transition"
          >
            Sign Out
          </button>
        </div>

        {statusMessage && (
          <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 text-indigo-300 text-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <span>{statusMessage}</span>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shrink-0"
              >
                Download Video (.mp4)
              </a>
            )}
          </div>
        )}

        {/* Video Output Preview */}
        {downloadUrl && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-slate-200">
              Video Preview
            </h2>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-slate-800 flex items-center justify-center">
              <video
                key={downloadUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                <source src={downloadUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        <form onSubmit={handleProcessVideo} className="space-y-6">
          {/* Step 1: Link & Timestamps */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-semibold text-slate-200">
              1. YouTube Link & Trim Range
            </h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                YouTube Video Link
              </label>
              <input
                type="url"
                required
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs text-slate-400">
                  Start Time (HH : MM : SS)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="HH"
                    value={timeRange.startHours}
                    onChange={(e) =>
                      handleTimeChange("startHours", e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 text-center text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                  <span className="text-slate-500 font-bold">:</span>
                  <input
                    type="text"
                    placeholder="MM"
                    value={timeRange.startMinutes}
                    onChange={(e) =>
                      handleTimeChange("startMinutes", e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 text-center text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                  <span className="text-slate-500 font-bold">:</span>
                  <input
                    type="text"
                    placeholder="SS"
                    value={timeRange.startSeconds}
                    onChange={(e) =>
                      handleTimeChange("startSeconds", e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 text-center text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs text-slate-400">
                  End Time (HH : MM : SS)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="HH"
                    value={timeRange.endHours}
                    onChange={(e) =>
                      handleTimeChange("endHours", e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 text-center text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                  <span className="text-slate-500 font-bold">:</span>
                  <input
                    type="text"
                    placeholder="MM"
                    value={timeRange.endMinutes}
                    onChange={(e) =>
                      handleTimeChange("endMinutes", e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 text-center text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                  <span className="text-slate-500 font-bold">:</span>
                  <input
                    type="text"
                    placeholder="SS"
                    value={timeRange.endSeconds}
                    onChange={(e) =>
                      handleTimeChange("endSeconds", e.target.value)
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 text-center text-sm focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Optional Visual Enhancements */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                2. Optional Visual Enhancements
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select any effect you want to apply. Leave all unchecked for
                trimming only.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {[
                {
                  id: "autoEditClips",
                  title: "Auto-Edit Clips",
                  desc: "Automatically remove silence & filler words",
                },
                {
                  id: "kineticTypography",
                  title: "Kinetic Typography",
                  desc: "Generate animated captions over video",
                },
                {
                  id: "colorGrading",
                  title: "Color Grading",
                  desc: "Apply cinematographic LUT & contrast filters",
                },
                {
                  id: "bRoll",
                  title: "Add B-Roll",
                  desc: "Overlay context-aware stock footage",
                },
              ].map((item) => (
                <label
                  key={item.id}
                  className={`flex items-start space-x-3 p-4 rounded-xl border cursor-pointer transition ${
                    features[item.id]
                      ? "bg-indigo-950/40 border-indigo-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={features[item.id]}
                    onChange={() => handleToggleFeature(item.id)}
                    className="w-4 h-4 mt-0.5 accent-indigo-600 rounded cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-200">
                      {item.title}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {item.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>

            {/* Typography Config */}
            {features.kineticTypography && (
              <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Select Typography Style:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      {
                        id: "hormozi",
                        label: "Alex Hormozi",
                        desc: "Bold Yellow & Black Stroke",
                      },
                      {
                        id: "mrbeast",
                        label: "MrBeast Style",
                        desc: "White Text + Black Box",
                      },
                      {
                        id: "minimal",
                        label: "Minimalist",
                        desc: "Clean Modern Sans-Serif",
                      },
                    ].map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setTypographyStyle(style.id)}
                        className={`p-3 text-left rounded-lg border text-xs transition ${
                          typographyStyle === style.id
                            ? "bg-indigo-600/20 border-indigo-500 text-white"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="block font-bold">{style.label}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {style.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">
                      Subtitle Font Size:
                    </label>
                    <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-800 px-2.5 py-1 rounded-md">
                      {fontSize}px
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="range"
                      min="30"
                      max="150"
                      step="5"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <input
                      type="number"
                      min="30"
                      max="150"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-center text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="mt-3">
                    <span className="block text-[11px] text-slate-500 mb-1.5">
                      Live Sample Preview:
                    </span>
                    <div className="w-full h-28 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center overflow-hidden p-4 relative">
                      <span style={getPreviewStyle()}>SAMPLE CAPTION</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Color Grade Preset Config */}
            {features.colorGrading && (
              <div className="mt-4 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <label className="block text-xs font-semibold text-slate-300">
                  Select Color Grade Preset:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    {
                      id: "cinematic",
                      label: "Cinematic Teal/Dark",
                      desc: "Rich contrast & deep shadows",
                    },
                    {
                      id: "warm",
                      label: "Warm & Punchy",
                      desc: "Vibrant saturated tones",
                    },
                    {
                      id: "monochrome",
                      label: "Monochrome B&W",
                      desc: "High contrast black and white",
                    },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setColorGradePreset(preset.id)}
                      className={`p-3 text-left rounded-lg border text-xs transition ${
                        colorGradePreset === preset.id
                          ? "bg-indigo-600/20 border-indigo-500 text-white"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <span className="block font-bold">{preset.label}</span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        {preset.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 rounded-xl transition text-sm disabled:opacity-50"
          >
            {loading
              ? "Processing Video..."
              : Object.values(features).some(Boolean)
              ? "Process Video + Selected Enhancements"
              : "Trim Video Only"}
          </button>
        </form>
      </div>
    </div>
  );
}