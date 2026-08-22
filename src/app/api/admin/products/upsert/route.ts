import { upsertProductAdmin } from "@/lib/products-admin-server";
import type { ProductUpsertInput } from "@/lib/product-action-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as ProductUpsertInput;
    const result = await upsertProductAdmin(input);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("POST /api/admin/products/upsert", error);
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Uloženie produktu zlyhalo. Skúste to znova.",
      },
      { status: 500 },
    );
  }
}
