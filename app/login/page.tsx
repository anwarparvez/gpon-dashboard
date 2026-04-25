import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-4">
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}