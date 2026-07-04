import React, { useEffect, useState } from 'react';
import { dbService, Purchase, Supplier, Product } from '../services/db';
import { useToast } from '../components/Toast';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Plus, Trash2, Calendar, FileText, ArrowRight, Eye, AlertCircle } from 'lucide-react';

export const Purchases: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // View invoice detail modal state
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Invoice creation form state
  const [isCreating, setIsCreating] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceItems, setInvoiceItems] = useState<{
    product_id: string;
    quantity: number;
    purchase_price: number;
  }[]>([]);
  const [paidAmount, setPaidAmount] = useState(0);

  const { showToast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const [purchasesData, suppliersData, productsData] = await Promise.all([
        dbService.getPurchases(),
        dbService.getSuppliers(),
        dbService.getProducts()
      ]);
      setPurchases(purchasesData);
      setSuppliers(suppliersData);
      setProducts(productsData);
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

  const handleOpenCreate = () => {
    if (suppliers.length === 0) {
      showToast('يرجى إضافة مورد أولاً قبل إنشاء فاتورة مشتريات', 'error');
      return;
    }
    if (products.length === 0) {
      showToast('يرجى إضافة منتجات أولاً قبل إنشاء فاتورة مشتريات', 'error');
      return;
    }
    setSupplierId(suppliers[0].id);
    setInvoiceNumber(`INV-${Math.floor(1000 + Math.random() * 9000)}`);
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setInvoiceItems([{ product_id: products[0].id, quantity: 10, purchase_price: products[0].purchase_price }]);
    setPaidAmount(0);
    setIsCreating(true);
  };

  const handleAddItemRow = () => {
    setInvoiceItems(prev => [...prev, {
      product_id: products[0].id,
      quantity: 10,
      purchase_price: products[0].purchase_price
    }]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (invoiceItems.length === 1) {
      showToast('يجب أن تحتوي الفاتورة على منتج واحد على الأقل', 'info');
      return;
    }
    setInvoiceItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'product_id' | 'quantity' | 'purchase_price', value: any) => {
    setInvoiceItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        // Auto default the price when product changes
        if (field === 'product_id') {
          const selectedProd = products.find(p => p.id === value);
          if (selectedProd) {
            updatedItem.purchase_price = selectedProd.purchase_price;
          }
        }
        return updatedItem;
      }
      return item;
    }));
  };

  // Calculations
  const invoiceTotal = invoiceItems.reduce((acc, item) => acc + (item.quantity * item.purchase_price), 0);
  const remainingBalance = Math.max(0, invoiceTotal - paidAmount);

  const handleSavePurchase = async () => {
    if (!invoiceNumber.trim()) {
      showToast('يرجى إدخال رقم الفاتورة', 'error');
      return;
    }
    if (invoiceItems.some(item => item.quantity <= 0 || item.purchase_price <= 0)) {
      showToast('الكمية وسعر الشراء يجب أن تكون أكبر من الصفر لكافة البنود', 'error');
      return;
    }

    try {
      setLoading(true);
      await dbService.savePurchase(
        {
          supplier_id: supplierId,
          date: invoiceDate,
          invoice_number: invoiceNumber,
          paid_amount: paidAmount
        },
        invoiceItems
      );
      showToast('تم تسجيل فاتورة الشراء وزيادة المخزون بنجاح');
      setIsCreating(false);
      loadData();
    } catch (err: any) {
      showToast('فشل حفظ الفاتورة، يرجى التحقق من المدخلات', 'error');
      console.error(err);
      setLoading(false);
    }
  };

  const handleDeletePurchase = async (purchase: Purchase) => {
    if (window.confirm(`هل أنت متأكد من حذف فاتورة المشتريات "${purchase.invoice_number}"؟ سيؤدي ذلك لخصم الكميات من المخزون وتعديل رصيد المورد.`)) {
      try {
        setLoading(true);
        await dbService.deletePurchase(purchase.id);
        showToast('تم حذف الفاتورة وتعديل الحسابات والمخزون بنجاح');
        loadData();
      } catch (err: any) {
        showToast('فشل حذف الفاتورة، قد يكون المخزون الحالي للمنتجات غير كافٍ لخصمه', 'error');
        console.error(err);
        setLoading(false);
      }
    }
  };

  const columns = [
    {
      header: 'رقم الفاتورة',
      accessor: (row: Purchase) => <span className="font-semibold text-slate-800">{row.invoice_number}</span>
    },
    {
      header: 'المورد',
      accessor: (row: Purchase) => <span className="font-medium">{row.supplier_name}</span>
    },
    {
      header: 'التاريخ',
      accessor: (row: Purchase) => <span className="text-slate-400 font-medium">{row.date}</span>
    },
    {
      header: 'الإجمالي',
      accessor: (row: Purchase) => <span className="font-bold text-slate-700">{row.total_amount.toFixed(2)}</span>
    },
    {
      header: 'المدفوع',
      accessor: (row: Purchase) => <span className="font-semibold text-emerald-600">{row.paid_amount.toFixed(2)}</span>
    },
    {
      header: 'المتبقي (الأجل)',
      accessor: (row: Purchase) => {
        const bal = row.total_amount - row.paid_amount;
        return (
          <span className={`font-bold ${bal > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
            {bal.toFixed(2)}
          </span>
        );
      }
    },
    {
      header: 'معاينة البنود',
      accessor: (row: Purchase) => (
        <button
          onClick={() => setSelectedPurchase(row)}
          className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
        >
          <Eye size={14} />
          <span className="text-[10px] font-bold">معاينة</span>
        </button>
      )
    }
  ];

  // If in Creation mode, render the Creation Form
  if (isCreating) {
    return (
      <div className="space-y-6 font-cairo">
        {/* Creator Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCreating(false)}
              className="p-2 bg-white border border-slate-100 hover:bg-slate-50 rounded-xl text-slate-500 hover:text-slate-800 shadow-sm transition-all active:scale-95"
            >
              <ArrowRight size={18} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 font-tajawal">فاتورة شراء جديدة</h2>
              <p className="text-slate-400 text-xs mt-1">تسجيل فاتورة توريد وزيادة المخزون وتحديث أرصدة الموردين</p>
            </div>
          </div>
        </div>

        {/* Invoice Fields Header */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">اختر المورد *</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            >
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">رقم الفاتورة *</label>
            <div className="relative">
              <FileText className="absolute right-3.5 top-3 text-slate-400" size={16} />
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
                placeholder="رقم الفاتورة من المورد"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">تاريخ الفاتورة *</label>
            <div className="relative">
              <Calendar className="absolute right-3.5 top-3 text-slate-400" size={16} />
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <h3 className="text-sm font-bold text-slate-700 font-tajawal">بنود الفاتورة</h3>
            <button
              onClick={handleAddItemRow}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
            >
              <Plus size={14} />
              <span>إضافة منتج جديد</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <th className="p-3">اسم المنتج</th>
                  <th className="p-3 w-40">الكمية</th>
                  <th className="p-3 w-40">سعر الشراء للوحدة</th>
                  <th className="p-3 w-40">الإجمالي الفرعي</th>
                  <th className="p-3 w-20 text-left">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoiceItems.map((item, index) => {
                  const subtotal = item.quantity * item.purchase_price;
                  const currentProd = products.find(p => p.id === item.product_id);
                  return (
                    <tr key={index} className="hover:bg-slate-50/20">
                      {/* Product Select */}
                      <td className="p-3">
                        <select
                          value={item.product_id}
                          onChange={(e) => handleItemChange(index, 'product_id', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white text-xs transition-all font-semibold text-slate-700"
                        >
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Quantity Input */}
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.001"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-800"
                          />
                          <span className="text-slate-400 font-bold text-[10px] shrink-0 w-10">
                            {currentProd ? currentProd.unit : 'وحدة'}
                          </span>
                        </div>
                      </td>

                      {/* Purchase Price Input */}
                      <td className="p-3">
                        <input
                          type="number"
                          step="0.01"
                          value={item.purchase_price}
                          onChange={(e) => handleItemChange(index, 'purchase_price', Number(e.target.value))}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-800"
                        />
                      </td>

                      {/* Subtotal */}
                      <td className="p-3 font-bold text-slate-800">
                        {subtotal.toFixed(2)}
                      </td>

                      {/* Delete */}
                      <td className="p-3 text-left">
                        <button
                          onClick={() => handleRemoveItemRow(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Footer Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-start gap-4">
            <AlertCircle size={20} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-500 leading-relaxed space-y-1">
              <span className="font-bold text-slate-700 block">ملاحظة محاسبية هامة:</span>
              <p>حفظ الفاتورة سيقوم بزيادة مخزون المنتجات المحددة تلقائياً.</p>
              <p>رصيد المورد الدائن سيتم تحديثه بمقدار **المبلغ المتبقي** (إجمالي الفاتورة - المدفوع).</p>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-2 text-sm font-bold text-slate-500">
              <span>إجمالي الفاتورة:</span>
              <span className="text-slate-800 text-lg">{invoiceTotal.toFixed(2)} ج.م</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="text-xs font-bold text-slate-500 block">المبلغ المدفوع حالياً:</label>
              <input
                type="number"
                step="0.01"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-48 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 text-left focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm font-bold">
              <span className="text-slate-500">المبلغ الآجل (المتبقي):</span>
              <span className={`text-lg ${remainingBalance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                {remainingBalance.toFixed(2)} ج.م
              </span>
            </div>

            <button
              onClick={handleSavePurchase}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-emerald-100 hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
            >
              حفظ وتوريد الفاتورة
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-cairo">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-tajawal">المشتريات</h2>
          <p className="text-slate-400 text-xs mt-1">سجل فواتير الشراء وتوريد المخزون من الموردين</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span>جاري تحميل فواتير الشراء...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={purchases}
          searchPlaceholder="بحث برقم الفاتورة أو المورد..."
          searchFilter={(item, q) => 
            item.invoice_number.toLowerCase().includes(q.toLowerCase()) || 
            item.supplier_name?.toLowerCase().includes(q.toLowerCase()) || false
          }
          onDelete={handleDeletePurchase}
          addButtonLabel="تسجيل فاتورة توريد"
          onAddClick={handleOpenCreate}
        />
      )}

      {/* View Invoice Items Modal */}
      <Modal
        isOpen={!!selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        title={`بنود فاتورة الشراء رقم (${selectedPurchase?.invoice_number})`}
      >
        {selectedPurchase && (
          <div className="space-y-4 font-cairo">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500 border-b border-slate-100 pb-3">
              <div><span className="font-bold text-slate-700">المورد:</span> {selectedPurchase.supplier_name}</div>
              <div><span className="font-bold text-slate-700">التاريخ:</span> {selectedPurchase.date}</div>
            </div>

            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-100">
                    <th className="p-3">اسم المنتج</th>
                    <th className="p-3">الكمية</th>
                    <th className="p-3">سعر الشراء للوحدة</th>
                    <th className="p-3 text-left">الإجمالي الفرعي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {selectedPurchase.items?.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{item.product_name}</td>
                      <td className="p-3 font-bold">{item.quantity}</td>
                      <td className="p-3">{item.purchase_price.toFixed(2)}</td>
                      <td className="p-3 text-left font-bold text-slate-800">{item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 pt-3 text-xs space-y-1">
              <div className="flex justify-between font-bold text-slate-600">
                <span>الإجمالي الكلي:</span>
                <span>{selectedPurchase.total_amount.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600">
                <span>المبلغ المدفوع:</span>
                <span>{selectedPurchase.paid_amount.toFixed(2)} ج.م</span>
              </div>
              <div className="flex justify-between font-bold text-rose-600 pt-1 border-t border-dashed border-slate-100">
                <span>المتبقي في الحساب:</span>
                <span>{(selectedPurchase.total_amount - selectedPurchase.paid_amount).toFixed(2)} ج.م</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default Purchases;
