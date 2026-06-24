import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ verified }: { verified?: boolean }) {
  if (!verified) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
      <BadgeCheck className="h-3.5 w-3.5" />
      Verified
    </span>
  );
}
