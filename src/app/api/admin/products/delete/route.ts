import { deleteProductAdmin } from "@/lib/products-admin-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { productId?: string };
    const productId = body.productId?.trim();

    if (!productId) {
      return Response.json(
        { ok: false, error: "Chýba ID produktu." },
        { status: 400 },
      );
    }

    const result = await deleteProductAdmin(productId);
    return Response.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("POST /api/admin/products/delete", error);
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Vymazanie produktu zlyhalo. Skúste to znova.",
      },
      { status: 500 },
    );
  }
}
