import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/authz";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata: Metadata = {
  title: "Admin Panel | Crewline",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminUser();
  if (!admin) {
    redirect("/login?next=%2Fadmin");
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] flex-col bg-[#F7F9FC] dark:bg-[#0B1220] md:min-h-[calc(100vh-88px)] md:flex-row">
      <AdminSidebar adminEmail={admin.email} />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
