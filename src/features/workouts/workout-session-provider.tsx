"use client";

import { createContext, useContext, useState } from "react";
import { useStore } from "zustand";
import type { ExercisePackage } from "./workout.types";
import {
  createWorkoutSessionStore,
  type WorkoutSessionStore,
} from "./workout-session-store";

type WorkoutSessionStoreApi = ReturnType<typeof createWorkoutSessionStore>;

const WorkoutSessionContext = createContext<WorkoutSessionStoreApi | null>(null);

export function WorkoutSessionProvider({
  workoutPackage,
  children,
}: {
  workoutPackage: ExercisePackage;
  children: React.ReactNode;
}) {
  const [store] = useState(() => createWorkoutSessionStore(workoutPackage));

  return (
    <WorkoutSessionContext.Provider value={store}>
      {children}
    </WorkoutSessionContext.Provider>
  );
}

export function useWorkoutSession<T>(
  selector: (store: WorkoutSessionStore) => T,
): T {
  const store = useContext(WorkoutSessionContext);
  if (!store) {
    throw new Error(
      "useWorkoutSession must be used within WorkoutSessionProvider",
    );
  }

  return useStore(store, selector);
}
