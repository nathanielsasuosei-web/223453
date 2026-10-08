import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthAside, AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your BeatForge artist account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/account";
  const current = await getCurrentUser();
  if (current) redirect(next);

  return (
    <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
      <AuthForm mode="login" next={next} serverError={params.error ?? ""} />
      <AuthAside />
    </div>
  );
}
