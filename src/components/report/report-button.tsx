"use client";

import { useState } from "react";
import { toast } from "sonner";

export function ReportButton({ targetId, targetType }: { targetId: string; targetType: "user" | "listing" }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!reason.trim()) return toast.error("Please provide a reason");
    const res = await fetch('/api/reports', { method: 'POST', body: JSON.stringify({ targetId, targetType, reason, details }), headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) return toast.error('Could not create report');
    toast.success('Report submitted');
    setOpen(false);
    setReason('');
    setDetails('');
  }

  return (
    <div>
      <button className="rounded-md bg-yellow-500 px-3 py-1 text-white" onClick={() => setOpen(true)}>Report</button>
      {open ? (
        <form onSubmit={submit} className="fixed left-0 top-0 z-50 flex h-full w-full items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="text-lg font-semibold">Report {targetType}</h3>
            <div className="mt-3">
              <label className="block text-sm font-medium">Reason</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2" />
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium">Details (optional)</label>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-md bg-gray-200 px-3 py-1" onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="rounded-md bg-primary px-3 py-1 text-white">Submit</button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export default ReportButton;
