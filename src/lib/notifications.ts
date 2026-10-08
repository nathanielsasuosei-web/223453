import "server-only";
import { emailBaseUrl, renderEmail, sendEmail } from "./email";
import { formatMoney } from "./format";
import { db, type Beat, type License, type Message, type Order, type Payment, type User } from "./store";
import { publicUrl, safeFileName } from "./upload";

/* ------------------------------------------------------------------- user */

export async function notifyWelcome(user: User) {
  const { html, text, subject, kind } = renderEmail({
    kind: "WELCOME",
    subject: `Welcome to BeatForge, ${user.name.split(" ")[0]}! 🎧`,
    preheader: "Your artist account is ready — start browsing beats.",
    body: {
      heading: `You're in, ${user.name.split(" ")[0]} 🎶`,
      paragraphs: [
        "Your BeatForge artist account is live. You can now browse every beat, preview it, pick a license and check out in under a minute.",
        "Pay with <strong>mobile money</strong> or a <strong>bank transfer</strong> — the moment your payment is confirmed, the beat files land in your inbox.",
      ],
      cta: { label: "Browse the beat store", url: `${emailBaseUrl()}/beats` },
      note: "Keep this email: your login is the address you registered with.",
    },
  });
  return sendEmail({ to: user.email, subject, html, text, kind });
}

/* ------------------------------------------------------------------ orders */

export async function notifyOrderCreated(order: Order, beat: Beat, license: License) {
  const { html, text, subject, kind } = renderEmail({
    kind: "ORDER_CREATED",
    subject: `Order ${order.code} received — ${beat.title} (${license.name})`,
    preheader: "Choose mobile money or bank transfer to complete your order.",
    body: {
      heading: "Order received 🧾",
      paragraphs: [
        `Thanks for choosing <strong>${escape(beat.title)}</strong>. Your order is reserved for the next 24 hours while payment is completed.`,
        "Finish checkout to get instant email delivery of your files.",
      ],
      facts: [
        ["Order", order.code],
        ["Beat", escape(beat.title)],
        ["License", license.name],
        ["Amount", formatMoney(order.amountCents, order.currency, db().settings.currencySymbol)],
      ],
      cta: { label: "Complete payment", url: `${emailBaseUrl()}/checkout/${order.id}` },
    },
  });
  return sendEmail({ to: order.userEmail, subject, html, text, kind });
}

export async function notifyPaymentInstructions(order: Order, beat: Beat, license: License, payment: Payment) {
  const s = db().settings;
  const amount = formatMoney(order.amountCents, order.currency, s.currencySymbol);
  const isMomo = payment.method === "MOBILE_MONEY";

  const momoSteps = isMomo
    ? [
        `Dial your mobile money menu and choose <strong>Send Money</strong>.`,
        `Send <strong>${amount}</strong> to <strong>${escape(payment.provider || "the producer's number")}</strong>${
          payment.phone ? ` — <strong>${escape(payment.phone)}</strong>` : ""
        }.`,
        `Use <strong>${order.code}</strong> as the reference / payment note.`,
        "Approve the prompt with your PIN. You'll get an SMS confirmation.",
      ]
    : [
        `Transfer <strong>${amount}</strong> to the account below.`,
        `Bank: <strong>${escape(s.bankAccount.bankName)}</strong> — Account name: <strong>${escape(s.bankAccount.accountName)}</strong>.`,
        `Account number: <strong>${escape(s.bankAccount.accountNumber)}</strong>${s.bankAccount.swift ? ` · SWIFT: ${escape(s.bankAccount.swift)}` : ""}.`,
        `Use <strong>${order.code}</strong> as the transfer reference so we can match your payment.`,
      ];

  const { html, text, subject, kind } = renderEmail({
    kind: "PAYMENT_INSTRUCTIONS",
    subject: `Payment instructions for ${order.code} — ${beat.title}`,
    preheader: isMomo ? "Send the amount by mobile money to release your files." : "Bank transfer details for your order.",
    body: {
      heading: isMomo ? "Pay with mobile money 📲" : "Pay by bank transfer 🏦",
      paragraphs: [
        ...momoSteps,
        s.paymentInstructions,
      ],
      facts: [
        ["Order", order.code],
        ["Beat", escape(beat.title)],
        ["License", license.name],
        ["Amount due", amount],
        ["Status", "Awaiting payment confirmation"],
      ],
      cta: { label: "View checkout status", url: `${emailBaseUrl()}/checkout/${order.id}` },
      note: "Once your payment is confirmed (usually within minutes) we email the beat files and your private download link automatically.",
    },
  });
  return sendEmail({ to: order.userEmail, subject, html, text, kind });
}

