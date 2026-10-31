'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Download,
  KeyRound,
  LogOut,
  ShieldCheck,
  FileText,
  Printer,
  Calendar,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { todayStr, addDays, weekStart, monthStart, shortDate } from '@/lib/format';

function getLastMonthRange(currentDateStr: string) {
  const d = new Date(currentDateStr + 'T00:00:00Z');
  const firstOfCurrent = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const lastOfPrev = new Date(firstOfCurrent.getTime() - 86400000);
  const firstOfPrev = new Date(Date.UTC(lastOfPrev.getUTCFullYear(), lastOfPrev.getUTCMonth(), 1));
  return {
    from: firstOfPrev.toISOString().slice(0, 10),
    to: lastOfPrev.toISOString().slice(0, 10),
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [repeatPassword, setRepeatPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  // Sales PDF Export State
  const tz = 'Asia/Dhaka';
  const today = todayStr(tz);
  const [pdfPreset, setPdfPreset] = React.useState<
    'today' | 'yesterday' | 'week' | 'last7' | 'month' | 'last_month' | 'custom'
  >('today');
  const [pdfFrom, setPdfFrom] = React.useState(today);
  const [pdfTo, setPdfTo] = React.useState(today);

  const applyPreset = (
    preset: 'today' | 'yesterday' | 'week' | 'last7' | 'month' | 'last_month' | 'custom'
  ) => {
    setPdfPreset(preset);
    if (preset === 'today') {
      setPdfFrom(today);
      setPdfTo(today);
    } else if (preset === 'yesterday') {
      const y = addDays(today, -1);
      setPdfFrom(y);
      setPdfTo(y);
    } else if (preset === 'week') {
      setPdfFrom(weekStart(today, 6));
      setPdfTo(today);
    } else if (preset === 'last7') {
      setPdfFrom(addDays(today, -6));
      setPdfTo(today);
    } else if (preset === 'month') {
      setPdfFrom(monthStart(today));
      setPdfTo(today);
    } else if (preset === 'last_month') {
      const lm = getLastMonthRange(today);
      setPdfFrom(lm.from);
      setPdfTo(lm.to);
    }
  };

  const handleOpenPdf = (autoPrint: boolean = true) => {
    if (!pdfFrom || !pdfTo) {
      toast.error('Please select both from and to dates');
      return;
    }
    const from = pdfFrom <= pdfTo ? pdfFrom : pdfTo;
    const to = pdfFrom <= pdfTo ? pdfTo : pdfFrom;

    let title = 'Sales Report';
    if (pdfPreset === 'today') title = 'Daily Sales Report (Today)';
    else if (pdfPreset === 'yesterday') title = `Daily Sales Report (${shortDate(from)})`;
    else if (pdfPreset === 'week') title = 'Weekly Sales Report';
    else if (pdfPreset === 'last7') title = '7-Day Sales Report';
    else if (pdfPreset === 'month') title = 'Monthly Sales Report';
    else if (pdfPreset === 'last_month') title = 'Last Month Sales Report';
    else if (from === to) title = `Daily Sales Report (${shortDate(from)})`;
    else title = `Sales Statement (${shortDate(from)} - ${shortDate(to)})`;

    const url = `/print/sales-report?from=${from}&to=${to}&title=${encodeURIComponent(
      title
    )}${autoPrint ? '&auto=1' : ''}`;
    window.open(url, '_blank');
  };

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password';
      setError(msg);
      toast.error(msg);
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
          Manage your login credentials, download PDF sales reports, and manage system sessions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Change Password Card */}
        <Card>
          <form onSubmit={handleChangePassword}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-teal-700 dark:text-teal-400" />
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

        {/* Right Column: Sales Report PDF Export & Session Cards */}
        <div className="space-y-6">
          {/* Sales Report PDF Export Card */}
          <Card className="border-teal-100 dark:border-teal-950/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                Sales Report PDF Export
              </CardTitle>
              <CardDescription>
                Download or print complete sales & profit statements as an A4 PDF document.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Period Quick Selection Pills */}
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 block">
                  Select Sales Period
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { id: 'today', label: 'Today (Daily)' },
                    { id: 'yesterday', label: 'Yesterday' },
                    { id: 'week', label: 'This Week' },
                    { id: 'last7', label: 'Last 7 Days' },
                    { id: 'month', label: 'This Month' },
                    { id: 'last_month', label: 'Last Month' },
                    { id: 'custom', label: 'Custom' },
                  ] as const).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => applyPreset(item.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                        pdfPreset === item.id
                          ? 'bg-teal-700 text-white shadow-xs dark:bg-teal-600'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={pdfFrom}
                    onChange={(e) => {
                      setPdfFrom(e.target.value);
                      setPdfPreset('custom');
                    }}
                    className="text-xs h-9"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={pdfTo}
                    onChange={(e) => {
                      setPdfTo(e.target.value);
                      setPdfPreset('custom');
                    }}
                    className="text-xs h-9"
                    required
                  />
                </div>
              </div>

              {/* Selected Period Info Banner */}
              <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-semibold text-teal-900 dark:text-teal-200">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
                    <span>Selected Period:</span>
                  </span>
                  <span className="font-bold">
                    {pdfFrom === pdfTo
                      ? shortDate(pdfFrom) || pdfFrom
                      : `${shortDate(pdfFrom) || pdfFrom} — ${shortDate(pdfTo) || pdfTo}`}
                  </span>
                </div>
                <p className="text-[11px] text-teal-800/80 dark:text-teal-300/70">
                  Includes full financial overview, revenue, cost, profit, category breakdown, and itemized sales.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => handleOpenPdf(true)}
                  className="flex-1 h-9.5 text-xs font-semibold shadow-xs"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Download Sales Report (PDF)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenPdf(false)}
                  className="h-9.5 text-xs font-medium"
                >
                  <Eye className="h-4 w-4 mr-1.5" />
                  Preview
                </Button>
              </div>

              {/* Subtle Database JSON backup link */}
              <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
                <a
                  href="/api/backup"
                  download
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 inline-flex items-center gap-1 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Need raw database copy? Download .json backup
                </a>
              </div>
            </CardContent>
          </Card>

          {/* Account Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-700 dark:text-teal-400" />
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
