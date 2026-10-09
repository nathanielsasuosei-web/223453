import { bool, int, requireAdminApi, serverError, str } from "@/lib/api-guard";
import { db, persist } from "@/lib/store";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GHS: "GH₵",
  NGN: "₦",
  KES: "KSh",
  UGX: "USh",
  ZAR: "R",
  EUR: "€",
  GBP: "£",
  XOF: "CFA",
  XAF: "FCFA",
  TZS: "TSh",
};

/** Admin updates studio settings (producer info, payment lines, currency). */
export async function POST(request: Request) {
  const guard = await requireAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const body = await request.json();
    const settings = db().settings;

    const text = (key: keyof typeof settings, fallback: string) =>
      body[key] !== undefined ? str(body[key]) : fallback;

    settings.producerName = text("producerName", settings.producerName);
    settings.producerTagline = text("producerTagline", settings.producerTagline);
    settings.producerBio = text("producerBio", settings.producerBio);
    settings.contactEmail = text("contactEmail", settings.contactEmail);
    settings.contactPhone = text("contactPhone", settings.contactPhone);
    settings.whatsapp = text("whatsapp", settings.whatsapp);
    settings.location = text("location", settings.location);
    settings.paymentInstructions = text("paymentInstructions", settings.paymentInstructions);
    settings.deliveryNote = text("deliveryNote", settings.deliveryNote);

    if (body.currency) {
      const currency = str(body.currency).toUpperCase().slice(0, 3) || settings.currency;
      settings.currency = currency;
      settings.currencySymbol = CURRENCY_SYMBOLS[currency] ?? settings.currencySymbol;
    }
    if (body.currencySymbol) settings.currencySymbol = str(body.currencySymbol);

    if (Array.isArray(body.momoAccounts)) {
      settings.momoAccounts = body.momoAccounts
        .map((a: Record<string, unknown>) => ({
          provider: str(a?.provider),
          number: str(a?.number),
          name: str(a?.name) || "BeatForge Studio",
        }))
        .filter((a: { provider: string; number: string }) => a.provider && a.number);
    }

    if (body.bankAccount && typeof body.bankAccount === "object") {
      settings.bankAccount = {
        bankName: str(body.bankAccount.bankName) || settings.bankAccount.bankName,
        accountName: str(body.bankAccount.accountName) || settings.bankAccount.accountName,
        accountNumber: str(body.bankAccount.accountNumber) || settings.bankAccount.accountNumber,
        swift: str(body.bankAccount.swift),
        branch: str(body.bankAccount.branch),
      };
    }

    if (body.allowHalfPayments !== undefined) {
      settings.allowHalfPayments = Boolean(body.allowHalfPayments);
    }

    if (body.socials && typeof body.socials === "object") {
      settings.socials = {
        instagram: str(body.socials.instagram),
        youtube: str(body.socials.youtube),
        tiktok: str(body.socials.tiktok),
        spotify: str(body.socials.spotify),
        x: str(body.socials.x),
      };
    }


    persist("settings");
    return Response.json({ ok: true, settings });
  } catch (err) {
    return serverError(err, "admin update settings");
  }
}
