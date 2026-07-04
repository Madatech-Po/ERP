import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/Tabs';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { dbService, Product } from '../services/db';
import { branchDbService, Branch, BranchBalance, Transfer, TransferItem } from '../services/branchDb';
import { Building2, ArrowRightLeft, FileSpreadsheet, History, Package, Plus, Trash2, MapPin, CheckCircle, XCircle } from 'lucide-react';

// --- Zod Schemas ---
const branchSchema = z.object({
  code: z.string().min(1, 'كود الفرع مطلوب'),
  name: z.string().min(2, 'اسم الفرع مطلوب'),
  manager: z.string().min(2, 'اسم المدير مطلوب'),
  phone: z.string().min(1, 'رقم الهاتف مطلوب'),
  address: z.string().min(1, 'العنوان مطلوب'),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive'])
});

const transferSchema = z.object({
  from_branch_id: z.string().min(1, 'يجب تحديد الفرع المحول منه'),
  to_branch_id: z.string().min(1, 'يجب تحديد الفرع المحول إليه'),
  date: z.string().min(1, 'التاريخ مطلوب'),
  notes: z.string().optional(),
});

type BranchFormValues = z.infer<typeof branchSchema>;
type TransferFormValues = z.infer<typeof transferSchema>;

export const BranchManagement: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // --- Data States ---
  const [branches, setBranches] = useState<Branch[]>([]);
  const [balances, setBalances] = useState<BranchBalance[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // --- Modal States ---
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState<Transfer | null>(null);
  const [viewingTransferItems, setViewingTransferItems] = useState<TransferItem[]>([]);

  // --- Form Hooks ---
  const branchForm = useForm<BranchFormValues>({ resolver: zodResolver(branchSchema) });
  const transferForm = useForm<TransferFormValues>({ resolver: zodResolver(transferSchema) });

  // --- Transfer Items State ---
  const [transferLines, setTransferLines] = useState<{ id: string; product_id: string; quantity: number }[]>([]);

  // --- Print State ---
  const [printVoucherId, setPrintVoucherId] = useState<string | null>(null);
  const [voucherData, setVoucherData] = useState<{transfer: Transfer, items: TransferItem[]} | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [brData, balData, trData, prodData] = await Promise.all([
        branchDbService.getBranches(),
        branchDbService.getBalances(),
        branchDbService.getTransfers(),
        dbService.getProducts()
      ]);
      setBranches(brData);
      setBalances(balData);
      setTransfers(trData);
      setProducts(prodData);
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تحميل بيانات الفروع', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (printVoucherId && voucherData) {
      const timer = setTimeout(() => {
        window.print();
        setPrintVoucherId(null);
        setVoucherData(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [printVoucherId, voucherData]);

  // =====================================
  // Branches Logic
  // =====================================
  const handleOpenBranchModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      branchForm.reset({
        code: branch.code,
        name: branch.name,
        manager: branch.manager,
        phone: branch.phone,
        address: branch.address,
        notes: branch.notes || '',
        status: branch.status
      });
    } else {
      setEditingBranch(null);
      branchForm.reset({
        code: `BR-${Math.floor(Math.random() * 10000)}`,
        name: '',
        manager: '',
        phone: '',
        address: '',
        notes: '',
        status: 'active'
      });
    }
    setIsBranchModalOpen(true);
  };

  const onSubmitBranch = async (values: BranchFormValues) => {
    try {
      await branchDbService.saveBranch({ ...editingBranch, ...values } as Branch);
      showToast(editingBranch ? 'تم تحديث الفرع بنجاح' : 'تم إضافة الفرع بنجاح');
      setIsBranchModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ الفرع', 'error');
    }
  };

  // =====================================
  // Transfer Logic
  // =====================================
  const handleAddTransferLine = () => {
    setTransferLines([...transferLines, { id: Date.now().toString(), product_id: '', quantity: 1 }]);
  };

  const handleUpdateTransferLine = (id: string, field: string, value: string | number) => {
    setTransferLines(lines => lines.map(line => line.id === id ? { ...line, [field]: value } : line));
  };

  const handleRemoveTransferLine = (id: string) => {
    setTransferLines(lines => lines.filter(line => line.id !== id));
  };

  const onSubmitTransfer = async (values: TransferFormValues) => {
    if (values.from_branch_id === values.to_branch_id) {
      showToast('لا يمكن التحويل لنفس الفرع', 'error');
      return;
    }
    
    const validLines = transferLines.filter(l => l.product_id && l.quantity > 0);
    if (validLines.length === 0) {
      showToast('يرجى إضافة منتجات للتحويل', 'error');
      return;
    }

    try {
      const items: Omit<TransferItem, 'id' | 'transfer_id'>[] = validLines.map(line => {
        const prod = products.find(p => p.id === line.product_id);
        return {
          product_id: line.product_id,
          quantity: line.quantity,
          unit: prod?.unit || 'قطعة'
        };
      });

      const newId = await branchDbService.saveTransferDraft({
        date: values.date,
        from_branch_id: values.from_branch_id,
        to_branch_id: values.to_branch_id,
        notes: values.notes,
        status: 'draft',
        created_by: 'مدير النظام'
      }, items);

      // Immediately send it for simplicity, or we can leave it as draft. We'll send it.
      await branchDbService.sendTransfer(newId);

      const allT = await branchDbService.getTransfers();
      const savedTransfer = allT.find(t => t.id === newId);
      const savedItems = await branchDbService.getTransferItems(newId);

      showToast('تم إنشاء وإرسال التحويل بنجاح');
      transferForm.reset();
      setTransferLines([]);
      loadData();

      // Trigger Print Preview
      if (savedTransfer) {
        setVoucherData({ transfer: savedTransfer, items: savedItems });
        setPrintVoucherId(newId);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'حدث خطأ أثناء حفظ التحويل', 'error');
    }
  };

  const handleConfirmReceive = async (transferId: string) => {
    if (!window.confirm('هل أنت متأكد من استلام هذه الشحنة وإضافتها لرصيد الفرع؟')) return;
    try {
      await branchDbService.receiveTransfer(transferId);
      showToast('تم استلام التحويل وإضافته للأرصدة');
      loadData();
      setIsTransferModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'خطأ في الاستلام', 'error');
    }
  };

  const handleCancelTransfer = async (transferId: string) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا التحويل؟ سيتم استرجاع الأرصدة للفرع المرسل.')) return;
    try {
      await branchDbService.cancelTransfer(transferId);
      showToast('تم إلغاء التحويل');
      loadData();
      setIsTransferModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'خطأ في الإلغاء', 'error');
    }
  };

  const openTransferDetails = async (transfer: Transfer) => {
    setViewingTransfer(transfer);
    const items = await branchDbService.getTransferItems(transfer.id);
    setViewingTransferItems(items);
    setIsTransferModalOpen(true);
  };

  // =====================================
  // Columns & Renders
  // =====================================
  const getBranchName = (id: string) => branches.find(b => b.id === id)?.name || 'غير معروف';
  const getProductName = (id: string) => products.find(p => p.id === id)?.name || 'غير معروف';

  const branchColumns = [
    { header: 'الكود', accessor: (b: Branch) => <span className="font-bold text-slate-700">{b.code}</span> },
    { header: 'الفرع', accessor: (b: Branch) => b.name },
    { header: 'مدير الفرع', accessor: (b: Branch) => b.manager },
    { header: 'الهاتف', accessor: (b: Branch) => b.phone },
    { header: 'الحالة', accessor: (b: Branch) => (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
        {b.status === 'active' ? 'نشط' : 'موقف'}
      </span>
    )},
    { header: 'إجراءات', accessor: (b: Branch) => (
      <button onClick={() => handleOpenBranchModal(b)} className="text-blue-600 hover:text-blue-800 text-sm font-bold">تعديل</button>
    )}
  ];

  const balanceData = balances.reduce((acc, curr) => {
    const existing = acc.find(x => x.branch_id === curr.branch_id);
    const prod = products.find(p => p.id === curr.product_id);
    const val = (prod?.purchase_price || 0) * curr.quantity;
    
    if (existing) {
      existing.totalProducts++;
      existing.totalQuantity += curr.quantity;
      existing.totalValue += val;
    } else {
      acc.push({
        branch_id: curr.branch_id,
        totalProducts: 1,
        totalQuantity: curr.quantity,
        totalValue: val
      });
    }
    return acc;
  }, [] as { branch_id: string, totalProducts: number, totalQuantity: number, totalValue: number }[]);

  const balanceColumns = [
    { header: 'الفرع', accessor: (d: any) => <span className="font-bold">{getBranchName(d.branch_id)}</span> },
    { header: 'إجمالي الأصناف', accessor: (d: any) => d.totalProducts },
    { header: 'إجمالي الكميات', accessor: (d: any) => d.totalQuantity },
    { header: 'إجمالي قيمة المخزون', accessor: (d: any) => <span className="font-bold text-blue-700">{d.totalValue.toFixed(2)} ج.م</span> },
  ];

  const transferColumns = [
    { header: 'رقم التحويل', accessor: (t: Transfer) => <span className="font-bold text-slate-700">{t.transfer_number}</span> },
    { header: 'التاريخ', accessor: (t: Transfer) => t.date },
    { header: 'من فرع', accessor: (t: Transfer) => getBranchName(t.from_branch_id) },
    { header: 'إلى فرع', accessor: (t: Transfer) => getBranchName(t.to_branch_id) },
    { header: 'بواسطة', accessor: (t: Transfer) => t.created_by },
    { header: 'الحالة', accessor: (t: Transfer) => {
        const statusConfig = {
          draft: { label: 'مسودة', class: 'bg-slate-100 text-slate-600' },
          sent: { label: 'مرسل / قيد الطريق', class: 'bg-blue-100 text-blue-700' },
          received: { label: 'تم الاستلام', class: 'bg-emerald-100 text-emerald-700' },
          cancelled: { label: 'ملغي', class: 'bg-rose-100 text-rose-700' },
        };
        const conf = statusConfig[t.status];
        return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${conf.class}`}>{conf.label}</span>;
      }
    },
    { header: 'إجراءات', accessor: (t: Transfer) => (
      <button onClick={() => openTransferDetails(t)} className="text-blue-600 hover:text-blue-800 text-sm font-bold bg-blue-50 px-3 py-1 rounded-lg">التفاصيل</button>
    )}
  ];

  if (loading) return (
    <div className="flex h-screen items-center justify-center text-blue-600">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 font-cairo pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 font-tajawal flex items-center gap-3">
            <Building2 className="text-blue-600" size={32} />
            إدارة الفروع
          </h2>
          <p className="text-slate-500 text-sm mt-2">إدارة بيانات الفروع المتعددة، حركة المخزون بينها، وأرصدة البضائع في كل فرع.</p>
        </div>
      </div>

      <Tabs defaultValue="branches" className="mt-8">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl bg-white border border-slate-100 shadow-sm p-1.5 h-auto rounded-2xl">
          <TabsTrigger value="branches" className="py-2.5 text-[15px]"><Building2 size={16} className="ml-2" /> الفروع</TabsTrigger>
          <TabsTrigger value="new-transfer" className="py-2.5 text-[15px]"><Plus size={16} className="ml-2" /> إنشاء تحويل</TabsTrigger>
          <TabsTrigger value="balances" className="py-2.5 text-[15px]"><FileSpreadsheet size={16} className="ml-2" /> أرصدة الفروع</TabsTrigger>
          <TabsTrigger value="transfers-history" className="py-2.5 text-[15px]"><History size={16} className="ml-2" /> سجل التحويلات</TabsTrigger>
        </TabsList>

        {/* --- Tab 1: Branches --- */}
        <TabsContent value="branches">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">قائمة الفروع المسجلة</h3>
              <button
                onClick={() => handleOpenBranchModal()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-2 transition-all"
              >
                <Plus size={18} /> إضافة فرع جديد
              </button>
            </div>
            <DataTable data={branches} columns={branchColumns} />
          </div>
        </TabsContent>

        {/* --- Tab 2: New Transfer --- */}
        <TabsContent value="new-transfer">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2"><ArrowRightLeft size={20} className="text-blue-600" /> نموذج تحويل بضاعة</h3>
            
            <form onSubmit={transferForm.handleSubmit(onSubmitTransfer)} className="space-y-6">
              <div className="grid grid-cols-3 gap-5 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">تاريخ التحويل *</label>
                  <input type="date" {...transferForm.register('date')} defaultValue={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none font-semibold" />
                  {transferForm.formState.errors.date && <span className="text-rose-500 text-xs">{transferForm.formState.errors.date.message}</span>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">من فرع (المرسل) *</label>
                  <select {...transferForm.register('from_branch_id')} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none font-semibold">
                    <option value="">-- اختر الفرع --</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {transferForm.formState.errors.from_branch_id && <span className="text-rose-500 text-xs">{transferForm.formState.errors.from_branch_id.message}</span>}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500">إلى فرع (المستلم) *</label>
                  <select {...transferForm.register('to_branch_id')} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none font-semibold">
                    <option value="">-- اختر الفرع --</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {transferForm.formState.errors.to_branch_id && <span className="text-rose-500 text-xs">{transferForm.formState.errors.to_branch_id.message}</span>}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-slate-700">الأصناف المحولة</h4>
                  <button type="button" onClick={handleAddTransferLine} className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors">
                    <Plus size={16} /> إضافة صنف
                  </button>
                </div>
                
                {transferLines.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                    <Package size={40} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-bold">لم يتم إضافة أصناف للتحويل بعد.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transferLines.map((line, index) => (
                      <div key={line.id} className="flex gap-4 items-center bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                        <span className="text-slate-400 font-bold w-6">{index + 1}</span>
                        <div className="flex-1">
                          <select 
                            value={line.product_id}
                            onChange={(e) => handleUpdateTransferLine(line.id, 'product_id', e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none font-bold"
                          >
                            <option value="">-- اختر المنتج --</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="w-32 relative">
                          <input 
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => handleUpdateTransferLine(line.id, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none font-bold text-center"
                          />
                        </div>
                        <button type="button" onClick={() => handleRemoveTransferLine(line.id)} className="w-10 h-10 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-500">ملاحظات التحويل</label>
                <textarea {...transferForm.register('notes')} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none resize-none" rows={2} placeholder="أي ملاحظات إضافية بخصوص الشحنة..."></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="submit" disabled={transferForm.formState.isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-md shadow-blue-200 transition-all active:scale-[0.98]">
                  إرسال التحويل واعتماد الخصم
                </button>
              </div>
            </form>
          </div>
        </TabsContent>

        {/* --- Tab 3: Balances --- */}
        <TabsContent value="balances">
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">ملخص أرصدة المخزون في الفروع</h3>
            <DataTable data={balanceData} columns={balanceColumns} />
          </div>
        </TabsContent>

        {/* --- Tab 4: Transfers History --- */}
        <TabsContent value="transfers-history">
           <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-6">سجل حركة التحويلات بين الفروع</h3>
            <DataTable data={transfers} columns={transferColumns} />
          </div>
        </TabsContent>
      </Tabs>

      {/* --- Branch Form Modal --- */}
      <Modal isOpen={isBranchModalOpen} onClose={() => setIsBranchModalOpen(false)} title={editingBranch ? 'تعديل بيانات فرع' : 'إضافة فرع جديد'}>
        <form onSubmit={branchForm.handleSubmit(onSubmitBranch)} className="space-y-5 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">كود الفرع *</label>
              <input type="text" {...branchForm.register('code')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none font-bold" />
              {branchForm.formState.errors.code && <span className="text-rose-500 text-xs">{branchForm.formState.errors.code.message}</span>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">الحالة</label>
              <select {...branchForm.register('status')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none font-bold">
                <option value="active">نشط</option>
                <option value="inactive">موقف</option>
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold text-slate-500">اسم الفرع *</label>
              <input type="text" {...branchForm.register('name')} placeholder="مثال: فرع مدينة نصر" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none font-bold" />
              {branchForm.formState.errors.name && <span className="text-rose-500 text-xs">{branchForm.formState.errors.name.message}</span>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">مدير الفرع *</label>
              <input type="text" {...branchForm.register('manager')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none font-bold" />
              {branchForm.formState.errors.manager && <span className="text-rose-500 text-xs">{branchForm.formState.errors.manager.message}</span>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">رقم الهاتف *</label>
              <input type="text" {...branchForm.register('phone')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none font-bold text-left" dir="ltr" />
              {branchForm.formState.errors.phone && <span className="text-rose-500 text-xs">{branchForm.formState.errors.phone.message}</span>}
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold text-slate-500">العنوان التفصيلي *</label>
              <div className="relative">
                <MapPin size={16} className="absolute right-3.5 top-2.5 text-slate-400" />
                <input type="text" {...branchForm.register('address')} className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none font-semibold" />
              </div>
              {branchForm.formState.errors.address && <span className="text-rose-500 text-xs">{branchForm.formState.errors.address.message}</span>}
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold text-slate-500">ملاحظات</label>
              <textarea {...branchForm.register('notes')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:outline-none resize-none" rows={2}></textarea>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button type="submit" disabled={branchForm.formState.isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-bold shadow-md transition-all">حفظ البيانات</button>
            <button type="button" onClick={() => setIsBranchModalOpen(false)} className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-all">إلغاء</button>
          </div>
        </form>
      </Modal>

      {/* --- View Transfer Modal --- */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title={`تفاصيل إذن تحويل: ${viewingTransfer?.transfer_number}`}>
        {viewingTransfer && (
          <div className="space-y-6 mt-2">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
              <div>
                <span className="block text-slate-400 text-xs font-bold mb-1">من فرع</span>
                <span className="font-bold text-slate-800">{getBranchName(viewingTransfer.from_branch_id)}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs font-bold mb-1">إلى فرع</span>
                <span className="font-bold text-slate-800">{getBranchName(viewingTransfer.to_branch_id)}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs font-bold mb-1">التاريخ</span>
                <span className="font-bold text-slate-800">{viewingTransfer.date}</span>
              </div>
              <div>
                <span className="block text-slate-400 text-xs font-bold mb-1">الحالة</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block ${
                  viewingTransfer.status === 'received' ? 'bg-emerald-100 text-emerald-700' :
                  viewingTransfer.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                  viewingTransfer.status === 'cancelled' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                }`}>
                  {viewingTransfer.status === 'sent' ? 'مرسل' : viewingTransfer.status === 'received' ? 'مستلم' : viewingTransfer.status === 'cancelled' ? 'ملغي' : 'مسودة'}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-700 mb-3">الأصناف المحولة:</h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="p-3 font-bold text-slate-600">المنتج</th>
                      <th className="p-3 font-bold text-slate-600 w-24">الكمية</th>
                      <th className="p-3 font-bold text-slate-600 w-24">الوحدة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingTransferItems.map(item => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-0">
                        <td className="p-3 font-bold">{getProductName(item.product_id)}</td>
                        <td className="p-3 text-blue-700 font-extrabold">{item.quantity}</td>
                        <td className="p-3 text-slate-500">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {viewingTransfer.status === 'sent' && (
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => handleConfirmReceive(viewingTransfer.id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl text-sm font-bold shadow-md shadow-emerald-200 flex justify-center items-center gap-2 transition-all">
                  <CheckCircle size={18} /> تأكيد استلام البضاعة
                </button>
                <button onClick={() => handleCancelTransfer(viewingTransfer.id)} className="px-6 bg-rose-50 hover:bg-rose-100 text-rose-600 py-3 rounded-xl text-sm font-bold flex justify-center items-center gap-2 transition-all">
                  <XCircle size={18} /> إلغاء التحويل
                </button>
              </div>
            )}
            
            {viewingTransfer.status !== 'sent' && (
               <div className="flex justify-end pt-4 border-t border-slate-100">
                 <button onClick={() => setIsTransferModalOpen(false)} className="px-8 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-bold transition-all">إغلاق</button>
               </div>
            )}
          </div>
        )}
      </Modal>

      {/* --- Printable Voucher (Hidden on Screen, Visible on Print) --- */}
      {printVoucherId && voucherData && (
        <div id="printable-voucher" className="bg-white text-black p-8 text-right font-cairo" dir="rtl">
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
            <div className="text-right">
              <h1 className="text-3xl font-bold font-tajawal mb-2">إذن تحويل بين الفروع</h1>
              <p className="text-lg">تاريخ التحويل: <span className="font-bold">{voucherData.transfer.date}</span></p>
              <p className="text-lg">رقم التحويل: <span className="font-bold">{voucherData.transfer.transfer_number}</span></p>
            </div>
            <div className="text-left flex flex-col items-end">
              <div className="w-20 h-20 bg-slate-100 flex items-center justify-center rounded-2xl mb-2 border-2 border-black">
                <Building2 size={40} className="text-black" />
              </div>
              <h2 className="font-bold text-xl">مدير المحل</h2>
            </div>
          </div>

          {/* Info Boxes */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="border-2 border-black p-4 rounded-xl">
              <h3 className="font-bold text-xl mb-2 border-b-2 border-black pb-2">بيانات المرسل</h3>
              <p className="text-lg">الفرع: <span className="font-bold">{getBranchName(voucherData.transfer.from_branch_id)}</span></p>
            </div>
            <div className="border-2 border-black p-4 rounded-xl">
              <h3 className="font-bold text-xl mb-2 border-b-2 border-black pb-2">بيانات المستلم</h3>
              <p className="text-lg">الفرع: <span className="font-bold">{getBranchName(voucherData.transfer.to_branch_id)}</span></p>
            </div>
          </div>

          <div className="mb-6 flex justify-between bg-slate-50 p-4 rounded-xl border border-black">
            <p className="text-lg"><strong>بواسطة:</strong> {voucherData.transfer.created_by}</p>
            <p className="text-lg"><strong>الحالة:</strong> {voucherData.transfer.status === 'sent' ? 'مرسل' : 'مسودة'}</p>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border-2 border-black mb-6 text-lg">
            <thead>
              <tr className="bg-slate-100">
                <th className="border-2 border-black p-3 text-center w-12">م</th>
                <th className="border-2 border-black p-3 text-center w-32">كود المنتج</th>
                <th className="border-2 border-black p-3 text-right">اسم المنتج</th>
                <th className="border-2 border-black p-3 text-center w-24">الوحدة</th>
                <th className="border-2 border-black p-3 text-center w-24">الكمية</th>
                <th className="border-2 border-black p-3 text-center w-32">سعر التكلفة</th>
                <th className="border-2 border-black p-3 text-center w-32">إجمالي القيمة</th>
              </tr>
            </thead>
            <tbody>
              {voucherData.items.map((item, idx) => {
                const prod = products.find(p => p.id === item.product_id);
                const cost = prod?.purchase_price || 0;
                const total = cost * item.quantity;
                return (
                  <tr key={item.id}>
                    <td className="border-2 border-black p-3 text-center font-bold">{idx + 1}</td>
                    <td className="border-2 border-black p-3 text-center font-bold">{prod?.id.slice(0,6) || '-'}</td>
                    <td className="border-2 border-black p-3 text-right font-bold">{prod?.name || 'غير معروف'}</td>
                    <td className="border-2 border-black p-3 text-center">{item.unit}</td>
                    <td className="border-2 border-black p-3 text-center font-bold">{item.quantity}</td>
                    <td className="border-2 border-black p-3 text-center font-bold">{cost.toFixed(2)}</td>
                    <td className="border-2 border-black p-3 text-center font-bold">{total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Voucher Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-1/2 border-2 border-black rounded-xl p-4 bg-slate-50">
              <h3 className="font-bold text-xl mb-3 border-b-2 border-black pb-2 text-center">إجمالي التحويل (تقييم مخزني)</h3>
              <div className="space-y-2 text-lg font-bold">
                <div className="flex justify-between">
                  <span>عدد الأصناف :</span>
                  <span>{voucherData.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>إجمالي الوحدات :</span>
                  <span>{voucherData.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between text-xl mt-2 pt-2 border-t-2 border-black text-blue-800">
                  <span>إجمالي قيمة التحويل :</span>
                  <span>
                    {voucherData.items.reduce((sum, item) => {
                      const prod = products.find(p => p.id === item.product_id);
                      return sum + (prod?.purchase_price || 0) * item.quantity;
                    }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} جنيه
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-16 border-2 border-black p-4 rounded-xl min-h-[100px]">
            <h3 className="font-bold text-xl mb-3">الملاحظات:</h3>
            <p className="text-lg">{voucherData.transfer.notes || 'لا يوجد ملاحظات إضافية بخصوص هذه الشحنة.'}</p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-4 gap-6 mt-16 text-center text-lg">
            <div>
              <p className="font-bold mb-16">أمين المخزن (المرسل)</p>
              <div className="border-t-2 border-black w-4/5 mx-auto"></div>
            </div>
            <div>
              <p className="font-bold mb-16">الناقل</p>
              <div className="border-t-2 border-black w-4/5 mx-auto"></div>
            </div>
            <div>
              <p className="font-bold mb-16">أمين المخزن (المستلم)</p>
              <div className="border-t-2 border-black w-4/5 mx-auto"></div>
            </div>
            <div>
              <p className="font-bold mb-16">المدير المستلم</p>
              <div className="border-t-2 border-black w-4/5 mx-auto"></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
