import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { dbService, Product, Category } from '../services/db';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { isMock, supabase } from '../supabaseClient';
import { Upload, ImageIcon, AlertTriangle } from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(2, 'اسم المنتج يجب أن يكون حرفين على الأقل'),
  category_id: z.string().min(1, 'يرجى اختيار تصنيف'),
  unit: z.string().min(1, 'يرجى إدخال وحدة المنتج (مثال: قطعة، كيلو)'),
  purchase_price: z.number().min(0, 'سعر الشراء يجب أن يكون 0 أو أكثر'),
  selling_price: z.number().min(0, 'سعر البيع يجب أن يكون 0 أو أكثر'),
  opening_quantity: z.number().min(0, 'الكمية الافتتاحية يجب أن تكون 0 أو أكثر'),
  minimum_stock: z.number().min(0, 'حد التنبيه يجب أن يكون 0 أو أكثر'),
  image_url: z.string().optional()
}).refine(data => data.selling_price >= data.purchase_price, {
  message: 'سعر البيع لا يمكن أن يكون أقل من سعر الشراء',
  path: ['selling_price']
});

type ProductFormValues = z.infer<typeof productSchema>;

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Image upload states
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema)
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        dbService.getProducts(),
        dbService.getCategories()
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
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
    setEditingProduct(null);
    setImagePreview(null);
    reset({
      name: '',
      category_id: categories[0]?.id || '',
      unit: 'قطعة',
      purchase_price: 0,
      selling_price: 0,
      opening_quantity: 0,
      minimum_stock: 5,
      image_url: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setImagePreview(product.image_url || null);
    reset({
      name: product.name,
      category_id: product.category_id,
      unit: product.unit,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      opening_quantity: product.opening_quantity,
      minimum_stock: product.minimum_stock,
      image_url: product.image_url || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(`هل أنت متأكد من حذف المنتج "${product.name}"؟`)) {
      try {
        await dbService.deleteProduct(product.id);
        showToast('تم حذف المنتج بنجاح');
        loadData();
      } catch (err: any) {
        showToast('فشل حذف المنتج', 'error');
        console.error(err);
      }
    }
  };

  // Image Upload handler
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (< 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('حجم الصورة يجب أن يكون أقل من 2 ميغابايت', 'error');
      return;
    }

    try {
      setUploadingImage(true);
      if (isMock) {
        // Base64 Mock upload
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setImagePreview(base64);
          setValue('image_url', base64);
          setUploadingImage(false);
        };
        reader.readAsDataURL(file);
      } else {
        // Real Supabase storage upload
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        setImagePreview(data.publicUrl);
        setValue('image_url', data.publicUrl);
        showToast('تم رفع الصورة بنجاح');
        setUploadingImage(false);
      }
    } catch (err) {
      showToast('حدث خطأ أثناء رفع الصورة', 'error');
      console.error(err);
      setUploadingImage(false);
    }
  };

  const onSubmit = async (values: ProductFormValues) => {
    try {
      await dbService.saveProduct({
        id: editingProduct?.id,
        ...values
      });
      showToast(editingProduct ? 'تم تحديث المنتج بنجاح' : 'تم إضافة المنتج بنجاح');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('اسم المنتج موجود بالفعل أو حدث خطأ ما', 'error');
      console.error(err);
    }
  };

  const columns = [
    {
      header: 'المنتج',
      accessor: (row: Product) => (
        <div className="flex items-center gap-3">
          {row.image_url ? (
            <img src={row.image_url} alt={row.name} className="w-10 h-10 rounded-xl object-cover border border-slate-100" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
              <ImageIcon size={18} />
            </div>
          )}
          <div>
            <span className="font-semibold text-slate-800 block">{row.name}</span>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full inline-block mt-0.5">{row.category_name}</span>
          </div>
        </div>
      )
    },
    {
      header: 'المخزون الحالي',
      accessor: (row: Product) => {
        const isLow = Number(row.current_stock || 0) <= row.minimum_stock;
        return (
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>
              {Number(row.current_stock || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} {row.unit}
            </span>
            {isLow && (
              <span className="flex items-center gap-1 text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold">
                <AlertTriangle size={10} />
                <span>نقص</span>
              </span>
            )}
          </div>
        );
      }
    },
    {
      header: 'سعر الشراء',
      accessor: (row: Product) => <span className="font-medium">{row.purchase_price.toFixed(2)}</span>
    },
    {
      header: 'سعر البيع',
      accessor: (row: Product) => <span className="font-medium text-blue-600">{row.selling_price.toFixed(2)}</span>
    },
    {
      header: 'حد الطلب',
      accessor: (row: Product) => <span className="text-slate-400 text-xs font-semibold">أقل من {row.minimum_stock} {row.unit}</span>
    }
  ];

  return (
    <div className="space-y-6 font-cairo">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-tajawal">المنتجات</h2>
          <p className="text-slate-400 text-xs mt-1">إضافة وإدارة منتجات المتجر وتتبع حركات مخزونها</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span>جاري تحميل قائمة المنتجات...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={products}
          searchPlaceholder="بحث في اسم المنتج أو الوحدة..."
          searchFilter={(item, q) => 
            item.name.toLowerCase().includes(q.toLowerCase()) || 
            item.unit.toLowerCase().includes(q.toLowerCase())
          }
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          addButtonLabel="إضافة منتج جديد"
          onAddClick={handleOpenAdd}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-cairo">
          
          {/* Image Upload Area */}
          <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-slate-50 transition-colors relative group">
            {imagePreview ? (
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span>تغيير</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer gap-2 py-2">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-100">
                  {uploadingImage ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload size={20} />
                  )}
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-600 block">اضغط لرفع صورة المنتج</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">صيغ JPG, PNG حتى 2MB</span>
                </div>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" disabled={uploadingImage} />
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 col-span-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 block">اسم المنتج *</label>
              <input
                type="text"
                {...register('name')}
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all ${
                  errors.name ? 'border-rose-300 focus:border-rose-500' : 'border-slate-100'
                }`}
                placeholder="أرز، سكر، صابون..."
              />
              {errors.name && (
                <span className="text-rose-500 text-xs font-semibold block">{errors.name.message}</span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">التصنيف *</label>
              <select
                {...register('category_id')}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">وحدة القياس *</label>
              <input
                type="text"
                {...register('unit')}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                placeholder="قطعة، كرتونة، كجم"
              />
              {errors.unit && (
                <span className="text-rose-500 text-xs font-semibold block">{errors.unit.message}</span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">سعر الشراء الافتراضي *</label>
              <input
                type="number"
                step="0.01"
                {...register('purchase_price', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
              {errors.purchase_price && (
                <span className="text-rose-500 text-xs font-semibold block">{errors.purchase_price.message}</span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">سعر البيع الافتراضي *</label>
              <input
                type="number"
                step="0.01"
                {...register('selling_price', { valueAsNumber: true })}
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all ${
                  errors.selling_price ? 'border-rose-300 focus:border-rose-500' : 'border-slate-100'
                }`}
              />
              {errors.selling_price && (
                <span className="text-rose-500 text-xs font-semibold block">{errors.selling_price.message}</span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">الكمية الافتتاحية (المخزون الأول) *</label>
              <input
                type="number"
                step="0.01"
                {...register('opening_quantity', { valueAsNumber: true })}
                disabled={!!editingProduct}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50"
              />
              {errors.opening_quantity && (
                <span className="text-rose-500 text-xs font-semibold block">{errors.opening_quantity.message}</span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">حد التنبيه لنقص المخزون *</label>
              <input
                type="number"
                step="0.01"
                {...register('minimum_stock', { valueAsNumber: true })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
              {errors.minimum_stock && (
                <span className="text-rose-500 text-xs font-semibold block">{errors.minimum_stock.message}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || uploadingImage}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-100 transition-all duration-200 disabled:opacity-50 active:scale-[0.98] mt-2"
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ البيانات'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
export default Products;
