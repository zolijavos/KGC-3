import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const quickActions = [
    { title: 'Bérlés indítása', icon: '🔧', color: 'bg-blue-500', href: '/rental/new' },
    { title: 'Munkalap', icon: '📋', color: 'bg-green-500', href: '/worksheet/new' },
    { title: 'Értékesítés', icon: '💰', color: 'bg-amber-500', href: '/sales/new' },
    { title: 'Készlet', icon: '📦', color: 'bg-cyan-500', href: '/inventory' },
    { title: 'Partner keresés', icon: '👤', color: 'bg-purple-500', href: '/partners' },
  ];

  const stats = [
    { label: 'Mai bérlések', value: '12', change: '+3', href: '/rental' },
    { label: 'Nyitott munkalapok', value: '8', change: '-2', href: '/worksheet' },
    { label: 'Mai bevétel', value: '245.000 Ft', change: '+15%', href: null },
    { label: 'Aktív partnerek', value: '156', change: '+5', href: '/partners' },
  ];

  return (
    <div className="min-h-full p-6 kgc-bg">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Üdvözöljük, {user?.name?.split(' ')[0] || 'Felhasználó'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Itt van a mai nap összefoglalója.</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(stat => (
          <Card
            key={stat.label}
            className={stat.href ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}
            onClick={() => stat.href && navigate(stat.href)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                {stat.href && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400 dark:text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                <span className="text-sm text-green-600 dark:text-green-400">{stat.change}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Gyors műveletek</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {quickActions.map(action => (
              <button
                key={action.title}
                onClick={() => navigate(action.href)}
                className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-200 dark:border-slate-600 p-6 transition-colors hover:border-kgc-primary hover:bg-kgc-primary/5 dark:hover:bg-kgc-primary/10"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-full ${action.color} text-2xl text-white`}
                >
                  {action.icon}
                </span>
                <span className="font-medium text-gray-700 dark:text-gray-200">{action.title}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Legutóbbi tevékenység</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { time: '10:32', text: 'Bérlés lezárva - Makita akkus fúró', user: 'Kovács Péter' },
              { time: '09:45', text: 'Új munkalap létrehozva - M-2024-0156', user: 'Nagy Anna' },
              { time: '09:12', text: 'Partner regisztrálva - Horváth Kft.', user: 'Szabó Gábor' },
              { time: '08:30', text: 'Rendszer elindítva', user: 'Rendszer' },
            ].map((activity, i) => (
              <div key={i} className="flex items-start gap-4 text-sm">
                <span className="w-12 flex-shrink-0 text-gray-400 dark:text-gray-500">
                  {activity.time}
                </span>
                <span className="flex-1 text-gray-700 dark:text-gray-300">{activity.text}</span>
                <span className="text-gray-500 dark:text-gray-400">{activity.user}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
