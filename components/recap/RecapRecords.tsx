"use client";

import type { YearRecords } from "@/lib/stats";
import { formatShortDate } from "@/lib/dates";
import { Card, SectionLabel } from "@/components/ui/Card";

/** Personal records worth telling someone about — see computeYearRecords. */
export function RecapRecords({ records }: { records: YearRecords }) {
  if (records.habitBests.length === 0 && !records.busiestWeek) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionLabel>Personal records</SectionLabel>
        {records.busiestWeek ? (
          <p className="text-[12px] text-ink-muted">
            Busiest week: {records.busiestWeek.count} · week of{" "}
            {formatShortDate(records.busiestWeek.startDate)}
          </p>
        ) : null}
      </div>
      {records.habitBests.length > 0 ? (
        <Card className="divide-y divide-line overflow-hidden">
          {records.habitBests.map((record) => (
            <div key={record.subject} className="flex items-center gap-3 px-4 py-2.5">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ background: record.color }}
              />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium tracking-tight">
                {record.subject}
              </span>
              <span className="shrink-0 text-[12.5px] text-ink-muted">
                best month ·{" "}
                <span className="font-semibold text-ink-soft">{record.detail}</span>
              </span>
            </div>
          ))}
        </Card>
      ) : null}
    </section>
  );
}
