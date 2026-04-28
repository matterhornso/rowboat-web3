import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-client-id, Authorization',
};

const isProtectedRoute = createRouteMatcher([
  '/projects(.*)',
  '/billing(.*)',
  '/onboarding(.*)',
]);

const isApiRoute = createRouteMatcher(['/api(.*)']);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  // CORS preflight
  if (request.method === 'OPTIONS' && isApiRoute(request)) {
    return NextResponse.json({}, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        ...corsOptions,
      },
    });
  }

  // CORS headers on all API responses
  if (isApiRoute(request)) {
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    Object.entries(corsOptions).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  // Guard app pages when auth is enabled
  if (process.env.USE_AUTH === 'true' && isProtectedRoute(request)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
