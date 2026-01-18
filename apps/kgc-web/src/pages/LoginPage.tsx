import { authApi } from '@/api/auth';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/ui';
import { useAuthStore } from '@/stores/auth-store';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);

  const [email, setEmail] = useState('admin@kgc.hu');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authApi.login({ email, password });
      login(response.accessToken, response.refreshToken, response.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bejelentkezési hiba');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-kgc-primary to-kgc-primary-dark p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-kgc-primary/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-kgc-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl">KGC ERP</CardTitle>
          <CardDescription>Kisgépcentrum ERP Rendszer</CardDescription>
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            DEV
          </span>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <Input
              label="E-mail cím"
              type="email"
              name="email"
              placeholder="pelda@email.hu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Jelszó"
              type="password"
              name="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-slate-600 dark:bg-slate-700"
                />
                <span className="text-gray-600 dark:text-gray-400">Emlékezz rám</span>
              </label>
              <a href="/forgot-password" className="text-kgc-primary hover:underline">
                Elfelejtett jelszó?
              </a>
            </div>
          </CardContent>

          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" loading={loading}>
              Bejelentkezés
            </Button>

            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
              <p className="rounded-md bg-amber-50 dark:bg-amber-900/30 p-2 text-amber-700 dark:text-amber-300">
                <strong>Teszt adatok:</strong> admin@kgc.hu / admin123
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