export async function notifyAdminNewOrder(order: Order, beat: Beat, payment: Payment | null) {
  const s = db().settings;
  const amount = formatMoney(order.amountCents, order.currency, s.currencySymbol);
  const { html, text, subject, kind } = renderEmail({
    kind: "ADMIN_NEW_ORDER",
    subject: `💰 New order ${order.code} — ${amount} (${payment ? payment.method.replace("_", " ") : "pending"})`,
    preheader: `${order.userName} ordered ${beat.title}.`,
    body: {
      heading: "New order to confirm",
      paragraphs: [
        `<strong>${escape(order.userName)}</strong> (${escape(order.userEmail)}) ordered <strong>${escape(beat.title)}</strong> on the ${licenseName(order.licenseId)} license.`,
        payment
          ? `They selected <strong>${payment.method === "MOBILE_MONEY" ? `mobile money${payment.provider ? ` (${escape(payment.provider)})` : ""}` : "bank transfer"}</strong>${
              payment.phone ? ` from ${escape(payment.phone)}` : ""
            }. Confirm the payment in the admin dashboard to trigger instant email delivery.`
          : "No payment method has been submitted yet.",
      ],
      facts: [
        ["Order", order.code],
        ["Amount", amount],
        ["Payment", payment ? payment.status : "not started"],
        ["Reference", payment?.reference || order.reference || "—"],
      ],
      cta: { label: "Open admin dashboard", url: `${emailBaseUrl()}/admin/orders` },
    },
  });
  return sendEmail({ to: s.contactEmail, subject, html, text, kind });
}

export async function notifyBeatDelivered(
  order: Order,
  beat: Beat,
  license: License,
  downloadToken: string,
) {
  const s = db().settings;
  const files = beat.files
    .filter((f) => f.tier === "*" || f.tier === license.slug)
    .map((f) => ({
      filename: `${beat.slug}-${f.name}`.replace(/[^a-zA-Z0-9._-]+/g, "_"),
      path: f.path,
    }));

  const downloadUrl = `${emailBaseUrl()}/download/${downloadToken}`;
  const { html, text, subject, kind } = renderEmail({
    kind: "BEAT_DELIVERED",
    subject: `🎉 Your beat is ready — ${beat.title} (${license.name})`,
    preheader: "Files attached plus a permanent private download link.",
    body: {
      heading: "Payment confirmed — here are your files 🎉",
      paragraphs: [
        `Thanks for your purchase, ${escape(order.userName.split(" ")[0])}! <strong>${escape(beat.title)}</strong> (${escape(license.name)}) is attached to this email, and your private download page is live below.`,
        files.length
          ? "Attached files: " + files.map((f) => `<strong>${escape(f.filename)}</strong>`).join(", ") + "."
          : "Your download page lists every file included with this license.",
        s.deliveryNote,
      ],
      facts: [
        ["Order", order.code],
        ["Beat", escape(beat.title)],
        ["License", license.name],
        ["Paid", formatMoney(order.amountCents, order.currency, s.currencySymbol)],
      ],
      cta: { label: "Download your files", url: downloadUrl },
      note: "The download link never expires. If anything is missing, just reply to this email.",
    },
  });
  return sendEmail({
    to: order.userEmail,
    subject,
    html,
    text,
    kind,
    attachments: files.slice(0, 6),
  });
}

export async function notifyOrderCancelled(order: Order, beat: Beat, reason: string) {
  const { html, text, subject, kind } = renderEmail({
    kind: "ORDER_CANCELLED",
    subject: `Order ${order.code} cancelled`,
    preheader: "Your order was cancelled — no charge was made.",
    body: {
      heading: "Order cancelled",
      paragraphs: [
        `Your order for <strong>${escape(beat.title)}</strong> was cancelled. ${escape(reason)}`,
        "You can place a new order any time from the beat page.",
      ],
      cta: { label: "Back to the store", url: `${emailBaseUrl()}/beats` },
    },
  });
  return sendEmail({ to: order.userEmail, subject, html, text, kind });
}

/* ---------------------------------------------------------------- messages */

export async function notifyMessageReceived(message: Message) {
  const s = db().settings;
  const { html, text, subject, kind } = renderEmail({
    kind: "MESSAGE_RECEIVED",
    subject: `✉️ New message: ${message.subject}`,
    preheader: `From ${message.name} (${message.email})`,
    body: {
      heading: "New message from the website",
      paragraphs: [
        `<strong>${escape(message.name)}</strong> &lt;${escape(message.email)}&gt; wrote:`,
        `"${escape(message.body).replace(/\n/g, "<br />")}"`,
      ],
      facts: [
        ["Subject", escape(message.subject)],
        ["From", `${escape(message.name)} (${escape(message.email)})`],
      ],
      cta: { label: "Reply in admin", url: `${emailBaseUrl()}/admin/messages` },
    },
  });
  return sendEmail({ to: s.contactEmail, subject, html, text, kind });
}

export async function notifyMessageReply(message: Message, replyBody: string) {
  const s = db().settings;
  const { html, text, subject, kind } = renderEmail({
    kind: "MESSAGE_REPLY",
    subject: `Re: ${message.subject}`,
    preheader: `${s.producerName} replied to your message.`,
    body: {
      heading: "You got a reply 💬",
      paragraphs: [
        `Hi ${escape(message.name.split(" ")[0])}, here's the reply to your message about "${escape(message.subject)}":`,
        replyBody.replace(/\n/g, "<br />"),
        "— " + escape(s.producerName) + ", BeatForge",
      ],
      cta: { label: "Continue the conversation", url: `${emailBaseUrl()}/account` },
    },
  });
  return sendEmail({ to: message.email, subject, html, text, kind });
}

/* ------------------------------------------------------------------ helpers */

function licenseName(id: string) {
  return db().licenses.find((l) => l.id === id)?.name ?? "—";
}

function escape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export { safeFileName };
