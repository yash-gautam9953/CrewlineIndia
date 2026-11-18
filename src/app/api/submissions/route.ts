import { NextResponse } from "next/server";
import { ID, Permission, Query, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { z } from "zod";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { isRateLimited } from "@/lib/rate-limit";
import { studentCanAccessTask } from "@/lib/task-access";
import { listAdminUserIds } from "@/lib/authz";
import { createNotification } from "@/lib/notifications";

const httpsUrl = z.union([z.literal(""), z.url({ protocol: /^https$/ }).max(2048)]);
const schema = z.object({
  taskId: z.string().min(1).max(64),
  projectTitle: z.string().trim().min(2).max(180),
  projectDescription: z.string().trim().min(10).max(6000),
  repositoryUrl: httpsUrl.optional().default(""),
  liveUrl: httpsUrl.optional().default(""),
  explanation: z.string().trim().max(4000).optional().default(""),
}).refine((value) => value.repositoryUrl || value.liveUrl || value.explanation.length >= 20, "Add a repository, live URL, or explanation of your work.");

async function projectFiles(request: Request) {
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    const files = form.getAll("projectFiles").filter((item): item is File => item instanceof File && item.size > 0);
    return { values: { taskId: form.get("taskId"), projectTitle: form.get("projectTitle"), projectDescription: form.get("projectDescription"), repositoryUrl: form.get("repositoryUrl") ?? "", liveUrl: form.get("liveUrl") ?? "", explanation: form.get("explanation") ?? "" }, files };
  }
  const json = await request.json().catch(() => null);
  return { values: json, files: [] as File[] };
}

function validateUpload(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!("pdf zip png jpg jpeg txt".split(" ").includes(ext))) return false;
  if (ext === "pdf") return file.type === "application/pdf" && file.size >= 5;
  if (ext === "zip") return ["application/zip", "application/x-zip-compressed", "application/octet-stream"].includes(file.type) && file.size >= 4;
  if (["jpg", "jpeg"].includes(ext)) return ["image/jpeg", "image/jpg"].includes(file.type) && file.size >= 3;
  if (ext === "png") return file.type === "image/png" && file.size >= 8;
  return file.type === "text/plain" && file.size >= 1;
}

