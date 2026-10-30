'use client';

import * as React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { money, profitClass, variant, todayStr, addDays, longDate } from '@/lib/format';
import { toast } from 'sonner';
import { Calendar, Banknote, CreditCard, Clock, Check } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  size?: string;
  color?: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
}

interface SellModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function SellModal({ product, open, onOpenChange, onSuccess }: SellModalProps) {
  const [quantity, setQuantity] = React.useState<number>(1);
  const [unitPrice, setUnitPrice] = React.useState<number | string>('');
  const [soldDate, setSoldDate] = React.useState<string>(todayStr());
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'online' | 'due'>('cash');
  const [note, setNote] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (product) {
      setQuantity(1);
      setUnitPrice(product.selling_price && product.selling_price > 0 ? product.selling_price : '');
      setSoldDate(todayStr());
      setPaymentMethod('cash');
      setNote('');
      setError('');
    }
  }, [product, open]);

  if (!product) return null;

  const numPrice = typeof unitPrice === 'number' ? unitPrice : parseFloat(String(unitPrice)) || 0;
  const totalRevenue = quantity * numPrice;
  const totalCost = quantity * product.purchase_price;
  const totalProfit = totalRevenue - totalCost;
  const isProfit = totalProfit > 0;
  const isLoss = totalProfit < 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numPrice < 0) {
      setError('Selling price cannot be negative');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          quantity,
          unit_price: numPrice,
          sold_date: soldDate || todayStr(),
          payment_method: paymentMethod,
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record sale');

      const methodLabel = paymentMethod === 'online' ? 'Online' : paymentMethod === 'due' ? 'Due' : 'Cash';

      if (isLoss) {
        toast.warning(`Sale recorded: ${quantity} × ${product.name}`, {
          description: `Total: ${money(totalRevenue)} • ${methodLabel} Sale • Net Loss: ${money(totalProfit)}`,
        });
      } else {
        toast.success(`Sale recorded: ${quantity} × ${product.name}`, {
          description: `Total: ${money(totalRevenue)} • ${methodLabel} Sale • Profit: ${money(totalProfit)}`,
        });
      }

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Sell: {product.name}</DialogTitle>
          <DialogDescription>
            {[
              variant(product),
              `${product.quantity} pcs in stock`,
              `Cost price ${money(product.purchase_price)}/pc`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Quantity *
              </label>
              <Input
                type="number"
                min={1}
                max={product.quantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Selling Price (per piece) *
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="Enter sale price..."
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Sale Type / Payment Method (Cash, Online, Due) */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Payment / Sale Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMethod === 'cash'
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-500/80 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Banknote className={`h-4 w-4 ${paymentMethod === 'cash' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                  {paymentMethod === 'cash' && <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <div>
                  <div className={`text-xs font-bold ${paymentMethod === 'cash' ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-800 dark:text-slate-200'}`}>
                    Cash Sale
                  </div>
                  <div className="text-[10px] text-slate-400">Cash in hand</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('online')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMethod === 'online'
                    ? 'border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 dark:border-sky-500/80 ring-2 ring-sky-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <CreditCard className={`h-4 w-4 ${paymentMethod === 'online' ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                  {paymentMethod === 'online' && <Check className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />}
                </div>
                <div>
                  <div className={`text-xs font-bold ${paymentMethod === 'online' ? 'text-sky-900 dark:text-sky-200' : 'text-slate-800 dark:text-slate-200'}`}>
                    Online Sale
                  </div>
                  <div className="text-[10px] text-slate-400">bKash / Card</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('due')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  paymentMethod === 'due'
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 dark:border-amber-500/80 ring-2 ring-amber-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Clock className={`h-4 w-4 ${paymentMethod === 'due' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                  {paymentMethod === 'due' && <Check className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
                </div>
                <div>
                  <div className={`text-xs font-bold ${paymentMethod === 'due' ? 'text-amber-900 dark:text-amber-200' : 'text-slate-800 dark:text-slate-200'}`}>
                    Due Sale
                  </div>
                  <div className="text-[10px] text-slate-400">Unpaid / Bakir</div>
                </div>
              </button>
            </div>
            {paymentMethod === 'due' && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1 font-medium">
                💡 Tip: Note customer name or contact below to keep track of this due sale.
              </p>
            )}
          </div>

          {/* Actual Date Picker with Presets and Calendar View */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Sale Date *
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSoldDate(todayStr())}
                  className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    soldDate === todayStr()
                      ? 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-semibold'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setSoldDate(addDays(todayStr(), -1))}
                  className={`text-[11px] px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                    soldDate === addDays(todayStr(), -1)
                      ? 'bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-semibold'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  Yesterday
                </button>
              </div>
            </div>

            <div
              onClick={() => {
                try {
                  dateInputRef.current?.showPicker();
                } catch {
                  dateInputRef.current?.focus();
                }
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer group"
            >
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/50 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {soldDate ? longDate(soldDate) : 'Select date'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {soldDate === todayStr() ? 'Today' : soldDate === addDays(todayStr(), -1) ? 'Yesterday' : soldDate}
                </div>
              </div>
              <input
                ref={dateInputRef}
                type="date"
                value={soldDate}
                max={todayStr()}
                onChange={(e) => setSoldDate(e.target.value)}
                className="opacity-0 absolute w-0 h-0 pointer-events-none"
              />
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 group-hover:underline">
                Pick Date
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Note (Optional)
            </label>
            <Input
              placeholder={paymentMethod === 'due' ? 'Customer name, phone number, due details...' : 'Customer name, discount reason...'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Dynamic Profit / Loss Calculation Preview */}
          <div
            className={`p-3.5 rounded-xl border text-xs transition-colors ${
              isLoss
                ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                : isProfit
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60 mb-2">
              <span className="text-slate-500">Buying Cost ({quantity} × {money(product.purchase_price)}):</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                {money(totalCost)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60 mb-2">
              <span className="text-slate-500">Total Sale Amount:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                {money(totalRevenue)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="font-semibold text-slate-600 dark:text-slate-400">
                {isLoss ? 'Estimated Loss:' : isProfit ? 'Estimated Profit:' : 'Net Result:'}
              </span>
              <span
                className={`font-mono font-extrabold text-sm ${
                  isLoss
                    ? 'text-rose-600 dark:text-rose-400'
                    : isProfit
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {money(totalProfit)}
              </span>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={isLoss ? 'destructive' : 'primary'}
            disabled={loading || product.quantity < quantity || unitPrice === ''}
          >
            {loading ? 'Recording...' : isLoss ? 'Confirm Sale (at Loss)' : 'Record Sale'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
