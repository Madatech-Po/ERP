import { supabase, isMock } from '../supabaseClient';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  opening_quantity: number;
  minimum_stock: number;
  image_url?: string;
  is_deleted: boolean;
  created_at?: string;
  // Dynamic fields resolved from views
  current_stock?: number;
  category_name?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  is_deleted: boolean;
  created_at?: string;
  // Dynamic fields
  outstanding_balance?: number;
  total_purchased?: number;
  total_paid?: number;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  purchase_price: number;
  subtotal: number;
  product_name?: string;
}

export interface Purchase {
  id: string;
  supplier_id: string;
  date: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  created_at?: string;
  supplier_name?: string;
  items?: PurchaseItem[];
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  payment_date: string;
  amount: number;
  reference?: string;
  notes?: string;
  created_at?: string;
  supplier_name?: string;
}

export interface DailySale {
  id: string;
  date: string;
  product_id: string;
  sold_quantity: number;
  purchase_price: number;
  selling_price: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  created_at?: string;
  product_name?: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: 'opening' | 'purchase' | 'sale' | 'adjustment';
  quantity: number;
  reference_id?: string;
  date: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
  created_at?: string;
}

export interface Settings {
  id?: string;
  store_name: string;
  phone?: string;
  address?: string;
  currency: string;
  logo_url?: string;
  low_stock_alert: number;
}

export interface DailyFinancials {
  date: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expenses: number;
  net_profit: number;
}

// ==========================================
// MOCK DATA INITIALIZATION & SIMULATOR
// ==========================================

const MOCK_STORAGE_KEYS = {
  CATEGORIES: 'mahal_categories',
  PRODUCTS: 'mahal_products',
  SUPPLIERS: 'mahal_suppliers',
  PURCHASES: 'mahal_purchases',
  PURCHASE_ITEMS: 'mahal_purchase_items',
  PAYMENTS: 'mahal_payments',
  DAILY_SALES: 'mahal_daily_sales',
  STOCK_MOVEMENTS: 'mahal_stock_movements',
  EXPENSES: 'mahal_expenses',
  SETTINGS: 'mahal_settings',
};

