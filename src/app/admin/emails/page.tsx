import type { Metadata } from "next";
import { SMTP_CONFIGURED, fromAddress } from "@/lib/email";
import { db } from "@/lib/store";
import { timeAgo } from "@/lib/format";
import { EmailOutbox } from "@/components/admin/EmailOutbox";

export const metadata: Metadata = {
  title: "Email outbox",
};

export default function AdminEmailsPage() {
  const data = db();
  const emails = data.emails.map((e) => ({
    id: e.id,
    to: e.to,
    from: e.from,
    subject: e.subject,
    text: e.text,
    html: e.html,
    kind: e.kind,
    attachments: e.attachments,
    status: e.status,
    error: e.error,
    createdAt: e.createdAt,
    read: e.read,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Email outbox</h2>
        <p className="mt-1 text-xs text-muted">
          Every transactional email the site sends — order confirmations, payment instructions, beat
          deliveries and message replies.
        </p>
      </div>

      <div
        className={`card p-4 text-sm ${
          SMTP_CONFIGURED ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"
        }`}
      >
        {SMTP_CONFIGURED ? (
          <p className="text-emerald-200">
            <strong>SMTP is configured</strong> — emails are delivered from {fromAddress()} and archived
            here.
          </p>
        ) : (
          <div className="text-amber-200">
            <p>
              <strong>Development outbox.</strong> No SMTP credentials are configured, so every email is
              captured here instead of being sent. Add <code className="font-mono">SMTP_HOST</code>,{" "}
              <code className="font-mono">SMTP_USER</code> and <code className="font-mono">SMTP_PASS</code>{" "}
              to your environment (Gmail app password, Resend, Mailtrap, Brevo…) and deliveries start
              going out for real.
            </p>
          </div>
        )}
      </div>

      <EmailOutbox emails={emails} />
    </div>
  );
}
