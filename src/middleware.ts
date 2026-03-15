import { type NextRequest, NextResponse } from "next/server";
import { verifySessionCookie, COOKIE_NAME } from "@/lib/auth-middleware";

const PUBLIC_PATHS = ["/login", "/signup", "/api/auth", "/auth", "/aguarde-validacao", "/~offline"];

/** Rotas ocultas: redirecionar para home para impedir acesso direto. */
const HIDDEN_ROUTES = ["/dashboard", "/preco-medio"];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);

  const isHiddenRoute = HIDDEN_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  if (isHiddenRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  /** Redirect old /carteira to /wallet */
  if (pathname === "/carteira" || pathname.startsWith("/carteira/")) {
    const newPath = pathname === "/carteira" ? "/wallet" : `/wallet${pathname.slice("/carteira".length)}`;
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  /** Redirect old /pools-liquidez to /pools */
  if (pathname === "/pools-liquidez" || pathname.startsWith("/pools-liquidez/")) {
    const newPath = pathname === "/pools-liquidez" ? "/pools" : `/pools${pathname.slice("/pools-liquidez".length)}`;
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  /** Redirect old /saude-defi to /aave */
  if (pathname === "/saude-defi" || pathname.startsWith("/saude-defi/")) {
    const newPath = pathname === "/saude-defi" ? "/aave" : `/aave${pathname.slice("/saude-defi".length)}`;
    return NextResponse.redirect(new URL(newPath, request.url));
  }

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
