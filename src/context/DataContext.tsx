import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadHealthData } from "../services/healthApi";
import type { HealthData } from "../types/health";

interface DataState {
  data: HealthData | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    loadHealthData()
      .then((value) => {
        if (active) setData(value);
      })
      .catch(() => {
        if (active) setError("Healthcare data could not be loaded. Check the local API and try again.");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const value = useMemo(
    () => ({ data, loading: !data && !error, error, retry: () => setAttempt((value) => value + 1) }),
    [data, error]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useHealthData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useHealthData must be used inside DataProvider");
  return context;
}
