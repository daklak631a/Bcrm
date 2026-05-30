import { useEffect, useState } from 'react'
import { gas } from './lib/gas'

interface AppUser {
  email: string
  name: string
  role: string
}

interface AppData {
  user?: AppUser
  customers?: unknown[]
  accounts?: unknown[]
  interactions?: unknown[]
}

function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch user and initial data from GAS backend
    gas.call<AppData>('getAppData')
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Không thể kết nối với server Google Apps Script.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Đang tải dữ liệu từ Google Sheets...</div>;
  }

  if (error) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-red-500">{error}</div>;
  }

  if (!data?.user) {
    return <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500">Không tìm thấy thông tin người dùng.</div>;
  }

  return (
    <div className="p-8 font-sans bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold mb-6 text-slate-800">BCRM - Quản lý khách hàng (Google Apps Script)</h1>
        
        <div className="mb-6 p-4 bg-indigo-50 text-indigo-900 rounded-md border border-indigo-100 flex items-center justify-between">
          <div>
            <p className="font-medium">Xin chào, {data.user.name}</p>
            <p className="text-sm opacity-80">{data.user.email} - Vai trò: {data.user.role}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Đã kết nối Google Sheets
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-slate-50 rounded border border-slate-100 text-center">
            <p className="text-sm text-slate-500 mb-1">Khách hàng</p>
            <p className="text-2xl font-semibold text-slate-800">{data.customers?.length || 0}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded border border-slate-100 text-center">
            <p className="text-sm text-slate-500 mb-1">Tài khoản</p>
            <p className="text-2xl font-semibold text-slate-800">{data.accounts?.length || 0}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded border border-slate-100 text-center">
            <p className="text-sm text-slate-500 mb-1">Tương tác</p>
            <p className="text-2xl font-semibold text-slate-800">{data.interactions?.length || 0}</p>
          </div>
        </div>
        
        <p className="text-slate-600 text-sm">
          Giao diện đang được chuyển đổi từ Next.js sang bản build React tĩnh. 
          Dữ liệu đã có thể lấy trực tiếp từ Google Sheets thành công!
        </p>
      </div>
    </div>
  )
}

export default App
