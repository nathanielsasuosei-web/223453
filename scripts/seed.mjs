/**
 * BeatForge seed script.
 *
 *   npm run seed
 *
 * Generates the demo catalog (synthesized beats, artwork, demo videos),
 * writes the JSON data files the app reads, and prints the login details.
 */
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { encodeMp3, synthesizeBeat, writeWav } from "./gen-audio.mjs";
import { writeArtwork } from "./gen-art.mjs";
import { extractPoster, findFfmpeg, renderDemoVideo } from "./gen-video.mjs";
import { createZip } from "./zip.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data");
const UPLOADS = path.join(DATA, "uploads");

/* ------------------------------------------------------------------- config */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@beatforge.studio";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123!";
const ARTIST_EMAIL = process.env.ARTIST_EMAIL || "artist@beatforge.studio";
const ARTIST_PASSWORD = process.env.ARTIST_PASSWORD || "Artist123!";

const BEATS = [
  {
    title: "Midnight in Accra",
    genre: "Afrobeats",
    bpm: 104,
    musicalKey: "A minor",
    mood: "Melodic",
    priceCents: 3499,
    tags: ["afrobeats", "type beat", "melodic", "late night"],
    description:
      "Warm Afrobeat groove with live-feeling percussion, rolling bass and a plucked lead that sits perfectly under a hook. Mixed and mastered, ready for a feature.",
    root: -24,
    bars: 4,
    seed: 11,
    featured: true,
    plays: 1284,
    sales: 6,
  },
  {
    title: "Amapiano Nights",
    genre: "Amapiano",
    bpm: 112,
    musicalKey: "G minor",
    mood: "Groovy",
    priceCents: 3999,
    tags: ["amapiano", "log drum", "groove", "dance"],
    description:
      "Classic Amapiano pocket: shuffling shakers, deep log drum and a chord pad that opens up in the drop. Leave room for the vocal — the instrumental tells the story.",
    root: -26,
    bars: 4,
    seed: 23,
    featured: true,
    plays: 2130,
    sales: 9,
  },
  {
    title: "Trap Cathedral",
    genre: "Trap",
    bpm: 140,
    musicalKey: "F minor",
    mood: "Dark",
    priceCents: 2999,
    tags: ["trap", "dark", "808", "hard"],
    description:
      "Cinematic trap with a sliding 808, haunting pad and a halftime feel in the bridge. Built for a big hook and a bigger music video.",
    root: -29,
    bars: 4,
    seed: 37,
    featured: true,
    plays: 1760,
    sales: 4,
  },
  {
    title: "Lagos Drill",
    genre: "Drill",
    bpm: 142,
    musicalKey: "E minor",
    mood: "Hard",
    priceCents: 3299,
    tags: ["drill", "uk drill", "sliding 808", "aggressive"],
    description:
      "Gritty drill with a sliding 808, triplet hats and a cold minor loop. The percussion pattern leaves space for fast, confident flows.",
    root: -28,
    bars: 4,
    seed: 51,
    featured: false,
    plays: 940,
    sales: 3,
  },
  {
    title: "Slow Burn",
    genre: "R&B",
    bpm: 88,
    musicalKey: "D minor",
    mood: "Romantic",
    priceCents: 4499,
    tags: ["rnb", "smooth", "sensual", "ballad"],
    description:
      "Late-night R&B with soft electric chords, finger snaps and a bass line that walks. Written for a vocalist who likes space and reverb.",
    root: -26,
    bars: 4,
    seed: 67,
    featured: false,
    plays: 1520,
    sales: 5,
  },
  {
    title: "Golden Hour",
    genre: "Highlife",
    bpm: 96,
    musicalKey: "C major",
    mood: "Chill",
    priceCents: 3799,
    tags: ["highlife", "guitar feel", "sunny", "feel good"],
    description:
      "Bright highlife-inspired groove with jazzy chords and a walking bass. Perfect for a summer record, an advert or a feel-good freestyle.",
    root: -24,
    bars: 4,
    seed: 83,
    featured: false,
    plays: 780,
    sales: 2,
  },
];

