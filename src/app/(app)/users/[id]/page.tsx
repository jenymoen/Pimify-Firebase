import { userService } from '@/lib/user-service';
import { notFound } from 'next/navigation';
import UserDetailClient from '@/components/users/user-detail-client';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await userService.getById(id, true);
  if (!res.success || !res.data) return notFound();
  const u = res.data;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Breadcrumb items={[
          { label: 'Users', href: '/users' },
          { label: u.name || 'User Detail' }
        ]} />
        <h1 className="text-2xl font-semibold">User Detail</h1>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading user details...</div>}>
        <UserDetailClient initial={u as any} />
      </Suspense>
    </div>
  );
}
