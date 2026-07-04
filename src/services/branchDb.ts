import { Product } from './db';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface Branch {
  id: string;
  code: string;
  name: string;
  manager: string;
  phone: string;
  address: string;
  notes?: string;
  status: 'active' | 'inactive';
  created_at?: string;
}

export interface BranchBalance {
  id: string;
  branch_id: string;
  product_id: string;
  quantity: number;
}

export interface TransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  quantity: number;
  unit: string;
}

export type TransferStatus = 'draft' | 'sent' | 'received' | 'cancelled';

export interface Transfer {
  id: string;
  transfer_number: string;
  date: string;
  from_branch_id: string;
  to_branch_id: string;
  notes?: string;
  status: TransferStatus;
  created_by: string;
  created_at?: string;
}

// ==========================================
// MOCK DATA INITIALIZATION
// ==========================================

const BRANCH_STORAGE_KEYS = {
  BRANCHES: 'mahal_branches',
  BALANCES: 'mahal_branch_balances',
  TRANSFERS: 'mahal_branch_transfers',
  TRANSFER_ITEMS: 'mahal_branch_transfer_items',
};

const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

const setLocal = <T>(key: string, data: T[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

// Initialize default mock data
const initMockData = () => {
  if (localStorage.getItem(BRANCH_STORAGE_KEYS.BRANCHES)) return;

  const defaultBranches: Branch[] = [
    {
      id: 'br_1',
      code: 'BR-001',
      name: 'الفرع الرئيسي (الدقي)',
      manager: 'أحمد محمود',
      phone: '01011122233',
      address: 'شارع التحرير، الدقي',
      status: 'active',
    },
    {
      id: 'br_2',
      code: 'BR-002',
      name: 'فرع مدينة نصر',
      manager: 'خالد مصطفى',
      phone: '01122233344',
      address: 'مكرم عبيد، مدينة نصر',
      status: 'active',
    }
  ];

  setLocal(BRANCH_STORAGE_KEYS.BRANCHES, defaultBranches);
  
  // Create some initial balances for products so we can transfer
  const productsStr = localStorage.getItem('mahal_products');
  const products: Product[] = productsStr ? JSON.parse(productsStr) : [];
  
  const defaultBalances: BranchBalance[] = products.map((p) => ({
    id: generateId('bb'),
    branch_id: 'br_1', // give everything to branch 1 initially
    product_id: p.id,
    quantity: p.opening_quantity > 0 ? p.opening_quantity * 2 : 100 // some arbitrary initial balance
  }));
  
  setLocal(BRANCH_STORAGE_KEYS.BALANCES, defaultBalances);
  setLocal(BRANCH_STORAGE_KEYS.TRANSFERS, []);
  setLocal(BRANCH_STORAGE_KEYS.TRANSFER_ITEMS, []);
};

// Call once on import
initMockData();

// ==========================================
// SERVICE IMPLEMENTATIONS
// ==========================================

export const branchDbService = {
  
  // -- Branches --
  getBranches: async (): Promise<Branch[]> => {
    return getLocal<Branch>(BRANCH_STORAGE_KEYS.BRANCHES);
  },

  saveBranch: async (branch: Omit<Branch, 'id'> & { id?: string }): Promise<Branch> => {
    const branches = getLocal<Branch>(BRANCH_STORAGE_KEYS.BRANCHES);
    if (branch.id) {
      const updated = branches.map(b => b.id === branch.id ? { ...b, ...branch } as Branch : b);
      setLocal(BRANCH_STORAGE_KEYS.BRANCHES, updated);
      return { ...branch } as Branch;
    } else {
      const newBranch = { ...branch, id: generateId('br') } as Branch;
      branches.push(newBranch);
      setLocal(BRANCH_STORAGE_KEYS.BRANCHES, branches);
      return newBranch;
    }
  },

  // -- Balances --
  getBalances: async (branchId?: string): Promise<BranchBalance[]> => {
    const balances = getLocal<BranchBalance>(BRANCH_STORAGE_KEYS.BALANCES);
    if (branchId) {
      return balances.filter(b => b.branch_id === branchId);
    }
    return balances;
  },

  // -- Transfers --
  getTransfers: async (): Promise<Transfer[]> => {
    return getLocal<Transfer>(BRANCH_STORAGE_KEYS.TRANSFERS).sort((a, b) => b.date.localeCompare(a.date));
  },

  getTransferItems: async (transferId: string): Promise<TransferItem[]> => {
    return getLocal<TransferItem>(BRANCH_STORAGE_KEYS.TRANSFER_ITEMS).filter(ti => ti.transfer_id === transferId);
  },

  saveTransferDraft: async (
    transfer: Omit<Transfer, 'id' | 'transfer_number'>,
    items: Omit<TransferItem, 'id' | 'transfer_id'>[]
  ): Promise<string> => {
    const transfers = getLocal<Transfer>(BRANCH_STORAGE_KEYS.TRANSFERS);
    const transferItems = getLocal<TransferItem>(BRANCH_STORAGE_KEYS.TRANSFER_ITEMS);
    
    const transferId = generateId('tr');
    // Generate simple incremental number TR-1001
    const tCount = transfers.length + 1;
    const transferNumber = `TR-${String(1000 + tCount)}`;

    const newTransfer: Transfer = {
      ...transfer,
      id: transferId,
      transfer_number: transferNumber,
      status: 'draft'
    };

    transfers.push(newTransfer);
    
    items.forEach(item => {
      transferItems.push({
        ...item,
        id: generateId('tri'),
        transfer_id: transferId
      });
    });

    setLocal(BRANCH_STORAGE_KEYS.TRANSFERS, transfers);
    setLocal(BRANCH_STORAGE_KEYS.TRANSFER_ITEMS, transferItems);
    
    return transferId;
  },

  sendTransfer: async (transferId: string): Promise<void> => {
    const transfers = getLocal<Transfer>(BRANCH_STORAGE_KEYS.TRANSFERS);
    const transferIndex = transfers.findIndex(t => t.id === transferId);
    if (transferIndex === -1) throw new Error("التحويل غير موجود");
    
    const transfer = transfers[transferIndex];
    if (transfer.status !== 'draft') throw new Error("يمكن إرسال المسودات فقط");

    const transferItems = await branchDbService.getTransferItems(transferId);
    const balances = getLocal<BranchBalance>(BRANCH_STORAGE_KEYS.BALANCES);

    // Validate and reduce stock from Source Branch
    for (const item of transferItems) {
      const balIndex = balances.findIndex(b => b.branch_id === transfer.from_branch_id && b.product_id === item.product_id);
      if (balIndex === -1 || balances[balIndex].quantity < item.quantity) {
        throw new Error(`الرصيد في الفرع المحول منه غير كافٍ لأحد المنتجات`);
      }
      balances[balIndex].quantity -= item.quantity;
    }

    transfers[transferIndex].status = 'sent';
    setLocal(BRANCH_STORAGE_KEYS.BALANCES, balances);
    setLocal(BRANCH_STORAGE_KEYS.TRANSFERS, transfers);
  },

  receiveTransfer: async (transferId: string): Promise<void> => {
    const transfers = getLocal<Transfer>(BRANCH_STORAGE_KEYS.TRANSFERS);
    const transferIndex = transfers.findIndex(t => t.id === transferId);
    if (transferIndex === -1) throw new Error("التحويل غير موجود");
    
    const transfer = transfers[transferIndex];
    if (transfer.status !== 'sent') throw new Error("يمكن استلام التحويلات المرسلة فقط");

    const transferItems = await branchDbService.getTransferItems(transferId);
    const balances = getLocal<BranchBalance>(BRANCH_STORAGE_KEYS.BALANCES);

    // Add stock to Destination Branch
    for (const item of transferItems) {
      const balIndex = balances.findIndex(b => b.branch_id === transfer.to_branch_id && b.product_id === item.product_id);
      if (balIndex !== -1) {
        balances[balIndex].quantity += item.quantity;
      } else {
        balances.push({
          id: generateId('bb'),
          branch_id: transfer.to_branch_id,
          product_id: item.product_id,
          quantity: item.quantity
        });
      }
    }

    transfers[transferIndex].status = 'received';
    setLocal(BRANCH_STORAGE_KEYS.BALANCES, balances);
    setLocal(BRANCH_STORAGE_KEYS.TRANSFERS, transfers);
  },

  cancelTransfer: async (transferId: string): Promise<void> => {
    const transfers = getLocal<Transfer>(BRANCH_STORAGE_KEYS.TRANSFERS);
    const transferIndex = transfers.findIndex(t => t.id === transferId);
    if (transferIndex === -1) throw new Error("التحويل غير موجود");
    
    const transfer = transfers[transferIndex];
    
    // If it was sent, we need to return the items to the source branch
    if (transfer.status === 'sent') {
      const transferItems = await branchDbService.getTransferItems(transferId);
      const balances = getLocal<BranchBalance>(BRANCH_STORAGE_KEYS.BALANCES);
      
      for (const item of transferItems) {
        const balIndex = balances.findIndex(b => b.branch_id === transfer.from_branch_id && b.product_id === item.product_id);
        if (balIndex !== -1) {
          balances[balIndex].quantity += item.quantity;
        } else {
          balances.push({
            id: generateId('bb'),
            branch_id: transfer.from_branch_id,
            product_id: item.product_id,
            quantity: item.quantity
          });
        }
      }
      setLocal(BRANCH_STORAGE_KEYS.BALANCES, balances);
    } else if (transfer.status === 'received') {
       throw new Error("لا يمكن إلغاء تحويل تم استلامه بالفعل");
    }

    transfers[transferIndex].status = 'cancelled';
    setLocal(BRANCH_STORAGE_KEYS.TRANSFERS, transfers);
  }
};
