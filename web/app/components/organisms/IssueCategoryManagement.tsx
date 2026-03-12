'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import IssueCategoryForm from './IssueCategoryForm';
import {
  useGetIssueCategoriesQuery,
  useGetComplexesQuery,
  useAdminCreateIssueCategoryMutation,
  useAdminUpdateIssueCategoryMutation,
  useDeleteIssueCategoryMutation,
} from '../../store/apiSlice';
import { IssueCategory, Complex } from '../../types';

const IssueCategoryManagement: React.FC = () => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [complexFilter, setComplexFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // API hooks
  const { data: complexes, isLoading: complexesLoading } = useGetComplexesQuery({});
  const { data: categories, isLoading: categoriesLoading, refetch } = useGetIssueCategoriesQuery({
    complexId: complexFilter ? Number(complexFilter) : undefined,
  });
  const [createCategory, { isLoading: isCreating }] = useAdminCreateIssueCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useAdminUpdateIssueCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteIssueCategoryMutation();

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
      setDeleteError(err?.data?.detail || 'Failed to delete category');
    }
  };

  const openEditModal = (category: IssueCategory) => {
    setSelectedCategory(category);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (category: IssueCategory) => {
    setSelectedCategory(category);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Table columns
  const columns: Column<IssueCategory>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'w-16',
    },
    {
      key: 'name',
      header: 'Category Name',
      render: (category) => (
        <span className="font-medium text-gray-900">{category.name}</span>
      ),
    },
    {
      key: 'complex',
      header: 'Complex',
      render: (category) => {
        const complex = complexes?.find(c => c.id === category.complex_id);
        return (
          <span className="text-gray-600">{complex?.name || `Complex ${category.complex_id}`}</span>
        );
      },
    },
    {
      key: 'created_date',
      header: 'Created',
      render: (category) => (
        <span className="text-gray-500">{formatDate(category.created_date)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (category) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            category.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {category.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
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
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(category);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
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
          <h2 className="text-xl font-semibold text-gray-900">Issue Categories</h2>
          <p className="text-gray-600 mt-1">
            Manage issue/request categories for complexes
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Category
        </Button>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search categories by name..."
        filters={[
          {
            key: 'complex',
            label: 'All Complexes',
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
          <span className="text-gray-500">Active filter:</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            Complex: {selectedComplex.name}
          </span>
          <button
            onClick={() => setComplexFilter('')}
            className="text-blue-600 hover:text-blue-800 text-xs underline"
          >
            Clear
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
            emptyMessage="No issue categories found"
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
        title="Create New Issue Category"
        size="md"
      >
        <IssueCategoryForm
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
        title="Edit Issue Category"
        size="md"
      >
        <IssueCategoryForm
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
        title="Delete Issue Category"
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <Alert variant="error" title="Error">
              {deleteError}
            </Alert>
          )}
          <p className="text-gray-600">
            Are you sure you want to delete category <strong>{selectedCategory?.name}</strong>?
            This action cannot be undone.
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
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default IssueCategoryManagement;
