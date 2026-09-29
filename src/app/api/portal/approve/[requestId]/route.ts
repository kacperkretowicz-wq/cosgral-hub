import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  approveAccessRequest,
  rejectAccessRequest,
  getAccessRequest,
} from "@/lib/portal-db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { requestId } = await params;
  const body = await request.json().catch(() => ({}));
  const action: string = body.action ?? "approve";

  try {
    if (action === "reject") {
      await rejectAccessRequest(requestId);
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    const accessReq = await approveAccessRequest(requestId);

    // Build the response — caller must set the cookie on the CLIENT side
    // (we set Set-Cookie here so redirects from the portal page work)
    const res = NextResponse.json({
      ok: true,
      status: "approved",
      token: accessReq.token,
      crm_client_id: accessReq.crm_client_id,
    });

    // Cookie is set on this response so if admin is previewing the portal
    // from HUB the cookie is present. For the actual client it is set by
    // the portal page via JS after polling for approval.
    res.cookies.set("portal_session", accessReq.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET: Check status of a pending request (polled by client browser)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params;
  const req = await getAccessRequest(requestId);
  if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ status: req.status, token: req.status === "approved" ? req.token : null });
}
