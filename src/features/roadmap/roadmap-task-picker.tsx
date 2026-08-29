"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { PhaseRecord, ProjectRecord } from "@/features/hierarchy/types";
import { cn } from "@/lib/utils";
import type { RoadmapTaskSourceType } from "./types";

export interface RoadmapTaskSelection {
  sourceType: RoadmapTaskSourceType;
  sourceProjectId: string | null;
  sourcePhaseId: string | null;
  label: string;
}

interface PickerEntry {
  type: RoadmapTaskSourceType;
  id: string;
  label: string;
  projectId: string;
  phaseId: string | null;
  color: string | null;
}

interface RoadmapTaskPickerProps {
  projects: ProjectRecord[];
  phases: PhaseRecord[];
  /** この列に紐づくProjectのidがあれば、関連する項目を先頭に並べる。 */
  preferredProjectId?: string | null;
  onSelect: (selection: RoadmapTaskSelection) => void;
}

/**
 * 週セルへタスクを埋め込む際のUI。既存Project/PhaseのSearchable一覧に加え、
 * 直接テキストを書き込んで手動ブロックを作ることもできる
 * （docs/spec.md §2.6「週セルへの直接書き込み」）。
 * ロードマップの列追加（Projectのみ）とは異なり、こちらはPhaseも選べる。
 */
export function RoadmapTaskPicker({
  projects,
  phases,
  preferredProjectId,
  onSelect,
}: RoadmapTaskPickerProps) {
  const [query, setQuery] = useState("");
  const [manualText, setManualText] = useState("");

  const submitManual = () => {
    const trimmed = manualText.trim();
    if (!trimmed) {
      return;
    }
    onSelect({ sourceType: "manual", sourceProjectId: null, sourcePhaseId: null, label: trimmed });
    setManualText("");
  };

  const entries: PickerEntry[] = projects.flatMap((project) => [
    {
      type: "project" as const,
      id: project.id,
      label: project.name,
      projectId: project.id,
      phaseId: null,
      color: project.color,
    },
    ...phases
      .filter((phase) => phase.project_id === project.id)
      .map(
        (phase): PickerEntry => ({
          type: "phase",
          id: phase.id,
          label: phase.name,
          projectId: project.id,
          phaseId: phase.id,
          color: project.color,
        }),
      ),
  ]);

  if (preferredProjectId) {
    entries.sort((a, b) => {
      const aPref = a.projectId === preferredProjectId ? 0 : 1;
      const bPref = b.projectId === preferredProjectId ? 0 : 1;
      return aPref - bPref;
    });
  }

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? entries.filter((entry) => entry.label.toLowerCase().includes(trimmed))
    : entries;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          value={manualText}
          placeholder="Type to add directly"
          onChange={(e) => setManualText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submitManual();
            }
          }}
        />
        <Button type="button" size="sm" disabled={!manualText.trim()} onClick={submitManual}>
          Add
        </Button>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Separator className="flex-1" />
        or choose an existing one
        <Separator className="flex-1" />
      </div>
      <Input
        value={query}
        placeholder="Search projects / phases"
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="max-h-64 overflow-y-auto">
        {entries.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">No projects or phases yet.</p>
        ) : filtered.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">No matches found.</p>
        ) : (
          filtered.map((entry) => (
            <button
              key={`${entry.type}:${entry.id}`}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent",
                entry.type === "phase" && "pl-5 text-muted-foreground",
              )}
              onClick={() =>
                onSelect({
                  sourceType: entry.type,
                  sourceProjectId: entry.projectId,
                  sourcePhaseId: entry.phaseId,
                  label: entry.label,
                })
              }
            >
              {entry.color && (
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
              )}
              <span className="truncate">{entry.label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
