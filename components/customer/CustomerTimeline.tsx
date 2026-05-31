'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { getSupabase } from '@/lib/supabase/client';
import { SalesRecord } from '@/types/models';
import { getRecordMetricValue, getRecordUnitLabel, formatMetricValue } from '@/lib/product-metrics';

interface TimelineEvent {
  id: string;
  date: string;
  type: 'loan' | 'deposit' | 'product' | 'interaction';
  title: string;
  description?: string | null;
  value?: number;
  unit?: string;
  status?: string;
}

interface CustomerTimelineProps {
  customerId: string;
}

export default function CustomerTimeline({ customerId }: CustomerTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTimeline() {
      const supabase = getSupabase();
      const allEvents: TimelineEvent[] = [];

      // Load loans
      const { data: loans } = await supabase
        .from('loans')
        .select('*')
        .eq('customer_id', customerId)
        .order('start_date', { ascending: false });

      loans?.forEach((loan: any) => {
        allEvents.push({
          id: `loan-${loan.id}`,
          date: loan.start_date,
          type: 'loan',
          title: loan.loan_type || 'Khoản vay',
          description: loan.disbursement_purpose || loan.business_sector,
          value: Number(loan.loan_amount || 0),
          unit: 'VNĐ',
          status: loan.status,
        });
      });

      // Load deposits
      const { data: deposits } = await supabase
        .from('deposits')
        .select('*')
        .eq('customer_id', customerId)
        .order('start_date', { ascending: false });

      deposits?.forEach((deposit: any) => {
        allEvents.push({
          id: `deposit-${deposit.id}`,
          date: deposit.start_date,
          type: 'deposit',
          title: deposit.deposit_type || 'Tiền gửi',
          description: deposit.maturity_date ? `Đáo hạn: ${deposit.maturity_date}` : null,
          value: Number(deposit.amount || 0),
          unit: 'VNĐ',
          status: deposit.status,
        });
      });

      // Load cross-sell products
      const { data: products } = await supabase
        .from('cross_sell_records')
        .select('*, cross_sell_products(*)')
        .eq('customer_id', customerId)
        .eq('status', 'COMPLETED')
        .order('sale_date', { ascending: false });

      products?.forEach((sale: any) => {
        const product = sale.cross_sell_products;
        allEvents.push({
          id: `product-${sale.id}`,
          date: sale.sale_date,
          type: 'product',
          title: product?.name || 'Sản phẩm',
          description: sale.note,
          value: getRecordMetricValue(sale as any),
          unit: getRecordUnitLabel(sale as any),
          status: sale.status,
        });
      });

      // Load interactions
      const { data: interactions } = await supabase
        .from('interactions')
        .select('*')
        .eq('customer_id', customerId)
        .order('interaction_date', { ascending: false });

      interactions?.forEach((interaction: any) => {
        allEvents.push({
          id: `interaction-${interaction.id}`,
          date: interaction.interaction_date,
          type: 'interaction',
          title: interaction.interaction_type || 'Tương tác',
          description: interaction.note,
        });
      });

      // Sort by date
      allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEvents(allEvents);
      setLoading(false);
    }

    loadTimeline();
  }, [customerId]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'loan': return '💰';
      case 'deposit': return '🏦';
      case 'product': return '📦';
      case 'interaction': return '💬';
      default: return '📌';
    }
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      loan: 'Khoản vay',
      deposit: 'Tiền gửi',
      product: 'Sản phẩm',
      interaction: 'Tương tác',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-500">Đang tải timeline...</div>;
  }

  if (events.length === 0) {
    return <div className="text-center py-8 text-slate-400">Chưa có lịch sử giao dịch</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lịch sử giao dịch</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-4 border-l-2 border-slate-200 pl-4 pb-4 last:pb-0">
              <div className="text-2xl -ml-6 bg-white pr-2">{getTypeIcon(event.type)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{event.title}</span>
                  <Badge variant="outline" className="text-xs">{getTypeBadge(event.type)}</Badge>
                  {event.status && <Badge variant="secondary" className="text-xs">{event.status}</Badge>}
                </div>
                {event.description && (
                  <p className="text-sm text-slate-600 mb-1">{event.description}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{format(new Date(event.date), 'dd/MM/yyyy', { locale: vi })}</span>
                  {event.value !== undefined && event.value > 0 && (
                    <span className="font-mono text-emerald-600">
                      {formatMetricValue(event.value, event.unit)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