const VIDEOS = [
  {
    title: "Studio session — Midnight in Accra",
    description:
      "How the Afrobeat groove came together: percussion, bass and the log-drum style pocket, tracked live in the studio.",
    seconds: 9,
    colorA: "0x1a1030",
    colorB: "0x7c3aed",
    views: 4120,
  },
  {
    title: "Making the 808 slide — Trap Cathedral",
    description:
      "A breakdown of the sliding 808, the pad stack and the mix bus chain that gives this trap beat its weight.",
    seconds: 8,
    colorA: "0x0b1020",
    colorB: "0x22d3ee",
    views: 2680,
  },
  {
    title: "Amapiano drum programming",
    description:
      "Programming the shaker pattern and log drum for Amapiano Nights — the groove that makes people move.",
    seconds: 8,
    colorA: "0x04120f",
    colorB: "0x10b981",
    views: 5310,
  },
];

/* --------------------------------------------------------------------- main */

function writeJson(name, value) {
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(path.join(DATA, name), JSON.stringify(value, null, 2));
}

async function main() {
  console.log("BeatForge seed\n");

  const ffmpeg = findFfmpeg();
  console.log(ffmpeg ? `ffmpeg found: ${ffmpeg}` : "ffmpeg not found — videos will be skipped");

  fs.rmSync(UPLOADS, { recursive: true, force: true });
  fs.mkdirSync(UPLOADS, { recursive: true });

  /* ------------------------------------------------------------- licenses */
  const licenses = [
    {
      id: "lic_basic",
      name: "MP3 Lease",
      slug: "mp3-lease",
      priceCents: 2999,
      description: "The classic lease — tagged MP3 for mixtapes, SoundCloud and free plays.",
      includes: ["Tagged MP3 (320kbps)", "Non-profitable performances", "1 music video (no monetization)"],
      distribution: "Unlimited (non-profit)",
      streams: "100,000 streams",
      videos: "1 music video",
      radio: false,
      exclusive: false,
      active: true,
      sort: 1,
    },
    {
      id: "lic_premium",
      name: "Premium WAV Lease",
      slug: "premium-wav-lease",
      priceCents: 7999,
      description: "Untagged WAV + trackout stems for releases you plan to monetize.",
      includes: ["Untagged WAV (24-bit)", "Trackout stems", "Monetized audio & video platforms"],
      distribution: "Unlimited (for profit)",
      streams: "1,000,000 streams",
      videos: "3 music videos",
      radio: true,
      exclusive: false,
      active: true,
      sort: 2,
    },
    {
      id: "lic_exclusive",
      name: "Exclusive Rights",
      slug: "exclusive-rights",
      priceCents: 29999,
      description: "Full ownership. The beat is removed from the store and becomes yours.",
      includes: ["All files (WAV, MP3, stems)", "Full ownership transfer", "Beat removed from store", "Signed contract PDF"],
      distribution: "Unlimited",
      streams: "Unlimited",
      videos: "Unlimited",
      radio: true,
      exclusive: true,
      active: true,
      sort: 3,
    },
  ];
  writeJson("licenses.json", licenses);

  /* ---------------------------------------------------------------- users */
  const users = [
    {
      id: "usr_admin",
      name: "Nova (Producer)",
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
      role: "ADMIN",
      phone: "+233 55 123 4567",
      country: "Ghana",
      createdAt: new Date(Date.now() - 220 * 86400000).toISOString(),
    },
    {
      id: "usr_artist_demo",
      name: "Kwesi A.",
      email: ARTIST_EMAIL,
      passwordHash: await bcrypt.hash(ARTIST_PASSWORD, 10),
      role: "ARTIST",
      phone: "+233 24 555 0101",
      country: "Ghana",
      createdAt: new Date(Date.now() - 26 * 86400000).toISOString(),
    },
    {
      id: "usr_artist_2",
      name: "Zainab O.",
      email: "zainab@example.com",
      passwordHash: await bcrypt.hash("Artist123!", 10),
      role: "ARTIST",
      phone: "+234 802 555 0143",
      country: "Nigeria",
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    },
  ];
  writeJson("users.json", users);

  /* ---------------------------------------------------------------- beats */
  const beats = [];
  for (const [index, spec] of BEATS.entries()) {
    const slug = spec.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    console.log(`  generating "${spec.title}" (${spec.bpm} BPM ${spec.musicalKey})…`);
    const rendered = synthesizeBeat({
      bpm: spec.bpm,
      bars: spec.bars,
      genre: spec.genre.toLowerCase(),
      root: spec.root,
      seed: spec.seed,
    });

    const wavPath = path.join(UPLOADS, "beats", `${slug}-master.wav`);
    const mp3Path = path.join(UPLOADS, "beats", `${slug}-tagged.mp3`);
    const zipPath = path.join(UPLOADS, "beats", `${slug}-stems.zip`);
    writeWav(wavPath, rendered);

    const mp3Bytes = ffmpeg ? encodeMp3(ffmpeg, wavPath, mp3Path) : fs.statSync(wavPath).size;

    createZip(
      [
        {
          name: "README.txt",
          content: `${spec.title} — trackout stems\n\nFiles: drums.wav, bass.wav, 808.wav, pads.wav, lead.wav, mix.wav\nLicense: ${spec.title} was purchased under a BeatForge license.\n`,
        },
        { name: "stems/drums.txt", content: "Drum stem placeholder (demo seed).\n" },
        { name: "stems/bass.txt", content: "Bass stem placeholder (demo seed).\n" },
        { name: "stems/808.txt", content: "808 stem placeholder (demo seed).\n" },
        { name: "stems/pads.txt", content: "Pad stem placeholder (demo seed).\n" },
        { name: "stems/lead.txt", content: "Lead stem placeholder (demo seed).\n" },
      ],
      zipPath,
    );

    const artworkPath = writeArtwork(path.join(UPLOADS, "artwork"), `${slug}.svg`, {
      title: spec.title,
      genre: spec.genre,
      bpm: spec.bpm,
      musicalKey: spec.musicalKey,
      index,
    });

    const rel = (p) => path.relative(UPLOADS, p).split(path.sep).join("/");

    beats.push({
      id: `beat_${index + 1}`,
      slug,
      title: spec.title,
      genre: spec.genre,
      bpm: spec.bpm,
      musicalKey: spec.musicalKey,
      mood: spec.mood,
      priceCents: spec.priceCents,
      description: spec.description,
      tags: spec.tags,
      artwork: rel(artworkPath),
      files: [
        {
          id: `file_${index + 1}_mp3`,
          name: `${spec.title} (Tagged MP3).mp3`,
          kind: "MP3",
          path: rel(mp3Path),
          sizeBytes: mp3Bytes,
          tier: "*",
        },
        {
          id: `file_${index + 1}_wav`,
          name: `${spec.title} (Master WAV).wav`,
          kind: "WAV",
          path: rel(wavPath),
          sizeBytes: fs.statSync(wavPath).size,
          tier: "premium-wav-lease",
        },
        {
          id: `file_${index + 1}_stems`,
          name: `${spec.title} (Trackout Stems).zip`,
          kind: "STEMS",
          path: rel(zipPath),
          sizeBytes: fs.statSync(zipPath).size,
          tier: "exclusive-rights",
        },
      ],
      durationSec: Math.round(rendered.durationSec),
      plays: spec.plays,
      sales: spec.sales,
      published: true,
      featured: spec.featured,
      createdAt: new Date(Date.now() - (BEATS.length - index) * 3 * 86400000).toISOString(),
    });
  }
  writeJson("beats.json", beats);

  /* --------------------------------------------------------------- videos */
  const videos = [];
  if (ffmpeg) {
    for (const [index, spec] of VIDEOS.entries()) {
      const slug = `video-${index + 1}`;
      console.log(`  rendering video "${spec.title}"…`);

      // reuse the matching beat's audio for the video soundtrack
      const beat = beats[index];
      const audioPath = path.join(UPLOADS, beat.files[0].path);
      const videoPath = path.join(UPLOADS, "videos", `${slug}.mp4`);
      const posterPath = path.join(UPLOADS, "videos", `${slug}-poster.jpg`);

      try {
        renderDemoVideo({
          ffmpeg,
          audioPath,
          outputPath: videoPath,
          title: spec.title,
          subtitle: "BeatForge Studio — behind the boards",
          seconds: spec.seconds,
          colorA: spec.colorA,
          colorB: spec.colorB,
        });
        extractPoster(ffmpeg, videoPath, posterPath);
        videos.push({
          id: `vid_${index + 1}`,
          title: spec.title,
          description: spec.description,
          path: `videos/${slug}.mp4`,
          poster: `videos/${slug}-poster.jpg`,
          durationSec: spec.seconds,
          views: spec.views,
          published: true,
          createdAt: new Date(Date.now() - (VIDEOS.length - index) * 5 * 86400000).toISOString(),
        });
      } catch (err) {
        console.error("  video render failed:", err.message);
      }
    }
  }
  writeJson("videos.json", videos);

  /* ---------------------------------------------------- orders, payments */
  const now = Date.now();
  const demoOrder = {
    id: "ord_demo_1",
    code: "BF-DEMO01",
    userId: "usr_artist_demo",
    userEmail: ARTIST_EMAIL,
    userName: "Kwesi A.",
    beatId: "beat_1",
    licenseId: "lic_premium",
    amountCents: 7999,
    currency: "USD",
    status: "DELIVERED",
    method: "MOBILE_MONEY",
    reference: "MM-BF-DEMO01",
    note: "",
    createdAt: new Date(now - 3 * 86400000).toISOString(),
    paidAt: new Date(now - 3 * 86400000 + 8 * 60000).toISOString(),
    deliveredAt: new Date(now - 3 * 86400000 + 8 * 60000).toISOString(),
  };
  const demoPayment = {
    id: "pay_demo_1",
    orderId: demoOrder.id,
    method: "MOBILE_MONEY",
    provider: "MTN Mobile Money",
    phone: "+233 24 555 0101",
    reference: "MM-BF-DEMO01",
    amountCents: demoOrder.amountCents,
    currency: "USD",
    status: "CONFIRMED",
    proofPath: null,
    note: "",
    createdAt: demoOrder.createdAt,
    confirmedAt: demoOrder.paidAt,
    confirmedBy: "Nova (Producer)",
  };
  const demoDownload = {
    id: "dl_demo_1",
    orderId: demoOrder.id,
    userId: "usr_artist_demo",
    beatId: "beat_1",
    token: crypto.randomBytes(24).toString("hex"),
    count: 2,
    createdAt: demoOrder.deliveredAt,
    lastAt: new Date(now - 2 * 86400000).toISOString(),
  };
  /* ------------------------------------------------- session bookings */
  const sessionDate = new Date(now + 7 * 86400000);
  const sessionDateStr = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, "0")}-${String(sessionDate.getDate()).padStart(2, "0")}`;
  const demoBooking = {
    id: "bkg_demo_1",
    code: "SB-DEMO01",
    userId: "usr_artist_demo",
    userEmail: ARTIST_EMAIL,
    userName: "Kwesi A.",
    service: "recording",
    priceCents: 30000,
    depositCents: 15000,
    balanceCents: 15000,
    currency: "USD",
    sessionDate: sessionDateStr,
    sessionTime: "14:00",
    phone: "+233 24 555 0101",
    note: "Vocals for my next single — need a relaxed two-hour slot with ad-libs.",
    status: "DEPOSIT_PAID",
    method: "MOBILE_MONEY",
    reference: "MM-SB-DEMO01",
    createdAt: new Date(now - 1 * 86400000).toISOString(),
    depositPaidAt: new Date(now - 1 * 86400000 + 30 * 60000).toISOString(),
    paidAt: null,
  };
  const demoBookingPayment = {
    id: "pay_demo_booking_1",
    orderId: "",
    bookingId: demoBooking.id,
    purpose: "SESSION_DEPOSIT",
    method: "MOBILE_MONEY",
    provider: "MTN Mobile Money",
    phone: "+233 24 555 0101",
    reference: "MM-SB-DEMO01",
    amountCents: demoBooking.depositCents,
    currency: "USD",
    status: "CONFIRMED",
    proofPath: null,
    note: "",
    createdAt: demoBooking.createdAt,
    confirmedAt: demoBooking.depositPaidAt,
    confirmedBy: "Nova (Producer)",
  };

  writeJson("orders.json", [demoOrder]);
  writeJson("payments.json", [demoPayment, demoBookingPayment]);
  writeJson("downloads.json", [demoDownload]);
  writeJson("sessionBookings.json", [demoBooking]);

  /* ------------------------------------------------------------- messages */
  const messages = [
    {
      id: "msg_demo_1",
      userId: "usr_artist_demo",
      name: "Kwesi A.",
      email: ARTIST_EMAIL,
      subject: "Custom beat for my next single",
      body: "Hey Nova — I need something in the Amapiano pocket around 112 BPM with a big log drop. Can you quote for a custom plus exclusive rights?",
      status: "REPLIED",
      createdAt: new Date(now - 2 * 86400000).toISOString(),
      replies: [
        {
          id: "rep_demo_1",
          body: "Yes — custom production with exclusive rights is $250 and takes about 5 working days. I'll send two references first so we're aligned on the sound.",
          from: "ADMIN",
          createdAt: new Date(now - 2 * 86400000 + 3 * 3600000).toISOString(),
        },
      ],
    },
  ];
  writeJson("messages.json", messages);

  /* -------------------------------------------------------- sample emails */
  const sampleEmail = (id, kind, subject, to, body) => ({
    id,
    to,
    from: '"BeatForge" <no-reply@beatforge.studio>',
    subject,
    text: body,
    html: `<div style="font-family:Segoe UI,Arial,sans-serif;background:#0a0a12;padding:24px"><div style="max-width:520px;margin:auto;background:#12121f;border:1px solid #262640;border-radius:18px;padding:28px;color:#e5e7eb"><h1 style="font-size:20px;margin:0 0 12px;color:#fff">${subject}</h1><p style="font-size:14px;line-height:1.6;color:#b9bcc8;margin:0">${body}</p></div></div>`,
    kind,
    attachments: [],
    status: "outbox",
    error: null,
    createdAt: new Date(now - 3 * 86400000).toISOString(),
    read: true,
  });
  writeJson("emails.json", [
    sampleEmail(
      "mail_demo_1",
      "BEAT_DELIVERED",
      "🎉 Your beat is ready — Midnight in Accra (Premium WAV Lease)",
      ARTIST_EMAIL,
      "Payment confirmed — the WAV master and stems are attached, and your private download page is live.",
    ),
    sampleEmail(
      "mail_demo_2",
      "PAYMENT_INSTRUCTIONS",
      "Payment instructions for BF-DEMO01 — Midnight in Accra",
      ARTIST_EMAIL,
      "Send the exact amount by mobile money using BF-DEMO01 as the reference.",
    ),
    sampleEmail(
      "mail_demo_3",
      "MESSAGE_REPLY",
      "Re: Custom beat for my next single",
      ARTIST_EMAIL,
      "Custom production with exclusive rights is $250 and takes about 5 working days.",
    ),
  ]);

  /* ------------------------------------------------------------- settings */
  writeJson("settings.json", {
    producerName: "Nova",
    producerTagline: "Producer & sound designer — hard-hitting beats for serious artists",
    producerBio:
      "I've been producing for 8 years with placements across Afrobeats, Amapiano, Hip-Hop and R&B. Every beat is mixed and delivered the moment your payment clears.",
    contactEmail: "bookings@beatforge.studio",
    contactPhone: "+233 55 123 4567",
    whatsapp: "+233551234567",
    location: "Accra, Ghana",
    currency: "USD",
    currencySymbol: "$",
    sessions: {
      enabled: true,
      recordingPriceCents: 30000,
      mixingPriceCents: 15000,
      masteringPriceCents: 8000,
      depositPercent: 50,
      note: "Pay 50% up front to secure your slot. The balance is due before your session — your booking is confirmed the moment the deposit clears.",
    },
    momoAccounts: [
      { provider: "MTN Mobile Money", number: "+233 55 123 4567", name: "BeatForge Studio" },
      { provider: "Telecel Cash", number: "+233 24 987 6543", name: "BeatForge Studio" },
    ],
    bankAccount: {
      bankName: "Ecobank Ghana",
      accountName: "BeatForge Studio Ltd",
      accountNumber: "1441001234567",
      swift: "ECOCGHAC",
      branch: "Ridge Branch",
    },
    paymentInstructions:
      "Send the exact amount using your order reference as the payment note. Payments are confirmed manually within 1 hour (usually a few minutes), and your files are emailed instantly after confirmation.",
    deliveryNote:
      "Your download links never expire. We also attach the files to the confirmation email so you always have a copy in your inbox.",
    socials: {
      instagram: "https://instagram.com/",
      youtube: "https://youtube.com/",
      tiktok: "https://tiktok.com/",
      spotify: "https://open.spotify.com/",
      x: "https://x.com/",
    },
  });

  /* ---------------------------------------------------------------- report */
  const size = (dir) =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir, { recursive: true, withFileTypes: true }).reduce((sum, entry) => {
          if (!entry.isFile()) return sum;
          return sum + fs.statSync(path.join(entry.parentPath ?? dir, entry.name)).size;
        }, 0)
      : 0;

  console.log(`
Seed complete
──────────────────────────────────────────────
  beats            ${beats.length}
  videos           ${videos.length}
  uploads size     ${(size(UPLOADS) / 1024 / 1024).toFixed(1)} MB

  Producer login   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}
  Artist demo      ${ARTIST_EMAIL} / ${ARTIST_PASSWORD}

  Start the app:   npm run dev
  Store:           http://localhost:3000/beats
  Admin:           http://localhost:3000/admin
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
