import "server-only";

const ORSF_BASE = "https://api.orsf.sk/v1";
const RPO_BASE = "https://api.statistics.sk/rpo/v1";
const FETCH_TIMEOUT_MS = 8000;

export type SkCompanySuggestion = {
  ico: string;
  name: string;
  city?: string;
  status?: string;
  dic?: string;
  icDph?: string;
};

export type SkCompanyDetail = SkCompanySuggestion & {
  street?: string;
  zip?: string;
  legalForm?: string;
};

type OrsfSearchHit = {
  ico?: string;
  name?: string;
  city?: string;
  status?: string;
  dic?: string;
  icDph?: string;
};

type OrsfCompany = {
  ico?: string;
  name?: string;
  dic?: string;
  icdph?: string;
  street?: string;
  city?: string;
  psc?: string;
  status?: string;
  legalForm?: string;
};

async function fetchJson<T>(
  url: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      next: { revalidate: 900 },
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Lookup zlyhal (${response.status}).`,
      };
    }
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (error) {
    const aborted =
      error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: 0,
      error: aborted
        ? "Vyhľadávanie firiem vypršalo. Skúste to znova."
        : "Vyhľadávanie firiem je dočasne nedostupné.",
    };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeIco(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

function isActiveStatus(status?: string) {
  if (!status) return true;
  const lower = status.toLowerCase();
  return (
    lower.includes("aktív") ||
    lower.includes("activ") ||
    lower === "ok"
  );
}

function isCancelledStatus(status?: string) {
  if (!status) return false;
  const lower = status.toLowerCase();
  return (
    lower.includes("zrušen") ||
    lower.includes("likvid") ||
    lower.includes("zánik") ||
    lower.includes("dissolv") ||
    lower.includes("cancel")
  );
}

/**
 * Autocomplete by IČO digits only (prefix match).
 * ORSF fulltext also hits company names with numbers — those are filtered out.
 */
export async function searchSkCompanies(
  query: string,
): Promise<
  | { ok: true; results: SkCompanySuggestion[] }
  | { ok: false; error: string }
> {
  const q = normalizeIco(query);
  if (q.length < 4) {
    return { ok: true, results: [] };
  }

  const result = await fetchJson<{ hits?: OrsfSearchHit[] }>(
    `${ORSF_BASE}/search?q=${encodeURIComponent(q)}`,
  );
  if (!result.ok) return { ok: false, error: result.error };

  const results = (result.data.hits ?? [])
    .filter((hit) => hit.ico && hit.name)
    .map((hit) => ({
      ico: normalizeIco(hit.ico!),
      name: hit.name!.trim(),
      city: hit.city?.trim() || undefined,
      status: hit.status?.trim() || undefined,
      dic: hit.dic?.trim() || undefined,
      icDph: hit.icDph?.trim() || undefined,
    }))
    // Only IČO prefix — never match on company name containing the same digits.
    .filter((hit) => hit.ico.startsWith(q))
    // Skip cancelled / liquidated entities for wholesale signup.
    .filter((hit) => !isCancelledStatus(hit.status))
    .slice(0, 8);

  return { ok: true, results };
}

/** Full 8-digit IČO detail (autofill + server verify). */
export async function getSkCompanyByIco(
  icoInput: string,
): Promise<
  | { ok: true; company: SkCompanyDetail }
  | { ok: false; error: string; notFound?: boolean }
> {
  const ico = normalizeIco(icoInput);
  if (ico.length !== 8) {
    return { ok: false, error: "IČO musí obsahovať presne 8 číslic." };
  }

  const orsf = await fetchJson<OrsfCompany>(`${ORSF_BASE}/companies/${ico}`);
  if (orsf.ok && orsf.data.ico && orsf.data.name) {
    return {
      ok: true,
      company: {
        ico: normalizeIco(orsf.data.ico),
        name: orsf.data.name.trim(),
        dic: orsf.data.dic?.trim() || undefined,
        icDph: orsf.data.icdph?.trim() || undefined,
        street: orsf.data.street?.trim() || undefined,
        city: orsf.data.city?.trim() || undefined,
        zip: orsf.data.psc?.replace(/\D/g, "").slice(0, 5) || undefined,
        status: orsf.data.status?.trim() || undefined,
        legalForm: orsf.data.legalForm?.trim() || undefined,
      },
    };
  }

  // Fallback: official RPO search by exact identifier
  const rpo = await fetchJson<{
    results?: Array<{
      id: number;
      identifiers?: Array<{ value?: string }>;
      fullNames?: Array<{ value?: string; validTo?: string | null }>;
      addresses?: Array<{
        street?: string;
        buildingNumber?: string;
        postalCodes?: string[];
        municipality?: { value?: string };
        validTo?: string | null;
      }>;
    }>;
  }>(`${RPO_BASE}/search?identifier=${encodeURIComponent(ico)}`);

  if (!rpo.ok) {
    return {
      ok: false,
      error: orsf.ok === false ? orsf.error : rpo.error,
    };
  }

  const match = (rpo.data.results ?? []).find((row) =>
    (row.identifiers ?? []).some((id) => normalizeIco(id.value ?? "") === ico),
  );
  if (!match) {
    return {
      ok: false,
      notFound: true,
      error: "Firma s týmto IČO sa v registri nenašla.",
    };
  }

  const currentName =
    [...(match.fullNames ?? [])]
      .reverse()
      .find((name) => !name.validTo)?.value ??
    match.fullNames?.[0]?.value;
  const currentAddress =
    [...(match.addresses ?? [])]
      .reverse()
      .find((address) => !address.validTo) ?? match.addresses?.[0];

  const streetParts = [
    currentAddress?.street,
    currentAddress?.buildingNumber,
  ].filter(Boolean);

  return {
    ok: true,
    company: {
      ico,
      name: (currentName ?? "").trim() || `Firma ${ico}`,
      street: streetParts.join(" ").trim() || undefined,
      city: currentAddress?.municipality?.value?.trim() || undefined,
      zip: currentAddress?.postalCodes?.[0]?.replace(/\D/g, "").slice(0, 5),
    },
  };
}

/** Reject registration unless IČO resolves in SK registries. */
export async function assertSkIcoExists(
  icoInput: string,
): Promise<{ ok: true; company: SkCompanyDetail } | { ok: false; error: string }> {
  const result = await getSkCompanyByIco(icoInput);
  if (!result.ok) {
    return {
      ok: false,
      error: result.notFound
        ? "Zadané IČO neexistuje v slovenskom registri firiem."
        : result.error,
    };
  }

  if (result.company.status && !isActiveStatus(result.company.status)) {
    return {
      ok: false,
      error: "Táto firma nie je v registri vedená ako aktívna.",
    };
  }

  return { ok: true, company: result.company };
}
