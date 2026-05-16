import { User } from "@/store/useAuthStore"
import { Agent, Customer, initialCustomers } from "@/store/useDataStore"

// keeping mockAgents here just as fallback or remove it if not needed,
// but for getFilteredData we will pass agents.

export const mockAgents = [
  { id: 'AGENT_1', name: 'Trần Minh', branchId: 'B1', currentStatus: 'meeting', currentTask: 'Đề xuất vay vốn - Nguyễn Văn An' },
  { id: 'AGENT_2', name: 'Lê Hoa', branchId: 'B1', currentStatus: 'calling', currentTask: 'Tư vấn khoản vay - Phạm Thị Dung' },
  { id: 'AGENT_3', name: 'Phạm Hùng', branchId: 'B2', currentStatus: 'available', currentTask: 'Tại quầy (Rảnh)' },
  { id: 'AGENT_4', name: 'Nguyễn Tuấn', branchId: 'B1', currentStatus: 'processing', currentTask: 'Xử lý hồ sơ L-2401' }
]

export const mockProducts = [
  { id: 'P001', name: 'Thẻ tín dụng Platinum', type: 'Thẻ', target: 50, currentSales: 12 },
  { id: 'P002', name: 'Bảo hiểm nhân thọ An Gia', type: 'Bảo hiểm', target: 20, currentSales: 5 },
  { id: 'P003', name: 'Tài khoản số đẹp', type: 'Tài khoản', target: 100, currentSales: 45 },
]

export const mockProductSales = [
  { id: 'S001', productId: 'P001', agentId: 'AGENT_1', customerId: 'C001', date: '2024-05-15', status: 'Success' },
  { id: 'S002', productId: 'P003', agentId: 'AGENT_1', customerId: 'C002', date: '2024-05-16', status: 'Success' },
  { id: 'S003', productId: 'P001', agentId: 'AGENT_2', customerId: 'C003', date: '2024-05-14', status: 'Pending' },
  { id: 'S004', productId: 'P002', agentId: 'AGENT_3', customerId: 'C004', date: '2024-05-12', status: 'Success' },
  { id: 'S005', productId: 'P001', agentId: 'AGENT_4', customerId: 'C005', date: '2024-05-17', status: 'Success' },
  { id: 'S006', productId: 'P002', agentId: 'AGENT_1', customerId: 'C001', date: '2024-05-18', status: 'Success' },
]

export const mockLoans = [
  { id: "L-2401-001", customerId: "C001", type: "Vay mua nhà", amount: 2500000000, term: "240 tháng", rate: "8.5%", status: "Active", date: "15/01/2024" },
  { id: "L-2402-042", customerId: "C002", type: "Vay kinh doanh", amount: 500000000, term: "36 tháng", rate: "9.2%", status: "Pending", date: "10/02/2024" },
  { id: "L-2403-105", customerId: "C003", type: "Vay mua ô tô", amount: 800000000, term: "60 tháng", rate: "8.9%", status: "Active", date: "05/03/2024" },
  { id: "L-2311-089", customerId: "C004", type: "Vay doanh nghiệp", amount: 5000000000, term: "12 tháng", rate: "7.5%", status: "Completed", date: "12/11/2023" },
  { id: "L-2404-012", customerId: "C005", type: "Vay tiêu dùng", amount: 100000000, term: "24 tháng", rate: "12.5%", status: "Active", date: "20/04/2024" },
]

export const mockDeposits = [
  { id: "D-2401-091", customerId: "C002", type: "Tiết kiệm thường", amount: 200000000, term: "6 tháng", rate: "5.5%", status: "Active", maturityDate: "15/07/2024" },
  { id: "D-2312-105", customerId: "C001", type: "Chứng chỉ tiền gửi", amount: 1500000000, term: "12 tháng", rate: "7.2%", status: "Active", maturityDate: "10/12/2024" },
  { id: "D-2402-012", customerId: "C003", type: "Tiết kiệm online", amount: 50000000, term: "1 tháng", rate: "4.2%", status: "Active", maturityDate: "05/03/2024" },
  { id: "D-2305-089", customerId: "C004", type: "Kỳ phiếu", amount: 3000000000, term: "6 tháng", rate: "6.5%", status: "Completed", maturityDate: "12/11/2023" },
  { id: "D-2404-032", customerId: "C005", type: "Tiết kiệm tích lũy", amount: 20000000, term: "12 tháng", rate: "6.0%", status: "Pending", maturityDate: "20/04/2025" },
]

export const mockInteractions = [
  { id: "INT-001", customerId: "C001", type: "call", title: "Tư vấn gia hạn khoản vay", date: "Hôm nay, 14:30", status: "Completed" },
  { id: "INT-002", customerId: "C002", type: "meeting", title: "Ký hợp đồng mở thẻ tín dụng", date: "Hôm nay, 09:00", status: "Completed" },
  { id: "INT-003", customerId: "C003", type: "email", title: "Gửi báo cáo lãi suất tiền gửi", date: "Hôm qua, 16:45", status: "Completed" },
  { id: "INT-004", customerId: "C004", type: "meeting", title: "Khảo sát thực địa khách hàng doanh nghiệp", date: "Ngày mai, 10:00", status: "Pending" },
  { id: "INT-005", customerId: "C005", type: "message", title: "Hỗ trợ lỗi chuyển tiền qua app", date: "12/05/2024", status: "Completed" },
]

export function getFilteredData(user: User | null, agents: Agent[] = mockAgents, rawCustomers: Customer[] = initialCustomers) {
  if (!user) {
    return { customers: [], loans: [], deposits: [], interactions: [], products: [], productSales: [] }
  }
  let allowedAgentIds: string[] = []
  if (user.role === 'admin_1') {
    allowedAgentIds = agents.map(a => a.id)
  } else if (user.role === 'admin_2') {
    allowedAgentIds = agents.filter(a => a.branchId === user.branchId).map(a => a.id)
  } else {
    allowedAgentIds = [user.id] // user only sees themselves
  }

  const customers = rawCustomers
    .filter(c => allowedAgentIds.includes(c.agentId))
    .map(c => ({
      ...c,
      agentName: agents.find(a => a.id === c.agentId)?.name || 'Unknown'
    }))
  
  const customerIds = customers.map(c => c.id)

  const loans = mockLoans
    .filter(l => customerIds.includes(l.customerId))
    .map(l => ({
      ...l,
      customerName: customers.find(c => c.id === l.customerId)?.name || 'Unknown'
    }))

  const deposits = mockDeposits
    .filter(d => customerIds.includes(d.customerId))
    .map(d => ({
      ...d,
      customerName: customers.find(c => c.id === d.customerId)?.name || 'Unknown'
    }))

  const interactions = mockInteractions
    .filter(i => customerIds.includes(i.customerId))
    .map(i => {
      const customer = customers.find(c => c.id === i.customerId)
      return {
        ...i,
        customerName: customer?.name || 'Unknown',
        agentName: customer?.agentName || 'Unknown'
      }
    })

  const productSales = mockProductSales
    .filter(s => allowedAgentIds.includes(s.agentId))
    .map(s => {
      const customer = customers.find(c => c.id === s.customerId)
      const product = mockProducts.find(p => p.id === s.productId)
      return {
        ...s,
        customerName: customer?.name || 'Unknown',
        productName: product?.name || 'Unknown'
      }
    })

  return { customers, loans, deposits, interactions, products: mockProducts, productSales }
}

export function formatCurrency(amount: number) {
  if (amount >= 1e9) {
    return (amount / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' Tỷ ₫'
  }
  if (amount >= 1e6) {
    return (amount / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' Tr ₫'
  }
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}
