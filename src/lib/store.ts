/**
 * BeatForge data layer.
 *
 * A tiny, dependency-free JSON document store that lives in /data.
 * It is intentionally simple (the app is designed to be swapped onto
 * Postgres/Prisma by replacing this single module) but it gives us
 * relational-ish collections, atomic writes and typed models.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const DATA_DIR = path.join(process.cwd(), "data");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

/* ------------------------------------------------------------------ types */

export type Role = "ADMIN" | "ARTIST";

export type PaymentMethod = "MOBILE_MONEY" | "BANK" | "CARD";

export type OrderStatus =
  | "PENDING"
  | "AWAITING_CONFIRMATION"
  | "PAID"
  | "DELIVERED"
  | "CANCELLED";

export type PaymentStatus = "PENDING" | "CONFIRMED" | "FAILED";

export type FileKind = "MP3" | "WAV" | "STEMS" | "ARTWORK" | "OTHER";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone: string;
  country: string;
  createdAt: string;
}

export interface BeatFile {
  id: string;
  name: string;
  kind: FileKind;
  /** path relative to UPLOAD_DIR, e.g. "beats/abc.mp3" */
  path: string;
  sizeBytes: number;
  /** which license tiers may download this file ("*" = all) */
  tier: string;
}

export interface Beat {
  id: string;
  slug: string;
  title: string;
  genre: string;
  bpm: number;
  musicalKey: string;
  mood: string;
  priceCents: number;
  description: string;
  tags: string[];
  /** path relative to UPLOAD_DIR */
  artwork: string | null;
  files: BeatFile[];
  durationSec: number;
  plays: number;
  sales: number;
  published: boolean;
  featured: boolean;
  createdAt: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  /** path relative to UPLOAD_DIR */
  path: string;
  poster: string | null;
  durationSec: number;
  views: number;
  published: boolean;
  createdAt: string;
}

export interface License {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  description: string;
  includes: string[];
  distribution: string;
  streams: string;
  videos: string;
  radio: boolean;
  exclusive: boolean;
  active: boolean;
  sort: number;
}

/** How an order is settled: once, or 50% deposit now + balance before delivery. */
export type PaymentPlan = "FULL" | "HALF";

/** Which part of a bill a payment covers. */
export type PaymentStage = "FULL" | "DEPOSIT" | "BALANCE";

export interface Order {
  id: string;
  code: string;
  userId: string;
  userEmail: string;
  userName: string;
  beatId: string;
  licenseId: string;
  /** Full price of the license — what the artist owes in total. */
  amountCents: number;
  currency: string;
  status: OrderStatus;
  method: PaymentMethod | null;
  reference: string;
  note: string;
  createdAt: string;
  paidAt: string | null;
  deliveredAt: string | null;
  /** "HALF" = pay 50% now, the rest before the files are released. */
  plan: PaymentPlan;
  /** Amount due up front (the deposit for HALF plans). */
  depositCents: number;
  /** Amount still owed after the deposit was paid. */
  balanceCents: number;
  balancePaidAt: string | null;
  balancePaymentId: string | null;
}

export interface Payment {
  id: string;
  /** Empty for studio-booking payments. */
  orderId: string;
  bookingId: string | null;
  method: PaymentMethod;
  provider: string;
  phone: string;
  reference: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  /** FULL, DEPOSIT or BALANCE. */
  kind: PaymentStage;
  /** path relative to UPLOAD_DIR (proof of transfer screenshot) */
  proofPath: string | null;
  note: string;
  createdAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
}

/* ------------------------------------------------------- studio & bookings */

export type BookingStatus =
  | "PENDING_PAYMENT"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED";

/** A bookable studio service, priced per hour (edited in /admin/studio). */
export interface StudioService {
  id: string;
  slug: string;
  name: string;
  blurb: string;
  priceCents: number;
  minHours: number;
  maxHours: number;
  active: boolean;
  sort: number;
}

export interface StudioDay {
  /** "09:00" */
  open: string;
  /** "21:00" */
  close: string;
  closed: boolean;
}

export interface StudioSettings {
  enabled: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  address: string;
  /** Percentage of the session total taken up front (meetbeatz-style: 50). */
  depositPercent: number;
  /** Length of one bookable slot in minutes. */
  slotMinutes: number;
  /** Minimum notice before a slot can be booked. */
  leadTimeHours: number;
  /** How far ahead the calendar can be booked. */
  maxDaysAhead: number;
  policy: string;
  /** Keyed by weekday index, "0" = Sunday. */
  hours: Record<string, StudioDay>;
}

