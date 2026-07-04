import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { dbService } from '../services/db';
import { useToast } from '../components/Toast';
import { isMock, supabase } from '../supabaseClient';
import { Store, Phone, MapPin, Landmark, AlertTriangle, Upload } from 'lucide-react';

const settingsSchema = z.object({
  store_name: z.string().min(2, 'اسم المحل يجب أن يكون حرفين على الأقل'),
  phone: z.string().optional(),
  address: z.string().optional(),
  currency: z.string().min(1, 'رمز العملة مطلوب'),
  logo_url: z.string().optional(),
  low_stock_alert: z.number().min(0, 'حد النقص يجب أن يكون 0 أو أكثر')
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema)
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await dbService.getSettings();
      reset({
        store_name: data.store_name,
        phone: data.phone || '',
        address: data.address || '',
        currency: data.currency,
        logo_url: data.logo_url || '',
        low_stock_alert: data.low_stock_alert
      });
      setLogoPreview(data.logo_url || null);
    } catch (err: any) {
      showToast('حدث خطأ أثناء تحميل الإعدادات', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('حجم الشعار يجب أن يكون أقل من 2 ميغابايت', 'error');
      return;
    }

    try {
      setUploadingLogo(true);
      if (isMock) {
        // Base64 Mock
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setLogoPreview(base64);
          setValue('logo_url', base64);
          setUploadingLogo(false);
          showToast('تم رفع الشعار بنجاح');
        };
        reader.readAsDataURL(file);
      } else {
        // Supabase Upload
        const fileExt = file.name.split('.').pop();
        const fileName = `logo_${Date.now()}.${fileExt}`;
        const filePath = `store/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images') // reuse bucket or use public store bucket
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        setLogoPreview(data.publicUrl);
        setValue('logo_url', data.publicUrl);
        showToast('تم رفع الشعار بنجاح');
        setUploadingLogo(false);
      }
    } catch (err) {
      showToast('حدث خطأ أثناء رفع الشعار', 'error');
      console.error(err);
      setUploadingLogo(false);
    }
  };

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      await dbService.saveSettings(values);
      showToast('تم حفظ إعدادات المتجر بنجاح');
      
      // Reload page to propagate changes (e.g. Header store name)
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      showToast('فشل حفظ الإعدادات', 'error');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-400">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <span>جاري تحميل الإعدادات...</span>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-cairo">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 font-tajawal">إعدادات المتجر</h2>
        <p className="text-slate-400 text-xs mt-1">تخصيص معلومات المحل والعملة الافتراضية وشعار النظام</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Logo Uploader */}
          <div className="flex flex-col items-center justify-center p-5 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 relative group">
            <span className="text-xs font-bold text-slate-400 mb-3 block">شعار المتجر</span>
            {logoPreview ? (
              <div className="relative w-28 h-28 rounded-2xl overflow-hidden border border-slate-150 shadow-sm bg-white p-2">
                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                <label className="absolute inset-0 bg-black/40 text-white flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span>تغيير</span>
                  <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center cursor-pointer gap-2 py-2">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 border border-slate-100">
                  {uploadingLogo ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload size={20} />
                  )}
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-600 block">رفع شعار المتجر</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">JPG, PNG حتى 2MB</span>
                </div>
                <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" disabled={uploadingLogo} />
              </label>
            )}
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold text-slate-500 block">اسم المحل / المتجر *</label>
              <div className="relative">
                <Store className="absolute right-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  {...register('store_name')}
                  className={`w-full pl-4 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold ${
                    errors.store_name ? 'border-rose-300 focus:border-rose-500' : 'border-slate-100'
                  }`}
                  placeholder="مثال: بقالة الأمانة"
                />
              </div>
              {errors.store_name && (
                <span className="text-rose-500 text-xs font-semibold block">{errors.store_name.message}</span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">رقم هاتف المحل</label>
              <div className="relative">
                <Phone className="absolute right-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  {...register('phone')}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
                  placeholder="رقم الهاتف للتواصل"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 block">رمز العملة الافتراضية *</label>
              <div className="relative">
                <Landmark className="absolute right-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  {...register('currency')}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-slate-800"
                  placeholder="مثال: ج.م، ر.س، د.أ، $"
                />
              </div>
              {errors.currency && (
                <span className="text-rose-500 text-xs font-semibold block">{errors.currency.message}</span>
              )}
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold text-slate-500 block">العنوان</label>
              <div className="relative">
                <MapPin className="absolute right-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="text"
                  {...register('address')}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-semibold"
                  placeholder="العنوان التفصيلي للمتجر"
                />
              </div>
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold text-slate-500 block">حد التنبيه الافتراضي لنواقص المخزون *</label>
              <div className="relative">
                <AlertTriangle className="absolute right-3.5 top-3 text-slate-400" size={16} />
                <input
                  type="number"
                  {...register('low_stock_alert', { valueAsNumber: true })}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-rose-600"
                  placeholder="5"
                />
              </div>
              {errors.low_stock_alert && (
                <span className="text-rose-500 text-xs font-semibold block">{errors.low_stock_alert.message}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || uploadingLogo}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-150 hover:shadow-lg transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Settings;
