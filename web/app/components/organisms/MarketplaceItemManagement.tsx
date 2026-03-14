'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import MarketplaceItemForm from './MarketplaceItemForm';
import {
  useGetMarketplaceItemsQuery,
  useGetMarketplaceCategoriesQuery,
  useGetComplexesQuery,
  useAdminCreateMarketplaceItemMutation,
  useUpdateMarketplaceItemMutation,
  useDeleteMarketplaceItemMutation,
} from '../../store/apiSlice';
import { MarketplaceItem, MarketplaceCategory, Complex, MarketplaceItemStatus } from '../../types';
import { useTranslation } from '../../locales';

const MarketplaceItemManagement: React.FC = () => {
  const { t } = useTranslation();
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [complexFilter, setComplexFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // API hooks
  const { data: complexes, isLoading: complexesLoading } = useGetComplexesQuery({});
  const { data: categories, isLoading: categoriesLoading } = useGetMarketplaceCategoriesQuery({});
  const { data: items, isLoading: itemsLoading, refetch } = useGetMarketplaceItemsQuery({
    complexId: complexFilter ? Number(complexFilter) : undefined,
    categoryId: categoryFilter ? Number(categoryFilter) : undefined,
    status: statusFilter as MarketplaceItemStatus || undefined,
  });
  const [createItem, { isLoading: isCreating }] = useAdminCreateMarketplaceItemMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateMarketplaceItemMutation();
  const [deleteItem, { isLoading: isDeleting }] = useDeleteMarketplaceItemMutation();

  // Get selected complex name
  const selectedComplex = useMemo(() => {
    return complexes?.find(c => c.id.toString() === complexFilter);
  }, [complexes, complexFilter]);

  // Get selected category name
  const selectedCategory = useMemo(() => {
    return categories?.find(c => c.id.toString() === categoryFilter);
  }, [categories, categoryFilter]);

  // Create a map of category IDs to categories for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<number, MarketplaceCategory>();
    categories?.forEach(category => map.set(category.id, category));
    return map;
  }, [categories]);

  // Filter data by search term
  const filteredData = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.username.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [items, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Status colors
  const statusColors: Record<MarketplaceItemStatus, string> = {
    AVAILABLE: 'bg-green-100 text-green-800',
    SOLD: 'bg-blue-100 text-blue-800',
    RESERVED: 'bg-yellow-100 text-yellow-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
  };

  // Handlers
  const handleCreate = async (data: { title: string; description: string; price: number; category_id: number; complex_id: number }) => {
    await createItem(data).unwrap();
    setIsCreateModalOpen(false);
    refetch();
  };

  const handleEdit = async (data: { title: string; description: string; price: number; category_id: number; status?: MarketplaceItemStatus }) => {
    if (!selectedItem) return;
    await updateItem({ id: selectedItem.id, data }).unwrap();
    setIsEditModalOpen(false);
    setSelectedItem(null);
    refetch();
  };

  const handleStatusUpdate = async (item: MarketplaceItem, newStatus: MarketplaceItemStatus) => {
    await updateItem({ 
      id: item.id, 
      data: { 
        status: newStatus,
      } 
    }).unwrap();
    refetch();
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      setDeleteError(null);
      await deleteItem(selectedItem.id).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err?.data?.detail || t('marketplace.items.deleteError') || 'Failed to delete item');
    }
  };

  const openEditModal = (item: MarketplaceItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (item: MarketplaceItem) => {
    setSelectedItem(item);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const openDetailModal = (item: MarketplaceItem) => {
    setSelectedItem(item);
    setIsDetailModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Table columns
  const columns: Column<MarketplaceItem>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'w-16',
    },
    {
      key: 'title',
      header: t('marketplace.items.item'),
      render: (item) => (
        <div>
          <span className="font-medium text-gray-900 block">{item.title}</span>
          <span className="text-xs text-gray-500 line-clamp-1">{formatPrice(item.price)}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: t('marketplace.items.category'),
      render: (item) => {
        const category = categoryMap.get(item.category_id);
        return (
          <span className="text-gray-600">{category?.name || `${t('marketplace.items.category')} ${item.category_id}`}</span>
        );
      },
    },
    {
      key: 'seller',
      header: t('marketplace.items.seller'),
      render: (item) => (
        <div>
          <span className="text-gray-900 block">{item.username}</span>
          <span className="text-xs text-gray-500">{item.contact}</span>
        </div>
      ),
    },
    {
      key: 'complex',
      header: t('common.complex') || 'Complex',
      render: (item) => {
        const complex = complexes?.find(c => c.id === item.complex_id);
        return (
          <span className="text-gray-600">{complex?.name || `${t('common.complex') || 'Complex'} ${item.complex_id}`}</span>
        );
      },
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (item) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            statusColors[item.status]
          }`}
        >
          {t(`marketplace.items.status.${item.status}`) || item.status}
        </span>
      ),
    },
    {
      key: 'listed_date',
      header: t('marketplace.items.listed'),
      render: (item) => (
        <span className="text-gray-500">{formatDate(item.listed_date)}</span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'w-48',
      render: (item) => (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDetailModal(item);
            }}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
          >
            {t('common.view')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(item);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {t('common.edit')}
          </button>
          {item.status === 'AVAILABLE' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusUpdate(item, 'SOLD');
                }}
                className="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 bg-green-50 rounded"
              >
                {t('marketplace.items.markSold')}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusUpdate(item, 'RESERVED');
                }}
                className="text-yellow-600 hover:text-yellow-800 text-xs font-medium px-2 py-1 bg-yellow-50 rounded"
              >
                {t('marketplace.items.reserve')}
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(item);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ];

  const isLoading = itemsLoading || complexesLoading || categoriesLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('marketplace.items.title')}</h2>
          <p className="text-gray-600 mt-1">
            {t('marketplace.items.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('marketplace.items.newItem')}
        </Button>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder={t('marketplace.items.searchPlaceholder')}
        filters={[
          {
            key: 'complex',
            label: t('payments.allComplexes'),
            value: complexFilter,
            onChange: (value) => {
              setComplexFilter(value);
              setCurrentPage(1);
            },
            options: complexes?.map(c => ({ value: c.id.toString(), label: c.name })) || [],
          },
          {
            key: 'category',
            label: t('marketplace.items.form.category'),
            value: categoryFilter,
            onChange: (value) => {
              setCategoryFilter(value);
              setCurrentPage(1);
            },
            options: categories?.map(c => ({ value: c.id.toString(), label: c.name })) || [],
          },
          {
            key: 'status',
            label: t('issues.allStatuses'),
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            },
            options: [
              { value: 'AVAILABLE', label: t('marketplace.items.status.AVAILABLE') },
              { value: 'SOLD', label: t('marketplace.items.status.SOLD') },
              { value: 'RESERVED', label: t('marketplace.items.status.RESERVED') },
              { value: 'EXPIRED', label: t('marketplace.items.status.EXPIRED') },
            ],
          },
        ]}
      />

      {/* Active Filters Display */}
      {(complexFilter || categoryFilter || statusFilter) && (
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="text-gray-500">{t('common.activeFilter')}:</span>
          {complexFilter && selectedComplex && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {t('common.complex') || 'Complex'}: {selectedComplex.name}
            </span>
          )}
          {categoryFilter && selectedCategory && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
              {t('marketplace.items.category')}: {selectedCategory.name}
            </span>
          )}
          {statusFilter && (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
              {t('common.status')}: {t(`marketplace.items.status.${statusFilter}`) || statusFilter}
            </span>
          )}
          <button
            onClick={() => {
              setComplexFilter('');
              setCategoryFilter('');
              setStatusFilter('');
            }}
            className="text-blue-600 hover:text-blue-800 text-xs underline"
          >
            {t('common.clear')}
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={paginatedData}
            keyExtractor={(item) => item.id}
            emptyMessage={t('marketplace.items.noItemsFound')}
          />
          <Pagination
            currentPage={currentPage}
            totalItems={filteredData.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('marketplace.items.createItem')}
        size="lg"
      >
        <MarketplaceItemForm
          categories={categories || []}
          complexes={complexes || []}
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          isLoading={isCreating}
          showComplex
        />
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedItem(null);
        }}
        title={t('marketplace.items.itemDetails')}
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-4">
            {/* Images */}
            {selectedItem.images && selectedItem.images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {selectedItem.images.map((image) => (
                  <img
                    key={image.id}
                    src={image.img_path}
                    alt={selectedItem.title}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">{t('marketplace.items.form.title')}</label>
                <p className="text-gray-900">{selectedItem.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">{t('marketplace.items.form.price')}</label>
                <p className="text-gray-900 font-semibold">{formatPrice(selectedItem.price)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">{t('marketplace.items.category')}</label>
                <p className="text-gray-900">{categoryMap.get(selectedItem.category_id)?.name || `${t('marketplace.items.category')} ${selectedItem.category_id}`}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">{t('common.status')}</label>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[selectedItem.status]}`}>
                  {t(`marketplace.items.status.${selectedItem.status}`) || selectedItem.status}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">{t('marketplace.items.seller')}</label>
                <p className="text-gray-900">{selectedItem.username}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">{t('users.contact') || 'Contact'}</label>
                <p className="text-gray-900">{selectedItem.contact}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">{t('common.complex') || 'Complex'}</label>
                <p className="text-gray-900">{complexes?.find(c => c.id === selectedItem.complex_id)?.name || `${t('common.complex') || 'Complex'} ${selectedItem.complex_id}`}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">{t('marketplace.items.listed')}</label>
                <p className="text-gray-900">{formatDate(selectedItem.listed_date)}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">{t('marketplace.items.description')}</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedItem.description}</p>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedItem(null);
                }}
              >
                {t('common.close')}
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  openEditModal(selectedItem);
                }}
              >
                {t('marketplace.items.editItem')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        title={t('marketplace.items.editItem')}
        size="lg"
      >
        <MarketplaceItemForm
          categories={categories || []}
          initialData={selectedItem}
          onSubmit={handleEdit}
          onCancel={() => {
            setIsEditModalOpen(false);
            setSelectedItem(null);
          }}
          isLoading={isUpdating}
          isEdit
          showStatus
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedItem(null);
          setDeleteError(null);
        }}
        title={t('marketplace.items.deleteItem')}
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <Alert variant="error" title={t('common.error')}>
              {deleteError}
            </Alert>
          )}
          <p className="text-gray-600">
            {t('marketplace.items.deleteConfirmMessage')} <strong>{selectedItem?.title}</strong>?
            {t('marketplace.items.deleteConfirmNote')}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedItem(null);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MarketplaceItemManagement;
