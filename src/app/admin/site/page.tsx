import type { Metadata } from "next";
import { db } from "@/lib/store";
import { SiteContentForm } from "@/components/admin/SiteContentForm";

export const metadata: Metadata = {
  title: "Website content",
};

export default function AdminSitePage() {
  return <SiteContentForm initial={db().settings.site} />;
}