// Seed initial mock data if localStorage is empty
const seedMockData = () => {
  if (localStorage.getItem(MOCK_STORAGE_KEYS.SETTINGS)) return;

  const defaultCategories: Category[] = [
    { id: 'c1', name: 'مواد غذائية', description: 'الأرز والسكر والسلع الاستهلاكية' },
    { id: 'c2', name: 'مشروبات غازية ومياه', description: 'المياه والعصائر والبيبسي' },
    { id: 'c3', name: 'منظفات', description: 'صابون، كلور، ومستلزمات الغسيل' },
    { id: 'c4', name: 'حلويات وبسكويت', description: 'الشوكولاتة، الشيبس، والتسالي' },
  ];

  const defaultProducts: Product[] = [
    { id: 'p1', name: 'أرز مصري المطبخ 1 كيلو', category_id: 'c1', unit: 'قطعة', purchase_price: 25.0, selling_price: 32.0, opening_quantity: 50, minimum_stock: 10, is_deleted: false },
    { id: 'p2', name: 'زيت كريستال عباد 1 لتر', category_id: 'c1', unit: 'قطعة', purchase_price: 65.0, selling_price: 75.0, opening_quantity: 30, minimum_stock: 8, is_deleted: false },
    { id: 'p3', name: 'مياه معدنية نستله 600 مل', category_id: 'c2', unit: 'كرتونة', purchase_price: 45.0, selling_price: 55.0, opening_quantity: 15, minimum_stock: 5, is_deleted: false },
    { id: 'p4', name: 'مناديل فاين 550 منديل', category_id: 'c3', unit: 'قطعة', purchase_price: 22.0, selling_price: 28.0, opening_quantity: 40, minimum_stock: 12, is_deleted: false },
    { id: 'p5', name: 'شوكولاتة جالكسي ساده', category_id: 'c4', unit: 'علبة', purchase_price: 120.0, selling_price: 150.0, opening_quantity: 3, minimum_stock: 5, is_deleted: false }, // Low Stock!
  ];

  const defaultSuppliers: Supplier[] = [
    { id: 's1', name: 'شركة الأمل للتوزيع', phone: '01012345678', address: 'القاهرة، مصر', notes: 'مورد المواد الغذائية الرئيسي', is_deleted: false },
    { id: 's2', name: 'الشركة المتحدة للمشروبات', phone: '01198765432', address: 'الجيزة، مصر', notes: 'موزع المياه البيبسي', is_deleted: false },
  ];

  // Helper to get past dates format YYYY-MM-DD
  const getPastDateStr = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  };

  const defaultPurchases: Purchase[] = [
    { id: 'pur1', supplier_id: 's1', date: getPastDateStr(4), invoice_number: 'INV-1092', total_amount: 1500.0, paid_amount: 1000.0 },
    { id: 'pur2', supplier_id: 's2', date: getPastDateStr(2), invoice_number: 'INV-3091', total_amount: 800.0, paid_amount: 800.0 },
  ];

  const defaultPurchaseItems: PurchaseItem[] = [
    { id: 'pi1', purchase_id: 'pur1', product_id: 'p1', quantity: 40, purchase_price: 25.0, subtotal: 1000.0 },
    { id: 'pi2', purchase_id: 'pur1', product_id: 'p2', quantity: 7.69, purchase_price: 65.0, subtotal: 500.0 },
    { id: 'pi3', purchase_id: 'pur2', product_id: 'p3', quantity: 14.54, purchase_price: 55.0, subtotal: 800.0 },
  ];

  // Movements from purchases (Positive)
  const defaultMovements: StockMovement[] = [
    { id: 'm1', product_id: 'p1', type: 'purchase', quantity: 40, reference_id: 'pi1', date: getPastDateStr(4) },
    { id: 'm2', product_id: 'p2', type: 'purchase', quantity: 7.69, reference_id: 'pi2', date: getPastDateStr(4) },
    { id: 'm3', product_id: 'p3', type: 'purchase', quantity: 14.54, reference_id: 'pi3', date: getPastDateStr(2) },
  ];

  const defaultPayments: SupplierPayment[] = [
    { id: 'sp1', supplier_id: 's1', payment_date: getPastDateStr(3), amount: 300.0, reference: 'سداد نقدي', notes: 'دفعة حساب' },
  ];

  // Daily Sales History for charts (last 3 days)
  // Day -3
  const ds1: DailySale = { id: 'ds1', date: getPastDateStr(3), product_id: 'p1', sold_quantity: 12, purchase_price: 25.0, selling_price: 32.0, revenue: 384, cogs: 300, gross_profit: 84 };
  const ds2: DailySale = { id: 'ds2', date: getPastDateStr(3), product_id: 'p2', sold_quantity: 5, purchase_price: 65.0, selling_price: 75.0, revenue: 375, cogs: 325, gross_profit: 50 };
  
  // Day -2
  const ds3: DailySale = { id: 'ds3', date: getPastDateStr(2), product_id: 'p1', sold_quantity: 15, purchase_price: 25.0, selling_price: 32.0, revenue: 480, cogs: 375, gross_profit: 105 };
  const ds4: DailySale = { id: 'ds4', date: getPastDateStr(2), product_id: 'p3', sold_quantity: 8, purchase_price: 45.0, selling_price: 55.0, revenue: 440, cogs: 360, gross_profit: 80 };
  
  // Day -1 (Yesterday)
  const ds5: DailySale = { id: 'ds5', date: getPastDateStr(1), product_id: 'p2', sold_quantity: 4, purchase_price: 65.0, selling_price: 75.0, revenue: 300, cogs: 260, gross_profit: 40 };
  const ds6: DailySale = { id: 'ds6', date: getPastDateStr(1), product_id: 'p4', sold_quantity: 10, purchase_price: 22.0, selling_price: 28.0, revenue: 280, cogs: 220, gross_profit: 60 };

  const defaultDailySales: DailySale[] = [ds1, ds2, ds3, ds4, ds5, ds6];

  // Movements from sales (Negative)
  defaultDailySales.forEach((s, idx) => {
    defaultMovements.push({
      id: `sm_sale_${idx}`,
      product_id: s.product_id,
      type: 'sale',
      quantity: -s.sold_quantity,
      reference_id: s.id,
      date: s.date
    });
  });

  const defaultExpenses: Expense[] = [
    { id: 'e1', category: 'كهرباء ومياه', amount: 150.0, date: getPastDateStr(3), description: 'فاتورة الكهرباء لشهر يونيو' },
    { id: 'e2', category: 'إيجار', amount: 1200.0, date: getPastDateStr(5), description: 'إيجار المحل الشهري' },
    { id: 'e3', category: 'أخرى', amount: 80.0, date: getPastDateStr(1), description: 'مصاريف ضيافة ونظافة' },
  ];

  const defaultSettings: Settings = {
    store_name: 'سوبر ماركت البركة',
    phone: '01005554433',
    address: 'شارع التحرير، الدقي، الجيزة',
    currency: 'ج.م',
    low_stock_alert: 5.0
  };

  localStorage.setItem(MOCK_STORAGE_KEYS.CATEGORIES, JSON.stringify(defaultCategories));
  localStorage.setItem(MOCK_STORAGE_KEYS.PRODUCTS, JSON.stringify(defaultProducts));
  localStorage.setItem(MOCK_STORAGE_KEYS.SUPPLIERS, JSON.stringify(defaultSuppliers));
  localStorage.setItem(MOCK_STORAGE_KEYS.PURCHASES, JSON.stringify(defaultPurchases));
  localStorage.setItem(MOCK_STORAGE_KEYS.PURCHASE_ITEMS, JSON.stringify(defaultPurchaseItems));
  localStorage.setItem(MOCK_STORAGE_KEYS.PAYMENTS, JSON.stringify(defaultPayments));
  localStorage.setItem(MOCK_STORAGE_KEYS.DAILY_SALES, JSON.stringify(defaultDailySales));
  localStorage.setItem(MOCK_STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(defaultMovements));
  localStorage.setItem(MOCK_STORAGE_KEYS.EXPENSES, JSON.stringify(defaultExpenses));
  localStorage.setItem(MOCK_STORAGE_KEYS.SETTINGS, JSON.stringify(defaultSettings));
};

