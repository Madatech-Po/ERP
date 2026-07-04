import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import confetti from 'canvas-confetti';

// Service & Client state
import { dbService } from './services/db';

// Reusable Components
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Modal } from './components/Modal';
import { ToastProvider, useToast } from './components/Toast';

// Screens / Pages
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { Suppliers } from './pages/Suppliers';
import { Purchases } from './pages/Purchases';
import { SupplierPayments } from './pages/SupplierPayments';
import { DailySales } from './pages/DailySales';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { BranchManagement } from './pages/BranchManagement';

// Inner layout to access Toast context
const AppLayout: React.FC = () => {
  const [isEndOfDayOpen, setIsEndOfDayOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [todayFinancials, setTodayFinancials] = useState({
    revenue: 0,
    cogs: 0,
    gross_profit: 0,
    expenses: 0,
    net_profit: 0
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const { showToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  const loadTodayMetrics = async () => {
    try {
      setLoadingMetrics(true);
      const financials = await dbService.getDailyFinancials(todayStr, todayStr);
      if (financials && financials.length > 0) {
        setTodayFinancials(financials[0]);
      } else {
        setTodayFinancials({
          revenue: 0,
          cogs: 0,
          gross_profit: 0,
          expenses: 0,
          net_profit: 0
        });
      }
    } catch (err) {
      console.error('Failed to load today financials for End of Day:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleOpenEndOfDay = () => {
    loadTodayMetrics();
    setIsEndOfDayOpen(true);
  };

  const handleConfirmEndOfDay = () => {
    // Confetti effect
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    showToast('🎉 تم إقفال اليوم وجرد الحركات بنجاح! طاب يومك.');
    setIsEndOfDayOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex no-print">
      {/* Right Sidebar */}
      <Sidebar 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenEndOfDay={handleOpenEndOfDay} 
      />

      {/* Main Container */}
      <div className="flex-1 lg:pr-64 flex flex-col min-h-screen w-full">
        {/* Top Header */}
        <Header onMenuToggle={() => setIsMobileMenuOpen(true)} />

        {/* Main Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/payments" element={<SupplierPayments />} />
            <Route path="/sales" element={<DailySales />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/branches" element={<BranchManagement />} />
          </Routes>
        </main>
      </div>

      {/* End of Day Modal */}
      <Modal
        isOpen={isEndOfDayOpen}
        onClose={() => setIsEndOfDayOpen(false)}
        title="إقفال وحسابات اليوم الحالي"
      >
        <div className="space-y-5 font-cairo">
          <div className="text-center space-y-1">
            <span className="text-xs text-slate-400 font-bold">تاريخ الإقفال</span>
            <span className="text-base font-bold text-slate-800 block">
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {loadingMetrics ? (
            <div className="py-8 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>جاري تحميل إحصائيات اليوم...</span>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3.5 text-xs text-slate-500 font-semibold">
              <div className="flex justify-between">
                <span>إجمالي مبيعات اليوم:</span>
                <span className="text-blue-600 font-extrabold">{todayFinancials.revenue.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between">
                <span>تكلفة البضاعة المباعة:</span>
                <span className="text-slate-700 font-bold">{todayFinancials.cogs.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-3">
                <span>إجمالي الربح التجاري:</span>
                <span className="text-emerald-600 font-bold">{todayFinancials.gross_profit.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-3">
                <span>مصاريف اليوم التشغيلية:</span>
                <span className="text-rose-600 font-bold">{todayFinancials.expenses.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between border-t border-slate-200/60 pt-3 text-sm font-extrabold">
                <span className="text-slate-700">صافي أرباح اليوم:</span>
                <span className={`${todayFinancials.net_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {todayFinancials.net_profit.toFixed(2)} ج.م
                </span>
              </div>
            </div>
          )}

          <div className="p-3 bg-blue-50/30 border border-blue-50 rounded-xl text-[10px] text-slate-500 leading-relaxed">
            💡 <strong>تنبيه:</strong> عملية إقفال اليوم هي إجراء توثيقي لحسابات المحل وصافي الربح اليومي. يمكنك مراجعة هذه الأرقام في شاشة التقارير في أي وقت لاحقاً.
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={handleConfirmEndOfDay}
              className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-100 hover:shadow-lg transition-all active:scale-[0.98]"
            >
              تأكيد الإغلاق اليومي
            </button>
            <button
              onClick={() => setIsEndOfDayOpen(false)}
              className="py-3 bg-white border border-slate-150 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-sm transition-all active:scale-[0.98]"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppLayout />
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
