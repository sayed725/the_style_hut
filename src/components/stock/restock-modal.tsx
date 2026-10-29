'use client';

import * as React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { money } from '@/lib/format';
import { toast } from 'sonner';

interface Product {
  id: number;
  name: string;
  quantity: number;
  purchase_price: number;
}

interface RestockModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RestockModal({ product, open, onOpenChange, onSuccess }: RestockModalProps) {
  const [quantity, setQuantity] = React.useState<number | string>('');
  const [cost, setCost] = React.useState<number | string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (product) {
      setQuantity('');
      setCost(product.purchase_price || '');
      setError('');
    }
  }, [product, open]);

  if (!product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/products/${product.id}/restock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity,
          unit_cost: cost !== '' ? cost : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restock');

      toast.success(`Restocked ${quantity} pcs of "${product.name}"`, {
        description: `New total: ${product.quantity + Number(quantity)} pieces available.`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to restock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Restock: {product.name}</DialogTitle>
          <DialogDescription>
            Currently {product.quantity} in stock at cost of {money(product.purchase_price)} each.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg">{error}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Pieces Received *</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Purchase Price Each</label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder={String(product.purchase_price)}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            If the newly bought price differs, the system calculates a weighted-average cost across old and new inventory to ensure exact profit calculations.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add to Stock'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
