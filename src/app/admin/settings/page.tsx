import type { Metadata } from "next";
import { db } from "@/lib/store";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const metadata: Metadata = {
  title: "Studio settings",
};

const CURRENCIES = ["USD", "GHS", "NGN", "KES", "UGX", "ZAR", "TZS", "EUR", "GBP"];

export default function AdminSettingsPage() {
  const settings = db().settings;

  return (
    <SettingsForm
      settings={{
        producerName: settings.producerName,
        producerTagline: settings.producerTagline,
        producerBio: settings.producerBio,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        whatsapp: settings.whatsapp,
        location: settings.location,
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        momoAccounts: settings.momoAccounts,
        bankAccount: settings.bankAccount,
        paymentInstructions: settings.paymentInstructions,
        deliveryNote: settings.deliveryNote,
        socials: settings.socials,
      }}
      currencies={CURRENCIES}
    />
  );
}
