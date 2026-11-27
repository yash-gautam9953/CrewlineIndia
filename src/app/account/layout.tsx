import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/appwrite/session";
import { StudentSidebar } from "@/components/student/student-sidebar";

export const metadata: Metadata = {
  title: "My Account | Crewline",
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) {
    redirect("/login?next=%2Faccount");
  }

  return (
    <div className="flex min-h-[calc(100vh-72px)] flex-col bg-[#F7F9FC] md:min-h-[calc(100vh-88px)] md:flex-row">
      <StudentSidebar
        studentName={session.user.name}
        studentEmail={session.user.email}
      />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
