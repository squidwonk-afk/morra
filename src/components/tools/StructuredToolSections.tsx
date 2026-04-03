"use client";

import { Card } from "@/components/ui/card";

const SECTION_LABELS: Record<string, string> = {
  section_overview: "SECTION 1 · Overview",
  section_executive: "SECTION 1 · Executive",
  section_opportunities: "SECTION 2 · Opportunities",
  section_action_plan: "SECTION 3 · Action plan",
  reasoning: "Reasoning",
  summary: "Summary",
};

function isSectionKey(k: string): boolean {
  return k.startsWith("section_") || k === "reasoning" || k === "summary";
}

export function StructuredToolSections({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(
    ([k, v]) => isSectionKey(k) && typeof v === "string" && String(v).trim()
  );

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {entries.map(([key, value]) => (
        <Card
          key={key}
          className="p-4 bg-[#0f0f0f] border-[#00FF94]/25 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[#00FF94] mb-2">
            {SECTION_LABELS[key] ?? key.replace(/_/g, " ")}
          </p>
          <div className="text-sm text-[#E0E0E0] whitespace-pre-wrap leading-relaxed">
            {String(value)}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function JsonKeyValueCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <Card className="p-4 bg-[#0f0f0f] border-[#00FF94]/15">
      <p className="text-xs text-[#707070] mb-1">{title}</p>
      <p className="text-sm text-[#E8E8E8] whitespace-pre-wrap">{value}</p>
    </Card>
  );
}
