'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { ProductMetricType } from '@/types/models';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  type: string;
  metric_type: ProductMetricType;
  unit_label: string;
  is_active: boolean;
  created_at: string;
}

export default function ProductAdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    metric_type: 'QUANTITY' as ProductMetricType,
    unit_label: '',
  });

  const isAdmin = user?.role === 'ADMIN_LEVEL_1' || user?.role === 'ADMIN_LEVEL_2';

  useEffect(() => {
    if (!isAdmin) {
      router.push('/products');
      return;
    }
    loadProducts();
  }, [isAdmin]);

  async function loadProducts() {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('cross_sell_products')
      .select('*')
      .order('created_at', { ascending: false });
    setProducts((data as Product[]) || []);
    setLoading(false);
  }

  function startEdit(product?: Product) {
    if (product) {
      setEditing(product);
      setFormData({
        name: product.name,
        type: product.type,
        metric_type: product.metric_type,
        unit_label: product.unit_label,
      });
    } else {
      setEditing(null);
      setFormData({ name: '', type: '', metric_type: 'QUANTITY', unit_label: '' });
    }
  }

  async function saveProduct() {
    if (!formData.name || !formData.type || !formData.unit_label) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const supabase = getSupabase();

    if (editing) {
      await supabase
        .from('cross_sell_products')
        .update(formData)
        .eq('id', editing.id);
    } else {
      await supabase.from('cross_sell_products').insert(formData);
    }

    setEditing(null);
    setFormData({ name: '', type: '', metric_type: 'QUANTITY', unit_label: '' });
    loadProducts();
  }

  async function toggleActive(product: Product) {
    const supabase = getSupabase();
    await supabase
      .from('cross_sell_products')
      .update({ is_active: !product.is_active })
      .eq('id', product.id);
    loadProducts();
  }

  async function deleteProduct(id: string) {
    if (!confirm('Xóa sản phẩm này?')) return;
    const supabase = getSupabase();
    await supabase.from('cross_sell_products').delete().eq('id', id);
    loadProducts();
  }

  if (!isAdmin) return null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý Sản phẩm Bán chéo</h1>
        <Button onClick={() => startEdit()}>+ Thêm sản phẩm</Button>
      </div>

      {editing !== null && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tên sản phẩm</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Bảo hiểm nhân thọ"
                />
              </div>
              <div>
                <Label>Loại</Label>
                <Input
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="VD: BẢO HIỂM"
                />
              </div>
              <div>
                <Label>Loại metric</Label>
                <Select
                  value={formData.metric_type}
                  onValueChange={(v) => setFormData({ ...formData, metric_type: v as ProductMetricType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QUANTITY">Số lượng (QUANTITY)</SelectItem>
                    <SelectItem value="AMOUNT">Số tiền (AMOUNT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Đơn vị</Label>
                <Input
                  value={formData.unit_label}
                  onChange={(e) => setFormData({ ...formData, unit_label: e.target.value })}
                  placeholder="VD: Triệu đồng, KH, Tỷ đồng"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveProduct}>Lưu</Button>
              <Button variant="outline" onClick={() => { setEditing(null); setFormData({ name: '', type: '', metric_type: 'QUANTITY', unit_label: '' }); }}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách sản phẩm ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Đang tải...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Tên</th>
                  <th className="text-left py-2">Loại</th>
                  <th className="text-left py-2">Metric</th>
                  <th className="text-left py-2">Đơn vị</th>
                  <th className="text-left py-2">Trạng thái</th>
                  <th className="text-right py-2">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2 text-sm text-slate-600">{p.type}</td>
                    <td className="py-2"><span className="text-xs px-2 py-0.5 bg-slate-100 rounded">{p.metric_type}</span></td>
                    <td className="py-2 text-sm">{p.unit_label}</td>
                    <td className="py-2">
                      <Badge variant={p.is_active ? 'default' : 'secondary'}>{p.is_active ? 'Hoạt động' : 'Tắt'}</Badge>
                    </td>
                    <td className="py-2 text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(p)}>Sửa</Button>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(p)}>
                        {p.is_active ? 'Tắt' : 'Bật'}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteProduct(p.id)}>Xóa</Button>
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
