"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

function useInvalidateColumns() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["roadmapColumns"] });
}

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries({ queryKey: ["roadmapTasks"] });
}

export function useCreateRoadmapColumn() {
  const invalidate = useInvalidateColumns();
  return useMutation({ mutationFn: api.insertRoadmapColumn, onSuccess: () => invalidate() });
}

export function useUpdateRoadmapColumn() {
  const invalidate = useInvalidateColumns();
  return useMutation({
    mutationFn: (vars: { id: string; patch: api.RoadmapColumnPatch }) =>
      api.updateRoadmapColumn(vars.id, vars.patch),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteRoadmapColumn() {
  const invalidate = useInvalidateColumns();
  const invalidateTasks = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => api.deleteRoadmapColumn(id),
    onSuccess: () => {
      invalidate();
      // 列を削除するとDB側でroadmap_tasksもCASCADE削除されるため、あわせて無効化する。
      invalidateTasks();
    },
  });
}

export function useCreateRoadmapTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({ mutationFn: api.insertRoadmapTask, onSuccess: () => invalidate() });
}

export function useUpdateRoadmapTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (vars: { id: string; patch: api.RoadmapTaskPatch }) =>
      api.updateRoadmapTask(vars.id, vars.patch),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteRoadmapTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({ mutationFn: (id: string) => api.deleteRoadmapTask(id), onSuccess: () => invalidate() });
}
