import { redirect } from "next/navigation";

export default function AdminApplicationDetailRedirectPage() {
  redirect("/admin/enrollments");
}
