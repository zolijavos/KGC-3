import { RoleBasedDashboard } from '@/features/dashboard/components';
import type { UserRole } from '@/features/dashboard/lib/widget-registry';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Dashboard Page
 * Uses RoleBasedDashboard to render widgets based on user role
 */
export function DashboardPage() {
  const { user } = useAuthStore();

  // Default to OPERATOR if role is not set
  const userRole: UserRole = (user?.role as UserRole) || 'OPERATOR';

  return (
    <div className="min-h-full p-6 kgc-bg">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Üdvözöljük, {user?.name?.split(' ')[0] || 'Felhasználó'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Itt van a mai nap összefoglalója.</p>
      </div>

      {/* Role-Based Dashboard Widgets */}
      <RoleBasedDashboard userRole={userRole} />
    </div>
  );
}
