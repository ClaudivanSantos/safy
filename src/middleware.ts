import { type NextRequest, NextResponse } from "next/server";
import { verifySessionCookie, COOKIE_NAME } from "@/lib/auth-middleware";

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth", "/auth", "/aguarde-validacao", "/~offline"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySessionCookie(token);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!session && !isPublic && pathname.startsWith("/app")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (session && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
