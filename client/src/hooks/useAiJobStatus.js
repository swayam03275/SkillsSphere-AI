import { useCallback, useRef, useState } from "react";
import { pollAiJobUntilDone } from "../services/aiJobService";

/**
 * Polls an AI background job and exposes progress for UI.
 */
export const useAiJobStatus = () => {
  const [progress, setProgress] = useState({ percent: 0, stage: "queued" });
  const [isPolling, setIsPolling] = useState(false);
  const abortRef = useRef(false);

  const waitForJob = useCallback(async (jobId) => {
    abortRef.current = false;
    setIsPolling(true);
    setProgress({ percent: 0, stage: "queued" });

    try {
      const completed = await pollAiJobUntilDone(jobId, {
        onProgress: (p) => {
          if (!abortRef.current) setProgress(p);
        },
      });
      return completed;
    } finally {
      setIsPolling(false);
    }
  }, []);

  const cancelPolling = useCallback(() => {
    abortRef.current = true;
    setIsPolling(false);
  }, []);

  return { progress, isPolling, waitForJob, cancelPolling };
};