export interface Booking {
  id: string;
  code: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  serviceId: string;
  serviceName: string;
  /** YYYY-MM-DD */
  date: string;
  /** "HH:MM" (24h, studio local time) */
  start: string;
  hours: number;
  notes: string;
  totalCents: number;
  depositPercent: number;
  depositCents: number;
  balanceCents: number;
  currency: string;
  status: BookingStatus;
  paymentId: string | null;
  balancePaidAt: string | null;
  balanceMethod: PaymentMethod | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Reply {
  id: string;
  body: string;
  from: "ADMIN" | "USER";
  createdAt: string;
}

export interface Message {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  subject: string;
  body: string;
  status: "NEW" | "REPLIED" | "CLOSED";
  createdAt: string;
  replies: Reply[];
}

export interface EmailLog {
  id: string;
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  kind: string;
  attachments: string[];
  /** "sent" when a real SMTP transport delivered it, "outbox" otherwise */
  status: "sent" | "outbox";
  error: string | null;
  createdAt: string;
  read: boolean;
}

export interface Download {
  id: string;
  orderId: string;
  userId: string;
  beatId: string;
  token: string;
  count: number;
  createdAt: string;
  lastAt: string | null;
}

/** Editable website copy & section toggles — managed by the producer in /admin/site. */
export interface SiteContent {
  brandName: string;
  announcement: { enabled: boolean; text: string; linkLabel: string; linkHref: string };
  hero: {
    eyebrow: string;
    headline: string;
    highlight: string;
    subtitle: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    showStats: boolean;
  };
  beatsSection: { show: boolean; eyebrow: string; title: string; subtitle: string };
  videosSection: { show: boolean; eyebrow: string; title: string; subtitle: string };
  contact: { title: string; subtitle: string };
  studioSection: { show: boolean; eyebrow: string; title: string; subtitle: string };
  footerNote: string;
}

export interface Settings {
  site: SiteContent;
  producerName: string;
  producerTagline: string;
  producerBio: string;
  contactEmail: string;
  contactPhone: string;
  whatsapp: string;
  location: string;
  currency: string;
  currencySymbol: string;
  /** Let artists pay beat licences 50% now / 50% before delivery. */
  allowHalfPayments: boolean;
  studio: StudioSettings;
  services: StudioService[];
  momoAccounts: { provider: string; number: string; name: string }[];
  bankAccount: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    swift: string;
    branch: string;
  };
  paymentInstructions: string;
  deliveryNote: string;
  socials: {
    instagram: string;
    youtube: string;
    tiktok: string;
    spotify: string;
    x: string;
  };
}

export interface DB {
  users: User[];
  beats: Beat[];
  videos: Video[];
  licenses: License[];
  orders: Order[];
  payments: Payment[];
  bookings: Booking[];
  messages: Message[];
  emails: EmailLog[];
  downloads: Download[];
  settings: Settings;
}

export const DEFAULT_SITE: SiteContent = {
  brandName: "BeatForge",
  announcement: { enabled: false, text: "", linkLabel: "", linkHref: "" },
  hero: {
    eyebrow: "Beats & visuals from the studio",
    headline: "Find the beat that",
    highlight: "makes your next hit.",
    subtitle:
      "Preview, lease or own original beats. Pay with mobile money or bank transfer and get your files by email the moment payment clears.",
    primaryLabel: "Browse beats",
    primaryHref: "/beats",
    secondaryLabel: "Contact the studio",
    secondaryHref: "/contact",
    showStats: true,
  },
  beatsSection: {
    show: true,
    eyebrow: "Fresh out the vault",
    title: "Beats ready to lease",
    subtitle:
      "Preview any beat right here. Lease it, or make it yours exclusively — the files are yours the second payment clears.",
  },
  videosSection: {
    show: true,
    eyebrow: "Visuals",
    title: "Videos from the studio",
    subtitle: "Sessions, beat breakdowns and visuals shot in the studio.",
  },
  contact: {
    title: "Message the studio",
    subtitle:
      "Custom beats, licensing questions, collabs or feature requests — every message goes straight to the producer's inbox and gets a reply by email.",
  },
  studioSection: {
    // Off by default: studio services live in the top navigation dropdown.
    show: false,
    eyebrow: "The studio",
    title: "Book studio time",
    subtitle:
      "Recording, mixing and mastering with the producer. Pick a slot, pay 50% now and the rest at the studio.",
  },
  footerNote: "Beats are licensed, not sold, unless marked exclusive.",
};

