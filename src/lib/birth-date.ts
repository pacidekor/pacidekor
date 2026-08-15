/** Normalize optional birth date from form (YYYY-MM-DD). */
export function normalizeBirthDate(value?: string | null): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const date = new Date(`${raw}T12:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  const [y, m, d] = raw.split("-").map(Number);
  if (
    date.getFullYear() !== y ||
    date.getMonth() + 1 !== m ||
    date.getDate() !== d
  ) {
    return undefined;
  }
  return raw;
}

/** null = OK / empty; string = error message */
export function birthDateError(value?: string | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const normalized = normalizeBirthDate(raw);
  if (!normalized) return "Zadajte platný dátum narodenia.";

  const date = new Date(`${normalized}T12:00:00`);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  if (date > today) return "Dátum narodenia nemôže byť v budúcnosti.";

  const oldest = new Date(today);
  oldest.setFullYear(oldest.getFullYear() - 120);
  if (date < oldest) return "Skontrolujte dátum narodenia.";

  const youngest = new Date(today);
  youngest.setFullYear(youngest.getFullYear() - 13);
  if (date > youngest) {
    return "Registrácia je možná od 13 rokov. Dátum môžete nechať prázdny.";
  }

  return null;
}
