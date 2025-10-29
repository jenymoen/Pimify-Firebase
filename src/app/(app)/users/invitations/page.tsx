import { invitationService } from '@/lib/invitation-service';
import { UserRole } from '@/types/workflow';
import { SubmitButton } from '@/components/ui/submit-button';

export const dynamic = 'force-dynamic';

async function createInvitationAction(formData: FormData) {
  'use server';
  const email = (formData.get('email') as string)?.trim();
  const role = formData.get('role') as UserRole;
  const message = (formData.get('message') as string) || undefined;
  if (!email || !role) return;
  await invitationService.create({ email, role, message });
  return { ok: true, email, created: 1 } as any;
}

async function searchInvitationsAction(formData: FormData) {
  'use server';
  const email = (formData.get('email') as string)?.trim();
  if (!email) return;
  return { email } as any;
}

async function resendInvitationAction(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const email = formData.get('email') as string;
  if (!id) return;
  await invitationService.resend(id);
  return { ok: true, email, resent: 1 } as any;
}

async function cancelInvitationAction(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const email = formData.get('email') as string;
  if (!id) return;
  await invitationService.cancel(id, 'Cancelled via UI');
  return { ok: true, email, canceled: 1 } as any;
}

async function getInvites(email?: string) {
  if (!email) return [] as Awaited<ReturnType<typeof invitationService.listByEmail>>['data'];
  const res = await invitationService.listByEmail(email);
  return res.data || [];
}

export default async function InvitationsPage({ searchParams }: { searchParams?: { email?: string, created?: string, resent?: string, canceled?: string } }) {
  const email = searchParams?.email || '';
  const invites = await getInvites(email);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Invitations</h1>

      <form action={createInvitationAction} className="space-y-3 border rounded p-4 max-w-xl">
        <h2 className="font-medium">Create Invitation</h2>
        <div className="space-y-1">
          <label className="block text-sm">Email</label>
          <input name="email" type="email" className="w-full border p-2 rounded" required aria-invalid={false} />
          <p className="text-xs text-muted-foreground">We’ll email an invitation link.</p>
        </div>
        <div className="space-y-1">
          <label className="block text-sm">Role</label>
          <select name="role" className="w-full border p-2 rounded" required>
            <option value="VIEWER">VIEWER</option>
            <option value="EDITOR">EDITOR</option>
            <option value="REVIEWER">REVIEWER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm">Message (optional)</label>
          <textarea name="message" className="w-full border p-2 rounded" rows={3} />
        </div>
        <SubmitButton className="bg-black text-white" loadingText="Sending...">Send Invitation</SubmitButton>
      </form>

      <form action={searchInvitationsAction} className="space-y-3 max-w-xl">
        <h2 className="font-medium">Search by Email</h2>
        <div className="flex gap-2">
          <input name="email" defaultValue={email} placeholder="user@example.com" className="flex-1 border p-2 rounded" aria-invalid={false} />
          <SubmitButton className="bg-gray-900 text-white" loadingText="Searching...">Search</SubmitButton>
        </div>
      </form>

      {(searchParams?.created || searchParams?.resent || searchParams?.canceled) && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm">
          {searchParams?.created && 'Invitation created.'}
          {searchParams?.resent && ' Invitation resent.'}
          {searchParams?.canceled && ' Invitation canceled.'}
        </div>
      )}

      {email && (
        <div className="space-y-2">
          <h2 className="font-medium">Results for {email}</h2>
          <div className="border rounded overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Token</th>
                  <th className="text-left p-2">Expires</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map(inv => (
                  <tr key={inv.id} className="border-t">
                    <td className="p-2">{inv.status}</td>
                    <td className="p-2">{inv.role}</td>
                    <td className="p-2 truncate max-w-xs">{inv.token}</td>
                    <td className="p-2">{inv.expiresAt ? new Date(inv.expiresAt).toLocaleString() : '-'}</td>
                    <td className="p-2">
                      <form action={resendInvitationAction} className="inline-block mr-2">
                        <input type="hidden" name="id" value={inv.id} />
                        <input type="hidden" name="email" value={email} />
                        <SubmitButton className="border rounded px-2 py-1" loadingText="Resending...">Resend</SubmitButton>
                      </form>
                      <form action={cancelInvitationAction} className="inline-block">
                        <input type="hidden" name="id" value={inv.id} />
                        <input type="hidden" name="email" value={email} />
                        <SubmitButton className="border rounded px-2 py-1" loadingText="Canceling...">Cancel</SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
