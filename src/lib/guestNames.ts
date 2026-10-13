export function normalizeGuestName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'").replace(/[‐‑–—]/g, "-").replace(/\s+/g, " ").trim().toLowerCase();
}

const nicknameGroups = [
  ["frankie", "franklin", "frank"], ["zac", "zach", "zachary"],
  ["becky", "rebecca", "becca"], ["dan", "daniel"], ["matt", "matthew"],
  ["tom", "thomas"], ["tim", "timothy"], ["alex", "alexis", "alexander", "alexandra"],
  ["sam", "samuel", "samantha"],
];

export function matchGuestNames<T extends { first_name: string; last_name: string }>(rows: T[], first: string, last: string) {
  const firstName = normalizeGuestName(first);
  const lastName = normalizeGuestName(last);
  const family = rows.filter(row => normalizeGuestName(row.last_name) === lastName);
  const exact = family.filter(row => normalizeGuestName(row.first_name) === firstName);
  if (exact.length) return exact;
  const variants = nicknameGroups.find(group => group.includes(firstName)) ?? [firstName];
  return family.filter(row => variants.includes(normalizeGuestName(row.first_name)));
}
