"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";

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

  async function togglePublish() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update publish status.");
      setMessage(!isPublished ? "Task published." : "Task unpublished.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update task.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save task changes.");
      setEditing(false);
      setMessage("Task updated.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save task changes.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteTask() {
    if (!window.confirm("Delete this task? Tasks with existing student submissions cannot be deleted.")) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not delete task.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete task.");
    } finally {
      setBusy(false);
    }
  }

  const input = "focus-ring mt-1 min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-navy";

  return (
    <div className="mt-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setEditing(!editing)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <Pencil size={13} /> {editing ? "Cancel edit" : "Edit task"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={togglePublish}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
          {isPublished ? "Unpublish" : "Publish"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={deleteTask}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>

      {editing && (
        <form onSubmit={saveEdit} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-600">
            Title
            <input name="title" required minLength={3} maxLength={180} defaultValue={title} className={input} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Order number
            <input name="sequence" type="number" min={1} max={500} required defaultValue={sequence} className={input} />
          </label>
          <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
            Instructions <span className="font-normal text-slate-400">(optional if PDF is attached)</span>
            <textarea name="instructions" maxLength={12000} rows={4} defaultValue={instructions} className={`${input} h-auto py-2`} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Deadline
            <input name="dueAt" type="datetime-local" defaultValue={dueAt ? dueAt.slice(0, 16) : ""} className={input} />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Max score
            <input name="maxScore" type="number" min={0} max={10000} defaultValue={maxScore ?? ""} className={input} />
          </label>
          <div className="flex flex-wrap gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input name="isMandatory" type="checkbox" defaultChecked={isMandatory} /> Required task
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input name="isPublished" type="checkbox" defaultChecked={isPublished} /> Published
            </label>
          </div>
          <div className="sm:col-span-2">
            <button disabled={busy} className="admin-btn-primary rounded-lg bg-[#1769D2] px-4 py-2 text-xs font-semibold text-white hover:bg-[#123B70] disabled:opacity-60">
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      )}

      {message && <p role="status" className="text-xs font-semibold text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
