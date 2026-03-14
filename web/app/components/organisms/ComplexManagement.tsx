'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import ComplexForm from './ComplexForm';
import AssignUserModal from './AssignUserModal';
import ComplexDetailModal from './ComplexDetailModal';
import {
  useGetComplexesQuery,
  useCreateComplexMutation,
  useUpdateComplexMutation,
  useDeleteComplexMutation,
} from '../../store/apiSlice';
import { Complex } from '../../types';
import { useTranslation } from '../../locales';

const ComplexManagement: React.FC = () => {
  const { t } = useTranslation();
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // API hooks
  const { data: complexes, isLoading, refetch } = useGetComplexesQuery({
    skip: 0,
    limit: 1000, // Fetch all and filter client-side for now
  });
  const [createComplex, { isLoading: isCreating }] = useCreateComplexMutation();
  const [updateComplex, { isLoading: isUpdating }] = useUpdateComplexMutation();
  const [deleteComplex, { isLoading: isDeleting }] = useDeleteComplexMutation();

  // Filtered and paginated data
  const filteredData = useMemo(() => {
    if (!complexes) return [];
    return complexes.filter((complex) =>
      complex.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complex.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [complexes, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Handlers
  const handleCreate = async (data: { name: string; address: string }) => {
    await createComplex(data).unwrap();
    setIsCreateModalOpen(false);
    refetch();
  };

  const handleEdit = async (data: { name: string; address: string }) => {
    if (!selectedComplex) return;
    await updateComplex({ id: selectedComplex.id, data }).unwrap();
    setIsEditModalOpen(false);
    setSelectedComplex(null);
    refetch();
  };

  const handleDelete = async () => {
    if (!selectedComplex) return;
    try {
      setDeleteError(null);
      await deleteComplex(selectedComplex.id).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedComplex(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err?.data?.detail || t('complexes.deleteError') || 'Failed to delete complex');
    }
  };

  const openEditModal = (complex: Complex) => {
    setSelectedComplex(complex);
    setIsEditModalOpen(true);
  };

  const openDetailModal = (complex: Complex) => {
    setSelectedComplex(complex);
    setIsDetailModalOpen(true);
  };

  const openAssignModal = (complex: Complex) => {
    setSelectedComplex(complex);
    setIsAssignModalOpen(true);
  };

  const openDeleteModal = (complex: Complex) => {
    setSelectedComplex(complex);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Table columns
  const columns: Column<Complex>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'w-20',
    },
    {
      key: 'name',
      header: t('common.name'),
      render: (complex) => (
        <span className="font-medium text-gray-900">{complex.name}</span>
      ),
    },
    {
      key: 'address',
      header: t('common.address'),
      render: (complex) => (
        <span className="text-gray-600">{complex.address}</span>
      ),
    },
    {
      key: 'created_date',
      header: t('common.created'),
      render: (complex) => (
        <span className="text-gray-500">
          {new Date(complex.created_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'w-48',
      render: (complex) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDetailModal(complex);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {t('common.view')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(complex);
            }}
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            {t('common.edit')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openAssignModal(complex);
            }}
            className="text-purple-600 hover:text-purple-800 text-sm font-medium"
          >
            {t('common.assign')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(complex);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('complexes.title')}</h2>
          <p className="text-gray-600 mt-1">
            {t('complexes.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('complexes.newComplex')}
        </Button>
      </div>

      {/* Search */}
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder={t('complexes.searchPlaceholder')}
      />

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
            keyExtractor={(complex) => complex.id}
            emptyMessage={t('complexes.noComplexesFound')}
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
        title={t('complexes.createComplex')}
        size="md"
      >
        <ComplexForm
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
          setSelectedComplex(null);
        }}
        title={t('complexes.editComplex')}
        size="md"
      >
        <ComplexForm
          initialData={selectedComplex}
          onSubmit={handleEdit}
          onCancel={() => {
            setIsEditModalOpen(false);
            setSelectedComplex(null);
          }}
          isLoading={isUpdating}
        />
      </Modal>

      {/* Detail Modal */}
      <ComplexDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedComplex(null);
        }}
        complex={selectedComplex}
      />

      {/* Assign Modal */}
      {selectedComplex && (
        <AssignUserModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedComplex(null);
          }}
          complexId={selectedComplex.id}
          complexName={selectedComplex.name}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedComplex(null);
          setDeleteError(null);
        }}
        title={t('complexes.deleteComplex')}
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <Alert variant="error" title={t('common.error')}>
              {deleteError}
            </Alert>
          )}
          <p className="text-gray-600">
            {t('complexes.deleteConfirmMessage')} <strong>{selectedComplex?.name}</strong>?
            {t('complexes.deleteConfirmNote')}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedComplex(null);
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

export default ComplexManagement;
