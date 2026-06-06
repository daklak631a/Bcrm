# BCRM 2.0

Ứng dụng CRM ngân hàng xây dựng bằng Next.js, React, TypeScript và Supabase.

## Yêu cầu

- Node.js 20+
- npm
- Một dự án Supabase đã áp dụng các migration của BCRM

## Chạy local

1. Cài dependency:

   ```bash
   npm ci
   ```

2. Tạo `.env.local` từ `.env.example` và điền thông tin Supabase.

3. Khởi động ứng dụng:

   ```bash
   npm run dev
   ```

Ứng dụng mặc định chạy tại `http://localhost:3000`.

## Biến môi trường

Các biến bắt buộc:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`: chỉ dùng phía server, không được đặt tiền tố `NEXT_PUBLIC_`

Các biến tùy chọn:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_PILOT_SUPABASE_URL`
- `NEXT_PUBLIC_PILOT_SUPABASE_ANON_KEY`

Nếu không cấu hình Upstash, proxy sẽ bỏ qua rate limit phân tán. Một số API vẫn có limiter in-memory cục bộ.

## Kiểm tra chất lượng

```bash
npm run check:mojibake
npm test
npm run test:coverage
npm run lint
npm run build
```

GitHub Actions chạy coverage, lint và production build cho mỗi push và pull request.

## Triển khai

1. Cấu hình toàn bộ biến môi trường trên nền tảng triển khai.
2. Chạy migration Supabase theo đúng thứ tự của môi trường.
3. Xác minh RLS và quyền truy cập chéo phòng ban bằng tài khoản thử nghiệm.
4. Chạy `npm run build` trước khi phát hành.
5. Không commit `.env.local`, service role key hoặc token Upstash.

Module pilot B2B phải dùng dự án Supabase riêng. Không cấu hình URL pilot trùng với Supabase production.
