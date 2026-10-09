import "server-only";
import { emailBaseUrl, renderEmail, sendEmail } from "./email";
import { formatDate, formatMoney } from "./format";
import {
  db,
  sessionServiceLabel,
  type Beat,
  type License,
  type Message,
  type Order,
  type Payment,
  type SessionBooking,
  type User,
} from "./store";
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

/* ---------------------------------------------------------------- sessions */

export async function notifySessionBooked(booking: SessionBooking) {
  const s = db().settings;
  const price = formatMoney(booking.priceCents, booking.currency, s.currencySymbol);
  const deposit = formatMoney(booking.depositCents, booking.currency, s.currencySymbol);
  const balance = formatMoney(booking.balanceCents, booking.currency, s.currencySymbol);
  const { html, text, subject, kind } = renderEmail({
    kind: "SESSION_BOOKED",
    subject: `Session booked — ${sessionServiceLabel(booking.service)} on ${formatDate(booking.sessionDate)} (${booking.code})`,
    preheader: `Pay your ${s.sessions.depositPercent}% deposit to secure the slot.`,
    body: {
      heading: `You're booked in, ${escape(booking.userName.split(" ")[0])} 🎙️`,
      paragraphs: [
        `Your <strong>${sessionServiceLabel(booking.service)}</strong> session is reserved for <strong>${formatDate(booking.sessionDate)}</strong> at <strong>${booking.sessionTime}</strong>.`,
        `To secure the slot, pay a <strong>${deposit}</strong> deposit (${s.sessions.depositPercent}% of the ${price} session). The remaining <strong>${balance}</strong> is due before your session.`,
      ],
      facts: [
        ["Booking", booking.code],
        ["Service", sessionServiceLabel(booking.service)],
        ["Date", `${formatDate(booking.sessionDate)} · ${booking.sessionTime}`],
        ["Session price", price],
        ["Deposit due now", deposit],
        ["Balance", balance],
      ],
      cta: { label: "Pay the deposit", url: `${emailBaseUrl()}/bookings/${booking.id}` },
      note: s.sessions.note,
    },
  });
  return sendEmail({ to: booking.userEmail, subject, html, text, kind });
}

export async function notifySessionPaymentInstructions(booking: SessionBooking, payment: Payment) {
  const s = db().settings;
  const amount = formatMoney(payment.amountCents, payment.currency, s.currencySymbol);
  const isMomo = payment.method === "MOBILE_MONEY";
  const what = payment.purpose === "SESSION_BALANCE" ? "balance" : "deposit";

  const steps = isMomo
    ? [
        `Dial your mobile money menu and choose <strong>Send Money</strong>.`,
        `Send <strong>${amount}</strong> to <strong>${escape(payment.provider || "the producer's number")}</strong>${
          payment.phone ? ` — <strong>${escape(payment.phone)}</strong>` : ""
        }.`,
        `Use <strong>${booking.code}</strong> as the reference / payment note.`,
        "Approve the prompt with your PIN. You'll get an SMS confirmation.",
      ]
    : [
        `Transfer <strong>${amount}</strong> to the account below.`,
        `Bank: <strong>${escape(s.bankAccount.bankName)}</strong> — Account name: <strong>${escape(s.bankAccount.accountName)}</strong>.`,
        `Account number: <strong>${escape(s.bankAccount.accountNumber)}</strong>${s.bankAccount.swift ? ` · SWIFT: ${escape(s.bankAccount.swift)}` : ""}.`,
        `Use <strong>${booking.code}</strong> as the transfer reference so we can match your payment.`,
      ];

  const { html, text, subject, kind } = renderEmail({
    kind: "SESSION_PAYMENT_INSTRUCTIONS",
    subject: `Pay your ${what} for ${booking.code} — ${sessionServiceLabel(booking.service)} session`,
    preheader: isMomo ? "Send the amount by mobile money to secure your session." : "Bank transfer details for your session.",
    body: {
      heading: isMomo ? "Pay with mobile money 📲" : "Pay by bank transfer 🏦",
      paragraphs: [...steps, s.paymentInstructions],
      facts: [
        ["Booking", booking.code],
        ["Service", sessionServiceLabel(booking.service)],
        ["Session date", `${formatDate(booking.sessionDate)} · ${booking.sessionTime}`],
        ["Amount due", `${amount} (${what})`],
        ["Status", "Awaiting payment confirmation"],
      ],
      cta: { label: "View booking status", url: `${emailBaseUrl()}/bookings/${booking.id}` },
      note: "The studio confirms payments manually — usually within minutes. Your slot is secured the moment the deposit clears.",
    },
  });
  return sendEmail({ to: booking.userEmail, subject, html, text, kind });
}

