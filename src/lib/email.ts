import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import fs from "node:fs";
import path from "node:path";
import { UPLOAD_DIR, db, persist, uid } from "./store";
import type { EmailLog } from "./store";

export const SMTP_CONFIGURED = Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
);

export function fromAddress() {
  return process.env.SMTP_FROM || `"BeatForge" <no-reply@beatforge.studio>`;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!SMTP_CONFIGURED) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

/* --------------------------------------------------------------- templates */

const BRAND = "#7c3aed";
const BRAND_2 = "#22d3ee";

function shell({
  title,
  preheader,
  body,
}: {
  title: string;
  preheader: string;
  body: EmailBody;
}) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a12;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#e5e7eb;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a12;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#12121f;border:1px solid #262640;border-radius:20px;overflow:hidden;">
        <tr>
          <td style="padding:26px 32px;background:linear-gradient(120deg,${BRAND},${BRAND_2});">
            <div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#0b0b14;">BEATFORGE</div>
            <div style="font-size:12px;color:#0b0b14;opacity:.75;">beats &amp; visuals by the producer</div>
          </td>
        </tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#ffffff;">${body.heading}</h1>
          ${body.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#b9bcc8;">${p}</p>`).join("")}
          ${body.facts ? factsTable(body.facts) : ""}
          ${body.cta ? ctaButton(body.cta) : ""}
          ${body.note ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#7c8095;border-left:3px solid ${BRAND};padding-left:12px;">${body.note}</p>` : ""}
        </td></tr>
        <tr><td style="padding:18px 32px 28px;border-top:1px solid #23233a;">
          <p style="margin:0;font-size:12px;color:#6b6f85;">BeatForge Studio · Delivered by email · Reply to this message any time.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function factsTable(facts: [string, string][]) {
  const rows = facts
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;font-size:13px;color:#7c8095;width:150px;">${escapeHtml(k)}</td><td style="padding:8px 0;font-size:14px;color:#ffffff;font-weight:600;">${v}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;border-top:1px solid #23233a;border-bottom:1px solid #23233a;">${rows}</table>`;
}

function ctaButton(cta: { label: string; url: string }) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;"><tr><td style="border-radius:12px;background:linear-gradient(120deg,${BRAND},${BRAND_2});">
    <a href="${cta.url}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:700;color:#0b0b14;text-decoration:none;border-radius:12px;">${escapeHtml(cta.label)}</a>
  </td></tr></table>
  <p style="margin:8px 0 0;font-size:12px;color:#6b6f85;word-break:break-all;">${escapeHtml(cta.url)}</p>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface EmailBody {
  heading: string;
  paragraphs: string[];
  facts?: [string, string][];
  cta?: { label: string; url: string };
  note?: string;
}

export function renderEmail(opts: {
  kind: string;
  subject: string;
  preheader: string;
  body: EmailBody;
}) {
  const html = shell({ title: opts.subject, preheader: opts.preheader, body: opts.body });
  const text = [
    opts.body.heading,
    "",
    ...opts.body.paragraphs.map((p) => p.replace(/<[^>]+>/g, "")),
    ...(opts.body.facts ?? []).map(([k, v]) => `• ${k}: ${v.replace(/<[^>]+>/g, "")}`),
    opts.body.cta ? `\n${opts.body.cta.label}: ${opts.body.cta.url}` : "",
    opts.body.note ? `\nNote: ${opts.body.note.replace(/<[^>]+>/g, "")}` : "",
  ]
    .join("\n")
    .trim();
  return { html, text, subject: opts.subject, kind: opts.kind };
}

/* ----------------------------------------------------------------- sending */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  kind: string;
  attachments?: { filename: string; path: string }[];
}

/**
 * Send an email. Uses SMTP when configured, otherwise records the message in
 * the outbox (`/admin/emails`) so the flow is fully testable without a mail
 * server.
 */
export async function sendEmail(input: SendEmailInput): Promise<EmailLog> {
  const transport = getTransporter();
  let status: EmailLog["status"] = "outbox";
  let error: string | null = null;

  if (transport) {
    try {
      const attachments = (input.attachments ?? [])
        .map((a) => ({ ...a, path: path.join(UPLOAD_DIR, a.path) }))
        .filter((a) => fs.existsSync(a.path));
      await transport.sendMail({
        from: fromAddress(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments,
      });
      status = "sent";
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error("[email] SMTP send failed:", error);
    }
  }

  const log: EmailLog = {
    id: uid("mail"),
    to: input.to,
    from: fromAddress(),
    subject: input.subject,
    text: input.text,
    html: input.html,
    kind: input.kind,
    attachments: (input.attachments ?? []).map((a) => a.filename),
    status,
    error,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const data = db();
  data.emails.unshift(log);
  if (data.emails.length > 300) data.emails.length = 300;
  persist("emails");
  return log;
}

export function emailBaseUrl() {
  return process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}
