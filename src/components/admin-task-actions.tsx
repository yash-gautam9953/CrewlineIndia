"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { readApiResponse } from "@/lib/http-client";
import { Button } from "@/components/ui/button";
import {
  alertErrorClass,
  alertSuccessClass,
  formInputClass,
  formLabelClass,
  formTextareaClass,
} from "@/components/ui/form-controls";

type Props = {
  taskId: string;
  title: string;
  instructions: string;
  sequence: number;
  dueAt?: string;
  maxScore?: number | null;
  isMandatory: boolean;
  isPublished: boolean;
};

export function AdminTaskActions({
  taskId,
  title,
  instructions,
  sequence,
  dueAt = "",
  maxScore = null,
  isMandatory,
  isPublished,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const submittingRef = useRef(false);

  async function togglePublish() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      await readApiResponse(response, "Could not update publish status.");
      setMessage(!isPublished ? "Task published." : "Task unpublished.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update task.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const rawDue = String(form.get("dueAt") ?? "").trim();
      const rawScore = String(form.get("maxScore") ?? "").trim();
      const response = await fetch(`/api/admin/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: String(form.get("title") ?? ""),
          instructions: String(form.get("instructions") ?? ""),
          sequence: Number(form.get("sequence")),
          dueAt: rawDue ? new Date(rawDue).toISOString() : "",
          maxScore: rawScore === "" ? "" : Number(rawScore),
          isMandatory: form.get("isMandatory") === "on",
          isPublished: form.get("isPublished") === "on",
        }),
      });
      await readApiResponse(response, "Could not save task changes.");
      setEditing(false);
      setMessage("Task updated.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save task changes.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  async function deleteTask() {
    if (submittingRef.current) return;
    if (!window.confirm("Delete this task? Tasks with existing student submissions cannot be deleted.")) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
      await readApiResponse(response, "Could not delete task.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete task.");
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setEditing(!editing)}>
          <Pencil size={13} aria-hidden="true" /> {editing ? "Cancel edit" : "Edit task"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={togglePublish}>
          {isPublished ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
          {isPublished ? "Unpublish" : "Publish"}
        </Button>
        <Button type="button" variant="destructive" size="sm" disabled={busy} onClick={deleteTask}>
          <Trash2 size={13} aria-hidden="true" /> Delete
        </Button>
      </div>

      {editing && (
        <form onSubmit={saveEdit} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#1C2940] sm:grid-cols-2">
          <label className={formLabelClass}>
            Title
            <input name="title" required minLength={3} maxLength={180} defaultValue={title} className={formInputClass} />
          </label>
          <label className={formLabelClass}>
            Order number
            <input name="sequence" type="number" min={1} max={500} required defaultValue={sequence} className={formInputClass} />
          </label>
          <label className={`${formLabelClass} sm:col-span-2`}>
            Instructions <span className="font-normal text-slate-400">(optional if PDF is attached)</span>
            <textarea name="instructions" maxLength={12000} rows={4} defaultValue={instructions} className={formTextareaClass} />
          </label>
          <label className={formLabelClass}>
            Deadline
            <input name="dueAt" type="datetime-local" defaultValue={dueAt ? dueAt.slice(0, 16) : ""} className={formInputClass} />
          </label>
          <label className={formLabelClass}>
            Max score
            <input name="maxScore" type="number" min={0} max={10000} defaultValue={maxScore ?? ""} className={formInputClass} />
          </label>
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input name="isMandatory" type="checkbox" defaultChecked={isMandatory} className="h-4 w-4 rounded" /> Required task
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input name="isPublished" type="checkbox" defaultChecked={isPublished} className="h-4 w-4 rounded" /> Published
            </label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" variant="primary" size="sm" loading={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      )}

      {message && <p role="status" className={alertSuccessClass}>{message}</p>}
      {error && <p role="alert" className={alertErrorClass}>{error}</p>}
    </div>
  );
}
