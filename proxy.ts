import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getErrorMessage } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { isPublicApi, isPublicPage, isStaticAsset } from '@/lib/auth/routes';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const ratelimit = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
    })
  : null;

async function applyApiRateLimit(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api')) return null

  const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';

  try {
    if (ratelimit) {
      const { success, limit, reset, remaining } = await ratelimit.limit(ip);

      if (!success) {
        return NextResponse.json(
          { error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            }
          }
        );
      }
    }
  } catch (error) {
    logger.error(
      '[RateLimit] Redis rate limiting failed open',
      { error: getErrorMessage(error) },
      { production: true }
    );
  }

  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isStaticAsset(pathname)) {
    return NextResponse.next()
  }

  const rateLimitResponse = await applyApiRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  const isApi = pathname.startsWith('/api')
  const isPublic = isApi ? isPublicApi(pathname) : isPublicPage(pathname)

  if (isPublic) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  try {
    const supabase = createSupabaseServerClient(request, response)
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      logger.warn('[Proxy] Session lookup failed', { error: getErrorMessage(error) })
    }

    if (!user) {
      if (isApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return response
  } catch (error) {
    logger.error(
      '[Proxy] Auth guard failed open for protected route',
      { pathname, error: getErrorMessage(error) },
      { production: true }
    )
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