/** Merge saved site content over the defaults, one level deep, so older data files keep working. */
export function mergeSite(saved?: Partial<SiteContent> | null): SiteContent {
  const d = DEFAULT_SITE;
  const s = saved ?? {};
  return {
    brandName: s.brandName || d.brandName,
    announcement: { ...d.announcement, ...s.announcement },
    hero: { ...d.hero, ...s.hero },
    beatsSection: { ...d.beatsSection, ...s.beatsSection },
    videosSection: { ...d.videosSection, ...s.videosSection },
    contact: { ...d.contact, ...s.contact },
    studioSection: { ...d.studioSection, ...s.studioSection },
    footerNote: s.footerNote ?? d.footerNote,
  };
}

/* --------------------------------------------------------- studio defaults */

export const DEFAULT_SERVICES: StudioService[] = [
  {
    id: "svc_recording",
    slug: "recording",
    name: "Recording",
    blurb:
      "Vocal recording in a treated booth with a session engineer. Includes a rough mix at the end of your session.",
    priceCents: 4000,
    minHours: 1,
    maxHours: 8,
    active: true,
    sort: 1,
  },
  {
    id: "svc_mixing",
    slug: "mixing",
    name: "Mixing",
    blurb:
      "A full mix of your session — balance, EQ, compression, effects and vocal treatment, delivered ready to master.",
    priceCents: 6000,
    minHours: 2,
    maxHours: 6,
    active: true,
    sort: 2,
  },
  {
    id: "svc_mastering",
    slug: "mastering",
    name: "Mastering",
    blurb:
      "Radio-ready masters with loudness, stereo and tonal polish — streaming, WAV and MP3 deliverables included.",
    priceCents: 8000,
    minHours: 1,
    maxHours: 4,
    active: true,
    sort: 3,
  },
];

const FULL_DAY: StudioDay = { open: "09:00", close: "21:00", closed: false };

export const DEFAULT_STUDIO: StudioSettings = {
  enabled: true,
  eyebrow: "Studio sessions",
  title: "Book your session.",
  subtitle:
    "Recording, mixing and mastering. Pick a slot, pay the deposit with mobile money, and your confirmation is emailed instantly.",
  address: "",
  depositPercent: 50,
  slotMinutes: 60,
  leadTimeHours: 12,
  maxDaysAhead: 60,
  policy:
    "Please arrive 10 minutes before your session. The balance is payable at the studio before the session starts. Reschedule at least 24 hours in advance to keep your deposit.",
  hours: {
    "0": { ...FULL_DAY },
    "1": { ...FULL_DAY },
    "2": { ...FULL_DAY },
    "3": { ...FULL_DAY },
    "4": { ...FULL_DAY },
    "5": { ...FULL_DAY },
    "6": { open: "10:00", close: "18:00", closed: false },
  },
};

/** Merge saved studio settings over the defaults (hours merged per weekday). */
export function mergeStudio(saved?: Partial<StudioSettings> | null): StudioSettings {
  const d = DEFAULT_STUDIO;
  const s = saved ?? {};
  const hours: Record<string, StudioDay> = { ...d.hours };
  for (const key of Object.keys(d.hours)) {
    const day = s.hours?.[key];
    if (day) hours[key] = { ...d.hours[key], ...day };
  }
  return {
    enabled: s.enabled ?? d.enabled,
    eyebrow: s.eyebrow ?? d.eyebrow,
    title: s.title ?? d.title,
    subtitle: s.subtitle ?? d.subtitle,
    address: s.address ?? d.address,
    depositPercent: clampPercent(s.depositPercent ?? d.depositPercent, d.depositPercent),
    slotMinutes: [30, 60, 90, 120].includes(Number(s.slotMinutes)) ? Number(s.slotMinutes) : d.slotMinutes,
    leadTimeHours: Number.isFinite(Number(s.leadTimeHours)) ? Math.max(0, Number(s.leadTimeHours)) : d.leadTimeHours,
    maxDaysAhead: Number.isFinite(Number(s.maxDaysAhead)) ? Math.max(1, Math.min(365, Number(s.maxDaysAhead))) : d.maxDaysAhead,
    policy: s.policy ?? d.policy,
    hours,
  };
}

