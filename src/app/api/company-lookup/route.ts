import { NextResponse } from "next/server";
import {
  getSkCompanyByIco,
  searchSkCompanies,
} from "@/lib/sk-company-registry";

export const runtime = "nodejs";

/**
 * SK company autocomplete / verify (ORSF + RPO fallback).
 * GET ?q=35730  → suggestions
 * GET ?ico=35730005 → detail
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ico = searchParams.get("ico")?.trim() ?? "";
  const q = searchParams.get("q")?.trim() ?? "";

  if (ico) {
    const result = await getSkCompanyByIco(ico);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, notFound: Boolean(result.notFound) },
        { status: result.notFound ? 404 : 502 },
      );
    }
    return NextResponse.json({ ok: true, company: result.company });
  }

  if (q.length < 4) {
    return NextResponse.json({
      ok: true,
      results: [],
      error: null,
    });
  }

  const result = await searchSkCompanies(q);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, results: [], error: result.error },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, results: result.results });
}
