import type { Metadata } from "next";
import { db } from "@/lib/store";
import { LicenseManager } from "@/components/admin/LicenseManager";

export const metadata: Metadata = {
  title: "Licenses",
};

export default function AdminLicensesPage() {
  const data = db();
  const licenses = [...data.licenses]
    .sort((a, b) => a.sort - b.sort)
    .map((l) => ({ ...l }));

  return <LicenseManager licenses={licenses} />;
}
