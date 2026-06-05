import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Khởi tạo hệ thống giới hạn: 10 request mỗi 10 giây cho mỗi IP
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
});

export async function middleware(request: NextRequest) {
  // Chỉ áp dụng Rate Limit cho các đường dẫn API
  if (request.nextUrl.pathname.startsWith('/api')) {
    const ip = request.headers.get('x-forwarded-for') ?? request.ip ?? '127.0.0.1';
    
    try {
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
