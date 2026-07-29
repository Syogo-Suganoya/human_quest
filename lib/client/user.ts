"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "human-quest-user";
// 同一タブ内の変更を通知するための独自イベント（storage イベントは他タブにしか飛ばない）
const CHANGE_EVENT = "human-quest-user-change";

export type StoredUser = { id: number; nickname: string };

function parse(raw: string | null): StoredUser | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  return parse(window.localStorage.getItem(STORAGE_KEY));
}

export function setStoredUser(user: StoredUser) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearStoredUser() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// useSyncExternalStore は getSnapshot が同じ状態に対して同じ参照を返すことを要求する。
// 毎回 JSON.parse すると新しいオブジェクトになり無限ループになるため、生文字列をキーにキャッシュする。
let cachedRaw: string | null = null;
let cachedUser: StoredUser | null = null;

function getSnapshot(): StoredUser | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUser = parse(raw);
  }
  return cachedUser;
}

function getServerSnapshot(): StoredUser | null {
  return null;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange); // 他タブでの変更
  window.addEventListener(CHANGE_EVENT, onStoreChange); // 同一タブでの変更
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
}

/**
 * localStorage 上のログインユーザーを購読する。
 * SSR時とハイドレーション完了までは null を返し、その後クライアントの値に切り替わる。
 */
export function useStoredUser(): StoredUser | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * ハイドレーションが完了したかを返す。
 * useStoredUser() の null は「未ログイン」と「まだ読めていない」の区別がつかないため、
 * ログイン必須画面のリダイレクト判定はこのフックと併用する。
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