function hasValidSignature(file: File, bytes: Buffer) {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return bytes.subarray(0, 5).toString() === "%PDF-";
  if (ext === "zip") return bytes.subarray(0, 2).toString("hex") === "504b";
  if (ext === "png") return bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  if (["jpg", "jpeg"].includes(ext ?? "")) return bytes.subarray(0, 3).toString("hex") === "ffd8ff";
  return !bytes.includes(0);
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (isRateLimited(request, "task-submit", 15)) return NextResponse.json({ error: "Too many submissions. Wait a minute and try again." }, { status: 429 });
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Please sign in to submit your work." }, { status: 401 });
  const { values, files } = await projectFiles(request);
  const input = schema.safeParse(values);
  if (!input.success) return NextResponse.json({ error: "Add a project title, description, and at least one project link, file, or work summary." }, { status: 400 });
  if (files.length > 5 || files.some((file) => file.size > 25 * 1024 * 1024 || !validateUpload(file))) return NextResponse.json({ error: "Upload up to 5 valid PDF, ZIP, PNG, JPG, or TXT files, each no larger than 25 MB." }, { status: 400 });
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > 25 * 1024 * 1024) return NextResponse.json({ error: "The total project upload size must not exceed 25 MB." }, { status: 400 });
  const fileBuffers = await Promise.all(files.map(async (file) => Buffer.from(await file.arrayBuffer())));
  if (files.some((file, index) => !hasValidSignature(file, fileBuffers[index]))) return NextResponse.json({ error: "One or more uploaded files do not match their file extension." }, { status: 400 });

  const service = createPrivilegedAppwriteClient();
  const tasksTable = process.env.APPWRITE_TASKS_TABLE_ID;
  const submissionsTable = process.env.APPWRITE_SUBMISSIONS_TABLE_ID;
  const enrollmentTable = process.env.APPWRITE_ENROLLMENTS_TABLE_ID;
  const internshipTable = process.env.APPWRITE_INTERNSHIPS_TABLE_ID;
  const profilesTable = process.env.APPWRITE_STUDENT_PROFILES_TABLE_ID;
  const bucketId = process.env.APPWRITE_SUBMISSIONS_BUCKET_ID;
  if (!service || !tasksTable || !submissionsTable || !enrollmentTable || !internshipTable || !profilesTable || (files.length && !bucketId)) return NextResponse.json({ error: "Submission service or private file storage is not configured." }, { status: 503 });
  const uploadedIds: string[] = [];
  try {
    const task = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId: tasksTable, rowId: input.data.taskId }) as Record<string, unknown> & { $id: string };
    if (!task.isPublished) return NextResponse.json({ error: "This task is not open for submissions." }, { status: 404 });
    if (!await studentCanAccessTask(service.tablesDB, service.databaseId, { ...task, $id: task.$id }, session.user.$id)) return NextResponse.json({ error: "You are not enrolled or assigned to this task." }, { status: 403 });
    const [internship, profileRows] = await Promise.all([
      service.tablesDB.getRow({ databaseId: service.databaseId, tableId: internshipTable, rowId: String(task.internshipId) }),
      service.tablesDB.listRows({ databaseId: service.databaseId, tableId: profilesTable, queries: [Query.equal("authUserId", session.user.$id), Query.limit(1)] }),
    ]);
    const active = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: enrollmentTable, queries: [Query.equal("studentId", session.user.$id), Query.equal("internshipId", String(task.internshipId)), Query.limit(100)] });
    const enrollment = active.rows.find((row) => row.status === "active" || row.status === "completed");
    if (!enrollment) return NextResponse.json({ error: "An active or completed enrollment is required to submit this task." }, { status: 403 });

    const versions = await service.tablesDB.listRows({ databaseId: service.databaseId, tableId: submissionsTable, queries: [Query.equal("studentId", session.user.$id), Query.equal("taskId", task.$id), Query.orderDesc("version"), Query.limit(1)] });
    const previous = versions.rows[0] as (typeof versions.rows)[number] & Record<string, unknown> | undefined;
    if (previous && previous.status !== "revision_required") return NextResponse.json({ error: "This project already has a submission under review or a final decision. Resubmit only after a revision request." }, { status: 409 });
    const version = Number(previous?.version ?? 0) + 1;
    if (files.length && bucketId) {
      const storage = new Storage(service.client);
      for (let i = 0; i < files.length; i++) {
        const extension = files[i].name.split(".").pop()?.toLowerCase() ?? "txt";
        const upload = await storage.createFile({ bucketId, fileId: ID.unique(), file: InputFile.fromBuffer(fileBuffers[i], `submission-${session.user.$id}-${task.$id}-v${version}-${i + 1}.${extension}`), permissions: [Permission.read(Role.user(session.user.$id))] });
        uploadedIds.push(upload.$id);
      }
    }
    const enrollmentData = enrollment as typeof enrollment & Record<string, unknown>;
    const deadline = typeof enrollmentData.submissionDeadlineAt === "string" ? enrollmentData.submissionDeadlineAt : "";
    const submittedAt = new Date().toISOString();
    const submittedBusinessDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(submittedAt));
    const isLate = Boolean(deadline && submittedBusinessDate > deadline.slice(0, 10));
    let row;
    try {
      row = await service.tablesDB.createRow({
        databaseId: service.databaseId, tableId: submissionsTable, rowId: ID.unique(),
        data: { studentId: session.user.$id, studentName: String(profileRows.rows[0]?.fullName ?? session.user.name), studentEmail: session.user.email, internshipId: String(task.internshipId), domain: String((internship as Record<string, unknown>).domain ?? ""), enrollmentId: enrollment.$id, taskId: task.$id, version, projectTitle: input.data.projectTitle, projectDescription: input.data.projectDescription, repositoryUrl: input.data.repositoryUrl, liveUrl: input.data.liveUrl, explanation: input.data.explanation, fileIds: uploadedIds.join(","), fileNames: JSON.stringify(files.map((file, index) => ({ id: uploadedIds[index], name: file.name }))), status: "submitted", submittedAt, updatedAt: submittedAt, isLate },
        permissions: [Permission.read(Role.user(session.user.$id))],
      });
    } catch (error) {
      for (const fileId of uploadedIds) try { await new Storage(service.client).deleteFile({ bucketId: bucketId!, fileId }); } catch { /* best-effort cleanup */ }
      throw error;
    }
    await Promise.all(listAdminUserIds().map((adminId) => createNotification({ userId: adminId, eventKey: `project-submitted:${row.$id}:${adminId}`, title: "Project submission received", body: `A student submitted “${input.data.projectTitle}” for an internship task.`, type: "submission", targetUrl: "/admin/submissions" }).catch(() => undefined)));
    return NextResponse.json({ id: row.$id, isLate }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    return NextResponse.json({ error: code === 409 ? "A submission for this task already exists. Refresh and check its current status." : "Could not save your project submission." }, { status: code === 409 ? 409 : 500 });
  }
}
