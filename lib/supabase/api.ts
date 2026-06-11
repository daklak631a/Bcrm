// Facade tổng hợp các module API theo domain.
// Giữ nguyên mọi export cũ để các import hiện có (`@/lib/supabase/api`) không đổi.
// Code triển khai nằm trong các module: cache, mappers, audit, profiles, plans,
// customers, loans, deposits, interactions, notifications, products,
// sales-records, support, transfers, settings.

export {
  invalidateApiCache,
  type PageResult,
  type CurrentUserScope,
} from './cache'

export {
  formatCurrency,
  getCustomerFullName,
  mapLoanToSalesRecord,
  mapDepositToSalesRecord,
  mapProductSaleToSalesRecord,
  sortSalesRecords,
} from './mappers'

export {
  logAudit,
  fetchAuditLogs,
  type AuditAction,
  type EntityType,
  type AuditLogPayload,
} from './audit'

export {
  fetchProfiles,
  fetchProfilesPage,
  fetchAllowedEmailsPage,
  fetchProfileById,
  fetchAllowedEmails,
  createAllowedEmail,
  updateAllowedEmail,
  deleteAllowedEmail,
  type ProfilePageInput,
  type AllowedEmailPageInput,
} from './profiles'

export {
  fetchPlans,
  createPlan,
  fetchPlanAssignments,
  upsertPlanAssignment,
  fetchWeeklyPlans,
  fetchDailyPlans,
  upsertWeeklyPlan,
  upsertDailyPlans,
} from './plans'

export {
  fetchCustomers,
  fetchCustomersPage,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  type CustomerPageInput,
} from './customers'

export {
  fetchLoans,
  fetchLoansByCustomer,
  createLoan,
  updateLoan,
} from './loans'

export {
  fetchDeposits,
  fetchDepositsByCustomer,
  createDeposit,
  updateDeposit,
} from './deposits'

export {
  fetchInteractions,
  fetchInteractionsByCustomer,
  createInteraction,
  updateInteraction,
} from './interactions'

export {
  fetchNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
} from './notifications'

export {
  fetchProducts,
  createProduct,
  deleteProduct,
  fetchProductSales,
  fetchProductSalesByAgentId,
  fetchProductSalesByAgentIds,
  fetchProductSalesByCustomer,
  fetchBatchSales,
  createBatchSale,
  allocateBatchSale,
  createProductSale,
  updateProductSale,
} from './products'

export {
  fetchSalesRecords,
  fetchSalesRecordsByAgent,
  fetchSalesRecordsByAgents,
  fetchSalesRecordsByCustomer,
  createSalesRecord,
} from './sales-records'

export {
  fetchSupportRequests,
  createSupportRequest,
  updateSupportRequestStatus,
} from './support'

export {
  createTransferRequest,
  fetchTransferRequests,
  updateTransferRequestStatus,
} from './transfers'

export {
  fetchSystemSettings,
  updateSystemSetting,
} from './settings'
