import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/admin/:path*", "/api/debug/:path*"],
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function challenge(): NextResponse {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="inconcepts admin", charset="UTF-8"',
    },
  });
}

export function middleware(req: NextRequest) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;

  if (!user || !pass) {
    return new NextResponse("Admin ist nicht konfiguriert.", { status: 503 });
  }

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Basic ")) return challenge();

  const decoded = atob(header.slice("Basic ".length));
  const idx = decoded.indexOf(":");
  if (idx < 0) return challenge();

  const gotUser = decoded.slice(0, idx);
  const gotPass = decoded.slice(idx + 1);

  if (!timingSafeEqual(gotUser, user) || !timingSafeEqual(gotPass, pass)) {
    return challenge();
  }

  return NextResponse.next();
}
