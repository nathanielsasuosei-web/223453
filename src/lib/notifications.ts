import "server-only";
import { emailBaseUrl, renderEmail, sendEmail } from "./email";
import { formatMoney } from "./format";
import {
  db,
  type Beat,
  type Booking,
  type License,
  type Message,
  type Order,
  type Payment,
  type StudioService,
  type User,
} from "./store";
import { bookingSummary, labelTime, prettyDate } from "./studio";
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

/* ---------------------------------------------------------------- balances */

export async function notifyBalanceDue(order: Order, beat: Beat, license: License) {
  const s = db().settings;
  const symbol = s.currencySymbol;
  const balance = formatMoney(order.balanceCents, order.currency, symbol);
  const paid = formatMoney(order.depositCents, order.currency, symbol);

  const { html, text, subject, kind } = renderEmail({
    kind: "BALANCE_DUE",
    subject: `Deposit received — ${balance} balance on order ${order.code}`,
    preheader: "Your files are released as soon as the balance lands.",
    body: {
      heading: "Half down, half to go 💰",
      paragraphs: [
        `Thanks — we've got your <strong>${paid}</strong> deposit for <strong>${escape(beat.title)}</strong> (${escape(license.name)}).`,
        `The remaining <strong>${balance}</strong> is due before we release the files. Pay it from your checkout page using the same mobile money number or bank details${s.bankAccount.bankName ? ` (${escape(s.bankAccount.bankName)})` : ""}.`,
        s.paymentInstructions,
      ],
      facts: [
        ["Order", order.code],
        ["Beat", escape(beat.title)],
        ["Deposit paid", paid],
        ["Balance due", balance],
      ],
      cta: { label: `Pay the ${balance} balance`, url: `${emailBaseUrl()}/checkout/${order.id}` },
      note: "Files, license and download link are emailed the moment the balance is confirmed.",
    },
  });
  return sendEmail({ to: order.userEmail, subject, html, text, kind });
}

/* ---------------------------------------------------------------- bookings */

export async function notifyBookingRequested(booking: Booking, service: StudioService) {
  const s = db().settings;
  const symbol = s.currencySymbol;
  const deposit = formatMoney(booking.depositCents, booking.currency, symbol);
  const total = formatMoney(booking.totalCents, booking.currency, symbol);

  const { html, text, subject, kind } = renderEmail({
    kind: "BOOKING_REQUESTED",
    subject: `Booking ${booking.code} received — ${booking.date} at ${labelTime(booking.start)}`,
    preheader: `Pay the ${deposit} deposit to lock your slot.`,
    body: {
      heading: "Your slot is held 🎛️",
      paragraphs: [
        `We've pencilled in <strong>${escape(service.name)}</strong> on <strong>${prettyDate(booking.date)}</strong> at <strong>${labelTime(booking.start)}</strong> for ${booking.hours} hour${booking.hours === 1 ? "" : "s"}.`,
        `Pay the <strong>${deposit}</strong> deposit (${booking.depositPercent}% of ${total}) now and your session is confirmed. The balance of ${formatMoney(booking.balanceCents, booking.currency, symbol)} is payable at the studio before the session starts.`,
      ],
      facts: [
        ["Booking", booking.code],
        ["Service", escape(service.name)],
        ["When", `${prettyDate(booking.date)} · ${labelTime(booking.start)} · ${booking.hours} hr`],
        ["Deposit due", deposit],
        ["Balance at studio", formatMoney(booking.balanceCents, booking.currency, symbol)],
      ],
      cta: { label: `Pay the ${deposit} deposit`, url: `${emailBaseUrl()}/booking/${booking.id}` },
      note: s.studio.policy,
    },
  });
  return sendEmail({ to: booking.userEmail, subject, html, text, kind });
}

export async function notifyAdminNewBooking(booking: Booking) {
  const s = db().settings;
  const { html, text, subject, kind } = renderEmail({
    kind: "ADMIN_NEW_BOOKING",
    subject: `📅 New booking ${booking.code} — ${booking.serviceName}, ${prettyDate(booking.date)}`,
    preheader: `${booking.userName} requested studio time.`,
    body: {
      heading: "New studio booking",
      paragraphs: [
        `<strong>${escape(booking.userName)}</strong> (${escape(booking.userEmail)}${booking.userPhone ? ` · ${escape(booking.userPhone)}` : ""}) booked <strong>${escape(booking.serviceName)}</strong> for ${booking.hours} hour${booking.hours === 1 ? "" : "s"}.`,
        booking.notes ? `Notes: "${escape(booking.notes)}"` : "No notes left for the engineer.",
      ],
      facts: [
        ["Booking", booking.code],
        ["When", `${prettyDate(booking.date)} · ${labelTime(booking.start)}`],
        ["Total", formatMoney(booking.totalCents, booking.currency, s.currencySymbol)],
        ["Deposit", formatMoney(booking.depositCents, booking.currency, s.currencySymbol)],
      ],
      cta: { label: "Open bookings", url: `${emailBaseUrl()}/admin/bookings` },
    },
  });
  return sendEmail({ to: s.contactEmail, subject, html, text, kind });
}

