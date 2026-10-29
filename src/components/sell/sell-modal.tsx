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
  const [unitPrice, setUnitPrice] = React.useState<number>(0);
  const [soldDate, setSoldDate] = React.useState<string>('');
  const [note, setNote] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (product) {
      setQuantity(1);
      setUnitPrice(product.selling_price || 0);
      setSoldDate('');
      setNote('');
      setError('');
    }
  }, [product, open]);

  if (!product) return null;

  const totalRevenue = quantity * unitPrice;
  const totalProfit = quantity * (unitPrice - product.purchase_price);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          quantity,
          unit_price: unitPrice,
          sold_date: soldDate || undefined,
          note,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record sale');

      toast.success(`Sold ${quantity} × ${product.name}`, {
        description: `Total: ${money(totalRevenue)} • Profit: ${money(totalProfit)}`,
      });

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
            {[variant(product), `${product.quantity} in stock`, `Cost ${money(product.purchase_price)}`].filter(Boolean).join(' · ')}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Quantity *</label>
              <Input
                type="number"
                min={1}
                max={product.quantity}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Selling Price *</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Date (Leave empty for today)</label>
            <Input type="date" value={soldDate} onChange={(e) => setSoldDate(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Note</label>
            <Input placeholder="Optional (e.g. discount, customer)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          </div>

          {/* Live Profit Preview Box */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex justify-between items-center">
            <div>
              <span className="text-slate-500">Total: </span>
              <span className="font-bold text-slate-900 dark:text-white">{money(totalRevenue)}</span>
            </div>
            <div>
              <span className="text-slate-500">Profit: </span>
              <span className={profitClass(totalProfit)}>{money(totalProfit)}</span>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading || product.quantity < quantity}>
            {loading ? 'Recording...' : 'Record Sale'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
