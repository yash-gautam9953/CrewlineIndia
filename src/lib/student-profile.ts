import "server-only";
import { ID, Permission, Query, Role } from "node-appwrite";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { requireTableId } from "@/lib/appwrite/resources";

export async function ensureStudentProfile(user: { $id: string; name: string; email: string }) {
  const service = createPrivilegedAppwriteClient();
  if (!service) throw new Error("Student profile storage is not configured.");
  const tableId = await requireTableId("studentProfiles");
  const matches = await service.tablesDB.listRows({
    databaseId: service.databaseId,
    tableId,
    queries: [Query.equal("authUserId", user.$id), Query.limit(1)],
  });
  if (matches.rows[0]) return matches.rows[0];
  return service.tablesDB.createRow({
    databaseId: service.databaseId,
    tableId,
    rowId: ID.unique(),
    data: { authUserId: user.$id, fullName: user.name, email: user.email, profileStatus: "active" },
    permissions: [Permission.read(Role.user(user.$id))],
  });
}