function clampPercent(value: unknown, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(100, Math.round(n)));
}

export const DEFAULT_SETTINGS: Settings = {
  site: DEFAULT_SITE,
  producerName: "Nova",
  producerTagline: "Producer & sound designer — hard-hitting beats for serious artists",
  producerBio:
    "I've been producing for 8 years, placement credits across Afrobeats, Amapiano, Hip-Hop and R&B. Every beat is mixed, tagged where needed and delivered the moment your payment clears.",
  contactEmail: "bookings@beatforge.studio",
  contactPhone: "+233 55 123 4567",
  whatsapp: "+233551234567",
  location: "Accra, Ghana",
  currency: "USD",
  currencySymbol: "$",
  allowHalfPayments: true,
  studio: DEFAULT_STUDIO,
  services: DEFAULT_SERVICES,
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
    spotify: "https://spotify.com/",
    x: "https://x.com/",
  },
};

export const DEFAULT_LICENSES: License[] = [
  {
    id: "lic_basic",
    name: "MP3 Lease",
    slug: "mp3-lease",
    priceCents: 2999,
    description: "The classic lease — tagged MP3 for mixtapes, SoundCloud and free plays.",
    includes: ["Tagged MP3 (320kbps)", "Non-profitable performances", "Music videos (no monetization)"],
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
    includes: ["All files (WAV, MP3, stems)", "Full ownership transfer", "Beat removed from store", "Contract PDF"],
    distribution: "Unlimited",
    streams: "Unlimited",
    videos: "Unlimited",
    radio: true,
    exclusive: true,
    active: true,
    sort: 3,
  },
];

/* ------------------------------------------------------------------- store */

let cache: DB | null = null;
let cacheStamp = "";

const DATA_FILES = [
  "users",
  "beats",
  "videos",
  "licenses",
  "orders",
  "payments",
  "bookings",
  "messages",
  "emails",
  "downloads",
  "settings",
] as const;

/**
 * Cheap change-detection stamp for the JSON data files. Several modules (and,
 * in dev, several compiled bundles) can hold their own copy of this module, so
 * the cache has to notice writes made elsewhere instead of trusting memory.
 */
function dataStamp() {
  let stamp = "";
  for (const name of DATA_FILES) {
    try {
      const stat = fs.statSync(path.join(DATA_DIR, `${name}.json`));
      stamp += `${name}:${stat.mtimeMs}:${stat.size}|`;
    } catch {
      stamp += `${name}:-|`;
    }
  }
  return stamp;
}

