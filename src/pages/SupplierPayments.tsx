import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { dbService, SupplierPayment, Supplier } from '../services/db';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { CreditCard, Calendar, FileText } from 'lucide-react';

const paymentSchema = z.object({
  supplier_id: z.string().min(1, 'يرجى اختيار مورد'),
  payment_date: z.string().min(1, 'تاريخ الدفع مطلوب'),
  amount: z.number().min(1, 'المبلغ المدفوع يجب أن يكون 1 أو أكثر'),
  reference: z.string().optional(),
  notes: z.string().optional()
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export const SupplierPayments: React.FC = () => {
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal CRUD state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupplierPayment | null>(null);

  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema)
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, suppliersData] = await Promise.all([
        dbService.getSupplierPayments(),
        dbService.getSuppliers()
      ]);
      setPayments(paymentsData);
      setSuppliers(suppliersData);
    } catch (err: any) {
      showToast('حدث خطأ أثناء تحميل البيانات', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    if (suppliers.length === 0) {
      showToast('يرجى إضافة مورد أولاً قبل تسجيل سداد', 'error');
      return;
    }
    setEditingPayment(null);
    reset({
      supplier_id: suppliers[0].id,
      payment_date: new Date().toISOString().split('T')[0],
      amount: 500,
      reference: 'نقداً',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (payment: SupplierPayment) => {
    setEditingPayment(payment);
    reset({
      supplier_id: payment.supplier_id,
      payment_date: payment.payment_date,
      amount: payment.amount,
      reference: payment.reference || '',
      notes: payment.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (payment: SupplierPayment) => {
    if (window.confirm(`هل أنت متأكد من حذف دفعة السداد بقيمة "${payment.amount}" للمورد "${payment.supplier_name}"؟ سيؤدي ذلك لزيادة رصيد مديونية المورد.`)) {
      try {
        await dbService.deleteSupplierPayment(payment.id);
        showToast('تم حذف دفعة السداد وتحديث رصيد المورد بنجاح');
        loadData();
      } catch (err: any) {
        showToast('فشل حذف دفعة السداد', 'error');
        console.error(err);
      }
    }
  };

  const onSubmit = async (values: PaymentFormValues) => {
    try {
      await dbService.saveSupplierPayment({
        id: editingPayment?.id,
        ...values
      });
      showToast(editingPayment ? 'تم تحديث دفعة السداد بنجاح' : 'تم تسجيل دفعة السداد بنجاح');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('فشل حفظ العملية، يرجى مراجعة البيانات', 'error');
      console.error(err);
    }
  };

  const columns = [
    {
      header: 'المورد',
      accessor: (row: SupplierPayment) => <span className="font-semibold text-slate-800">{row.supplier_name}</span>
    },
    {
      header: 'تاريخ السداد',
      accessor: (row: SupplierPayment) => <span className="text-slate-400 font-medium">{row.payment_date}</span>
    },
    {
      header: 'المبلغ المدفوع',
      accessor: (row: SupplierPayment) => <span className="font-bold text-emerald-600">{row.amount.toFixed(2)}</span>
    },
    {
      header: 'طريقة الدفع/المرجع',
      accessor: (row: SupplierPayment) => <span className="font-medium text-slate-600">{row.reference || '-'}</span>
    },
    {
      header: 'ملاحظات',
      accessor: (row: SupplierPayment) => <span className="text-slate-400 text-xs">{row.notes || '-'}</span>
    }
  ];

  return (
    <div className="space-y-6 font-cairo">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-tajawal">سداد الموردين</h2>
          <p className="text-slate-400 text-xs mt-1">تسجيل مبالغ السداد والدفعات النقدية للموردين لخصمها من ديونهم</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span>جاري تحميل سجلات المدفوعات...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={payments}
          searchPlaceholder="بحث في اسم المورد أو المرجع..."
          searchFilter={(item, q) => 
            item.supplier_name?.toLowerCase().includes(q.toLowerCase()) || 
            item.reference?.toLowerCase().includes(q.toLowerCase()) || false
          }
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          addButtonLabel="تسجيل دفعة سداد جديدة"
          onAddClick={handleOpenAdd}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPayment ? 'تعديل دفعة السداد' : 'تسجيل سداد نقدي لمورد'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">اختر المورد *</label>
            <select
              {...register('supplier_id')}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold text-slate-700"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} (الدين الحالي: {s.outstanding_balance?.toFixed(2) || '0.00'})</option>
              ))}
            </select>
            {errors.supplier_id && (
              <span className="text-rose-500 text-xs font-semibold block">{errors.supplier_id.message}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">المبلغ المدفوع *</label>
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
              <label className="text-xs font-bold text-slate-500 block">تاريخ السداد *</label>
              <div className="relative">
                <Calendar className="absolute right-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="date"
                  {...register('payment_date')}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
                />
              </div>
              {errors.payment_date && (
                <span className="text-rose-500 text-xs font-semibold block">{errors.payment_date.message}</span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">طريقة الدفع / الرقم المرجعي</label>
            <div className="relative">
              <FileText className="absolute right-3.5 top-3 text-slate-400" size={16} />
              <input
                type="text"
                {...register('reference')}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
                placeholder="مثال: نقداً، شيك رقم 102، حوالة بنكية"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">ملاحظات</label>
            <textarea
              {...register('notes')}
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
              placeholder="شرح إضافي للعملية..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-100 transition-all duration-200 disabled:opacity-50 active:scale-[0.98] mt-2"
          >
            {isSubmitting ? 'جاري التسجيل...' : 'تسجيل عملية الدفع'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
export default SupplierPayments;
