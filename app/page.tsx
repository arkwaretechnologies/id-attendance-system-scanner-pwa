'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';

const Scanner = dynamic(() => import('@/components/Scanner'), { ssr: false });

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user && pathname === '/') {
      router.replace('/login');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }
  if (!user) {
    return null;
  }
  return <Scanner />;
}
