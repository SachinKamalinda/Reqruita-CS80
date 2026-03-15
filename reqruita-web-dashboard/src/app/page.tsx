'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/api';

export default function RootRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = Boolean(getToken());
    router.replace(isAuthenticated ? '/home' : '/signin');
  }, [router]);

  return null;
}