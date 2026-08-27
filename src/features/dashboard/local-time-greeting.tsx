"use client";

import { useSyncExternalStore } from "react";

const GREETING_REFRESH_INTERVAL_MS = 60_000;

export function getGreetingForHour(hour: number) {
  if (hour >= 5 && hour < 11) return "Selamat pagi";
  if (hour >= 11 && hour < 15) return "Selamat siang";
  if (hour >= 15 && hour < 18) return "Selamat sore";
  return "Selamat malam";
}

function getLocalGreeting() {
  return getGreetingForHour(new Date().getHours());
}

function getServerGreeting() {
  return "Selamat pagi";
}

function subscribeToLocalTime(onTimeChange: () => void) {
  const intervalId = window.setInterval(onTimeChange, GREETING_REFRESH_INTERVAL_MS);
  return () => window.clearInterval(intervalId);
}

export function LocalTimeGreeting({ name }: { name: string }) {
  const greeting = useSyncExternalStore(
    subscribeToLocalTime,
    getLocalGreeting,
    getServerGreeting,
  );

  return <h1>{greeting}, {name}</h1>;
}
