// utils/generateAss.js
import fs from "fs";

export function createAssSubtitleFile(
  filePath,
  words,
  styleType = "hormozi",
  customFontSize = 60
) {
  const fontSize = Number(customFontSize) || 60;
  // MarginV scales proportionally with font size so larger text stays above the bottom edge
  const marginV = Math.max(25, Math.floor(fontSize * 0.6));
  const outline = Math.max(2, Math.floor(fontSize * 0.08));

  const styles = {
    hormozi: `Style: Default,Impact,${fontSize},&H0000FFFF,&H00000000,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,${outline},0,2,20,20,${marginV},1`,
    mrbeast: `Style: Default,Arial Black,${fontSize},&H00FFFFFF,&H00000000,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,3,0,0,2,20,20,${marginV},1`,
    minimal: `Style: Default,Montserrat,${fontSize},&H00FFFFFF,&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,${Math.max(1, Math.floor(outline / 2))},0,2,20,20,${marginV},1`,
  };

  const selectedStyle = styles[styleType] || styles.hormozi;

  let assContent = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${selectedStyle}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return "0:00:00.00";
    const pad = (n, z = 2) => String(n).padStart(z, "0");
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds % 1) * 100);
    return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
  };

  words.forEach((w) => {
    const startTime = formatTime(w.start);
    const endTime = formatTime(w.end);
    const text = w.word.trim().toUpperCase();
    assContent += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${text}\n`;
  });

  fs.writeFileSync(filePath, assContent, "utf8");
}