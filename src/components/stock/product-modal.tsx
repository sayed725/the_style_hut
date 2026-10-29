'use client';

import * as React from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { money, pct } from '@/lib/format';
import { toast } from 'sonner';

interface Product {
  id?: number;
  sku?: string;
  name: string;
  category?: string;
  size?: string;
  color?: string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  low_stock: number;
}

interface ProductModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProductModal({ product, open, onOpenChange, onSuccess }: ProductModalProps) {
  const isEdit = !!product?.id;
  const [name, setName] = React.useState('');
  const [sku, setSku] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [size, setSize] = React.useState('');
  const [color, setColor] = React.useState('');
  const [buyPrice, setBuyPrice] = React.useState<number | string>('');
  const [sellPrice, setSellPrice] = React.useState<number | string>('');
  const [quantity, setQuantity] = React.useState<number | string>('');
  const [lowStock, setLowStock] = React.useState<number | string>(3);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (product) {
      setName(product.name || '');
      setSku(product.sku || '');
      setCategory(product.category || '');
      setSize(product.size || '');
      setColor(product.color || '');
      setBuyPrice(product.purchase_price ?? '');
      setSellPrice(product.selling_price ?? '');
      setQuantity(product.quantity ?? '');
      setLowStock(product.low_stock ?? 3);
      setError('');
    } else {
      setName('');
      setSku('');
      setCategory('');
      setSize('');
      setColor('');
      setBuyPrice('');
      setSellPrice('');
      setQuantity('');
      setLowStock(3);
      setError('');
    }
  }, [product, open]);

  const buy = parseFloat(String(buyPrice)) || 0;
  const sell = parseFloat(String(sellPrice)) || 0;
  const expectedProfit = sell - buy;
  const marginPct = sell > 0 ? ((sell - buy) / sell) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const url = isEdit ? `/api/products/${product.id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          sku,
          category,
          size,
          color,
          purchase_price: buyPrice,
          selling_price: sellPrice,
          quantity: quantity || 0,
          low_stock: lowStock || 3,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product');

      toast.success(isEdit ? `Updated "${name}"` : `Added "${name}" to stock`, {
        description: `${quantity || 0} pcs available at ${money(Number(sellPrice) || 0)}`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update product details. Prices will apply to all future sales.'
              : 'Add an item to your inventory with buying cost and selling price.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3.5">
          {error && <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg">{error}</div>}

          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Product Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Cotton T-Shirt" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Category</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Shirts" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">SKU / Code</label>
              <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. TSH-001" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Size</label>
              <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="M, L, XL, 42..." />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Color</label>
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Blue, Black..." />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Purchase Price (Cost) *</label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Selling Price *</label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                required
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Quantity in Stock *</label>
              <Input
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Low Stock Alert At</label>
              <Input
                type="number"
                min={0}
                value={lowStock}
                onChange={(e) => setLowStock(e.target.value)}
                placeholder="3"
              />
            </div>
          </div>

          {/* Expected Profit Indicator */}
          {buy > 0 && sell > 0 && (
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs flex justify-between items-center text-emerald-800 dark:text-emerald-300 font-medium">
              <span>Expected profit per piece:</span>
              <span className="font-bold">{money(expectedProfit)} ({pct(marginPct)} margin)</span>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
