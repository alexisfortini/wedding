import type { Guest } from "./mockDatabase";

export async function lookupGuest(details: { id: string } | { firstName: string; lastName: string }, signal?: AbortSignal): Promise<Guest | null> {
  const timeout = AbortSignal.timeout(25000);
  const response = await fetch("/api/guest-lookup", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(details), cache: "no-store",
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The invitation service is unavailable. Please retry.");
  return data.guest ?? null;
}
