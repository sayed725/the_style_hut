'use client';

import * as React from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrintControlBarProps {
  title: string;
  from: string;
  to: string;
  autoPrint?: boolean;
}

export function PrintControlBar({ title, from, to, autoPrint }: PrintControlBarProps) {
  const [printed, setPrinted] = React.useState(false);

  React.useEffect(() => {
    if (autoPrint && !printed) {
      const timer = setTimeout(() => {
        window.print();
        setPrinted(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, printed]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="no-print sticky top-0 z-50 bg-slate-900 text-white shadow-md border-b border-slate-800 px-4 py-3 sm:px-6">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left Side: Back & Info */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <Link href="/settings">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white text-xs h-8 px-2.5"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Settings
            </Button>
          </Link>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>{title}</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Period: {from} {from !== to ? `to ${to}` : ''}
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <div className="hidden lg:flex items-center text-xs text-amber-300/90 gap-1.5 bg-amber-950/40 border border-amber-500/20 px-2.5 py-1 rounded-md">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Select &ldquo;Save as PDF&rdquo; in printer destination to save file</span>
          </div>

          <Button
            onClick={handlePrint}
            variant="primary"
            size="sm"
            className="w-full sm:w-auto h-8 px-3.5 text-xs font-semibold shadow-sm bg-teal-600 hover:bg-teal-500 text-white"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print / Save as PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
