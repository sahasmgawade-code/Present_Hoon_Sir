import { useState, useCallback } from 'react';

const STORAGE_KEY = 'phsams_selected_batch_id';

// Persists the selected batch across reloads and tabs via localStorage.
export function useSelectedBatch() {
  const [batchId, setBatchIdState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });

  const setBatchId = useCallback((id) => {
    setBatchIdState(id);
    if (id === null || id === undefined) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
  }, []);

  return [batchId, setBatchId];
}