'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface TransferRequest {
  id: string;
  customer_id: string;
  from_manager_id: string;
  to_manager_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string | null;
  requested_at: string;
  decided_at?: string | null;
  from_manager?: { full_name: string };
  to_manager?: { full_name: string };
  customer?: { full_name: string; business_name?: string };
}

export default function ManagerTransfersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'ADMIN_LEVEL_1' || user?.role === 'ADMIN_LEVEL_2';

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    loadTransfers();
  }, [isAdmin]);

  async function loadTransfers() {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('manager_transfer_requests')
      .select(`
        *,
        from_manager:profiles!from_manager_id(full_name),
        to_manager:profiles!to_manager_id(full_name),
        customer:customers(full_name, business_name)
      `)
      .order('requested_at', { ascending: false });
    setTransfers((data as any) || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    const supabase = getSupabase();
    await supabase
      .from('manager_transfer_requests')
      .update({ status, decided_at: new Date().toISOString() })
      .eq('id', id);
    loadTransfers();
  }

  if (!isAdmin) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Quản lý Chuyển giao Khách hàng</h1>

      <Card>
        <CardHeader>
          <CardTitle>Yêu cầu chuyển giao ({transfers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Đang tải...</div>
          ) : transfers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">Chưa có yêu cầu nào</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Khách hàng</th>
                  <th className="text-left py-2">Từ</th>
                  <th className="text-left py-2">Đến</th>
                  <th className="text-left py-2">Trạng thái</th>
                  <th className="text-left py-2">Ngày yêu cầu</th>
                  <th className="text-right py-2">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id} className="border-b">
                    <td className="py-2">{t.customer?.full_name || t.customer?.business_name || '—'}</td>
                    <td className="py-2 text-sm">{t.from_manager?.full_name || '—'}</td>
                    <td className="py-2 text-sm">{t.to_manager?.full_name || '—'}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${t.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : t.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2 text-sm text-slate-600">{format(new Date(t.requested_at), 'dd/MM/yyyy HH:mm', { locale: vi })}</td>
                    <td className="py-2 text-right space-x-2">
                      {t.status === 'PENDING' && (
                        <>
                          <Button size="sm" onClick={() => updateStatus(t.id, 'APPROVED')}>Duyệt</Button>
                          <Button size="sm" variant="destructive" onClick={() => updateStatus(t.id, 'REJECTED')}>Từ chối</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
