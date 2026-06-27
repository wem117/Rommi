export function CompatibilityBar({ score }: { score: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[15px] font-medium text-[#9a6e56]">
        <span>Compatibility</span>
        <span className="text-[2rem] font-semibold leading-none text-[#0f8d00]">{score}%</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#efe9df]">
        <div className="h-full rounded-full bg-[#0f8d00]" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
