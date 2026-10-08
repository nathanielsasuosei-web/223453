import { getCurrentUser } from "@/lib/auth";
import { Navbar } from "./Navbar";

export async function SiteHeader({ producerName }: { producerName: string }) {
  const current = await getCurrentUser();
  return (
    <Navbar
      producerName={producerName}
      user={
        current
          ? { name: current.name, email: current.email, role: current.role }
          : null
      }
    />
  );
}
