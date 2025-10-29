import { userService } from '@/lib/user-service';
import { notFound, redirect } from 'next/navigation';
import { SubmitButton } from '@/components/ui/submit-button';

export const dynamic = 'force-dynamic';

async function updateUserAction(formData: FormData) {
  'use server';
  const userId = formData.get('id') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  await userService.update(userId, { name, email });
  redirect(`/users/${userId}?saved=1`);
}

export default async function UserDetailPage({ params, searchParams }: { params: { id: string }, searchParams?: { saved?: string } }) {
  const res = await userService.getById(params.id, true);
  if (!res.success || !res.data) return notFound();
  const u = res.data;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">User Detail</h1>
      {searchParams?.saved && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm">Changes saved</div>
      )}
      <div className="space-y-2">
        <div><span className="font-medium">ID:</span> {u.id}</div>
        <div><span className="font-medium">Role:</span> {u.role}</div>
        <div><span className="font-medium">Status:</span> {u.status}</div>
      </div>

      <form action={updateUserAction} className="space-y-3 max-w-md border p-4 rounded">
        <input type="hidden" name="id" value={u.id} />
        <div className="space-y-1">
          <label className="block text-sm">Name</label>
          <input name="name" defaultValue={u.name} required minLength={2} className="w-full border p-2 rounded" aria-invalid={false} />
          <p className="text-xs text-muted-foreground">Required. At least 2 characters.</p>
        </div>
        <div className="space-y-1">
          <label className="block text-sm">Email</label>
          <input name="email" type="email" defaultValue={u.email} required className="w-full border p-2 rounded" aria-invalid={false} />
          <p className="text-xs text-muted-foreground">Must be a valid email.</p>
        </div>
        <SubmitButton className="bg-black text-white" loadingText="Saving...">Save</SubmitButton>
      </form>
    </div>
  );
}
