/**
 * Generates short demo videos with ffmpeg (if a binary is available).
 * Looks for: $FFMPEG_BIN, an imageio-ffmpeg install, then ffmpeg on PATH.
 *
 * Uses the libass `ass` filter for text (this static build has no drawtext).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CANDIDATE_PATHS = [
  process.env.FFMPEG_BIN,
  "/home/user/.venv-ffmpeg/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2",
  "/usr/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
].filter(Boolean);

export function findFfmpeg() {
  for (const candidate of CANDIDATE_PATHS) {
    try {
      if (fs.existsSync(candidate)) {
        execFileSync(candidate, ["-version"], { stdio: "ignore" });
        return candidate;
      }
    } catch {
      /* keep looking */
    }
  }
  return null;
}

function assEscape(text) {
  return String(text).replace(/([{}])/g, "\\$1").replace(/\r?\n/g, "\\N");
}

function assTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function buildAss({ title, subtitle, seconds }) {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Title,DejaVu Sans,58,&H00FFFFFF,&H000000FF,&H80000000,&H64000000,-1,0,0,0,100,100,0,0,1,2,1,5,60,60,200,1
Style: Sub,DejaVu Sans,28,&H00E6E8FF,&H000000FF,&H80000000,&H64000000,0,0,0,0,100,100,0,0,1,2,1,5,60,60,130,1
Style: Mark,DejaVu Sans,24,&H00D8DCF5,&H000000FF,&H80000000,&H64000000,-1,0,0,0,100,100,4,0,1,1,1,5,60,60,620,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,${assTime(0)},${assTime(seconds)},Title,,0,0,0,,{\\an5\\pos(640,250)\\fad(300,300)}${assEscape(title)}
Dialogue: 0,${assTime(0)},${assTime(seconds)},Sub,,0,0,0,,{\\an5\\pos(640,330)\\fad(300,300)}${assEscape(subtitle)}
Dialogue: 0,${assTime(0)},${assTime(seconds)},Mark,,0,0,0,,{\\an5\\pos(640,640)\\fad(300,300)}BEATFORGE STUDIO
`;
}

/**
 * Renders a 1280x720 clip: animated gradient background, burned-in titles,
 * an audio-driven wave strip and the supplied audio track.
 */
export function renderDemoVideo({
  ffmpeg,
  audioPath,
  outputPath,
  title,
  subtitle,
  seconds = 9,
  colorA = "0x1a1030",
  colorB = "0x7c3aed",
}) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const assPath = path.join(path.dirname(outputPath), "titles.ass");
  fs.writeFileSync(assPath, buildAss({ title, subtitle, seconds }));

  const filterComplex = [
    "[0:v]format=yuv420p,vignette=PI/5,ass='" + assPath.replace(/'/g, "\\'") + "'[bg]",
    "[1:a]showwaves=s=1280x200:mode=cline:rate=30:colors=0x22d3ee,format=yuva420p[wave]",
    "[bg][wave]overlay=0:430:format=auto,format=yuv420p[v]",
  ].join(";");

  const args = [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `gradients=s=1280x720:c0=${colorA}:c1=${colorB}:c2=0x0b0b18:d=${seconds}:r=30:speed=0.035:x0=640:y0=360:x1=0:y1=720`,
    "-i",
    audioPath,
    "-filter_complex",
    filterComplex,
    "-map",
    "[v]",
    "-map",
    "1:a",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-t",
    String(seconds),
    "-movflags",
    "+faststart",
    outputPath,
  ];

  execFileSync(ffmpeg, args, { stdio: "pipe" });
  fs.rmSync(assPath, { force: true });
  return outputPath;
}

/** Extracts a poster frame from a rendered video. */
export function extractPoster(ffmpeg, videoPath, posterPath) {
  fs.mkdirSync(path.dirname(posterPath), { recursive: true });
  execFileSync(
    ffmpeg,
    ["-y", "-i", videoPath, "-ss", "00:00:02", "-frames:v", "1", "-q:v", "3", posterPath],
    { stdio: "pipe" },
  );
  return posterPath;
}
