import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { dbService, Expense } from '../services/db';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { CreditCard, Calendar, FileText, LayoutList } from 'lucide-react';

const expenseSchema = z.object({
  category: z.string().min(1, 'يرجى تحديد بند المصروف'),
  amount: z.number().min(1, 'مبلغ المصروف يجب أن يكون 1 أو أكثر'),
  date: z.string().min(1, 'تاريخ الصرف مطلوب'),
  description: z.string().optional()
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal CRUD state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const { showToast } = useToast();

  const expenseCategories = ['إيجار المحل', 'كهرباء ومياه وغاز', 'رواتب وأجور', 'بضائع تالفة', 'مصاريف نقل وشحن', 'أخرى'];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema)
  });

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await dbService.getExpenses();
      setExpenses(data);
    } catch (err: any) {
      showToast('حدث خطأ أثناء تحميل المصروفات', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    reset({
      category: expenseCategories[0],
      date: new Date().toISOString().split('T')[0],
      amount: 100,
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    reset({
      category: expense.category,
      date: expense.date,
      amount: expense.amount,
      description: expense.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (expense: Expense) => {
    if (window.confirm(`هل أنت متأكد من حذف مصروف بقيمة "${expense.amount}" تحت بند "${expense.category}"؟`)) {
      try {
        await dbService.deleteExpense(expense.id);
        showToast('تم حذف سجل المصروف بنجاح');
        loadExpenses();
      } catch (err: any) {
        showToast('فشل حذف المصروف', 'error');
        console.error(err);
      }
    }
  };

  const onSubmit = async (values: ExpenseFormValues) => {
    try {
      await dbService.saveExpense({
        id: editingExpense?.id,
        ...values
      });
      showToast(editingExpense ? 'تم تحديث سجل المصروف بنجاح' : 'تم إضافة المصروف بنجاح');
      setIsModalOpen(false);
      loadExpenses();
    } catch (err: any) {
      showToast('فشل حفظ المصروف، يرجى مراجعة البيانات', 'error');
      console.error(err);
    }
  };

  const columns = [
    {
      header: 'بند المصروف',
      accessor: (row: Expense) => <span className="font-semibold text-slate-800">{row.category}</span>
    },
    {
      header: 'التاريخ',
      accessor: (row: Expense) => <span className="text-slate-400 font-medium">{row.date}</span>
    },
    {
      header: 'المبلغ',
      accessor: (row: Expense) => <span className="font-bold text-rose-600">{row.amount.toFixed(2)}</span>
    },
    {
      header: 'البيان / التفاصيل',
      accessor: (row: Expense) => <span className="text-slate-400 text-xs">{row.description || '-'}</span>
    }
  ];

  return (
    <div className="space-y-6 font-cairo">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-tajawal">المصروفات</h2>
          <p className="text-slate-400 text-xs mt-1">تسجيل المصاريف التشغيلية للمحل (الإيجار، المرافق، الأجور وغيرها) لحساب الأرباح الصافية</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span>جاري تحميل قائمة المصروفات...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={expenses}
          searchPlaceholder="بحث في البند أو البيان..."
          searchFilter={(item, q) => 
            item.category.toLowerCase().includes(q.toLowerCase()) || 
            item.description?.toLowerCase().includes(q.toLowerCase()) || false
          }
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          addButtonLabel="تسجيل مصروف جديد"
          onAddClick={handleOpenAdd}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? 'تعديل بيانات المصروف' : 'تسجيل بند صرف جديد'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">بند المصروف *</label>
            <div className="relative">
              <LayoutList className="absolute right-3.5 top-3 text-slate-400" size={16} />
              <select
                {...register('category')}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-700"
              >
                {expenseCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            {errors.category && (
              <span className="text-rose-500 text-xs font-semibold block">{errors.category.message}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">المبلغ المصروف *</label>
              <div className="relative">
                <CreditCard className="absolute right-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="number"
                  step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                  className={`w-full pl-4 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-800 ${
                    errors.amount ? 'border-rose-300 focus:border-rose-500' : 'border-slate-100'
                  }`}
                  placeholder="0.00"
                />
              </div>
              {errors.amount && (
                <span className="text-rose-500 text-xs font-semibold block">{errors.amount.message}</span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">التاريخ *</label>
              <div className="relative">
                <Calendar className="absolute right-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="date"
                  {...register('date')}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
                />
              </div>
              {errors.date && (
                <span className="text-rose-500 text-xs font-semibold block">{errors.date.message}</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">البيان / التفاصيل</label>
            <div className="relative">
              <FileText className="absolute right-3.5 top-3 text-slate-400" size={16} />
              <textarea
                {...register('description')}
                rows={2}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                placeholder="تفاصيل إضافية أو اسم مستلم المبلغ..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-100 transition-all duration-200 disabled:opacity-50 active:scale-[0.98] mt-2"
          >
            {isSubmitting ? 'جاري التسجيل...' : 'تسجيل المصروف'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
export default Expenses;
