'use client';

import * as React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { money, profitClass, variant } from '@/lib/format';
import { toast } from 'sonner';

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
  const [soldDate, setSoldDate] = React.useState<string>('');
  const [note, setNote] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (product) {
      setQuantity(1);
      setUnitPrice(product.selling_price && product.selling_price > 0 ? product.selling_price : '');
      setSoldDate('');
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
          sold_date: soldDate || undefined,
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record sale');

      if (isLoss) {
        toast.warning(`Sale recorded: ${quantity} × ${product.name}`, {
          description: `Total: ${money(totalRevenue)} • Net Loss: ${money(totalProfit)}`,
        });
      } else {
        toast.success(`Sale recorded: ${quantity} × ${product.name}`, {
          description: `Total: ${money(totalRevenue)} • Profit: ${money(totalProfit)}`,
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

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Sale Date (Leave empty for today)
            </label>
            <Input type="date" value={soldDate} onChange={(e) => setSoldDate(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Note (Optional)
            </label>
            <Input
              placeholder="e.g. Customer name, discount reason"
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