function readJson<T>(name: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(name: string, value: unknown) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const file = path.join(DATA_DIR, name);
    const tmp = `${file}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, file);
  } catch (err) {
    console.error("[store] failed to persist", name, err);
  }
}

/** Older data files predate 50/50 payments — fill in the new fields on read. */
function normalizeOrder(order: Order): Order {
  const plan: PaymentPlan = order.plan === "HALF" ? "HALF" : "FULL";
  const depositCents =
    typeof order.depositCents === "number" ? order.depositCents : plan === "HALF" ? Math.round(order.amountCents / 2) : order.amountCents;
  const balanceCents = typeof order.balanceCents === "number" ? order.balanceCents : order.amountCents - depositCents;
  return {
    ...order,
    plan,
    depositCents,
    balanceCents,
    balancePaidAt: order.balancePaidAt ?? null,
    balancePaymentId: order.balancePaymentId ?? null,
  };
}

function normalizePayment(payment: Payment): Payment {
  return {
    ...payment,
    orderId: payment.orderId ?? "",
    bookingId: payment.bookingId ?? null,
    kind: payment.kind ?? "FULL",
  };
}

export function db(): DB {
  const stamp = dataStamp();
  if (!cache || stamp !== cacheStamp) {
    cacheStamp = stamp;
    cache = {
      users: readJson<User[]>("users.json", []),
      beats: readJson<Beat[]>("beats.json", []),
      videos: readJson<Video[]>("videos.json", []),
      licenses: readJson<License[]>("licenses.json", []),
      orders: readJson<Order[]>("orders.json", []).map(normalizeOrder),
      payments: readJson<Payment[]>("payments.json", []).map(normalizePayment),
      bookings: readJson<Booking[]>("bookings.json", []),
      messages: readJson<Message[]>("messages.json", []),
      emails: readJson<EmailLog[]>("emails.json", []),
      downloads: readJson<Download[]>("downloads.json", []),
      settings: (() => {
        const saved = readJson<Partial<Settings>>("settings.json", {});
        return {
          ...DEFAULT_SETTINGS,
          ...saved,
          site: mergeSite(saved.site),
          studio: mergeStudio(saved.studio),
          services: Array.isArray(saved.services) && saved.services.length ? saved.services : DEFAULT_SERVICES,
        };
      })(),
    };
  }
  return cache;
}

const KEYS: (keyof DB)[] = [
  "users",
  "beats",
  "videos",
  "licenses",
  "orders",
  "payments",
  "bookings",
  "messages",
  "emails",
  "downloads",
  "settings",
];

/** Flush the in-memory store to disk (per collection JSON file). */
export function persist(...only: (keyof DB)[]) {
  const data = db();
  for (const key of only.length ? only : KEYS) {
    writeJson(`${key}.json`, data[key]);
  }
}

/** Forget the cache — used by the seed script / tests. */
export function invalidateStore() {
  cache = null;
  cacheStamp = "";
}

/* ------------------------------------------------------------------ helpers */

export function uid(prefix: string) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCode(len = 6) {
  let out = "";
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function uniqueSlug(base: string, taken: string[]) {
  let slug = slugify(base) || "beat";
  let n = 2;
  while (taken.includes(slug)) slug = `${slugify(base)}-${n++}`;
  return slug;
}

export function formatMoney(cents: number, currency = db().settings.currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    return `${db().settings.currencySymbol}${(cents / 100).toFixed(2)}`;
  }
}

export function beatById(id: string) {
  return db().beats.find((b) => b.id === id) ?? null;
}

export function beatBySlug(slug: string) {
  return db().beats.find((b) => b.slug === slug) ?? null;
}

export function videoById(id: string) {
  return db().videos.find((v) => v.id === id) ?? null;
}

export function licenseById(id: string) {
  return db().licenses.find((l) => l.id === id) ?? null;
}

export function orderById(id: string) {
  return db().orders.find((o) => o.id === id) ?? null;
}

export function orderByCode(code: string) {
  return db().orders.find((o) => o.code === code.toUpperCase()) ?? null;
}

export function userById(id: string) {
  return db().users.find((u) => u.id === id) ?? null;
}

export function userByEmail(email: string) {
  const e = email.trim().toLowerCase();
  return db().users.find((u) => u.email.toLowerCase() === e) ?? null;
}

export function paymentById(id: string) {
  return db().payments.find((p) => p.id === id) ?? null;
}

export function paymentsForOrder(orderId: string) {
  return db().payments.filter((p) => p.orderId === orderId);
}

export function paymentsForBooking(bookingId: string) {
  return db().payments.filter((p) => p.bookingId === bookingId);
}

export function bookingById(id: string) {
  return db().bookings.find((b) => b.id === id) ?? null;
}

export function bookingsForUser(userId: string) {
  return db()
    .bookings.filter((b) => b.userId === userId)
    .sort((a, b) => `${b.date}${b.start}`.localeCompare(`${a.date}${a.start}`));
}

export function studioServices() {
  return [...db().settings.services]
    .filter((s) => s.active)
    .sort((a, b) => a.sort - b.sort);
}

export function serviceById(id: string) {
  return db().settings.services.find((s) => s.id === id) ?? null;
}

/** Bookings that hold calendar space (pending deposits included). */
export function blockingBookings() {
  return db().bookings.filter((b) => b.status !== "CANCELLED");
}

export function ordersForUser(userId: string) {
  return db()
    .orders.filter((o) => o.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function messagesForUser(userId: string) {
  return db()
    .messages.filter((m) => m.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function downloadByToken(token: string) {
  return db().downloads.find((d) => d.token === token) ?? null;
}

export function publicUser(u: User) {
  const { passwordHash: _passwordHash, ...rest } = u;
  return rest;
}

/** Genres present on published beats, most used first. */
export function genreList() {
  const counts = new Map<string, number>();
  for (const b of db().beats) {
    if (!b.published) continue;
    counts.set(b.genre, (counts.get(b.genre) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
}

