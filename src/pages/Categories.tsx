import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { dbService, Category } from '../services/db';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

// Form validation schema
const categorySchema = z.object({
  name: z.string().min(2, 'اسم التصنيف يجب أن يكون حرفين على الأقل'),
  description: z.string().optional()
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema)
  });

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await dbService.getCategories();
      setCategories(data);
    } catch (err: any) {
      showToast('حدث خطأ أثناء تحميل التصنيفات', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    reset({ name: '', description: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      description: category.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (window.confirm(`هل أنت متأكد من حذف تصنيف "${category.name}"؟`)) {
      try {
        await dbService.deleteCategory(category.id);
        showToast('تم حذف التصنيف بنجاح');
        loadCategories();
      } catch (err: any) {
        showToast('فشل حذف التصنيف (قد يكون مرتبطاً بمنتجات)', 'error');
        console.error(err);
      }
    }
  };

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      await dbService.saveCategory({
        id: editingCategory?.id,
        ...values
      });
      showToast(editingCategory ? 'تم تحديث التصنيف بنجاح' : 'تم إضافة التصنيف بنجاح');
      setIsModalOpen(false);
      loadCategories();
    } catch (err: any) {
      showToast('اسم التصنيف موجود بالفعل أو حدث خطأ ما', 'error');
      console.error(err);
    }
  };

  const columns = [
    {
      header: 'اسم التصنيف',
      accessor: (row: Category) => <span className="font-semibold text-slate-800">{row.name}</span>
    },
    {
      header: 'الوصف',
      accessor: (row: Category) => <span className="text-slate-400">{row.description || '-'}</span>
    }
  ];

  return (
    <div className="space-y-6 font-cairo">
      {/* Title section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 font-tajawal">التصنيفات</h2>
          <p className="text-slate-400 text-xs mt-1">إدارة تصنيفات المنتجات وتصنيف المخزون</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span>جاري تحميل التصنيفات...</span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={categories}
          searchPlaceholder="بحث في اسم التصنيف..."
          searchFilter={(item, q) => item.name.toLowerCase().includes(q.toLowerCase())}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          addButtonLabel="إضافة تصنيف جديد"
          onAddClick={handleOpenAdd}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">اسم التصنيف *</label>
            <input
              type="text"
              {...register('name')}
              className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all ${
                errors.name ? 'border-rose-300 focus:border-rose-500' : 'border-slate-100'
              }`}
              placeholder="مثال: بقالة، منظفات"
            />
            {errors.name && (
              <span className="text-rose-500 text-xs font-semibold block">{errors.name.message}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 block">الوصف</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
              placeholder="تفاصيل اختيارية حول التصنيف..."
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
export default Categories;
