import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Khởi tạo hệ thống giới hạn (Sẽ trả về null nếu chưa cấu hình Upstash)
const ratelimit = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '10 s'),
      analytics: true,
    })
  : null;

export async function middleware(request: NextRequest) {
  // Chỉ áp dụng Rate Limit cho các đường dẫn API
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
    
    try {
      if (ratelimit) {
        const { success, limit, reset, remaining } = await ratelimit.limit(ip);
        
        // Nếu vượt quá giới hạn
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
      // Fail-open: Nếu Redis bị sập tạm thời thì vẫn cho phép API chạy (không block user vô cớ)
      console.error('Redis Rate Limiting Error:', error);
    }
  }

  return NextResponse.next();
}

// Cấu hình để middleware chỉ chạy trên các đường dẫn phù hợp
export const config = {
  matcher: '/api/:path*',
};
