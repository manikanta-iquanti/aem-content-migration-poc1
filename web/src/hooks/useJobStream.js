import { useState, useCallback, useRef, useEffect } from "react";
import { startJob as apiStartJob } from "../api/client.js";

/**
 * @typedef {'idle' | 'running' | 'completed' | 'failed'} JobStatus
 */

export function useJobStream() {
  /** @type {[string[], React.Dispatch<React.SetStateAction<string[]>>]} */
  const [logs, setLogs] = useState([]);
  /** @type {[JobStatus, React.Dispatch<React.SetStateAction<JobStatus>>]} */
  const [status, setStatus] = useState("idle");
  const [step, setStep] = useState(null);
  const [exitCode, setExitCode] = useState(null);
  const [error, setError] = useState(null);
  const esRef = useRef(null);

  useEffect(
    () => () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    },
    []
  );

  const clear = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setLogs([]);
    setStep(null);
    setExitCode(null);
    setError(null);
    setStatus("idle");
  }, []);

  const run = useCallback(async (operationId, payload = {}) => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setLogs([]);
    setError(null);
    setExitCode(null);
    setStep(null);
    setStatus("running");

    let jobId;
    try {
      const res = await apiStartJob(operationId, payload);
      jobId = res.jobId;
    } catch (e) {
      setStatus("failed");
      setError(e instanceof Error ? e.message : String(e));
      return;
    }

    const es = new EventSource(`/api/jobs/${jobId}/stream`);
    esRef.current = es;

    es.addEventListener("log", (ev) => {
      try {
        const { line } = JSON.parse(ev.data);
        if (typeof line === "string") {
          setLogs((prev) => [...prev, line]);
        }
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("step", (ev) => {
      try {
        setStep(JSON.parse(ev.data));
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("status", (ev) => {
      try {
        const d = JSON.parse(ev.data);
        if (d.status === "running") setStatus("running");
      } catch {
        /* ignore */
      }
    });

    es.addEventListener("done", (ev) => {
      try {
        const d = JSON.parse(ev.data);
        setStatus(d.status === "completed" ? "completed" : "failed");
        setExitCode(typeof d.exitCode === "number" ? d.exitCode : null);
        if (d.error) setError(String(d.error));
      } catch {
        setStatus("failed");
        setError("Could not parse job result");
      }
      es.close();
      esRef.current = null;
    });

    es.onerror = () => {
      if (esRef.current === es) {
        setStatus((s) => (s === "running" ? "failed" : s));
        setError((prev) => prev || "Log stream disconnected");
        es.close();
        esRef.current = null;
      }
    };
  }, []);

  const busy = status === "running";

  return { logs, status, step, exitCode, error, busy, run, clear };
}
