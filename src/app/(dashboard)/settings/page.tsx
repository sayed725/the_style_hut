'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [repeatPassword, setRepeatPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== repeatPassword) {
      setError('New passwords do not match');
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: currentPassword, next: newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');

      toast.success('Password updated successfully! Other active sessions were signed out.');
      setSuccess('Password updated successfully! Other active sessions were signed out.');
      setCurrentPassword('');
      setNewPassword('');
      setRepeatPassword('');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
      toast.success('Signed out successfully.');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Failed to log out');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Settings & Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          Manage your login credentials, export database snapshots, and system settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Change Password Card */}
        <Card>
          <form onSubmit={handleChangePassword}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-teal-700" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your administrative password (8 to 72 characters).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {error && <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg">{error}</div>}
              {success && <div className="p-3 text-xs bg-emerald-50 text-emerald-700 rounded-lg">{success}</div>}

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Current Password</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  maxLength={72}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Repeat New Password</label>
                <Input
                  type="password"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  minLength={8}
                  maxLength={72}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="primary" disabled={loading} className="w-full">
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Backup & System Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-4 w-4 text-teal-700" />
                Database Snapshot Backup
              </CardTitle>
              <CardDescription>
                Download a complete, offline JSON copy of all products, sales history, stock logs, and account records.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500 mb-4">
                We recommend downloading a copy regularly and storing it securely on your Google Drive or computer.
              </p>
              <a href="/api/backup" download>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Backup (.json)
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Account Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-700" />
                Session & Security
              </CardTitle>
              <CardDescription>
                Secure session cookies with 12-hour idle timeout.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out of Store
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
