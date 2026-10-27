import { createPaymentExport } from "@/lib/payment-export";
import { getCurrentUser } from "@/lib/session";

function attachmentFilename(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in again." }, { status: 401 });

  const { id } = await context.params;
  const widgetId = Number(id);
  if (!Number.isInteger(widgetId) || widgetId <= 0) {
    return Response.json({ error: "That payment widget was not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The export could not be created." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "The export could not be created." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  if (typeof record.filename !== "string" || typeof record.password !== "string") {
    return Response.json({ error: "The export could not be created." }, { status: 400 });
  }
  if (typeof record.includeAccounts !== "boolean") {
    return Response.json({ error: "Choose whether to include the accounts tab." }, { status: 400 });
  }

  try {
    const result = await createPaymentExport(user, widgetId, {
      filename: record.filename,
      password: record.password,
      includeAccounts: record.includeAccounts,
    });
    if ("error" in result) {
      const status = result.error === "That payment widget was not found." ? 404 : 400;
      return Response.json({ error: result.error }, { status });
    }

    return new Response(result.bytes, {
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": attachmentFilename(result.downloadName),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "The export could not be created." }, { status: 500 });
  }
}
