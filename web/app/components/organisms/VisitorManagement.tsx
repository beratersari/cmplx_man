'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import VisitorForm from './VisitorForm';
import {
  useGetVisitorsQuery,
  useGetComplexesQuery,
  useCreateVisitorMutation,
  useUpdateVisitorMutation,
  useUpdateVisitorStatusMutation,
  useDeleteVisitorMutation,
} from '../../store/apiSlice';
import { Visitor, VisitorStatus, Complex } from '../../types';

const VisitorManagement: React.FC = () => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [complexFilter, setComplexFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // API hooks
  const { data: complexes, isLoading: complexesLoading } = useGetComplexesQuery({});
  const { data: visitors, isLoading: visitorsLoading, refetch } = useGetVisitorsQuery({
    complexId: complexFilter ? Number(complexFilter) : undefined,
    visitDate: dateFilter || undefined,
  });
  const [createVisitor, { isLoading: isCreating }] = useCreateVisitorMutation();
  const [updateVisitor, { isLoading: isUpdating }] = useUpdateVisitorMutation();
  const [updateVisitorStatus, { isLoading: isUpdatingStatus }] = useUpdateVisitorStatusMutation();
  const [deleteVisitor, { isLoading: isDeleting }] = useDeleteVisitorMutation();

  // Get selected complex name
  const selectedComplex = useMemo(() => {
    return complexes?.find(c => c.id.toString() === complexFilter);
  }, [complexes, complexFilter]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!visitors) return [];
    return visitors.filter((visitor) => {
      const matchesSearch =
        visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (visitor.plate_number && visitor.plate_number.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter ? visitor.status === statusFilter : true;

      return matchesSearch && matchesStatus;
    });
  }, [visitors, searchTerm, statusFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Status colors
  const statusColors: Record<VisitorStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CHECKED_IN: 'bg-green-100 text-green-800',
    CHECKED_OUT: 'bg-gray-100 text-gray-800',
    NO_SHOW: 'bg-red-100 text-red-800',
  };

  // Handlers
  const handleCreate = async (data: { name: string; plate_number?: string; complex_id: number }) => {
    await createVisitor(data).unwrap();
    setIsCreateModalOpen(false);
    refetch();
  };

  const handleEdit = async (data: { name: string; plate_number?: string }) => {
    if (!selectedVisitor) return;
    await updateVisitor({ id: selectedVisitor.id, data }).unwrap();
    setIsEditModalOpen(false);
    setSelectedVisitor(null);
    refetch();
  };

  const handleStatusUpdate = async (visitor: Visitor, newStatus: VisitorStatus) => {
    await updateVisitorStatus({ id: visitor.id, data: { status: newStatus } }).unwrap();
    refetch();
  };

  const handleDelete = async () => {
    if (!selectedVisitor) return;
    try {
      setDeleteError(null);
      await deleteVisitor(selectedVisitor.id).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedVisitor(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err?.data?.detail || 'Failed to delete visitor');
    }
  };

  const openEditModal = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (visitor: Visitor) => {
    setSelectedVisitor(visitor);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Table columns
  const columns: Column<Visitor>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'w-16',
    },
    {
      key: 'name',
      header: 'Visitor Name',
      render: (visitor) => (
        <span className="font-medium text-gray-900">{visitor.name}</span>
      ),
    },
    {
      key: 'plate_number',
      header: 'Plate Number',
      render: (visitor) => (
        <span className="text-gray-600">{visitor.plate_number || '-'}</span>
      ),
    },
    {
      key: 'complex',
      header: 'Complex',
      render: (visitor) => {
        const complex = complexes?.find(c => c.id === visitor.complex_id);
        return (
          <span className="text-gray-600">{complex?.name || `Complex ${visitor.complex_id}`}</span>
        );
      },
    },
    {
      key: 'visit_date',
      header: 'Visit Date',
      render: (visitor) => (
        <span className="text-gray-500">{formatDate(visitor.visit_date)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (visitor) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            statusColors[visitor.status]
          }`}
        >
          {visitor.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'checkin_info',
      header: 'Check-in/out',
      render: (visitor) => (
        <div className="text-xs text-gray-500">
          {visitor.status_updated_date ? (
            <div>
              <div>{visitor.status === 'CHECKED_IN' ? 'Checked in:' : visitor.status === 'CHECKED_OUT' ? 'Checked out:' : 'Updated:'}</div>
              <div>{formatDate(visitor.status_updated_date)}</div>
            </div>
          ) : (
            '-'
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-64',
      render: (visitor) => (
        <div className="flex items-center gap-2 flex-wrap">
          {visitor.status === 'PENDING' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStatusUpdate(visitor, 'CHECKED_IN');
              }}
              disabled={isUpdatingStatus}
              className="text-green-600 hover:text-green-800 text-sm font-medium px-2 py-1 bg-green-50 rounded"
            >
              Check In
            </button>
          )}
          {visitor.status === 'CHECKED_IN' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStatusUpdate(visitor, 'CHECKED_OUT');
              }}
              disabled={isUpdatingStatus}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium px-2 py-1 bg-gray-50 rounded"
            >
              Check Out
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(visitor);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(visitor);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const isLoading = visitorsLoading || complexesLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Visitor Registry</h2>
          <p className="text-gray-600 mt-1">
            Manage visitor registrations, check-ins, and check-outs
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Visitor
        </Button>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search visitors by name or plate number..."
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
          {
            key: 'date',
            label: 'Date Filter',
            value: dateFilter,
            onChange: (value) => {
              setDateFilter(value);
              setCurrentPage(1);
            },
            options: [],
            isDate: true,
          },
          {
            key: 'status',
            label: 'All Statuses',
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            },
            options: [
              { value: 'PENDING', label: 'Pending' },
              { value: 'CHECKED_IN', label: 'Checked In' },
              { value: 'CHECKED_OUT', label: 'Checked Out' },
              { value: 'NO_SHOW', label: 'No Show' },
            ],
          },
        ]}
      />

      {/* Active Filters Display */}
      {(complexFilter || dateFilter || statusFilter) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Active filters:</span>
          {complexFilter && selectedComplex && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Complex: {selectedComplex.name}
            </span>
          )}
          {dateFilter && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Date: {new Date(dateFilter).toLocaleDateString()}
            </span>
          )}
          {statusFilter && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Status: {statusFilter.replace('_', ' ')}
            </span>
          )}
          <button
            onClick={() => {
              setComplexFilter('');
              setDateFilter('');
              setStatusFilter('');
            }}
            className="text-blue-600 hover:text-blue-800 text-xs underline"
          >
            Clear all
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
            keyExtractor={(visitor) => visitor.id}
            emptyMessage="No visitors found"
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
        title="Register New Visitor"
        size="md"
      >
        <VisitorForm
          complexes={complexes || []}
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          isLoading={isCreating}
          showComplexSelect={true}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedVisitor(null);
        }}
        title="Edit Visitor"
        size="md"
      >
        <VisitorForm
          complexes={complexes || []}
          initialData={selectedVisitor}
          onSubmit={handleEdit}
          onCancel={() => {
            setIsEditModalOpen(false);
            setSelectedVisitor(null);
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
          setSelectedVisitor(null);
          setDeleteError(null);
        }}
        title="Delete Visitor"
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <Alert variant="error" title="Error">
              {deleteError}
            </Alert>
          )}
          <p className="text-gray-600">
            Are you sure you want to delete visitor <strong>{selectedVisitor?.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedVisitor(null);
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

export default VisitorManagement;
