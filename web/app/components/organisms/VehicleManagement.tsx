'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert, SummaryCard } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import VehicleForm from './VehicleForm';
import {
  useGetVehiclesQuery,
  useGetComplexesQuery,
  useGetUsersQuery,
  useGetVehicleStatsQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
} from '../../store/apiSlice';
import { Vehicle, Complex, User } from '../../types';
import { useTranslation } from '../../locales';

const VehicleManagement: React.FC = () => {
  const { t } = useTranslation();
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [complexFilter, setComplexFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // API hooks
  const { data: complexes, isLoading: complexesLoading } = useGetComplexesQuery({});
  const { data: users, isLoading: usersLoading } = useGetUsersQuery({});
  const { data: vehicles, isLoading: vehiclesLoading, refetch } = useGetVehiclesQuery({});
  const { data: vehicleStats, isLoading: statsLoading } = useGetVehicleStatsQuery(
    complexFilter ? Number(complexFilter) : 0,
    { skip: !complexFilter }
  );
  const [createVehicle, { isLoading: isCreating }] = useCreateVehicleMutation();
  const [updateVehicle, { isLoading: isUpdating }] = useUpdateVehicleMutation();
  const [deleteVehicle, { isLoading: isDeleting }] = useDeleteVehicleMutation();

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

  // Filter data
  const filteredData = useMemo(() => {
    if (!vehicles) return [];
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        vehicle.plate_number.toLowerCase().includes(searchTerm.toLowerCase());

      // Filter by complex - need to check the vehicle owner's complex
      if (complexFilter) {
        const owner = userMap.get(vehicle.user_id);
        // For now, skip complex filtering since we need user-building relationships
        // This would require additional API support or data
        return matchesSearch;
      }

      return matchesSearch;
    });
  }, [vehicles, searchTerm, complexFilter, userMap]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Handlers
  const handleCreate = async (data: { user_id: number; plate_number: string }) => {
    await createVehicle(data).unwrap();
    setIsCreateModalOpen(false);
    refetch();
  };

  const handleEdit = async (data: { plate_number: string }) => {
    if (!selectedVehicle) return;
    await updateVehicle({ id: selectedVehicle.id, data }).unwrap();
    setIsEditModalOpen(false);
    setSelectedVehicle(null);
    refetch();
  };

  const handleDelete = async () => {
    if (!selectedVehicle) return;
    try {
      setDeleteError(null);
      await deleteVehicle(selectedVehicle.id).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedVehicle(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err?.data?.detail || t('vehicles.deleteError') || 'Failed to delete vehicle');
    }
  };

  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Table columns
  const columns: Column<Vehicle>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'w-16',
    },
    {
      key: 'plate_number',
      header: t('vehicles.plateNumber'),
      render: (vehicle) => (
        <span className="font-medium text-gray-900">{vehicle.plate_number}</span>
      ),
    },
    {
      key: 'owner',
      header: t('vehicles.owner'),
      render: (vehicle) => {
        const owner = userMap.get(vehicle.user_id);
        return (
          <span className="text-gray-600">{owner?.username || `${t('users.user')} ${vehicle.user_id}`}</span>
        );
      },
    },
    {
      key: 'created_date',
      header: t('vehicles.registered'),
      render: (vehicle) => (
        <span className="text-gray-500">{formatDate(vehicle.created_date)}</span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'w-32',
      render: (vehicle) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(vehicle);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {t('common.edit')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(vehicle);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ];

  const isLoading = vehiclesLoading || complexesLoading || usersLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('vehicles.title')}</h2>
          <p className="text-gray-600 mt-1">
            {t('vehicles.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('vehicles.registerVehicle')}
        </Button>
      </div>

      {/* Stats Panel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('vehicles.statistics')}</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.filterByComplex') || 'Filter by Complex'}
          </label>
          <select
            value={complexFilter}
            onChange={(e) => setComplexFilter(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('payments.form.selectComplex')}</option>
            {complexes?.map((complex) => (
              <option key={complex.id} value={complex.id}>
                {complex.name}
              </option>
            ))}
          </select>
        </div>

        {statsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : complexFilter && vehicleStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SummaryCard
              title={t('vehicles.totalVehicles')}
              value={vehicleStats.total_vehicles}
              subtitle={t('vehicles.inSelectedComplex')}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              }
              color="blue"
            />
            {vehicleStats.vehicles_by_complex.map((stat) => (
              <SummaryCard
                key={stat.complex_id}
                title={stat.complex_name}
                value={stat.vehicle_count}
                subtitle={t('vehicles.title')}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
                color="teal"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
            {t('vehicles.selectComplexToViewStats')}
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder={t('vehicles.searchPlaceholder')}
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
            keyExtractor={(vehicle) => vehicle.id}
            emptyMessage={t('vehicles.noVehiclesFound')}
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
        title={t('vehicles.registerVehicle')}
        size="md"
      >
        <VehicleForm
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
          setSelectedVehicle(null);
        }}
        title={t('vehicles.editVehicle')}
        size="md"
      >
        <VehicleForm
          users={users || []}
          initialData={selectedVehicle}
          onSubmit={handleEdit}
          onCancel={() => {
            setIsEditModalOpen(false);
            setSelectedVehicle(null);
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
          setSelectedVehicle(null);
          setDeleteError(null);
        }}
        title={t('vehicles.deleteVehicle')}
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <Alert variant="error" title={t('common.error')}>
              {deleteError}
            </Alert>
          )}
          <p className="text-gray-600">
            {t('vehicles.deleteConfirmMessage') || 'Are you sure you want to delete vehicle'} <strong>{selectedVehicle?.plate_number}</strong>?
            {t('complexes.deleteConfirmNote')}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedVehicle(null);
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

export default VehicleManagement;