if (isMock) {
  seedMockData();
}

// Helper to get from localstorage
const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Helper to set to localstorage
const setLocal = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// ==========================================
// SERVICE IMPLEMENTATIONS
// ==========================================

export const dbService = {

  // 1. SETTINGS
  getSettings: async (): Promise<Settings> => {
    if (isMock) {
      const data = localStorage.getItem(MOCK_STORAGE_KEYS.SETTINGS);
      return data ? JSON.parse(data) : { store_name: 'مدير المحل', currency: 'ج.م', low_stock_alert: 5.0 };
    }
    const { data, error } = await supabase.from('settings').select('*').limit(1).single();
    if (error) throw error;
    return data;
  },

  saveSettings: async (settings: Settings): Promise<Settings> => {
    if (isMock) {
      localStorage.setItem(MOCK_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return settings;
    }
    // Get first settings row ID to update or insert
    const { data: existing } = await supabase.from('settings').select('id').limit(1);
    const id = existing && existing.length > 0 ? existing[0].id : undefined;

    if (id) {
      const { data, error } = await supabase.from('settings').update(settings).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('settings').insert(settings).select().single();
      if (error) throw error;
      return data;
    }
  },

  // 2. CATEGORIES
  getCategories: async (): Promise<Category[]> => {
    if (isMock) {
      return getLocal<Category>(MOCK_STORAGE_KEYS.CATEGORIES);
    }
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return data;
  },

  saveCategory: async (category: Omit<Category, 'id'> & { id?: string }): Promise<Category> => {
    if (isMock) {
      const categories = getLocal<Category>(MOCK_STORAGE_KEYS.CATEGORIES);
      if (category.id) {
        // Update
        const updated = categories.map(c => c.id === category.id ? { ...c, ...category } as Category : c);
        setLocal(MOCK_STORAGE_KEYS.CATEGORIES, updated);
        return { ...category } as Category;
      } else {
        // Create
        const newCat = { ...category, id: `cat_${Date.now()}` } as Category;
        categories.push(newCat);
        setLocal(MOCK_STORAGE_KEYS.CATEGORIES, categories);
        return newCat;
      }
    }

    if (category.id) {
      const { data, error } = await supabase.from('categories').update(category).eq('id', category.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('categories').insert(category).select().single();
      if (error) throw error;
      return data;
    }
  },

  deleteCategory: async (id: string): Promise<boolean> => {
    if (isMock) {
      const categories = getLocal<Category>(MOCK_STORAGE_KEYS.CATEGORIES);
      const filtered = categories.filter(c => c.id !== id);
      setLocal(MOCK_STORAGE_KEYS.CATEGORIES, filtered);
      return true;
    }
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // 3. PRODUCTS
  getProducts: async (): Promise<Product[]> => {
    if (isMock) {
      const products = getLocal<Product>(MOCK_STORAGE_KEYS.PRODUCTS).filter(p => !p.is_deleted);
      const categories = getLocal<Category>(MOCK_STORAGE_KEYS.CATEGORIES);
      const movements = getLocal<StockMovement>(MOCK_STORAGE_KEYS.STOCK_MOVEMENTS);

      return products.map(product => {
        const cat = categories.find(c => c.id === product.category_id);
        const pMovements = movements.filter(m => m.product_id === product.id);
        const stockSum = pMovements.reduce((acc, cur) => acc + Number(cur.quantity), 0);
        return {
          ...product,
          category_name: cat ? cat.name : 'غير محدد',
          current_stock: Number(product.opening_quantity) + stockSum,
        };
      });
    }

    // In real database we query view v_current_stock to get current inventory dynamically
    const { data: dbProducts, error: pErr } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('is_deleted', false)
      .order('name');
    if (pErr) throw pErr;

    const { data: dbStock, error: sErr } = await supabase.from('v_current_stock').select('*');
    if (sErr) throw sErr;

    return dbProducts.map(p => {
      const stockRow = dbStock?.find(s => s.product_id === p.id);
      return {
        ...p,
        category_name: p.categories ? p.categories.name : 'غير محدد',
        current_stock: stockRow ? Number(stockRow.current_stock) : Number(p.opening_quantity),
      };
    });
  },

  saveProduct: async (product: Omit<Product, 'id' | 'is_deleted'> & { id?: string; is_deleted?: boolean }): Promise<Product> => {
    if (isMock) {
      const products = getLocal<Product>(MOCK_STORAGE_KEYS.PRODUCTS);
      if (product.id) {
        // Update
        const updated = products.map(p => p.id === product.id ? { ...p, ...product } as Product : p);
        setLocal(MOCK_STORAGE_KEYS.PRODUCTS, updated);
        return { ...product, is_deleted: false } as Product;
      } else {
        // Create
        const newProduct = { ...product, id: `prod_${Date.now()}`, is_deleted: false } as Product;
        products.push(newProduct);
        setLocal(MOCK_STORAGE_KEYS.PRODUCTS, products);
        return newProduct;
      }
    }

    const payload = { ...product, is_deleted: false };
    if (product.id) {
      const { data, error } = await supabase.from('products').update(payload).eq('id', product.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select().single();
      if (error) throw error;
      return data;
    }
  },

  deleteProduct: async (id: string): Promise<boolean> => {
    if (isMock) {
      const products = getLocal<Product>(MOCK_STORAGE_KEYS.PRODUCTS);
      const updated = products.map(p => p.id === id ? { ...p, is_deleted: true } : p);
      setLocal(MOCK_STORAGE_KEYS.PRODUCTS, updated);
      return true;
    }
    // Soft delete
    const { error } = await supabase.from('products').update({ is_deleted: true }).eq('id', id);
    if (error) throw error;
    return true;
  },

  // 4. SUPPLIERS
  getSuppliers: async (): Promise<Supplier[]> => {
    if (isMock) {
      const suppliers = getLocal<Supplier>(MOCK_STORAGE_KEYS.SUPPLIERS).filter(s => !s.is_deleted);
      const purchases = getLocal<Purchase>(MOCK_STORAGE_KEYS.PURCHASES);
      const payments = getLocal<SupplierPayment>(MOCK_STORAGE_KEYS.PAYMENTS);

      return suppliers.map(s => {
        const sPurchases = purchases.filter(p => p.supplier_id === s.id);
        const sPayments = payments.filter(p => p.supplier_id === s.id);

        const totalPurchased = sPurchases.reduce((acc, cur) => acc + Number(cur.total_amount), 0);
        const paidInPurchases = sPurchases.reduce((acc, cur) => acc + Number(cur.paid_amount), 0);
        const totalPayments = sPayments.reduce((acc, cur) => acc + Number(cur.amount), 0);

        return {
          ...s,
          total_purchased: totalPurchased,
          total_paid: paidInPurchases + totalPayments,
          outstanding_balance: totalPurchased - (paidInPurchases + totalPayments)
        };
      });
    }

    const { data: dbSuppliers, error: sErr } = await supabase.from('suppliers').select('*').eq('is_deleted', false).order('name');
    if (sErr) throw sErr;

    const { data: dbBalances, error: bErr } = await supabase.from('v_supplier_balances').select('*');
    if (bErr) throw bErr;

    return dbSuppliers.map(s => {
      const balanceRow = dbBalances?.find(b => b.supplier_id === s.id);
      return {
        ...s,
        total_purchased: balanceRow ? Number(balanceRow.total_purchased) : 0,
        total_paid: balanceRow ? Number(balanceRow.total_paid) : 0,
        outstanding_balance: balanceRow ? Number(balanceRow.outstanding_balance) : 0
      };
    });
  },

  saveSupplier: async (supplier: Omit<Supplier, 'id' | 'is_deleted'> & { id?: string; is_deleted?: boolean }): Promise<Supplier> => {
    if (isMock) {
      const suppliers = getLocal<Supplier>(MOCK_STORAGE_KEYS.SUPPLIERS);
      if (supplier.id) {
        const updated = suppliers.map(s => s.id === supplier.id ? { ...s, ...supplier } as Supplier : s);
        setLocal(MOCK_STORAGE_KEYS.SUPPLIERS, updated);
        return { ...supplier, is_deleted: false } as Supplier;
      } else {
        const newSupplier = { ...supplier, id: `sup_${Date.now()}`, is_deleted: false } as Supplier;
        suppliers.push(newSupplier);
        setLocal(MOCK_STORAGE_KEYS.SUPPLIERS, suppliers);
        return newSupplier;
      }
    }

    const payload = { ...supplier, is_deleted: false };
    if (supplier.id) {
      const { data, error } = await supabase.from('suppliers').update(payload).eq('id', supplier.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('suppliers').insert(payload).select().single();
      if (error) throw error;
      return data;
    }
  },

  deleteSupplier: async (id: string): Promise<boolean> => {
    if (isMock) {
      const suppliers = getLocal<Supplier>(MOCK_STORAGE_KEYS.SUPPLIERS);
      const updated = suppliers.map(s => s.id === id ? { ...s, is_deleted: true } : s);
      setLocal(MOCK_STORAGE_KEYS.SUPPLIERS, updated);
      return true;
    }
    const { error } = await supabase.from('suppliers').update({ is_deleted: true }).eq('id', id);
    if (error) throw error;
    return true;
  },

  getSupplierDetails: async (id: string): Promise<{
    supplier: Supplier;
    purchases: Purchase[];
    payments: SupplierPayment[];
  }> => {
    const suppliers = await dbService.getSuppliers();
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) throw new Error('المورد غير موجود');

    if (isMock) {
      const purchases = getLocal<Purchase>(MOCK_STORAGE_KEYS.PURCHASES).filter(p => p.supplier_id === id).sort((a,b) => b.date.localeCompare(a.date));
      const payments = getLocal<SupplierPayment>(MOCK_STORAGE_KEYS.PAYMENTS).filter(p => p.supplier_id === id).sort((a,b) => b.payment_date.localeCompare(a.payment_date));
      return { supplier, purchases, payments };
    }

    const { data: purchases, error: purErr } = await supabase.from('purchases').select('*').eq('supplier_id', id).order('date', { ascending: false });
    if (purErr) throw purErr;

    const { data: payments, error: payErr } = await supabase.from('supplier_payments').select('*').eq('supplier_id', id).order('payment_date', { ascending: false });
    if (payErr) throw payErr;

    return { supplier, purchases: purchases || [], payments: payments || [] };
  },

  // 5. PURCHASES
  getPurchases: async (): Promise<Purchase[]> => {
    if (isMock) {
      const purchases = getLocal<Purchase>(MOCK_STORAGE_KEYS.PURCHASES);
      const suppliers = getLocal<Supplier>(MOCK_STORAGE_KEYS.SUPPLIERS);
      const purchaseItems = getLocal<PurchaseItem>(MOCK_STORAGE_KEYS.PURCHASE_ITEMS);
      const products = getLocal<Product>(MOCK_STORAGE_KEYS.PRODUCTS);

      return purchases.map(p => {
        const sup = suppliers.find(s => s.id === p.supplier_id);
        const pItems = purchaseItems.filter(item => item.purchase_id === p.id).map(item => {
          const prod = products.find(pr => pr.id === item.product_id);
          return {
            ...item,
            product_name: prod ? prod.name : 'منتج غير معروف'
          };
        });
        return {
          ...p,
          supplier_name: sup ? sup.name : 'مورد غير معروف',
          items: pItems
        };
      }).sort((a,b) => b.date.localeCompare(a.date));
    }

    const { data, error } = await supabase
      .from('purchases')
      .select('*, suppliers(name), purchase_items(*, products(name))')
      .order('date', { ascending: false });
    if (error) throw error;

    return data.map(p => {
      const items = p.purchase_items?.map((item: any) => ({
        id: item.id,
        purchase_id: item.purchase_id,
        product_id: item.product_id,
        quantity: Number(item.quantity),
        purchase_price: Number(item.purchase_price),
        subtotal: Number(item.subtotal),
        product_name: item.products ? item.products.name : 'منتج غير معروف'
      })) || [];

      return {
        id: p.id,
        supplier_id: p.supplier_id,
        date: p.date,
        invoice_number: p.invoice_number,
        total_amount: Number(p.total_amount),
        paid_amount: Number(p.paid_amount),
        supplier_name: p.suppliers ? p.suppliers.name : 'مورد غير معروف',
        items
      };
    });
  },

  savePurchase: async (
    purchase: Omit<Purchase, 'id' | 'total_amount' | 'supplier_name' | 'items'>,
    items: Omit<PurchaseItem, 'id' | 'purchase_id' | 'subtotal'>[]
  ): Promise<string> => {
    const total_amount = items.reduce((acc, cur) => acc + (cur.quantity * cur.purchase_price), 0);

    if (isMock) {
      const purchases = getLocal<Purchase>(MOCK_STORAGE_KEYS.PURCHASES);
      const purchaseItems = getLocal<PurchaseItem>(MOCK_STORAGE_KEYS.PURCHASE_ITEMS);
      const movements = getLocal<StockMovement>(MOCK_STORAGE_KEYS.STOCK_MOVEMENTS);

      const purchaseId = `pur_${Date.now()}`;
      const newPurchase: Purchase = {
        id: purchaseId,
        supplier_id: purchase.supplier_id,
        date: purchase.date,
        invoice_number: purchase.invoice_number,
        total_amount,
        paid_amount: purchase.paid_amount
      };
      purchases.push(newPurchase);
      setLocal(MOCK_STORAGE_KEYS.PURCHASES, purchases);

      items.forEach((item, idx) => {
        const itemId = `pi_${purchaseId}_${idx}`;
        const subtotal = item.quantity * item.purchase_price;
        const newItem: PurchaseItem = {
          id: itemId,
          purchase_id: purchaseId,
          product_id: item.product_id,
          quantity: item.quantity,
          purchase_price: item.purchase_price,
          subtotal
        };
        purchaseItems.push(newItem);

        // Add Stock Movement
        movements.push({
          id: `mv_${purchaseId}_${idx}`,
          product_id: item.product_id,
          type: 'purchase',
          quantity: item.quantity,
          reference_id: itemId,
          date: purchase.date
        });
      });

      setLocal(MOCK_STORAGE_KEYS.PURCHASE_ITEMS, purchaseItems);
      setLocal(MOCK_STORAGE_KEYS.STOCK_MOVEMENTS, movements);
      return purchaseId;
    }

    // Call PostgreSQL RPC function to save invoice atomically in a transaction
    const { data, error } = await supabase.rpc('save_purchase_invoice', {
      p_supplier_id: purchase.supplier_id,
      p_invoice_number: purchase.invoice_number,
      p_date: purchase.date,
      p_total_amount: total_amount,
      p_paid_amount: purchase.paid_amount,
      p_items: items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        purchase_price: item.purchase_price,
        subtotal: item.quantity * item.purchase_price
      }))
    });

    if (error) throw error;
    return data;
  },

  deletePurchase: async (id: string): Promise<boolean> => {
    if (isMock) {
      const purchases = getLocal<Purchase>(MOCK_STORAGE_KEYS.PURCHASES);
      const purchaseItems = getLocal<PurchaseItem>(MOCK_STORAGE_KEYS.PURCHASE_ITEMS);
      const movements = getLocal<StockMovement>(MOCK_STORAGE_KEYS.STOCK_MOVEMENTS);

      setLocal(MOCK_STORAGE_KEYS.PURCHASES, purchases.filter(p => p.id !== id));
      
      const itemsToDelete = purchaseItems.filter(item => item.purchase_id === id);
      const itemIds = itemsToDelete.map(i => i.id);

      setLocal(MOCK_STORAGE_KEYS.PURCHASE_ITEMS, purchaseItems.filter(item => item.purchase_id !== id));
      setLocal(MOCK_STORAGE_KEYS.STOCK_MOVEMENTS, movements.filter(m => !itemIds.includes(m.reference_id || '')));
      return true;
    }

    // Since we have ON DELETE CASCADE and RESTRICT on DB triggers, we delete the purchase invoice,
    // but stock movements don't cascade auto delete in basic schema without a trigger,
    // so let's delete stock movements and items. Actually, in real DB, delete stock movements first:
    const { data: items } = await supabase.from('purchase_items').select('id').eq('purchase_id', id);
    if (items && items.length > 0) {
      const ids = items.map(i => i.id);
      await supabase.from('stock_movements').delete().in('reference_id', ids).eq('type', 'purchase');
    }
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // 6. SUPPLIER PAYMENTS
  getSupplierPayments: async (): Promise<SupplierPayment[]> => {
    if (isMock) {
      const payments = getLocal<SupplierPayment>(MOCK_STORAGE_KEYS.PAYMENTS);
      const suppliers = getLocal<Supplier>(MOCK_STORAGE_KEYS.SUPPLIERS);

      return payments.map(p => {
        const sup = suppliers.find(s => s.id === p.supplier_id);
        return {
          ...p,
          supplier_name: sup ? sup.name : 'مورد غير معروف'
        };
      }).sort((a,b) => b.payment_date.localeCompare(a.payment_date));
    }

    const { data, error } = await supabase.from('supplier_payments').select('*, suppliers(name)').order('payment_date', { ascending: false });
    if (error) throw error;
    return data.map(p => ({
      ...p,
      supplier_name: p.suppliers ? p.suppliers.name : 'مورد غير معروف'
    }));
  },

  saveSupplierPayment: async (payment: Omit<SupplierPayment, 'id'> & { id?: string }): Promise<SupplierPayment> => {
    if (isMock) {
      const payments = getLocal<SupplierPayment>(MOCK_STORAGE_KEYS.PAYMENTS);
      if (payment.id) {
        const updated = payments.map(p => p.id === payment.id ? { ...p, ...payment } as SupplierPayment : p);
        setLocal(MOCK_STORAGE_KEYS.PAYMENTS, updated);
        return { ...payment } as SupplierPayment;
      } else {
        const newPayment = { ...payment, id: `pay_${Date.now()}` } as SupplierPayment;
        payments.push(newPayment);
        setLocal(MOCK_STORAGE_KEYS.PAYMENTS, payments);
        return newPayment;
      }
    }

    if (payment.id) {
      const { data, error } = await supabase.from('supplier_payments').update(payment).eq('id', payment.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('supplier_payments').insert(payment).select().single();
      if (error) throw error;
      return data;
    }
  },

  deleteSupplierPayment: async (id: string): Promise<boolean> => {
    if (isMock) {
      const payments = getLocal<SupplierPayment>(MOCK_STORAGE_KEYS.PAYMENTS);
      setLocal(MOCK_STORAGE_KEYS.PAYMENTS, payments.filter(p => p.id !== id));
      return true;
    }
    const { error } = await supabase.from('supplier_payments').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // 7. DAILY SALES (The Core Feature)
  getDailySalesByDate: async (date: string): Promise<DailySale[]> => {
    if (isMock) {
      const sales = getLocal<DailySale>(MOCK_STORAGE_KEYS.DAILY_SALES);
      const products = getLocal<Product>(MOCK_STORAGE_KEYS.PRODUCTS);

      return sales.filter(s => s.date === date).map(s => {
        const p = products.find(pr => pr.id === s.product_id);
        return {
          ...s,
          product_name: p ? p.name : 'منتج غير معروف'
        };
      });
    }

    const { data, error } = await supabase
      .from('daily_sales')
      .select('*, products(name)')
      .eq('date', date);
    if (error) throw error;

    return data.map(d => ({
      ...d,
      product_name: d.products ? d.products.name : 'منتج غير معروف'
    }));
  },

  saveDailySales: async (
    date: string,
    salesItems: { product_id: string; sold_quantity: number; purchase_price: number; selling_price: number }[]
  ): Promise<boolean> => {
    if (isMock) {
      const sales = getLocal<DailySale>(MOCK_STORAGE_KEYS.DAILY_SALES);
      const movements = getLocal<StockMovement>(MOCK_STORAGE_KEYS.STOCK_MOVEMENTS);

      // Remove existing sales and movements for this date
      const salesOnDate = sales.filter(s => s.date === date);
      const salesIds = salesOnDate.map(s => s.id);
      
      const filteredSales = sales.filter(s => s.date !== date);
      const filteredMovements = movements.filter(m => !(m.type === 'sale' && salesIds.includes(m.reference_id || '')));

      salesItems.forEach((item, idx) => {
        if (item.sold_quantity > 0) {
          const saleId = `sale_${date}_${item.product_id}_${idx}`;
          const revenue = item.sold_quantity * item.selling_price;
          const cogs = item.sold_quantity * item.purchase_price;
          const gross_profit = revenue - cogs;

          filteredSales.push({
            id: saleId,
            date,
            product_id: item.product_id,
            sold_quantity: item.sold_quantity,
            purchase_price: item.purchase_price,
            selling_price: item.selling_price,
            revenue,
            cogs,
            gross_profit
          });

          filteredMovements.push({
            id: `sm_sale_${date}_${item.product_id}_${idx}`,
            product_id: item.product_id,
            type: 'sale',
            quantity: -item.sold_quantity,
            reference_id: saleId,
            date
          });
        }
      });

      setLocal(MOCK_STORAGE_KEYS.DAILY_SALES, filteredSales);
      setLocal(MOCK_STORAGE_KEYS.STOCK_MOVEMENTS, filteredMovements);
      return true;
    }

    // Call PostgreSQL RPC function to save daily sales atomically in a transaction
    const { data, error } = await supabase.rpc('save_daily_sales', {
      p_date: date,
      p_sales_items: salesItems.map(item => ({
        product_id: item.product_id,
        sold_quantity: item.sold_quantity,
        purchase_price: item.purchase_price,
        selling_price: item.selling_price
      }))
    });

    if (error) throw error;
    return data;
  },

  // 8. EXPENSES
  getExpenses: async (): Promise<Expense[]> => {
    if (isMock) {
      return getLocal<Expense>(MOCK_STORAGE_KEYS.EXPENSES).sort((a,b) => b.date.localeCompare(a.date));
    }
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  saveExpense: async (expense: Omit<Expense, 'id'> & { id?: string }): Promise<Expense> => {
    if (isMock) {
      const expenses = getLocal<Expense>(MOCK_STORAGE_KEYS.EXPENSES);
      if (expense.id) {
        const updated = expenses.map(e => e.id === expense.id ? { ...e, ...expense } as Expense : e);
        setLocal(MOCK_STORAGE_KEYS.EXPENSES, updated);
        return { ...expense } as Expense;
      } else {
        const newExpense = { ...expense, id: `exp_${Date.now()}` } as Expense;
        expenses.push(newExpense);
        setLocal(MOCK_STORAGE_KEYS.EXPENSES, expenses);
        return newExpense;
      }
    }

    if (expense.id) {
      const { data, error } = await supabase.from('expenses').update(expense).eq('id', expense.id).select().single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('expenses').insert(expense).select().single();
      if (error) throw error;
      return data;
    }
  },

  deleteExpense: async (id: string): Promise<boolean> => {
    if (isMock) {
      const expenses = getLocal<Expense>(MOCK_STORAGE_KEYS.EXPENSES);
      setLocal(MOCK_STORAGE_KEYS.EXPENSES, expenses.filter(e => e.id !== id));
      return true;
    }
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // ==========================================
  // REPORTS & FINANCIALS
  // ==========================================
  getDailyFinancials: async (startDate: string, endDate: string): Promise<DailyFinancials[]> => {
    if (isMock) {
      const sales = getLocal<DailySale>(MOCK_STORAGE_KEYS.DAILY_SALES);
      const expenses = getLocal<Expense>(MOCK_STORAGE_KEYS.EXPENSES);

      // Create unique set of dates in range
      const datesSet = new Set<string>();
      
      // Fill dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        datesSet.add(d.toISOString().split('T')[0]);
      }

      const report: DailyFinancials[] = [];

      datesSet.forEach(date => {
        const daySales = sales.filter(s => s.date === date);
        const dayExpenses = expenses.filter(e => e.date === date);

        const revenue = daySales.reduce((acc, cur) => acc + Number(cur.revenue), 0);
        const cogs = daySales.reduce((acc, cur) => acc + Number(cur.cogs), 0);
        const gross_profit = revenue - cogs;
        const totalExpenses = dayExpenses.reduce((acc, cur) => acc + Number(cur.amount), 0);

        // Only include in report if there was activity, or it's within range
        report.push({
          date,
          revenue,
          cogs,
          gross_profit,
          expenses: totalExpenses,
          net_profit: gross_profit - totalExpenses
        });
      });

      return report.sort((a,b) => a.date.localeCompare(b.date));
    }

    const { data, error } = await supabase
      .from('v_daily_financials')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');
    if (error) throw error;

    return data.map(d => ({
      date: d.date,
      revenue: Number(d.revenue),
      cogs: Number(d.cogs),
      gross_profit: Number(d.gross_profit),
      expenses: Number(d.expenses),
      net_profit: Number(d.net_profit)
    }));
  },

  // Caching dashboard metrics calculations
  getDashboardMetrics: async (): Promise<{
    todaySales: number;
    netProfitThisMonth: number;
    stockValue: number;
    supplierDebts: number;
    monthlyExpenses: number;
    lowStockCount: number;
  }> => {
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    const monthStartStr = firstDayOfMonth.toISOString().split('T')[0];

    // Let's reuse services to get accurate data
    const products = await dbService.getProducts();
    const suppliers = await dbService.getSuppliers();
    
    // 1. Stock Value = Sum of (current_stock * purchase_price)
    const stockValue = products.reduce((acc, p) => acc + (Number(p.current_stock || 0) * p.purchase_price), 0);

    // 2. Low Stock Count
    const lowStockCount = products.filter(p => Number(p.current_stock || 0) <= p.minimum_stock).length;

    // 3. Supplier Debts = Sum of supplier balances
    const supplierDebts = suppliers.reduce((acc, s) => acc + (s.outstanding_balance || 0), 0);

    if (isMock) {
      const sales = getLocal<DailySale>(MOCK_STORAGE_KEYS.DAILY_SALES);
      const expenses = getLocal<Expense>(MOCK_STORAGE_KEYS.EXPENSES);

      // Today Sales
      const todaySales = sales.filter(s => s.date === today).reduce((acc, s) => acc + s.revenue, 0);

      // Monthly Expenses
      const monthlyExpenses = expenses
        .filter(e => e.date >= monthStartStr && e.date <= today)
        .reduce((acc, e) => acc + e.amount, 0);

      // Net Profit This Month
      const thisMonthSales = sales.filter(s => s.date >= monthStartStr && s.date <= today);
      const grossProfit = thisMonthSales.reduce((acc, s) => acc + s.gross_profit, 0);
      const netProfitThisMonth = grossProfit - monthlyExpenses;

      return {
        todaySales,
        netProfitThisMonth,
        stockValue,
        supplierDebts,
        monthlyExpenses,
        lowStockCount
      };
    }

    // Real Supabase queries
    // Today's Sales
    const { data: todaySalesData } = await supabase.from('daily_sales').select('revenue').eq('date', today);
    const todaySales = todaySalesData?.reduce((acc, cur) => acc + Number(cur.revenue), 0) || 0;

    // Monthly Expenses
    const { data: expData } = await supabase.from('expenses').select('amount').gte('date', monthStartStr).lte('date', today);
    const monthlyExpenses = expData?.reduce((acc, cur) => acc + Number(cur.amount), 0) || 0;

    // Gross Profit this month
    const { data: salesData } = await supabase.from('daily_sales').select('gross_profit').gte('date', monthStartStr).lte('date', today);
    const grossProfit = salesData?.reduce((acc, cur) => acc + Number(cur.gross_profit), 0) || 0;

    return {
      todaySales,
      netProfitThisMonth: grossProfit - monthlyExpenses,
      stockValue,
      supplierDebts,
      monthlyExpenses,
      lowStockCount
    };
  }
};
