"use client";

import { usePathname } from "next/navigation";

const steps = [
  { href: "/onboarding/step-1", label: "Basics" },
  { href: "/onboarding/step-2", label: "Housing" },
  { href: "/onboarding/step-3", label: "Lifestyle" }
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeIndex = Math.max(
    steps.findIndex((step) => pathname.endsWith(step.href)),
    0
  );

  return (
    <div className="w-full rounded-2xl bg-white p-6 shadow-soft">
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.href} className="flex flex-1 items-center last:flex-none">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                  index <= activeIndex ? "bg-primary text-white" : "bg-background text-foreground/50"
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 ? (
                <div
                  className={`mx-3 h-1 flex-1 rounded-full ${
                    index < activeIndex ? "bg-primary" : "bg-background"
                  }`}
                />
              ) : null}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 text-center text-xs font-medium text-foreground/60">
          {steps.map((step) => (
            <span key={step.href}>{step.label}</span>
          ))}
        </div>
      </div>
      {children}
    </div>
  );
}
