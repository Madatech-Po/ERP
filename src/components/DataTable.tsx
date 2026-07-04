import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Edit, Trash2, FolderOpen } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchFilter?: (item: T, query: string) => boolean;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  addButtonLabel?: string;
  onAddClick?: () => void;
  filterElement?: React.ReactNode;
  pageSize?: number;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  searchPlaceholder = 'بحث...',
  searchFilter,
  onEdit,
  onDelete,
  addButtonLabel,
  onAddClick,
  filterElement,
  pageSize = 10
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filtered data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim() || !searchFilter) return data;
    return data.filter(item => searchFilter(item, searchQuery));
  }, [data, searchQuery, searchFilter]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  
  // Reset to first page when filtering
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.015)] overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-5 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-4 top-3.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {filterElement}
          
          {addButtonLabel && onAddClick && (
            <button
              onClick={onAddClick}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-100 hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
            >
              {addButtonLabel}
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold font-tajawal">
              {columns.map((col, idx) => (
                <th key={idx} className={`p-4 font-semibold ${col.className || ''}`}>
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="p-4 text-left font-semibold w-24">الخيارات</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIdx) => (
                <tr key={row.id || rowIdx} className="hover:bg-slate-50/40 transition-colors duration-150">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`p-4 ${col.className || ''}`}>
                      {col.accessor(row)}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="p-4 text-left">
                      <div className="flex items-center justify-end gap-2.5">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                            title="تعديل"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(row)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors duration-150"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                    <FolderOpen size={48} className="stroke-[1.2] text-slate-300" />
                    <p className="text-sm font-medium">لم يتم العثور على أي نتائج</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination */}
      {filteredData.length > pageSize && (
        <div className="p-4 border-t border-slate-50 bg-slate-50/20 flex items-center justify-between text-xs text-slate-500 font-medium">
          <div>
            عرض {Math.min(filteredData.length, (currentPage - 1) * pageSize + 1)} إلى{' '}
            {Math.min(filteredData.length, currentPage * pageSize)} من أصل {filteredData.length} سجل
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-150"
            >
              <ChevronRight size={16} />
            </button>

            <span className="px-3 py-1 bg-slate-100 rounded-md text-slate-700">
              صفحة {currentPage} من {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all duration-150"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default DataTable;
