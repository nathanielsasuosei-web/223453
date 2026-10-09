import { getCurrentUser } from "@/lib/auth";
import { GlassNavbar } from "./GlassNavbar";

export async function SiteHeader({
  producerName,
  brandName,
}: {
  producerName: string;
  brandName?: string;
}) {
  const current = await getCurrentUser();
  return (
    <GlassNavbar
      producerName={producerName}
      brandName={brandName}
      user={
        current
          ? { name: current.name, email: current.email, role: current.role }
          : null
      }
    />
  );
}
