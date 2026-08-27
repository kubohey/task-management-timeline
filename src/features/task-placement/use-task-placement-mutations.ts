"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

function useInvalidatePlacements() {
  const queryClient = useQueryClient();
  return (phaseId: string) =>
    void queryClient.invalidateQueries({ queryKey: ["taskPlacements", phaseId] });
}

export function useCreatePlacement() {
  const invalidate = useInvalidatePlacements();
  return useMutation({
    mutationFn: (vars: { sourceRowId: string; date: string; phaseId: string }) =>
      api.insertTaskPlacement(vars),
    onSuccess: (_data, vars) => invalidate(vars.phaseId),
  });
}

export function useDeletePlacement() {
  const invalidate = useInvalidatePlacements();
  return useMutation({
    mutationFn: (vars: { id: string; phaseId: string }) => api.deleteTaskPlacement(vars.id),
    onSuccess: (_data, vars) => invalidate(vars.phaseId),
  });
}
