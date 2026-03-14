'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import MarketplaceCategoryForm from './MarketplaceCategoryForm';
import {
  useGetMarketplaceCategoriesQuery,
  useGetComplexesQuery,
  useAdminCreateMarketplaceCategoryMutation,
  useAdminUpdateMarketplaceCategoryMutation,
  useDeleteMarketplaceCategoryMutation,
} from '../../store/apiSlice';
import { MarketplaceCategory, Complex } from '../../types';
import { useTranslation } from '../../locales';

const MarketplaceCategoryManagement: React.FC = () => {
  const { t } = useTranslation();
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [complexFilter, setComplexFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // API hooks
  const { data: complexes, isLoading: complexesLoading } = useGetComplexesQuery({});
  const { data: categories, isLoading: categoriesLoading, refetch } = useGetMarketplaceCategoriesQuery({
    complexId: complexFilter ? Number(complexFilter) : undefined,
  });
  const [createCategory, { isLoading: isCreating }] = useAdminCreateMarketplaceCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useAdminUpdateMarketplaceCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteMarketplaceCategoryMutation();

  // Get selected complex name
  const selectedComplex = useMemo(() => {
    return complexes?.find(c => c.id.toString() === complexFilter);
  }, [complexes, complexFilter]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!categories) return [];
    return categories.filter((category) => {
      const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by complex
      if (complexFilter) {
        return matchesSearch && category.complex_id.toString() === complexFilter;
      }

      return matchesSearch;
    });
  }, [categories, searchTerm, complexFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Handlers
  const handleCreate = async (data: { name: string; complex_id: number }) => {
    await createCategory(data).unwrap();
    setIsCreateModalOpen(false);
    refetch();
  };

  const handleEdit = async (data: { name: string; complex_id: number }) => {
    if (!selectedCategory) return;
    await updateCategory({ id: selectedCategory.id, data }).unwrap();
    setIsEditModalOpen(false);
    setSelectedCategory(null);
    refetch();
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    try {
      setDeleteError(null);
      await deleteCategory(selectedCategory.id).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err?.data?.detail || t('marketplace.categories.deleteError') || 'Failed to delete category');
    }
  };

  const openEditModal = (category: MarketplaceCategory) => {
    setSelectedCategory(category);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (category: MarketplaceCategory) => {
    setSelectedCategory(category);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Table columns
  const columns: Column<MarketplaceCategory>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'w-16',
    },
    {
      key: 'name',
      header: t('marketplace.categories.categoryName'),
      render: (category) => (
        <span className="font-medium text-gray-900">{category.name}</span>
      ),
    },
    {
      key: 'complex',
      header: t('common.complex') || 'Complex',
      render: (category) => {
        const complex = complexes?.find(c => c.id === category.complex_id);
        return (
          <span className="text-gray-600">{complex?.name || `${t('common.complex') || 'Complex'} ${category.complex_id}`}</span>
        );
      },
    },
    {
      key: 'created_date',
      header: t('common.created'),
      render: (category) => (
        <span className="text-gray-500">{formatDate(category.created_date)}</span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (category) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            category.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {category.is_active ? t('common.active') || 'Active' : t('common.inactive') || 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'w-32',
      render: (category) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(category);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {t('common.edit')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(category);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ];

  const isLoading = categoriesLoading || complexesLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('marketplace.categories.title')}</h2>
          <p className="text-gray-600 mt-1">
            {t('marketplace.categories.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('marketplace.categories.newCategory')}
        </Button>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder={t('marketplace.categories.searchPlaceholder')}
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
        ]}
      />

      {/* Active Filters Display */}
      {complexFilter && selectedComplex && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">{t('common.activeFilter')}:</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            {t('common.complex') || 'Complex'}: {selectedComplex.name}
          </span>
          <button
            onClick={() => setComplexFilter('')}
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
            keyExtractor={(category) => category.id}
            emptyMessage={t('marketplace.categories.noCategoriesFound')}
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
        title={t('marketplace.categories.createCategory')}
        size="md"
      >
        <MarketplaceCategoryForm
          complexes={complexes || []}
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          isLoading={isCreating}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCategory(null);
        }}
        title={t('marketplace.categories.editCategory')}
        size="md"
      >
        <MarketplaceCategoryForm
          complexes={complexes || []}
          initialData={selectedCategory}
          onSubmit={handleEdit}
          onCancel={() => {
            setIsEditModalOpen(false);
            setSelectedCategory(null);
          }}
          isLoading={isUpdating}
          isEdit
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCategory(null);
          setDeleteError(null);
        }}
        title={t('marketplace.categories.deleteCategory')}
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <Alert variant="error" title={t('common.error')}>
              {deleteError}
            </Alert>
          )}
          <p className="text-gray-600">
            {t('marketplace.categories.deleteConfirmMessage')} <strong>{selectedCategory?.name}</strong>?
            {t('marketplace.categories.deleteConfirmNote')}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedCategory(null);
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

export default MarketplaceCategoryManagement;