export async function notifyBookingPaymentInstructions(booking: Booking, payment: Payment) {
  const s = db().settings;
  const amount = formatMoney(payment.amountCents, booking.currency, s.currencySymbol);
  const isMomo = payment.method === "MOBILE_MONEY";

  const steps = isMomo
    ? [
        `Dial your mobile money menu and choose <strong>Send Money</strong>.`,
        `Send <strong>${amount}</strong> to <strong>${escape(payment.provider || "the studio number")}</strong>${payment.phone ? ` — <strong>${escape(payment.phone)}</strong>` : ""}.`,
        `Use <strong>${booking.code}</strong> as the reference.`,
        "Approve the prompt with your PIN. Your slot is confirmed as soon as we match it.",
      ]
    : [
        `Transfer <strong>${amount}</strong> to <strong>${escape(s.bankAccount.accountName)}</strong>, ${escape(s.bankAccount.bankName)} — <strong>${escape(s.bankAccount.accountNumber)}</strong>.`,
        `Use <strong>${booking.code}</strong> as the transfer reference.`,
      ];

  const { html, text, subject, kind } = renderEmail({
    kind: "BOOKING_PAYMENT",
    subject: `Deposit instructions for ${booking.code} — ${amount}`,
    preheader: isMomo ? "Send the deposit by mobile money to lock your slot." : "Bank details for your session deposit.",
    body: {
      heading: isMomo ? "Pay your deposit 📲" : "Pay your deposit 🏦",
      paragraphs: [...steps, s.paymentInstructions],
      facts: [
        ["Booking", booking.code],
        ["Session", bookingSummary(booking.serviceName, booking.date, booking.start, booking.hours)],
        ["Amount due", amount],
        ["Status", "Awaiting payment confirmation"],
      ],
      cta: { label: "View booking status", url: `${emailBaseUrl()}/booking/${booking.id}` },
    },
  });
  return sendEmail({ to: booking.userEmail, subject, html, text, kind });
}

export async function notifyBookingConfirmed(booking: Booking) {
  const s = db().settings;
  const { html, text, subject, kind } = renderEmail({
    kind: "BOOKING_CONFIRMED",
    subject: `✅ Session confirmed — ${prettyDate(booking.date)} at ${labelTime(booking.start)}`,
    preheader: "Your deposit landed. See you at the studio.",
    body: {
      heading: "You're booked ✅",
      paragraphs: [
        `Your <strong>${escape(booking.serviceName)}</strong> session is locked in for <strong>${prettyDate(booking.date)}</strong> at <strong>${labelTime(booking.start)}</strong> (${booking.hours} hour${booking.hours === 1 ? "" : "s"}).`,
        `The balance of <strong>${formatMoney(booking.balanceCents, booking.currency, s.currencySymbol)}</strong> is payable at the studio before the session starts.`,
        s.studio.policy,
      ],
      facts: [
        ["Booking", booking.code],
        ["Service", escape(booking.serviceName)],
        ["When", `${prettyDate(booking.date)} · ${labelTime(booking.start)}`],
        ["Where", escape(s.studio.address || s.location)],
        ["Balance due", formatMoney(booking.balanceCents, booking.currency, s.currencySymbol)],
      ],
      cta: { label: "View your booking", url: `${emailBaseUrl()}/booking/${booking.id}` },
    },
  });
  return sendEmail({ to: booking.userEmail, subject, html, text, kind });
}

export async function notifyBookingBalancePaid(booking: Booking) {
  const s = db().settings;
  const { html, text, subject, kind } = renderEmail({
    kind: "BOOKING_BALANCE_PAID",
    subject: `Balance settled for ${booking.code}`,
    preheader: "Session paid in full.",
    body: {
      heading: "Balance received 🙌",
      paragraphs: [
        `The balance for your <strong>${escape(booking.serviceName)}</strong> session on ${prettyDate(booking.date)} is settled — nothing left to pay.`,
      ],
      facts: [
        ["Booking", booking.code],
        ["Total paid", formatMoney(booking.totalCents, booking.currency, s.currencySymbol)],
      ],
      cta: { label: "View your booking", url: `${emailBaseUrl()}/booking/${booking.id}` },
    },
  });
  return sendEmail({ to: booking.userEmail, subject, html, text, kind });
}

export async function notifyBookingCancelled(booking: Booking, reason: string) {
  const { html, text, subject, kind } = renderEmail({
    kind: "BOOKING_CANCELLED",
    subject: `Booking ${booking.code} cancelled`,
    preheader: "Your slot has been released.",
    body: {
      heading: "Booking cancelled",
      paragraphs: [
        `Your <strong>${escape(booking.serviceName)}</strong> session on ${prettyDate(booking.date)} at ${labelTime(booking.start)} was cancelled. ${escape(reason)}`,
        "You can book another slot any time — the calendar shows what's free.",
      ],
      cta: { label: "Book another slot", url: `${emailBaseUrl()}/studio` },
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
