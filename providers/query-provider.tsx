'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 3 * 60 * 1000, // Tăng staleTime lên 3 phút để giảm tải server
            gcTime: 10 * 60 * 1000, // Giữ dữ liệu trong cache 10 phút trước khi xóa
            refetchOnWindowFocus: false, // Tránh gọi API khi đổi tab về
            refetchOnMount: false, // Nếu data chưa stale thì không gọi lại khi mount component
            retry: 2, // Thử lại 2 lần nếu network lỗi
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
