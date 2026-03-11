'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import BuildingForm from './BuildingForm';
import BuildingDetailModal from './BuildingDetailModal';
import {
  useGetBuildingsQuery,
  useCreateBuildingMutation,
  useUpdateBuildingMutation,
  useDeleteBuildingMutation,
  useGetComplexesQuery,
  useGetUsersQuery,
} from '../../store/apiSlice';
import { Building, Complex, User } from '../../types';

interface BuildingWithComplex extends Building {
  complex?: Complex;
}

const BuildingManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: complexes, isLoading: complexesLoading } = useGetComplexesQuery({
    skip: 0,
    limit: 1000,
  });

  const { data: buildings, isLoading: buildingsLoading, refetch } = useGetBuildingsQuery({
    skip: 0,
    limit: 1000,
  });

  const { data: allUsers, isLoading: usersLoading } = useGetUsersQuery({
    skip: 0,
    limit: 1000,
  });

  const [createBuilding, { isLoading: isCreating }] = useCreateBuildingMutation();
  const [updateBuilding, { isLoading: isUpdating }] = useUpdateBuildingMutation();
  const [deleteBuilding, { isLoading: isDeleting }] = useDeleteBuildingMutation();

  const buildingsWithComplex = useMemo(() => {
    if (!buildings || !complexes) return [];
    return buildings.map((building) => ({
      ...building,
      complex: complexes.find((c) => c.id === building.complex_id),
    }));
  }, [buildings, complexes]);

  const filteredData = useMemo(() => {
    return buildingsWithComplex.filter((building) => {
      const matchesSearch =
        building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        building.complex?.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter
        ? building.complex?.is_active === (statusFilter === 'active')
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [buildingsWithComplex, searchTerm, statusFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleCreate = async (data: { name: string; complex_id: number }) => {
    try {
      setError(null);
      await createBuilding(data).unwrap();
      setIsCreateModalOpen(false);
      refetch();
    } catch (err: any) {
      setError(err?.data?.detail || 'Failed to create building');
    }
  };

  const handleEdit = async (data: { name: string; complex_id: number }) => {
    if (!selectedBuilding) return;
    try {
      setError(null);
      await updateBuilding({ id: selectedBuilding.id, data }).unwrap();
      setIsEditModalOpen(false);
      setSelectedBuilding(null);
      refetch();
    } catch (err: any) {
      setError(err?.data?.detail || 'Failed to update building');
    }
  };

  const handleDelete = async () => {
    if (!selectedBuilding) return;
    try {
      setDeleteError(null);
      await deleteBuilding(selectedBuilding.id).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedBuilding(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err?.data?.detail || 'Failed to delete building');
    }
  };

  const handleAssignUser = async (userId: number) => {
    console.log('Assign user', userId, 'to building', selectedBuilding?.id);
  };

  const openEditModal = (building: Building) => {
    setSelectedBuilding(building);
    setError(null);
    setIsEditModalOpen(true);
  };

  const openDetailModal = (building: Building) => {
    setSelectedBuilding(building);
    setIsDetailModalOpen(true);
  };

  const openDeleteModal = (building: Building) => {
    setSelectedBuilding(building);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const getBuildingUsers = (buildingId: number): User[] => {
    return allUsers || [];
  };

  const columns: Column<BuildingWithComplex>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'w-20',
    },
    {
      key: 'name',
      header: 'Building Name',
      render: (building) => (
        <span className="font-medium text-gray-900">{building.name}</span>
      ),
    },
    {
      key: 'complex',
      header: 'Complex',
      render: (building) => (
        <div>
          <div className="text-gray-900">{building.complex?.name || 'Unknown'}</div>
          <div className="text-sm text-gray-500">{building.complex?.address}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (building) => {
        const isActive = building.complex?.is_active ?? true;
        return (
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      key: 'created_date',
      header: 'Created',
      render: (building) => (
        <span className="text-gray-500">
          {new Date(building.created_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-48',
      render: (building) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDetailModal(building);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(building);
            }}
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(building);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const isLoading = buildingsLoading || complexesLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Building Management</h2>
          <p className="text-gray-600 mt-1">
            Manage buildings across all complexes
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Building
        </Button>
      </div>

      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search buildings or complexes..."
        filters={[
          {
            key: 'status',
            label: 'All Statuses',
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            },
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
          },
        ]}
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={paginatedData}
            keyExtractor={(building) => building.id}
            emptyMessage="No buildings found"
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

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setError(null);
        }}
        title="Create New Building"
        size="md"
      >
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}
        {complexes ? (
          <BuildingForm
            complexes={complexes}
            onSubmit={handleCreate}
            onCancel={() => {
              setIsCreateModalOpen(false);
              setError(null);
            }}
            isLoading={isCreating}
          />
        ) : (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedBuilding(null);
          setError(null);
        }}
        title="Edit Building"
        size="md"
      >
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}
        {complexes && selectedBuilding ? (
          <BuildingForm
            complexes={complexes}
            initialData={selectedBuilding}
            onSubmit={handleEdit}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedBuilding(null);
              setError(null);
            }}
            isLoading={isUpdating}
          />
        ) : (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        )}
      </Modal>

      <BuildingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedBuilding(null);
        }}
        building={selectedBuilding}
        complex={selectedBuilding ? complexes?.find(c => c.id === selectedBuilding.complex_id) : undefined}
        users={selectedBuilding ? getBuildingUsers(selectedBuilding.id) : []}
        isLoading={usersLoading}
        onAssignUser={handleAssignUser}
      />

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedBuilding(null);
          setDeleteError(null);
        }}
        title="Delete Building"
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <Alert variant="error" title="Error">
              {deleteError}
            </Alert>
          )}
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedBuilding?.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedBuilding(null);
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

export default BuildingManagement;
