"use client";

import { useCallback, useEffect, useRef } from "react";

const ALERT_INTERVAL_MS = 1_200;
const ALERT_FREQUENCY_HZ = 880;

type AudioWindow = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

function getAudioContextConstructor() {
  if (typeof window === "undefined") return undefined;
  return window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
}

export function useTimerAlert(active: boolean) {
  const contextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const oscillatorsRef = useRef(new Set<OscillatorNode>());

  const arm = useCallback(() => {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) return;

    contextRef.current ??= new AudioContextConstructor();
    if (contextRef.current.state === "suspended") {
      void contextRef.current.resume().catch(() => undefined);
    }
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    for (const oscillator of oscillatorsRef.current) {
      try {
        oscillator.stop();
      } catch {
        // An oscillator may already have reached its scheduled stop time.
      }
    }
    oscillatorsRef.current.clear();
  }, []);

  const playPattern = useCallback(() => {
    const context = contextRef.current;
    if (!context || context.state === "closed") return;

    for (const delaySeconds of [0, 0.28]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const startsAt = context.currentTime + delaySeconds;

      oscillator.type = "sine";
      oscillator.frequency.value = ALERT_FREQUENCY_HZ;
      gain.gain.setValueAtTime(0.0001, startsAt);
      gain.gain.linearRampToValueAtTime(0.18, startsAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + 0.2);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillatorsRef.current.add(oscillator);
      oscillator.addEventListener?.(
        "ended",
        () => oscillatorsRef.current.delete(oscillator),
        { once: true },
      );
      oscillator.start(startsAt);
      oscillator.stop(startsAt + 0.21);
    }
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }

    arm();
    const context = contextRef.current;
    if (!context) return;

    let cancelled = false;
    const startAlert = async () => {
      if (context.state === "suspended") {
        await context.resume().catch(() => undefined);
      }
      if (cancelled || context.state !== "running") return;

      playPattern();
      intervalRef.current = window.setInterval(playPattern, ALERT_INTERVAL_MS);
    };

    void startAlert();
    return () => {
      cancelled = true;
      stop();
    };
  }, [active, arm, playPattern, stop]);

  useEffect(
    () => () => {
      stop();
      const context = contextRef.current;
      contextRef.current = null;
      if (context && context.state !== "closed") {
        void context.close().catch(() => undefined);
      }
    },
    [stop],
  );

  return arm;
}
