import React, { useEffect, useState } from 'react';
import { dbService, Product, Purchase, Expense } from '../services/db';
import { useToast } from '../components/Toast';
import { MetricCard } from '../components/MetricCard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Receipt,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    netProfitThisMonth: 0,
    stockValue: 0,
    supplierDebts: 0,
    monthlyExpenses: 0,
    lowStockCount: 0
  });

  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [latestPurchases, setLatestPurchases] = useState<Purchase[]>([]);
  const [latestExpenses, setLatestExpenses] = useState<Expense[]>([]);

  // Chart data states
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [expenseCats, setExpenseCats] = useState<any[]>([]);

  const { showToast } = useToast();

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [
        metricsData,
        productsData,
        purchasesData,
        expensesData
      ] = await Promise.all([
        dbService.getDashboardMetrics(),
        dbService.getProducts(),
        dbService.getPurchases(),
        dbService.getExpenses()
      ]);

      setMetrics(metricsData);
      
      // Filter low stock
      const lowStock = productsData.filter(p => Number(p.current_stock || 0) <= p.minimum_stock);
      setLowStockProducts(lowStock.slice(0, 5));

      // Slice latest items
      setLatestPurchases(purchasesData.slice(0, 5));
      setLatestExpenses(expensesData.slice(0, 5));

      // 1. Generate Sales Trend (Last 7 Days)
      const last7DaysData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Find sales for this day
        const daySales = await dbService.getDailySalesByDate(dateStr);
        const dayRevenue = daySales.reduce((acc, s) => acc + s.revenue, 0);
        
        // Format day name in Arabic (e.g. الأحد)
        const dayName = d.toLocaleDateString('ar-EG', { weekday: 'short' });
        
        last7DaysData.push({
          name: dayName,
          date: dateStr,
          المبيعات: dayRevenue
        });
      }
      setSalesTrend(last7DaysData);

      // 2. Top Selling Products
      // We'll aggregate daily sales from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Fetch all sales in last 30 days
      const salesPromises = [];
      const tempDate = new Date(thirtyDaysAgo);
      while (tempDate <= new Date()) {
        salesPromises.push(dbService.getDailySalesByDate(tempDate.toISOString().split('T')[0]));
        tempDate.setDate(tempDate.getDate() + 1);
      }
      const allSales = (await Promise.all(salesPromises)).flat();

      // Aggregate quantities by product
      const productSalesMap: Record<string, { name: string; qty: number }> = {};
      allSales.forEach(s => {
        if (!productSalesMap[s.product_id]) {
          const prod = productsData.find(p => p.id === s.product_id);
          productSalesMap[s.product_id] = {
            name: prod ? prod.name : 'منتج غير معروف',
            qty: 0
          };
        }
        productSalesMap[s.product_id].qty += Number(s.sold_quantity);
      });

      const topProductsSorted = Object.values(productSalesMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)
        .map(item => ({
          name: item.name.length > 15 ? item.name.substring(0, 15) + '..' : item.name,
          الكمية: item.qty
        }));
      setTopProducts(topProductsSorted);

      // 3. Expense Distribution
      const categoryTotals: Record<string, number> = {};
      expensesData.forEach(e => {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
      });
      const totalExpensesAmount = Object.values(categoryTotals).reduce((a, b) => a + b, 0);

      const expenseCatsData = Object.entries(categoryTotals).map(([cat, amount]) => ({
        name: cat,
        amount,
        percentage: totalExpensesAmount > 0 ? (amount / totalExpensesAmount) * 100 : 0
      })).sort((a,b) => b.amount - a.amount);
      setExpenseCats(expenseCatsData);

    } catch (err: any) {
      showToast('حدث خطأ أثناء تحميل بيانات لوحة التحكم', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const COLORS = ['#2563eb', '#4f46e5', '#06b6d4', '#10b981', '#f59e0b'];

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400 font-cairo">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <span>جاري تحميل لوحة التحكم الذكية...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-cairo">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 font-tajawal">لوحة التحكم</h2>
        <p className="text-slate-400 text-xs mt-1">مرحباً بك في نظام مدير المحل. إليك ملخص أداء متجرك اليوم والشهري.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="مبيعات اليوم"
          value={metrics.todaySales}
          currency="ج.م"
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="صافي الربح (الشهر)"
          value={metrics.netProfitThisMonth}
          currency="ج.م"
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="قيمة المخزون"
          value={metrics.stockValue}
          currency="ج.م"
          icon={Package}
          color="indigo"
        />
        <MetricCard
          title="ديون الموردين"
          value={metrics.supplierDebts}
          currency="ج.م"
          icon={Users}
          color="red"
        />
        <MetricCard
          title="مصروفات الشهر"
          value={metrics.monthlyExpenses}
          currency="ج.م"
          icon={Receipt}
          color="amber"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend AreaChart */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 font-tajawal">منحنى المبيعات (آخر 7 أيام)</h3>
            <span className="text-[10px] text-slate-400 font-bold">مبيعات يومية بالعملة المحلية</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'Cairo' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    direction: 'rtl', 
                    borderRadius: '12px', 
                    borderColor: '#f1f5f9',
                    fontFamily: 'Cairo',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }} 
                />
                <Area type="monotone" dataKey="المبيعات" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Distribution Progress Bars */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 font-tajawal">توزيع المصروفات (التشغيل)</h3>
            <span className="text-[10px] text-slate-400 font-bold">حصة البند</span>
          </div>
          
          <div className="space-y-4 pt-2 overflow-y-auto max-h-64">
            {expenseCats.length > 0 ? (
              expenseCats.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">{item.name}</span>
                    <span className="text-slate-500">{item.amount.toFixed(2)} ج.م ({item.percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-55 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${item.percentage}%`,
                        backgroundColor: COLORS[idx % COLORS.length]
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">لا يوجد مصروفات مسجلة هذا الشهر</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Products BarChart & Action Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top Selling Products */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-700 font-tajawal">المنتجات الأكثر مبيعاً (آخر 30 يوم)</h3>
          <div className="h-64 w-full">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'Cairo' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      direction: 'rtl', 
                      borderRadius: '12px', 
                      borderColor: '#f1f5f9',
                      fontFamily: 'Cairo',
                      fontSize: '11px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                    }} 
                  />
                  <Bar dataKey="الكمية" fill="#2563eb" radius={[6, 6, 0, 0]}>
                    {topProducts.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs">لا يوجد مبيعات مسجلة في الـ 30 يوماً الماضية</div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <h3 className="text-sm font-bold text-rose-600 font-tajawal flex items-center gap-1">
              <AlertTriangle size={16} />
              <span>منتجات أوشكت على النفاد</span>
            </h3>
            <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold">
              تنبيه النواقص
            </span>
          </div>

          <div className="divide-y divide-slate-50 overflow-y-auto max-h-56">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map(p => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <span className="text-slate-800 block">{p.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">حد الطلب: {p.minimum_stock} {p.unit}</span>
                  </div>
                  <span className="text-rose-600 bg-rose-50 px-2 py-1 rounded-lg font-bold">
                    {p.current_stock} {p.unit}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">المخزون ممتاز، لا يوجد منتجات ناقصة</div>
            )}
          </div>
          
          <Link to="/products" className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5 pt-2">
            <span>عرض جرد المستودع</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        {/* Latest Purchases & Expenses */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
            <h3 className="text-sm font-bold text-slate-700 font-tajawal">أحدث العمليات المسجلة</h3>
            <span className="text-[10px] text-slate-400 font-bold">توريد ومصروفات</span>
          </div>

          <div className="divide-y divide-slate-50 overflow-y-auto max-h-56">
            {latestPurchases.slice(0,2).map(p => (
              <div key={p.id} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                <div>
                  <span className="text-slate-800 block">فاتورة شراء: {p.invoice_number}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{p.date} • {p.supplier_name}</span>
                </div>
                <span className="text-slate-700 font-bold">+{p.total_amount.toFixed(2)} ج.م</span>
              </div>
            ))}
            
            {latestExpenses.slice(0,2).map(e => (
              <div key={e.id} className="py-2.5 flex items-center justify-between text-xs font-semibold">
                <div>
                  <span className="text-slate-800 block">مصروف: {e.category}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{e.date} • {e.description || 'مصاريف تشغيل'}</span>
                </div>
                <span className="text-rose-600 font-bold">-{e.amount.toFixed(2)} ج.م</span>
              </div>
            ))}

            {latestPurchases.length === 0 && latestExpenses.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs">لا يوجد حركات مسجلة مؤخراً</div>
            )}
          </div>
          
          <Link to="/reports" className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5 pt-2">
            <span>عرض السجلات والتقارير المالية</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  );
};
export default Dashboard;
