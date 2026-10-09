import type { Metadata } from "next";
import { db } from "@/lib/store";
import { StudioSettingsForm } from "@/components/admin/StudioSettingsForm";

export const metadata: Metadata = {
  title: "Studio & bookings",
};

export default function AdminStudioPage() {
  const settings = db().settings;
  return (
    <StudioSettingsForm
      studio={settings.studio}
      services={settings.services}
      allowHalfPayments={settings.allowHalfPayments}
      currency={settings.currency}
    />
  );
}
