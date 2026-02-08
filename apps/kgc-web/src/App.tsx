import { AppLayout } from '@/components/layout';
import {
  ChatPage,
  CompanyVehicleDetailPage,
  CompanyVehicleFormPage,
  CompanyVehicleListPage,
  ContractDetailPage,
  ContractFormPage,
  ContractListPage,
  DashboardPage,
  ExpiringDocumentsPage,
  FeatureFlagsPage,
  HorillaHRPage,
  InventoryDetailPage,
  InventoryListPage,
  InventoryMovementsPage,
  InventoryReceivePage,
  InvoiceDetailPage,
  InvoiceFormPage,
  InvoiceListPage,
  LoginPage,
  MyForgeOSPage,
  PartnerCreatePage,
  PartnerDetailPage,
  PartnerEditPage,
  PartnerListPage,
  ProductCreatePage,
  ProductDetailPage,
  ProductEditPage,
  ProductListPage,
  QuotationDetailPage,
  QuotationFormPage,
  QuotationListPage,
  RentalDetailPage,
  RentalListPage,
  RentalReturnPage,
  RentalVehicleDetailPage,
  RentalVehicleFormPage,
  RentalVehicleListPage,
  RentalWizardPage,
  ReportsPage,
  RoleManagementPage,
  SalesDetailPage,
  SalesListPage,
  SalesPOSPage,
  SettingsPage,
  TasksPage,
  TenantSettingsPage,
  TwentyCRMPage,
  UserDetailPage,
  UserFormPage,
  UserListPage,
  WidgetPermissionsPage,
  WorksheetDetailPage,
  WorksheetEditPage,
  WorksheetListPage,
  WorksheetWizardPage,
} from '@/pages';
import { useAuthStore } from '@/stores/auth-store';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedLayout() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />

          {/* Protected routes with layout */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Rental routes */}
            <Route path="/rental" element={<RentalListPage />} />
            <Route path="/rental/new" element={<RentalWizardPage />} />
            <Route path="/rental/return" element={<RentalReturnPage />} />
            <Route path="/rental/:id" element={<RentalDetailPage />} />

            {/* Worksheet routes */}
            <Route path="/worksheet" element={<WorksheetListPage />} />
            <Route path="/worksheet/new" element={<WorksheetWizardPage />} />
            <Route path="/worksheet/:id" element={<WorksheetDetailPage />} />
            <Route path="/worksheet/:id/edit" element={<WorksheetEditPage />} />

            {/* Sales routes */}
            <Route path="/sales" element={<SalesListPage />} />
            <Route path="/sales/new" element={<SalesPOSPage />} />
            <Route path="/sales/:id" element={<SalesDetailPage />} />

            {/* Partner routes */}
            <Route path="/partners" element={<PartnerListPage />} />
            <Route path="/partners/new" element={<PartnerCreatePage />} />
            <Route path="/partners/:id" element={<PartnerDetailPage />} />
            <Route path="/partners/:id/edit" element={<PartnerEditPage />} />

            {/* Inventory routes */}
            <Route path="/inventory" element={<InventoryListPage />} />
            <Route path="/inventory/movements" element={<InventoryMovementsPage />} />
            <Route path="/inventory/receive" element={<InventoryReceivePage />} />
            <Route path="/inventory/:id" element={<InventoryDetailPage />} />

            {/* Product routes */}
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/new" element={<ProductCreatePage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/products/:id/edit" element={<ProductEditPage />} />

            {/* Quotation routes */}
            <Route path="/quotations" element={<QuotationListPage />} />
            <Route path="/quotations/:id" element={<QuotationDetailPage />} />
            <Route path="/quotations/:id/edit" element={<QuotationFormPage />} />

            {/* Contract routes */}
            <Route path="/contracts" element={<ContractListPage />} />
            <Route path="/contracts/:id" element={<ContractDetailPage />} />
            <Route path="/contracts/:id/edit" element={<ContractFormPage />} />

            {/* Invoice routes */}
            <Route path="/invoices" element={<InvoiceListPage />} />
            <Route path="/invoices/new" element={<InvoiceFormPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />

            {/* Vehicle routes (Epic 34: Járműnyilvántartás) */}
            <Route path="/vehicles/rental" element={<RentalVehicleListPage />} />
            <Route path="/vehicles/rental/new" element={<RentalVehicleFormPage />} />
            <Route path="/vehicles/rental/:id" element={<RentalVehicleDetailPage />} />
            <Route path="/vehicles/rental/:id/edit" element={<RentalVehicleFormPage />} />
            <Route path="/vehicles/company" element={<CompanyVehicleListPage />} />
            <Route path="/vehicles/company/new" element={<CompanyVehicleFormPage />} />
            <Route path="/vehicles/company/:id" element={<CompanyVehicleDetailPage />} />
            <Route path="/vehicles/company/:id/edit" element={<CompanyVehicleFormPage />} />
            <Route path="/vehicles/expiring" element={<ExpiringDocumentsPage />} />

            {/* User routes */}
            <Route path="/users" element={<UserListPage />} />
            <Route path="/users/new" element={<UserFormPage />} />
            <Route path="/users/roles" element={<RoleManagementPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
            <Route path="/users/:id/edit" element={<UserFormPage />} />

            {/* Settings routes */}
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/dashboard/permissions" element={<WidgetPermissionsPage />} />

            {/* Reports route */}
            <Route path="/reports" element={<ReportsPage />} />

            {/* Tasks route */}
            <Route path="/tasks" element={<TasksPage />} />

            {/* Chat route */}
            <Route path="/chat" element={<ChatPage />} />

            {/* Tenant Admin route */}
            <Route path="/tenant" element={<TenantSettingsPage />} />

            {/* Feature Flags route */}
            <Route path="/feature-flags" element={<FeatureFlagsPage />} />

            {/* Integration routes */}
            <Route path="/integrations/crm" element={<TwentyCRMPage />} />
            <Route path="/integrations/hr" element={<HorillaHRPage />} />

            {/* MyForgeOS route */}
            <Route path="/myforgeos" element={<MyForgeOSPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
