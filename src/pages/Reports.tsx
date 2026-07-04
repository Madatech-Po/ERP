import React, { useEffect, useState } from 'react';
import { dbService, Product, Supplier, Expense, DailyFinancials, DailySale } from '../services/db';
import { useToast } from '../components/Toast';
import { Calendar, FileText, Download, TrendingUp, Package, Users, Receipt } from 'lucide-react';

export const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Date Filters (default: first day of current month to today)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [activeTab, setActiveTab] = useState<'profit' | 'inventory' | 'expenses' | 'suppliers' | 'sales'>('profit');

  // Loaded Report Data
  const [financials, setFinancials] = useState<DailyFinancials[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [salesReport, setSalesReport] = useState<DailySale[]>([]);

  const { showToast } = useToast();

  const loadReportData = async () => {
    try {
      setLoading(true);
      const [financialsData, productsData, suppliersData, expensesData] = await Promise.all([
        dbService.getDailyFinancials(startDate, endDate),
        dbService.getProducts(),
        dbService.getSuppliers(),
        dbService.getExpenses()
      ]);

      setFinancials(financialsData);
      setProducts(productsData);
      setSuppliers(suppliersData);

      // Filter expenses by date
      const filteredExpenses = expensesData.filter(e => e.date >= startDate && e.date <= endDate);
      setExpenses(filteredExpenses);

      // Aggregate all daily sales in date range
      const salesPromises = [];
      const currentDate = new Date(startDate);
      const stopDate = new Date(endDate);
      
      while (currentDate <= stopDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        salesPromises.push(dbService.getDailySalesByDate(dateStr));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      const salesResults = await Promise.all(salesPromises);
      const allSales = salesResults.flat();
      setSalesReport(allSales);

    } catch (err: any) {
      showToast('حدث خطأ أثناء إعداد التقارير', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [startDate, endDate]);

  // Aggregate Totals
  const profitTotals = financials.reduce(
    (acc, cur) => {
      acc.revenue += cur.revenue;
      acc.cogs += cur.cogs;
      acc.grossProfit += cur.gross_profit;
      acc.expenses += cur.expenses;
      acc.netProfit += cur.net_profit;
      return acc;
    },
    { revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0 }
  );

  const inventoryTotals = products.reduce(
    (acc, p) => {
      const stock = p.current_stock || 0;
      acc.totalStock += stock;
      acc.totalValuation += stock * p.purchase_price;
      if (stock <= p.minimum_stock) acc.lowStockCount += 1;
      return acc;
    },
    { totalStock: 0, totalValuation: 0, lowStockCount: 0 }
  );

  const expenseTotals = expenses.reduce((acc, e) => acc + e.amount, 0);

  const supplierTotals = suppliers.reduce(
    (acc, s) => {
      acc.debts += s.outstanding_balance || 0;
      acc.purchases += s.total_purchased || 0;
      acc.payments += s.total_paid || 0;
      return acc;
    },
    { debts: 0, purchases: 0, payments: 0 }
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-cairo">
      {/* Title & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-5 no-print">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-tajawal">التقارير المالية والتحليلية</h2>
          <p className="text-slate-400 text-xs mt-1">عرض وتحليل الأرباح وحركة المخزون وحسابات الموردين في فترة زمنية</p>
        </div>

        {/* Date Selector Filters */}
        <div className="flex items-center gap-3">
          <div className="relative w-40">
            <Calendar className="absolute right-3 top-3.5 text-slate-400" size={14} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm focus:outline-none"
            />
          </div>
          <span className="text-slate-400 text-xs font-bold">إلى</span>
          <div className="relative w-40">
            <Calendar className="absolute right-3 top-3.5 text-slate-400" size={14} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-3 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm focus:outline-none"
            />
          </div>
          
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 bg-white border border-slate-150 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Download size={14} />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-2 border-b border-slate-150 overflow-x-auto no-print pb-px">
        {[
          { id: 'profit', label: 'الأرباح والخسائر', icon: TrendingUp },
          { id: 'inventory', label: 'جرد وتقييم المخزون', icon: Package },
          { id: 'expenses', label: 'المصروفات التفصيلية', icon: Receipt },
          { id: 'suppliers', label: 'ديون وحسابات الموردين', icon: Users },
          { id: 'sales', label: 'أداء المبيعات بالمنتج', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-tajawal font-bold text-xs transition-all whitespace-nowrap ${
                active 
                  ? 'border-blue-600 text-blue-600 bg-blue-50/10' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span>جاري احتساب البيانات وتوليد التقارير...</span>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* TAB 1: PROFIT REPORT */}
          {activeTab === 'profit' && (
            <div className="space-y-6 animate-slide-in">
              {/* Financial KPI Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي الإيرادات (المبيعات)</span>
                  <span className="text-lg font-extrabold text-blue-600">{profitTotals.revenue.toFixed(2)} ج.م</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">تكلفة البضاعة المباعة (COGS)</span>
                  <span className="text-lg font-extrabold text-slate-700">{profitTotals.cogs.toFixed(2)} ج.م</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي الربح التجاري</span>
                  <span className="text-lg font-extrabold text-emerald-600">{profitTotals.grossProfit.toFixed(2)} ج.م</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">المصروفات والتشغيل</span>
                  <span className="text-lg font-extrabold text-rose-600">{profitTotals.expenses.toFixed(2)} ج.م</span>
                </div>
              </div>

              {/* Net profit callout */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-md flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold font-tajawal opacity-90">صافي الربح الفعلي للمحل</h3>
                  <span className="text-2xl font-black mt-1 block">
                    {profitTotals.netProfit.toFixed(2)} ج.م
                  </span>
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-xl text-xs font-bold backdrop-blur-sm">
                  {profitTotals.netProfit >= 0 ? '👍 فترة رابحة وممتازة' : '⚠️ خسارة تشغيلية في هذه الفترة'}
                </div>
              </div>

              {/* Detailed Financials Table */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-700 font-tajawal">جدول قائمة الأرباح والخسائر اليومي</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">المبيعات (الإيراد)</th>
                        <th className="p-3">التكلفة (COGS)</th>
                        <th className="p-3">إجمالي الربح</th>
                        <th className="p-3">المصروفات</th>
                        <th className="p-3 text-left">صافي الربح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-600">
                      {financials.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">{f.date}</td>
                          <td className="p-3 font-bold text-blue-600">{f.revenue.toFixed(2)}</td>
                          <td className="p-3">{f.cogs.toFixed(2)}</td>
                          <td className="p-3 text-emerald-600 font-bold">{f.gross_profit.toFixed(2)}</td>
                          <td className="p-3 text-rose-600">{f.expenses.toFixed(2)}</td>
                          <td className={`p-3 text-left font-bold ${f.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {f.net_profit.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVENTORY REPORT */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-slide-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي كمية القطع بالمخزن</span>
                  <span className="text-lg font-extrabold text-slate-800">{inventoryTotals.totalStock.toLocaleString()} قطعة</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي قيمة الأصول (بسعر الشراء)</span>
                  <span className="text-lg font-extrabold text-blue-600">{inventoryTotals.totalValuation.toFixed(2)} ج.م</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">منتجات منخفضة المخزون</span>
                  <span className={`text-lg font-extrabold ${inventoryTotals.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                    {inventoryTotals.lowStockCount} منتج
                  </span>
                </div>
              </div>

              {/* Products Inventory List */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-700 font-tajawal">جرد المنتجات وتقييم المخزون المالي</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                        <th className="p-3">اسم المنتج</th>
                        <th className="p-3">التصنيف</th>
                        <th className="p-3">المخزون الافتتاحي</th>
                        <th className="p-3">المخزون الحالي</th>
                        <th className="p-3">سعر الشراء للوحدة</th>
                        <th className="p-3 text-left">قيمة المخزون الحالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-600">
                      {products.map(p => {
                        const stock = p.current_stock || 0;
                        const valuation = stock * p.purchase_price;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-800">{p.name}</td>
                            <td className="p-3">{p.category_name}</td>
                            <td className="p-3 text-slate-400">{p.opening_quantity}</td>
                            <td className={`p-3 font-bold ${stock <= p.minimum_stock ? 'text-rose-600' : 'text-slate-800'}`}>
                              {stock} {p.unit}
                            </td>
                            <td className="p-3">{p.purchase_price.toFixed(2)}</td>
                            <td className="p-3 text-left font-bold text-blue-600">{valuation.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXPENSE REPORT */}
          {activeTab === 'expenses' && (
            <div className="space-y-6 animate-slide-in">
              <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي المصاريف التشغيلية للفترة</span>
                  <span className="text-xl font-black text-rose-600 mt-1 block">{expenseTotals.toFixed(2)} ج.م</span>
                </div>
              </div>

              {/* Expenses List */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-700 font-tajawal">سجل بنود المصروفات المسجلة</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                        <th className="p-3">بند المصروف</th>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">البيان والتفاصيل</th>
                        <th className="p-3 text-left">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-600">
                      {expenses.length > 0 ? (
                        expenses.map(e => (
                          <tr key={e.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-800">{e.category}</td>
                            <td className="p-3 text-slate-400">{e.date}</td>
                            <td className="p-3">{e.description || '-'}</td>
                            <td className="p-3 text-left font-bold text-rose-600">{e.amount.toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">لا يوجد مصروفات مسجلة في هذه الفترة</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SUPPLIERS REPORT */}
          {activeTab === 'suppliers' && (
            <div className="space-y-6 animate-slide-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي المشتريات الآجلة بالفترة</span>
                  <span className="text-lg font-extrabold text-slate-800">{supplierTotals.purchases.toFixed(2)} ج.م</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي سداد الموردين</span>
                  <span className="text-lg font-extrabold text-emerald-600">{supplierTotals.payments.toFixed(2)} ج.m</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold block">إجمالي الديون الحالية المستحقة للموردين</span>
                  <span className="text-lg font-extrabold text-rose-600">{supplierTotals.debts.toFixed(2)} ج.م</span>
                </div>
              </div>

              {/* Suppliers List */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-700 font-tajawal">تقرير المديونيات وكشوفات أرصدة الموردين</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                        <th className="p-3">المورد</th>
                        <th className="p-3">الهاتف</th>
                        <th className="p-3">إجمالي قيمة الفواتير</th>
                        <th className="p-3">إجمالي المسدد</th>
                        <th className="p-3 text-left">الرصيد المستحق الحالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-600">
                      {suppliers.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">{s.name}</td>
                          <td className="p-3 text-slate-400">{s.phone || '-'}</td>
                          <td className="p-3 font-medium">{s.total_purchased?.toFixed(2)}</td>
                          <td className="p-3 text-emerald-600 font-medium">{s.total_paid?.toFixed(2)}</td>
                          <td className={`p-3 text-left font-bold ${(s.outstanding_balance || 0) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                            {(s.outstanding_balance || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SALES REPORT */}
          {activeTab === 'sales' && (
            <div className="space-y-6 animate-slide-in">
              {/* Aggregated Sales by Product */}
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-700 font-tajawal">مبيعات المنتجات الإجمالية وأرباحها</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                        <th className="p-3">اسم المنتج</th>
                        <th className="p-3">الكمية الإجمالية المباعة</th>
                        <th className="p-3">الإيراد الكلي</th>
                        <th className="p-3">تكلفة البضاعة المباعة</th>
                        <th className="p-3 text-left">إجمالي الربح التجاري</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-slate-600">
                      {products.map(p => {
                        const productSales = salesReport.filter(s => s.product_id === p.id);
                        const totalQty = productSales.reduce((acc, cur) => acc + Number(cur.sold_quantity), 0);
                        const totalRevenue = productSales.reduce((acc, cur) => acc + Number(cur.revenue), 0);
                        const totalCogs = productSales.reduce((acc, cur) => acc + Number(cur.cogs), 0);
                        const totalProfit = totalRevenue - totalCogs;

                        if (totalQty === 0) return null; // Skip if no sales

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-800">{p.name}</td>
                            <td className="p-3 font-bold text-slate-700">{totalQty} {p.unit}</td>
                            <td className="p-3 text-blue-600 font-semibold">{totalRevenue.toFixed(2)}</td>
                            <td className="p-3">{totalCogs.toFixed(2)}</td>
                            <td className="p-3 text-left font-bold text-emerald-600">{totalProfit.toFixed(2)}</td>
                          </tr>
                        );
                      }).filter(row => row !== null)}
                      {salesReport.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">لا يوجد مبيعات مسجلة في هذه الفترة الزمنية</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
export default Reports;
