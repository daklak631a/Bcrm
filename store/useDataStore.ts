import { create } from 'zustand'

export interface Agent {
  id: string
  name: string
  branchId: string
  currentStatus: string
  currentTask: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  cccd: string
  tier: string
  status: string
  agentId: string
}

export const initialAgents: Agent[] = [
  { id: 'AGENT_1', name: 'Trần Minh', branchId: 'B1', currentStatus: 'meeting', currentTask: 'Đề xuất vay vốn - Nguyễn Văn An' },
  { id: 'AGENT_2', name: 'Lê Hoa', branchId: 'B1', currentStatus: 'calling', currentTask: 'Tư vấn khoản vay - Phạm Thị Dung' },
  { id: 'AGENT_3', name: 'Phạm Hùng', branchId: 'B2', currentStatus: 'available', currentTask: 'Tại quầy (Rảnh)' },
  { id: 'AGENT_4', name: 'Nguyễn Tuấn', branchId: 'B1', currentStatus: 'processing', currentTask: 'Xử lý hồ sơ L-2401' }
]

export const initialCustomers: Customer[] = [
  { id: "C001", name: "Nguyễn Văn An", phone: "0901234567", email: "an.nguyen@email.com", cccd: "079012345678", tier: "VIP", status: "Active", agentId: "AGENT_1" },
  { id: "C002", name: "Trần Thị Bé", phone: "0912345678", email: "be.tran@email.com", cccd: "079087654321", tier: "Standard", status: "Active", agentId: "AGENT_2" },
  { id: "C003", name: "Lê Hoàng Phúc", phone: "0923456789", email: "phuc.le@email.com", cccd: "079011223344", tier: "Platinum", status: "Inactive", agentId: "AGENT_1" },
  { id: "C004", name: "Phạm Thị Dung", phone: "0934567890", email: "dung.pham@email.com", cccd: "079055667788", tier: "Gold", status: "Active", agentId: "AGENT_2" },
  { id: "C005", name: "Hoàng Văn Thái", phone: "0945678901", email: "thai.hoang@email.com", cccd: "079099887766", tier: "Standard", status: "Pending", agentId: "AGENT_3" },
]

interface DataState {
  agents: Agent[]
  customers: Customer[]
  updateAgentBranch: (agentId: string, newBranchId: string) => void
  addCustomers: (newCustomers: Customer[]) => void
}

export const useDataStore = create<DataState>((set) => ({
  agents: initialAgents,
  customers: initialCustomers,
  updateAgentBranch: (agentId, newBranchId) => set((state) => ({
    agents: state.agents.map(a => a.id === agentId ? { ...a, branchId: newBranchId } : a)
  })),
  addCustomers: (newCustomers) => set((state) => ({
    customers: [...state.customers, ...newCustomers]
  }))
}))
