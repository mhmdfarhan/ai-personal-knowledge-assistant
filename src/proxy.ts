import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/auth/callback",
  "/auth/auth-code-error",
];

const PUBLIC_EXACT_PATHS = ["/"];

/**
 * Halaman yang tetap boleh diakses user yang sudah login (mis. ganti password
 * setelah recovery, karena butuh sesi aktif).
 */
const SESSION_REQUIRED_AUTH_PATHS = ["/auth/update-password"];

/**
 * Auth guard tingkat jaringan (proxy). Perlindungan utama tetap dilakukan di
 * setiap Route Handler / Server Component lewat supabase.auth.getUser() dan
 * RLS di database — proxy ini hanya menyegarkan sesi + redirect cepat.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sebelum .env.local diisi, jangan blokir apa pun — biarkan halaman
  // menampilkan pesan setup yang jelas.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api");
  const isPublicAuth = PUBLIC_AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isPublicExact = PUBLIC_EXACT_PATHS.includes(pathname);
  const isPublic = isPublicAuth || isPublicExact;
  const needsSession =
    SESSION_REQUIRED_AUTH_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic && !needsSession && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isPublicAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Jalankan di semua route kecuali: API routes, aset statis Next.js,
     * optimasi gambar, favicon, dan berkas media.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
