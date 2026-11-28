import { NextResponse } from "next/server";
import { ID, Permission, Role, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { getSessionUser } from "@/lib/appwrite/session";
import { createPrivilegedAppwriteClient } from "@/lib/appwrite/server";
import { getAppwriteResources } from "@/lib/appwrite/resources";
import { checkRateLimit } from "@/lib/rate-limit";
import { isTrustedOrigin } from "@/lib/security";

const maxProofSize = 10 * 1024 * 1024;
function validProof(file: File, bytes: Buffer) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return file.type === "application/pdf" && bytes.subarray(0, 5).toString() === "%PDF-";
  if (["jpg", "jpeg"].includes(extension ?? "")) return file.type === "image/jpeg" && bytes.subarray(0, 3).toString("hex") === "ffd8ff";
  if (extension === "png") return file.type === "image/png" && bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  return false;
}

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  if (!isTrustedOrigin(request)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  if ((await checkRateLimit(request, "payment-submit", 5)).limited) return NextResponse.json({ error: "Too many payment submissions. Try again shortly." }, { status: 429 });
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Sign in to submit payment details." }, { status: 401 });
  const form = await request.formData();
  const reference = String(form.get("transactionReference") ?? "").trim();
  const proof = form.get("proof");
  if (reference.length < 4 || reference.length > 180) return NextResponse.json({ error: "Enter the payment transaction reference." }, { status: 400 });
  if (proof !== null && !(proof instanceof File)) return NextResponse.json({ error: "Choose a valid proof file." }, { status: 400 });
  const proofFile = proof instanceof File && proof.size ? proof : null;
  if (proofFile && (proofFile.size > maxProofSize || proofFile.size < 8)) return NextResponse.json({ error: "Payment proof must be up to 10 MB." }, { status: 400 });
  const proofBytes = proofFile ? Buffer.from(await proofFile.arrayBuffer()) : null;
  if (proofFile && proofBytes && !validProof(proofFile, proofBytes)) return NextResponse.json({ error: "Payment proof must be a valid PDF, PNG, or JPG image." }, { status: 400 });
  const service = createPrivilegedAppwriteClient();
  const resources = service ? await getAppwriteResources().catch(() => null) : null;
  if (!service || !resources) return NextResponse.json({ error: "Payment service or proof storage is not configured." }, { status: 503 });
  const tableId = resources.tables.payments;
  const bucketId = resources.buckets.submissionsBucket;
  const { paymentId } = await params;
  let uploadedId = "";
  try {
    const row = await service.tablesDB.getRow({ databaseId: service.databaseId, tableId, rowId: paymentId }) as Record<string, unknown>;
    if (row.studentId !== session.user.$id) return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    if (!["pending", "rejected", "not_applicable"].includes(String(row.status))) return NextResponse.json({ error: "This payment record is not accepting a verification submission." }, { status: 409 });
    if (proofFile && proofBytes && bucketId) {
      const uploaded = await new Storage(service.client).createFile({ bucketId, fileId: ID.unique(), file: InputFile.fromBuffer(proofBytes, `payment-proof-${paymentId}.${proofFile.name.split(".").pop()}`), permissions: [Permission.read(Role.user(session.user.$id))] });
      uploadedId = uploaded.$id;
    }
    await service.tablesDB.updateRow({ databaseId: service.databaseId, tableId, rowId: paymentId, data: { status: "submitted", transactionReference: reference, proofFileId: uploadedId || row.proofFileId || null, verificationReason: null } });
    return NextResponse.json({ submitted: true });
  } catch {
    if (uploadedId && bucketId) try { await new Storage(service.client).deleteFile({ bucketId, fileId: uploadedId }); } catch { /* best-effort cleanup */ }
    return NextResponse.json({ error: "Could not submit payment proof." }, { status: 500 });
  }
}
