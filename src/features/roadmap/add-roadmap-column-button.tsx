"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ProjectRecord } from "@/features/hierarchy/types";
import { useCreateRoadmapColumn } from "./use-roadmap-mutations";

interface AddRoadmapColumnButtonProps {
  userId: string;
  projects: ProjectRecord[];
  sortOrder: number;
}

/**
 * ロードマップに列を追加するボタン。既存Projectを選ぶと、そのProject名で
 * 初期化された列が作られる（列ラベルは以後独立して自由編集できる、docs/spec.md §2.6）。
 */
export function AddRoadmapColumnButton({ userId, projects, sortOrder }: AddRoadmapColumnButtonProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const createColumn = useCreateRoadmapColumn();

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? projects.filter((p) => p.name.toLowerCase().includes(trimmed))
    : projects;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" title="列を追加（Projectを選択）">
          <PlusIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="flex flex-col gap-2">
          <Input
            autoFocus
            value={query}
            placeholder="Projectを検索"
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-56 overflow-y-auto">
            {projects.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">Projectがまだありません。</p>
            ) : filtered.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">見つかりませんでした。</p>
            ) : (
              filtered.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    createColumn.mutate({
                      userId,
                      projectId: project.id,
                      label: project.name,
                      sortOrder,
                    });
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {project.color && (
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                  )}
                  <span className="truncate">{project.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
