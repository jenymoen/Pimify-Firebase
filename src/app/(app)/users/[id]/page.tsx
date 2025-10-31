import { userService } from '@/lib/user-service';
import { notFound } from 'next/navigation';
import UserDetailClient from '@/components/users/user-detail-client';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const res = await userService.getById(params.id, true);
  if (!res.success || !res.data) return notFound();
  const u = res.data;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">User Detail</h1>
      <UserDetailClient initial={u as any} />
    </div>
  );
}
