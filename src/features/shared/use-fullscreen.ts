"use client";

import { useEffect, type RefObject } from "react";
import { useUiStore } from "@/store/ui-store";

/**
 * ブラウザのFullscreen APIとui-storeのisFullscreenを同期する。
 * isFullscreenは実際のdocument.fullscreenElementを反映するだけの受け身の状態にし、
 * 全画面のリクエスト/解除自体は必ずクリックハンドラ内で同期的に行う
 * （Fullscreen APIはユーザー操作イベントのコールスタック内での呼び出しを要求するため、
 * useEffect経由の非同期リクエストだと失敗することがある）。
 * docs/spec.md §8 Phase7「全画面表示」
 */
export function useFullscreenSync(containerRef: RefObject<HTMLElement | null>) {
  const setFullscreen = useUiStore((s) => s.setFullscreen);

  useEffect(() => {
    const handleChange = () => {
      setFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, [setFullscreen, containerRef]);
}

/** 全画面表示ボタンのクリックハンドラから直接呼び出し、Fullscreen APIを同期的に要求/解除する。 */
export function toggleFullscreen(containerRef: RefObject<HTMLElement | null>) {
  const el = containerRef.current;
  if (!el) {
    return;
  }
  if (document.fullscreenElement === el) {
    document.exitFullscreen().catch(() => {});
  } else {
    el.requestFullscreen().catch(() => {});
  }
}
