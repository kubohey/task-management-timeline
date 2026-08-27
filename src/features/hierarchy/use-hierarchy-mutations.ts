"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.insertGroup,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: api.GroupPatch }) =>
      api.updateGroup(vars.id, vars.patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteGroup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.insertProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: api.ProjectPatch }) =>
      api.updateProject(vars.id, vars.patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useCreatePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.insertPhase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phases"] }),
  });
}

export function useUpdatePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: api.PhasePatch }) =>
      api.updatePhase(vars.id, vars.patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phases"] }),
  });
}

export function useDeletePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePhase(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phases"] }),
  });
}

export function useCreatePhaseStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.insertPhaseStatus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phase_statuses"] }),
  });
}

export function useUpdatePhaseStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; patch: api.PhaseStatusPatch }) =>
      api.updatePhaseStatus(vars.id, vars.patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["phase_statuses"] }),
  });
}

export function useDeletePhaseStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePhaseStatus(id),
    onSuccess: () => {
      // statusを削除するとphases.status_idはDB側でNULLになる（on delete set null）ため、
      // phasesのキャッシュも合わせて無効化する。
      queryClient.invalidateQueries({ queryKey: ["phase_statuses"] });
      queryClient.invalidateQueries({ queryKey: ["phases"] });
    },
  });
}
