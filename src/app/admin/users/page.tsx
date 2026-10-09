import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/store";
import { UserManager } from "@/components/admin/UserManager";

export const metadata: Metadata = {
  title: "Accounts",
};

export default async function AdminUsersPage() {
  const current = await getCurrentUser();
  const data = db();
  const users = data.users
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
      orders: data.orders.filter((o) => o.userId === u.id).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return <UserManager users={users} currentUserId={current?.user.id ?? ""} />;
}
