import { redirect } from 'next/navigation';
import type { Profile, UserRole } from '@/lib/auth';

export function requireRoles(profile: Profile | null, allowed: UserRole[], fallback = '/leads') {
  if (!profile) redirect('/login');
  if (!allowed.includes(profile.role)) redirect(fallback);
}
