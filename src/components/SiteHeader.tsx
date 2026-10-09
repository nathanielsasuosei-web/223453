import { getCurrentUser } from "@/lib/auth";
import { Navbar } from "./Navbar";

export async function SiteHeader({
  producerName,
  brandName,
}: {
  producerName: string;
  brandName?: string;
}) {
  const current = await getCurrentUser();
  return (
    <Navbar
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
