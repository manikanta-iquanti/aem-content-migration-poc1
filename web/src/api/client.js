const API = "";

async function parseError(res) {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    if (j && j.error) return j.error;
  } catch {
    /* ignore */
  }
  return text || `Request failed (${res.status})`;
}

export async function fetchOperations() {
  const r = await fetch(`${API}/api/operations`);
  if (!r.ok) throw new Error(await parseError(r));
  return r.json();
}

export async function fetchConfig() {
  const r = await fetch(`${API}/api/config`);
  if (!r.ok) throw new Error(await parseError(r));
  return r.json();
}

export async function saveConfig(body) {
  const r = await fetch(`${API}/api/config`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json();
}

export async function startJob(operationId, payload = {}) {
  const r = await fetch(`${API}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operationId, payload }),
  });
  if (!r.ok) throw new Error(await parseError(r));
  return r.json();
}
