"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { useStore } from "@/lib/store";
import { ImportError, downloadJson, exportToJson, parseImport } from "@/lib/transfer";
import { todayKey } from "@/lib/dates";
import { Card, SectionLabel } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { Switch } from "@/components/ui/Switch";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/PageSkeleton";

type Notice = { tone: "ok" | "error"; message: string } | null;

export default function SettingsPage() {
  const {
    ready,
    data,
    settings,
    updateSettings,
    replaceAll,
    resetAll,
    loadDemoData,
    clearDemoData,
  } = useStore();

  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirming, setConfirming] = useState<"reset" | "clear" | null>(null);

  if (!ready) return <PageSkeleton />;

  const handleExport = () => {
    downloadJson(`habits-${todayKey()}.json`, exportToJson(data));
    setNotice({ tone: "ok", message: "Exported. Keep that file somewhere safe." });
  };

  const handleImportFile = async (file: File) => {
    try {
      const imported = parseImport(await file.text());
      replaceAll(imported);
      setNotice({
        tone: "ok",
        message: `Imported ${imported.habits.length} habits and ${
          Object.keys(imported.completions).length
        } days of history.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof ImportError ? error.message : "Could not read that file.",
      });
    }
  };

  const habitCount = data.habits.length;
  const dayCount = Object.keys(data.completions).length;

  return (
    <div className="animate-rise space-y-7">
      <header>
        <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
          Preferences
        </p>
        <h1 className="mt-1 text-[34px] font-bold leading-none tracking-[-0.03em] md:text-[42px]">
          Settings
        </h1>
      </header>

      <Card className="divide-y divide-line">
        <Row label="Theme" hint="Light is the primary design; dark uses soft charcoal.">
          <Segmented
            ariaLabel="Theme"
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "System" },
            ]}
          />
        </Row>

        <Row label="Start week on" hint="Affects the month calendar and combined year grid.">
          <Segmented
            ariaLabel="Start week on"
            value={String(settings.weekStartsOn) as "0" | "1"}
            onChange={(value) => updateSettings({ weekStartsOn: value === "0" ? 0 : 1 })}
            options={[
              { value: "1", label: "Monday" },
              { value: "0", label: "Sunday" },
            ]}
          />
        </Row>

        <Row label="Year grid cell size" hint="Larger cells are easier to hover; smaller fits more on screen.">
          <Segmented
            ariaLabel="Year grid cell size"
            value={settings.cellSize}
            onChange={(cellSize) => updateSettings({ cellSize })}
            options={[
              { value: "sm", label: "Small" },
              { value: "md", label: "Medium" },
              { value: "lg", label: "Large" },
            ]}
          />
        </Row>

        <Row label="Show archived habits" hint="Include archived habits in the year view.">
          <Switch
            label="Show archived habits"
            checked={settings.showArchived}
            onChange={(showArchived) => updateSettings({ showArchived })}
          />
        </Row>
      </Card>

      <section className="space-y-3">
        <SectionLabel>Your data</SectionLabel>
        <Card className="space-y-4 p-5">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Everything lives in this browser&rsquo;s local storage — {habitCount}{" "}
            {habitCount === 1 ? "habit" : "habits"} across {dayCount}{" "}
            {dayCount === 1 ? "day" : "days"} of history. Export regularly so you have a backup.
          </p>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleExport}>
              <Download size={15} />
              Export JSON
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload size={15} />
              Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImportFile(file);
                event.target.value = "";
              }}
            />
          </div>

          {notice ? (
            <p
              role="status"
              className={[
                "animate-rise rounded-xl px-3 py-2 text-[12.5px]",
                notice.tone === "ok"
                  ? "bg-sunken text-ink-soft"
                  : "bg-[#E5484D]/10 text-[#D3383D] dark:text-[#FF9592]",
              ].join(" ")}
            >
              {notice.message}
            </p>
          ) : null}
        </Card>
      </section>

      <section className="space-y-3">
        <SectionLabel>Demo &amp; reset</SectionLabel>
        <Card className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold tracking-tight">Clear demo data</p>
              <p className="text-[12.5px] text-ink-muted">
                Wipes all completion history but keeps your habits.
              </p>
            </div>
            {confirming === "clear" ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    clearDemoData();
                    setConfirming(null);
                    setNotice({ tone: "ok", message: "History cleared." });
                  }}
                >
                  Clear history
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={() => setConfirming("clear")}>
                Clear
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold tracking-tight">Reload demo data</p>
              <p className="text-[12.5px] text-ink-muted">
                Replaces everything with the sample habits and 30 days of history.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                loadDemoData();
                setNotice({ tone: "ok", message: "Demo data loaded." });
              }}
            >
              Load demo
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold tracking-tight">Reset everything</p>
              <p className="text-[12.5px] text-ink-muted">
                Deletes all habits, history and settings. Export first.
              </p>
            </div>
            {confirming === "reset" ? (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    resetAll();
                    setConfirming(null);
                    setNotice({ tone: "ok", message: "Everything reset." });
                  }}
                >
                  Delete everything
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirming("reset")}>
                Reset
              </Button>
            )}
          </div>
        </Card>
      </section>

      <p className="pb-2 text-center text-[11.5px] text-ink-muted">
        Year · a habit tracker that stays on your device
      </p>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold tracking-tight">{label}</p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}
