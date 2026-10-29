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
  selling_price?: number;
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
  const [category, setCategory] = React.useState('');
  const [buyPrice, setBuyPrice] = React.useState<number | string>('');
  const [quantity, setQuantity] = React.useState<number | string>('');
  const [lowStock, setLowStock] = React.useState<number | string>(3);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [sku, setSku] = React.useState('');
  const [size, setSize] = React.useState('');
  const [color, setColor] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCategory(product.category || '');
      setBuyPrice(product.purchase_price ?? '');
      setQuantity(product.quantity ?? '');
      setLowStock(product.low_stock ?? 3);
      setSku(product.sku || '');
      setSize(product.size || '');
      setColor(product.color || '');
      setShowAdvanced(Boolean(product.sku || product.size || product.color));
      setError('');
    } else {
      setName('');
      setCategory('');
      setBuyPrice('');
      setQuantity('');
      setLowStock(3);
      setSku('');
      setSize('');
      setColor('');
      setShowAdvanced(false);
      setError('');
    }
  }, [product, open]);

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
          category,
          purchase_price: buyPrice,
          quantity: quantity || 0,
          low_stock: lowStock || 3,
          sku,
          size,
          color,
          selling_price: product?.selling_price || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save product');

      toast.success(isEdit ? `Updated "${name}"` : `Added "${name}" to stock`, {
        description: `${quantity || 0} pcs in stock • Cost: ${money(Number(buyPrice) || 0)}`,
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
              ? 'Update product details and stock.'
              : 'Add an item to stock with its purchase price and inventory count.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg">{error}</div>}

          {/* Product Name */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Product Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Cotton T-Shirt, Denim Jacket"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Category
            </label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Shirts, Pants, Panjabi"
            />
          </div>

          {/* Purchase Price (Cost) */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
              Purchase Price (Cost per piece) *
            </label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              required
              placeholder="0.00"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              What you paid to purchase this item. Selling price will be set when you make a sale.
            </p>
          </div>

          {/* Quantity & Low Stock Alert */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Quantity in Stock *
              </label>
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
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                Low Stock Alert At
              </label>
              <Input
                type="number"
                min={0}
                value={lowStock}
                onChange={(e) => setLowStock(e.target.value)}
                placeholder="3"
              />
            </div>
          </div>

          {/* Optional Variant Details Toggle */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showAdvanced ? '− Hide optional details (Size, Color, SKU)' : '+ Add optional details (Size, Color, SKU)'}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Size</label>
                    <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="M, L, XL, 42..." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Color</label>
                    <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Black, Navy, White..." />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">SKU / Code</label>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. TSH-001" />
                </div>
              </div>
            )}
          </div>
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
