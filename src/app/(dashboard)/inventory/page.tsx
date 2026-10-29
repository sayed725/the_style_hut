'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProductModal } from '@/components/stock/product-modal';
import { RestockModal } from '@/components/stock/restock-modal';
import { SellModal } from '@/components/sell/sell-modal';
import { money, num, pct, profitClass, variant } from '@/lib/format';
import { Plus, Search, Package, Edit, Trash2, RotateCcw, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

export default function InventoryPage() {
  const [products, setProducts] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [showArchived, setShowArchived] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Modals state
  const [productModalOpen, setProductModalOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<any>(null);
  const [restockProduct, setRestockProduct] = React.useState<any>(null);
  const [sellProduct, setSellProduct] = React.useState<any>(null);

  const fetchProducts = React.useCallback(() => {
    setLoading(true);
    fetch(`/api/products${showArchived ? '?archived=1' : ''}`)
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [showArchived]);

  React.useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = products.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return [p.name, p.sku, p.category, p.size, p.color].join(' ').toLowerCase().includes(term);
  });

  const totalPieces = filtered.reduce((acc, p) => acc + (p.quantity || 0), 0);

  const handleRemove = async (p: any) => {
    if (!confirm(`Remove "${p.name}"? If it has past sales it is archived (sales records are preserved), otherwise permanently deleted.`)) return;
    try {
      const res = await fetch(`/api/products/${p.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete product');
      toast.success(`"${p.name}" removed / archived.`);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove product');
    }
  };

  const handleRestore = async (p: any) => {
    try {
      const res = await fetch(`/api/products/${p.id}/restore`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to restore product');
      toast.success(`"${p.name}" restored to active stock.`);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to restore product');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Stock Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {filtered.length} products • {num(totalPieces)} total pieces on hand
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingProduct(null);
            setProductModalOpen(true);
          }}
          className="font-bold shadow-md self-start sm:self-auto"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Product
        </Button>
      </div>

      {/* Controls Bar: Search & Active/Archived Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search by name, SKU, size..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 shadow-xs rounded-xl"
          />
        </div>

        {/* Segmented Filter */}
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/80 p-1 self-start sm:self-auto shadow-2xs">
          <button
            onClick={() => setShowArchived(false)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !showArchived ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Active Products
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              showArchived ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Desktop Table View (>= md screens) */}
      <Card className="hidden md:block overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold select-none">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Variant</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Margin</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Loading stock data...</td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((p) => {
                  const marginPct = p.selling_price > 0 ? ((p.selling_price - p.purchase_price) / p.selling_price) * 100 : 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {[p.category, p.sku].filter(Boolean).join(' • ') || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {variant(p) || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={p.quantity === 0 ? 'destructive' : p.quantity <= p.low_stock ? 'warning' : 'success'}>
                          {p.quantity === 0 ? 'Out of stock' : `${p.quantity} in stock`}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-300 font-mono">
                        {money(p.purchase_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white font-mono">
                        {money(p.selling_price)}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${profitClass(marginPct)} font-mono`}>
                        {pct(marginPct)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {showArchived ? (
                            <Button size="sm" variant="outline" onClick={() => handleRestore(p)}>
                              Restore
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                disabled={p.quantity <= 0}
                                onClick={() => setSellProduct(p)}
                              >
                                Sell
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setRestockProduct(p)}>
                                Restock
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingProduct(p);
                                  setProductModalOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => handleRemove(p)}
                              >
                                Remove
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    {showArchived ? 'No archived products.' : 'No products found. Click "Add Product" to create your first item.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Card Stack View (< md screens) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          filtered.map((p) => {
            const marginPct = p.selling_price > 0 ? ((p.selling_price - p.purchase_price) / p.selling_price) * 100 : 0;
            return (
              <Card key={p.id} className="p-4 rounded-xl space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {[p.category, variant(p), p.sku].filter(Boolean).join(' • ') || 'Standard'}
                    </p>
                  </div>
                  <Badge variant={p.quantity === 0 ? 'destructive' : p.quantity <= p.low_stock ? 'warning' : 'success'}>
                    {p.quantity === 0 ? 'Out' : `${p.quantity} pcs`}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cost</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 font-mono">{money(p.purchase_price)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Price</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">{money(p.selling_price)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Margin</span>
                    <span className={`font-bold font-mono ${profitClass(marginPct)}`}>{pct(marginPct)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {showArchived ? (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => handleRestore(p)}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Restore Product
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        className="flex-1 font-bold"
                        disabled={p.quantity <= 0}
                        onClick={() => setSellProduct(p)}
                      >
                        <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                        Sell
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setRestockProduct(p)}>
                        Restock
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingProduct(p);
                          setProductModalOpen(true);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2"
                        onClick={() => handleRemove(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            );
          })
        ) : (
          <Card className="p-8 text-center text-slate-400">
            <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-xs">No products found matching your search.</p>
          </Card>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <ProductModal
        product={editingProduct}
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        onSuccess={fetchProducts}
      />

      {/* Restock Modal */}
      <RestockModal
        product={restockProduct}
        open={!!restockProduct}
        onOpenChange={(open) => !open && setRestockProduct(null)}
        onSuccess={fetchProducts}
      />

      {/* Quick Sell Modal */}
      <SellModal
        product={sellProduct}
        open={!!sellProduct}
        onOpenChange={(open) => !open && setSellProduct(null)}
        onSuccess={fetchProducts}
      />
    </div>
  );
}
