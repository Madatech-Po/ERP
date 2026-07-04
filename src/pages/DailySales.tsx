import React, { useEffect, useState } from 'react';
import { dbService, Product } from '../services/db';
import { useToast } from '../components/Toast';
import { Calendar, Search, TrendingUp, CheckCircle, Percent, AlertCircle } from 'lucide-react';

export const DailySales: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // Map product id -> sold quantity input
  const [soldQuantities, setSoldQuantities] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const { showToast } = useToast();

  const loadData = async (date: string) => {
    try {
      setLoading(true);
      const [productsData, salesData] = await Promise.all([
        dbService.getProducts(),
        dbService.getDailySalesByDate(date)
      ]);
      setProducts(productsData);
      
      // Initialize inputs from loaded sales or default to 0
      const quantities: Record<string, number> = {};
      productsData.forEach(p => {
        const sale = salesData.find(s => s.product_id === p.id);
        quantities[p.id] = sale ? Number(sale.sold_quantity) : 0;
      });
      setSoldQuantities(quantities);
    } catch (err: any) {
      showToast('حدث خطأ أثناء تحميل البيانات', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  const handleQuantityChange = (productId: string, value: number) => {
    setSoldQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, value)
    }));
  };

  // Filtered products list
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Dynamic calculations for preview
  const totals = filteredProducts.reduce((acc, p) => {
    const qty = soldQuantities[p.id] || 0;
    if (qty > 0) {
      const revenue = qty * p.selling_price;
      const cogs = qty * p.purchase_price;
      acc.itemsSold += 1;
      acc.totalQty += qty;
      acc.expectedRevenue += revenue;
      acc.expectedProfit += (revenue - cogs);
    }
    return acc;
  }, { itemsSold: 0, totalQty: 0, expectedRevenue: 0, expectedProfit: 0 });

  const handleSaveSales = async () => {
    const salesItems = Object.entries(soldQuantities)
      .map(([productId, quantity]) => {
        const prod = products.find(p => p.id === productId);
        if (!prod || quantity <= 0) return null;
        return {
          product_id: productId,
          sold_quantity: quantity,
          purchase_price: prod.purchase_price,
          selling_price: prod.selling_price
        };
      })
      .filter(item => item !== null) as { product_id: string; sold_quantity: number; purchase_price: number; selling_price: number }[];

    try {
      setSaving(true);
      await dbService.saveDailySales(selectedDate, salesItems);
      showToast('تم حفظ مبيعات اليوم وتحديث المخزون بنجاح');
      loadData(selectedDate); // Reload current stock
    } catch (err: any) {
      showToast('فشل حفظ المبيعات اليومية', 'error');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 font-cairo">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-tajawal">تسجيل المبيعات اليومية</h2>
          <p className="text-slate-400 text-xs mt-1">أدخل الكميات المباعة من المنتجات في نهاية اليوم لحساب الأرباح تلقائياً</p>
        </div>

        {/* Date Selector */}
        <div className="relative w-48 self-start md:self-auto">
          <Calendar className="absolute right-3.5 top-3 text-slate-400" size={16} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-150 rounded-xl text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Toolbar Search */}
      <div className="relative max-w-md bg-white rounded-xl shadow-[0_2px_15px_rgba(0,0,0,0.01)] border border-slate-100">
        <Search className="absolute right-4 top-3.5 text-slate-400" size={18} />
        <input
          type="text"
          placeholder="بحث سريع عن منتج أو تصنيف لتسجيل مبيعاته..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-4 pr-11 py-2.5 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span>جاري تحميل قائمة جرد المبيعات...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Products Entry Sheet */}
          <div className="xl:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold font-tajawal">
                    <th className="p-4">اسم المنتج</th>
                    <th className="p-4 w-32">المخزون الحالي</th>
                    <th className="p-4 w-28">سعر البيع</th>
                    <th className="p-4 w-40 text-center">الكمية المباعة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => {
                      const qty = soldQuantities[p.id] || 0;
                      const hasSale = qty > 0;
                      return (
                        <tr key={p.id} className={`transition-colors duration-150 ${hasSale ? 'bg-blue-50/20 hover:bg-blue-50/30' : 'hover:bg-slate-50/40'}`}>
                          <td className="p-4">
                            <span className="font-semibold text-slate-800 block">{p.name}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full inline-block mt-0.5">{p.category_name}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-medium text-slate-500">
                              {Number(p.current_stock || 0).toLocaleString()} {p.unit}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-slate-800">
                            {p.selling_price.toFixed(2)}
                          </td>
                          {/* Sold Qty Input */}
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={qty || ''}
                                onChange={(e) => handleQuantityChange(p.id, Number(e.target.value))}
                                className={`w-28 px-3 py-2.5 min-h-[44px] border rounded-xl text-center font-bold text-sm focus:outline-none transition-all ${
                                  hasSale 
                                    ? 'border-blue-400 bg-blue-50/40 text-blue-700 focus:border-blue-600 focus:bg-white' 
                                    : 'border-slate-150 bg-slate-50/50 text-slate-800 focus:border-blue-500 focus:bg-white'
                                }`}
                                placeholder="0"
                              />
                              <span className="text-[10px] font-bold text-slate-400 w-10 shrink-0">{p.unit}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">لم يتم العثور على منتجات مطابقة للبحث</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic Summary Panel */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
                <TrendingUp size={18} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-700 font-tajawal">ملخص مبيعات اليوم</h3>
              </div>

              {/* Metrics */}
              <div className="space-y-3.5 text-xs text-slate-500 font-semibold">
                <div className="flex justify-between">
                  <span>المنتجات المباعة:</span>
                  <span className="text-slate-800 font-bold">{totals.itemsSold} منتج</span>
                </div>
                <div className="flex justify-between">
                  <span>إجمالي الكميات المباعة:</span>
                  <span className="text-slate-800 font-bold">{totals.totalQty.toLocaleString()} وحدة</span>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-3">
                  <span className="flex items-center gap-1 text-blue-600"><CheckCircle size={14} /> الإيرادات المتوقعة:</span>
                  <span className="text-blue-600 font-bold text-sm">{totals.expectedRevenue.toFixed(2)} ج.م</span>
                </div>
                <div className="flex justify-between border-t border-slate-50 pt-3">
                  <span className="flex items-center gap-1 text-emerald-600"><Percent size={14} /> الربح المتوقع:</span>
                  <span className="text-emerald-600 font-bold text-sm">{totals.expectedProfit.toFixed(2)} ج.م</span>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3.5 bg-blue-50/30 border border-blue-50 rounded-xl flex items-start gap-2.5">
                <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  الضغط على حفظ سيقوم بخصم الكميات من المخزون فوراً واحتساب الربح وإضافته لتقرير الربحية. يمكنك العودة وتعديل مبيعات هذا اليوم في أي وقت.
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={handleSaveSales}
                disabled={saving || totals.totalQty === 0}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-100 hover:shadow-lg transition-all duration-200 disabled:opacity-40 disabled:hover:bg-blue-600 active:scale-[0.98]"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ مبيعات اليوم'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DailySales;
