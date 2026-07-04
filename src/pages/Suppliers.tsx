import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { dbService, Supplier, Purchase, SupplierPayment } from '../services/db';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { ArrowRight, Phone, MapPin, Notebook, CreditCard, ShoppingBag } from 'lucide-react';

const supplierSchema = z.object({
  name: z.string().min(2, 'اسم المورد يجب أن يكون حرفين على الأقل'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional()
});

type SupplierFormValues = z.infer<typeof supplierSchema>;

export const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Detail profile state
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{
    supplier: Supplier;
    purchases: Purchase[];
    payments: SupplierPayment[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal CRUD state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema)
  });

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await dbService.getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      showToast('حدث خطأ أثناء تحميل الموردين', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  // Load details if a supplier is selected
  useEffect(() => {
    if (!selectedSupplierId) {
      setDetailData(null);
      return;
    }

    const loadDetails = async () => {
      try {
        setLoadingDetail(true);
        const details = await dbService.getSupplierDetails(selectedSupplierId);
        setDetailData(details);
      } catch (err: any) {
        showToast('حدث خطأ أثناء تحميل ملف المورد', 'error');
        setSelectedSupplierId(null);
        console.error(err);
      } finally {
        setLoadingDetail(false);
      }
    };

    loadDetails();
  }, [selectedSupplierId]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    reset({ name: '', phone: '', address: '', notes: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    reset({
      name: supplier.name,
      phone: supplier.phone || '',
      address: supplier.address || '',
      notes: supplier.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (supplier: Supplier) => {
    if (window.confirm(`هل أنت متأكد من حذف المورد "${supplier.name}"؟`)) {
      try {
        await dbService.deleteSupplier(supplier.id);
        showToast('تم حذف المورد بنجاح');
        loadSuppliers();
      } catch (err: any) {
        showToast('فشل حذف المورد (قد يكون لديه فواتير مرتبطة به)', 'error');
        console.error(err);
      }
    }
  };

  const onSubmit = async (values: SupplierFormValues) => {
    try {
      await dbService.saveSupplier({
        id: editingSupplier?.id,
        ...values
      });
      showToast(editingSupplier ? 'تم تحديث بيانات المورد بنجاح' : 'تم إضافة المورد بنجاح');
      setIsModalOpen(false);
      loadSuppliers();
      // If editing supplier in detail view, refresh detail data
      if (selectedSupplierId && editingSupplier?.id === selectedSupplierId) {
        const details = await dbService.getSupplierDetails(selectedSupplierId);
        setDetailData(details);
      }
    } catch (err: any) {
      showToast('اسم المورد موجود بالفعل أو حدث خطأ ما', 'error');
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // LIST VIEW RENDERING
  // ----------------------------------------------------
  const listColumns = [
    {
      header: 'المورد',
      accessor: (row: Supplier) => (
        <div className="cursor-pointer" onClick={() => setSelectedSupplierId(row.id)}>
          <span className="font-semibold text-slate-800 block hover:text-blue-600 transition-colors">{row.name}</span>
          <span className="text-xs text-slate-400 font-medium">سجل الحساب المالي</span>
        </div>
      )
    },
    {
      header: 'رقم الهاتف',
      accessor: (row: Supplier) => <span className="text-slate-500 font-medium">{row.phone || '-'}</span>
    },
    {
      header: 'المشتريات الكلية',
      accessor: (row: Supplier) => <span className="font-medium text-slate-700">{(row.total_purchased || 0).toFixed(2)}</span>
    },
    {
      header: 'المدفوع الكلي',
      accessor: (row: Supplier) => <span className="font-medium text-emerald-600">{(row.total_paid || 0).toFixed(2)}</span>
    },
    {
      header: 'الرصيد المستحق',
      accessor: (row: Supplier) => {
        const balance = row.outstanding_balance || 0;
        return (
          <span className={`font-bold ${balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
            {balance.toFixed(2)}
          </span>
        );
      }
    }
  ];

  if (selectedSupplierId && detailData) {
    const { supplier, purchases, payments } = detailData;
    return (
      <div className="space-y-6 font-cairo">
        {/* Detail Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setSelectedSupplierId(null); loadSuppliers(); }}
              className="p-2 bg-white border border-slate-100 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 shadow-sm transition-all active:scale-95"
            >
              <ArrowRight size={18} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 font-tajawal">{supplier.name}</h2>
              <div className="flex items-center gap-4 text-xs text-slate-400 font-medium mt-1.5">
                {supplier.phone && (
                  <span className="flex items-center gap-1"><Phone size={12} /> {supplier.phone}</span>
                )}
                {supplier.address && (
                  <span className="flex items-center gap-1"><MapPin size={12} /> {supplier.address}</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingSupplier(supplier);
              reset({
                name: supplier.name,
                phone: supplier.phone || '',
                address: supplier.address || '',
                notes: supplier.notes || ''
              });
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            تعديل الملف
          </button>
        </div>

        {/* Supplier Notes */}
        {supplier.notes && (
          <div className="p-4 bg-blue-50/30 border border-blue-50 rounded-2xl flex items-start gap-3">
            <Notebook size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-500 leading-relaxed">
              <span className="font-bold text-slate-700 block mb-0.5">ملاحظات حول المورد:</span>
              {supplier.notes}
            </div>
          </div>
        )}

        {/* Ledger Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs text-slate-400 font-bold block">إجمالي قيمة المشتريات</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-800">{(supplier.total_purchased || 0).toFixed(2)}</span>
              <span className="text-xs text-slate-400 font-bold">ج.م</span>
            </div>
            <span className="text-[10px] bg-slate-50 px-2 py-0.5 rounded-full inline-block text-slate-400 font-medium">
              حسبت من {purchases.length} فاتورة شراء
            </span>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs text-slate-400 font-bold block">إجمالي المدفوعات المسددة</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-emerald-600">{(supplier.total_paid || 0).toFixed(2)}</span>
              <span className="text-xs text-slate-400 font-bold">ج.م</span>
            </div>
            <span className="text-[10px] bg-emerald-50/50 px-2 py-0.5 rounded-full inline-block text-emerald-600 font-medium">
              شامل سداد فواتير + دفعات إضافية
            </span>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-2">
            <span className="text-xs text-slate-400 font-bold block">الرصيد المستحق (الدين الحالي)</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold ${(supplier.outstanding_balance || 0) > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                {(supplier.outstanding_balance || 0).toFixed(2)}
              </span>
              <span className="text-xs text-slate-400 font-bold">ج.م</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block font-medium ${
              (supplier.outstanding_balance || 0) > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
            }`}>
              {(supplier.outstanding_balance || 0) > 0 ? 'مستحق للمورد حالياً' : 'مصفى بالكامل'}
            </span>
          </div>
        </div>

        {/* Tabs for Purchases and Payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Purchase History */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <ShoppingBag size={18} className="text-blue-500 stroke-[2]" />
              <h3 className="text-sm font-bold text-slate-700 font-tajawal">سجل فواتير المشتريات</h3>
            </div>
            
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الإجمالي</th>
                    <th className="p-3">المدفوع</th>
                    <th className="p-3">المتبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {purchases.length > 0 ? (
                    purchases.map(p => {
                      const balance = p.total_amount - p.paid_amount;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-800">{p.invoice_number}</td>
                          <td className="p-3 font-medium text-slate-400">{p.date}</td>
                          <td className="p-3 font-bold">{p.total_amount.toFixed(2)}</td>
                          <td className="p-3 text-emerald-600 font-semibold">{p.paid_amount.toFixed(2)}</td>
                          <td className="p-3 font-bold text-rose-600">{balance.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">لا يوجد فواتير مسجلة للمورد</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments History */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-3">
              <CreditCard size={18} className="text-emerald-500 stroke-[2]" />
              <h3 className="text-sm font-bold text-slate-700 font-tajawal">سجل سداد المورد المباشر</h3>
            </div>
            
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                    <th className="p-3">المبلغ المسدد</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">طريقة الدفع/المرجع</th>
                    <th className="p-3">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {payments.length > 0 ? (
                    payments.map(pay => (
                      <tr key={pay.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-emerald-600 font-bold">{pay.amount.toFixed(2)}</td>
                        <td className="p-3 font-medium text-slate-400">{pay.payment_date}</td>
                        <td className="p-3 font-semibold">{pay.reference || '-'}</td>
                        <td className="p-3 text-slate-400">{pay.notes || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">لم يتم تسجيل مدفوعات إضافية</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-cairo">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-tajawal">الموردين</h2>
          <p className="text-slate-400 text-xs mt-1">إضافة وإدارة الموردين وعرض كشوفات الحساب المالية الخاصة بهم</p>
        </div>
      </div>

      {loading || loadingDetail ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span>جاري تحميل الموردين...</span>
        </div>
      ) : (
        <DataTable
          columns={listColumns}
          data={suppliers}
          searchPlaceholder="بحث في اسم المورد أو الهاتف..."
          searchFilter={(item, q) => 
            item.name.toLowerCase().includes(q.toLowerCase()) || 
            (item.phone && item.phone.includes(q)) || false
          }
          onEdit={(row) => handleOpenEdit(row)}
          onDelete={(row) => handleDelete(row)}
          addButtonLabel="إضافة مورد جديد"
          onAddClick={handleOpenAdd}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">اسم المورد *</label>
            <input
              type="text"
              {...register('name')}
              className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all ${
                errors.name ? 'border-rose-300 focus:border-rose-500' : 'border-slate-100'
              }`}
              placeholder="مثال: شركة النور للاستيراد"
            />
            {errors.name && (
              <span className="text-rose-500 text-xs font-semibold block">{errors.name.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">رقم الهاتف</label>
            <input
              type="text"
              {...register('phone')}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              placeholder="مثال: 01012345678"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">العنوان</label>
            <input
              type="text"
              {...register('address')}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              placeholder="مثال: وسط البلد، القاهرة"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">ملاحظات</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
              placeholder="أية ملاحظات إضافية حول شروط المورد أو طريقة الدفع..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-100 transition-all duration-200 disabled:opacity-50 active:scale-[0.98] mt-2"
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ البيانات'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
export default Suppliers;
