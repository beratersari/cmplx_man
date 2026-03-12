'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import ReservationForm from './ReservationForm';
import {
  useGetReservationsQuery,
  useGetComplexesQuery,
  useGetReservationCategoriesQuery,
  useGetUsersQuery,
  useAdminCreateReservationMutation,
  useUpdateReservationMutation,
  useUpdateReservationStatusMutation,
  useDeleteReservationMutation,
} from '../../store/apiSlice';
import { Reservation, Complex, ReservationCategory, User, ReservationStatus } from '../../types';

const ReservationManagement: React.FC = () => {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [complexFilter, setComplexFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // API hooks
  const { data: complexes, isLoading: complexesLoading } = useGetComplexesQuery({});
  const { data: categories, isLoading: categoriesLoading } = useGetReservationCategoriesQuery({});
  const { data: users, isLoading: usersLoading } = useGetUsersQuery({});
  const { data: reservations, isLoading: reservationsLoading, refetch } = useGetReservationsQuery({
    complexId: complexFilter ? Number(complexFilter) : undefined,
    status: statusFilter || undefined,
  });
  const [createReservation, { isLoading: isCreating }] = useAdminCreateReservationMutation();
  const [updateReservation, { isLoading: isUpdating }] = useUpdateReservationMutation();
  const [updateReservationStatus, { isLoading: isUpdatingStatus }] = useUpdateReservationStatusMutation();
  const [deleteReservation, { isLoading: isDeleting }] = useDeleteReservationMutation();

  // Get selected complex name
  const selectedComplex = useMemo(() => {
    return complexes?.find(c => c.id.toString() === complexFilter);
  }, [complexes, complexFilter]);

  // Create a map of user IDs to users for quick lookup
  const userMap = useMemo(() => {
    const map = new Map<number, User>();
    users?.forEach(user => map.set(user.id, user));
    return map;
  }, [users]);

  // Create a map of category IDs to categories for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<number, ReservationCategory>();
    categories?.forEach(category => map.set(category.id, category));
    return map;
  }, [categories]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!reservations) return [];
    return reservations.filter((reservation) => {
      const user = userMap.get(reservation.user_id);
      const matchesSearch =
        user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [reservations, searchTerm, userMap]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Status colors
  const statusColors: Record<ReservationStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };

  // Handlers
  const handleCreate = async (data: {
    category_id: number;
    user_id: number;
    complex_id: number;
    reservation_date: string;
    start_hour: string;
    end_hour: string;
    person_count: number;
    notes?: string;
  }) => {
    await createReservation(data).unwrap();
    setIsCreateModalOpen(false);
    refetch();
  };

  const handleEdit = async (data: {
    category_id?: number;
    reservation_date?: string;
    start_hour?: string;
    end_hour?: string;
    person_count?: number;
    notes?: string;
  }) => {
    if (!selectedReservation) return;
    await updateReservation({ id: selectedReservation.id, data }).unwrap();
    setIsEditModalOpen(false);
    setSelectedReservation(null);
    refetch();
  };

  const handleStatusUpdate = async (reservation: Reservation, newStatus: ReservationStatus) => {
    await updateReservationStatus({ id: reservation.id, data: { status: newStatus } }).unwrap();
    refetch();
  };

  const handleDelete = async () => {
    if (!selectedReservation) return;
    try {
      setDeleteError(null);
      await deleteReservation(selectedReservation.id).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedReservation(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err?.data?.detail || 'Failed to delete reservation');
    }
  };

  const openEditModal = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Format time for display
  const formatTime = (time: string) => {
    return time;
  };

  // Table columns
  const columns: Column<Reservation>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'w-16',
    },
    {
      key: 'user',
      header: 'User',
      render: (reservation) => {
        const user = userMap.get(reservation.user_id);
        return (
          <span className="font-medium text-gray-900">{user?.username || `User ${reservation.user_id}`}</span>
        );
      },
    },
    {
      key: 'category',
      header: 'Category',
      render: (reservation) => {
        const category = categoryMap.get(reservation.category_id);
        return (
          <span className="text-gray-600">{category?.name || `Category ${reservation.category_id}`}</span>
        );
      },
    },
    {
      key: 'date_time',
      header: 'Date & Time',
      render: (reservation) => (
        <div className="text-sm">
          <div className="text-gray-900">{formatDate(reservation.reservation_date)}</div>
          <div className="text-gray-500">{formatTime(reservation.start_hour)} - {formatTime(reservation.end_hour)}</div>
        </div>
      ),
    },
    {
      key: 'people',
      header: 'People',
      render: (reservation) => (
        <span className="text-gray-600">{reservation.person_count}</span>
      ),
    },
    {
      key: 'complex',
      header: 'Complex',
      render: (reservation) => {
        const complex = complexes?.find(c => c.id === reservation.complex_id);
        return (
          <span className="text-gray-600">{complex?.name || `Complex ${reservation.complex_id}`}</span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (reservation) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            statusColors[reservation.status as ReservationStatus]
          }`}
        >
          {reservation.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-48',
      render: (reservation) => (
        <div className="flex items-center gap-2 flex-wrap">
          {reservation.status === 'PENDING' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusUpdate(reservation, 'ACCEPTED');
                }}
                className="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 bg-green-50 rounded"
              >
                Accept
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusUpdate(reservation, 'REJECTED');
                }}
                className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 bg-red-50 rounded"
              >
                Reject
              </button>
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(reservation);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(reservation);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const isLoading = reservationsLoading || complexesLoading || categoriesLoading || usersLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Reservation Management</h2>
          <p className="text-gray-600 mt-1">
            Manage facility reservations from residents
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Reservation
        </Button>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search reservations by user or notes..."
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
            key: 'status',
            label: 'All Statuses',
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            },
            options: [
              { value: 'PENDING', label: 'Pending' },
              { value: 'ACCEPTED', label: 'Accepted' },
              { value: 'REJECTED', label: 'Rejected' },
            ],
          },
        ]}
      />

      {/* Active Filters Display */}
      {(complexFilter || statusFilter) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Active filters:</span>
          {complexFilter && selectedComplex && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Complex: {selectedComplex.name}
            </span>
          )}
          {statusFilter && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              Status: {statusFilter}
            </span>
          )}
          <button
            onClick={() => {
              setComplexFilter('');
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
            keyExtractor={(reservation) => reservation.id}
            emptyMessage="No reservations found"
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
        title="Create New Reservation"
        size="lg"
      >
        <ReservationForm
          complexes={complexes || []}
          categories={categories || []}
          users={users || []}
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
          setSelectedReservation(null);
        }}
        title="Edit Reservation"
        size="md"
      >
        <ReservationForm
          complexes={complexes || []}
          categories={categories || []}
          users={users || []}
          initialData={selectedReservation}
          onSubmit={handleEdit}
          onCancel={() => {
            setIsEditModalOpen(false);
            setSelectedReservation(null);
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
          setSelectedReservation(null);
          setDeleteError(null);
        }}
        title="Delete Reservation"
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <Alert variant="error" title="Error">
              {deleteError}
            </Alert>
          )}
          <p className="text-gray-600">
            Are you sure you want to delete reservation <strong>#{selectedReservation?.id}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedReservation(null);
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

export default ReservationManagement;