export async function notifyAdminNewBooking(booking: SessionBooking, payment: Payment | null) {
  const s = db().settings;
  const amount = formatMoney(payment ? payment.amountCents : booking.depositCents, booking.currency, s.currencySymbol);
  const { html, text, subject, kind } = renderEmail({
    kind: "ADMIN_NEW_BOOKING",
    subject: `🎙️ New booking ${booking.code} — ${sessionServiceLabel(booking.service)} on ${formatDate(booking.sessionDate)}`,
    preheader: `${booking.userName} booked a ${sessionServiceLabel(booking.service)} session.`,
    body: {
      heading: "New session booking",
      paragraphs: [
        `<strong>${escape(booking.userName)}</strong> (${escape(booking.userEmail)}) booked a <strong>${sessionServiceLabel(booking.service)}</strong> session for <strong>${formatDate(booking.sessionDate)}</strong> at <strong>${booking.sessionTime}</strong>.`,
        payment
          ? `They submitted a <strong>${payment.method === "MOBILE_MONEY" ? `mobile money${payment.provider ? ` (${escape(payment.provider)})` : ""}` : "bank transfer"}</strong> payment of <strong>${amount}</strong>${
              payment.phone ? ` from ${escape(payment.phone)}` : ""
            }. Confirm it in the admin dashboard to secure the slot.`
          : `They still need to pay the <strong>${amount}</strong> deposit to secure the slot.`,
        booking.note ? `Artist's note: "${escape(booking.note)}"` : "",
      ].filter(Boolean),
      facts: [
        ["Booking", booking.code],
        ["Service", sessionServiceLabel(booking.service)],
        ["Session price", formatMoney(booking.priceCents, booking.currency, s.currencySymbol)],
        ["Amount", amount],
        ["Payment", payment ? payment.status : "not started"],
        ["Reference", payment?.reference || booking.reference || "—"],
      ],
      cta: { label: "Open session bookings", url: `${emailBaseUrl()}/admin/bookings` },
    },
  });
  return sendEmail({ to: s.contactEmail, subject, html, text, kind });
}

export async function notifySessionDepositPaid(booking: SessionBooking) {
  const s = db().settings;
  const balance = formatMoney(booking.balanceCents, booking.currency, s.currencySymbol);
  const { html, text, subject, kind } = renderEmail({
    kind: "SESSION_DEPOSIT_PAID",
    subject: `Deposit received — your ${sessionServiceLabel(booking.service)} session is secured ✅ (${booking.code})`,
    preheader: "Your slot is locked in. The balance is due before your session.",
    body: {
      heading: "Deposit confirmed — you're on the calendar 🎉",
      paragraphs: [
        `Thanks, ${escape(booking.userName.split(" ")[0])}! Your deposit for the <strong>${sessionServiceLabel(booking.service)}</strong> session on <strong>${formatDate(booking.sessionDate)}</strong> at <strong>${booking.sessionTime}</strong> has cleared.`,
        `Your slot is now secured. The remaining <strong>${balance}</strong> is due before your session — pay it any time from your booking page.`,
      ],
      facts: [
        ["Booking", booking.code],
        ["Service", sessionServiceLabel(booking.service)],
        ["Date", `${formatDate(booking.sessionDate)} · ${booking.sessionTime}`],
        ["Balance due", balance],
      ],
      cta: { label: "Pay the balance", url: `${emailBaseUrl()}/bookings/${booking.id}` },
      note: "Bring your reference tracks and any stems if you're sending them ahead of time.",
    },
  });
  return sendEmail({ to: booking.userEmail, subject, html, text, kind });
}

export async function notifySessionPaid(booking: SessionBooking) {
  const s = db().settings;
  const { html, text, subject, kind } = renderEmail({
    kind: "SESSION_PAID",
    subject: `Fully paid — see you at the studio 🎶 (${booking.code})`,
    preheader: `${sessionServiceLabel(booking.service)} session on ${formatDate(booking.sessionDate)} at ${booking.sessionTime}.`,
    body: {
      heading: "You're fully paid — see you at the studio 🎶",
      paragraphs: [
        `That's everything, ${escape(booking.userName.split(" ")[0])}! Your <strong>${sessionServiceLabel(booking.service)}</strong> session is paid in full.`,
        `We'll see you on <strong>${formatDate(booking.sessionDate)}</strong> at <strong>${booking.sessionTime}</strong>. The studio address and contact number are on the contact page if you need them.`,
      ],
      facts: [
        ["Booking", booking.code],
        ["Service", sessionServiceLabel(booking.service)],
        ["Date", `${formatDate(booking.sessionDate)} · ${booking.sessionTime}`],
        ["Paid", formatMoney(booking.priceCents, booking.currency, s.currencySymbol)],
      ],
      cta: { label: "View my sessions", url: `${emailBaseUrl()}/account?tab=sessions` },
    },
  });
  return sendEmail({ to: booking.userEmail, subject, html, text, kind });
}

export async function notifySessionCancelled(booking: SessionBooking, reason: string) {
  const { html, text, subject, kind } = renderEmail({
    kind: "SESSION_CANCELLED",
    subject: `Booking ${booking.code} cancelled`,
    preheader: "Your session booking was cancelled.",
    body: {
      heading: "Booking cancelled",
      paragraphs: [
        `Your <strong>${sessionServiceLabel(booking.service)}</strong> session booking for ${formatDate(booking.sessionDate)} at ${booking.sessionTime} was cancelled. ${escape(reason)}`,
        "If you already paid a deposit, reply to this email and the studio will arrange a refund. You can book a new session any time.",
      ],
      cta: { label: "Book a new session", url: `${emailBaseUrl()}/book` },
    },
  });
  return sendEmail({ to: booking.userEmail, subject, html, text, kind });
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
