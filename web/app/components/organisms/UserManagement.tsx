'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import { useGetUsersQuery } from '../../store/apiSlice';
import { User } from '../../types';

const UserManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: users, isLoading, refetch } = useGetUsersQuery({
    skip: 0,
    limit: 1000,
  });

  // Filter data
  const filteredData = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.contact && user.contact.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRole = roleFilter ? user.role === roleFilter : true;
      const matchesStatus = statusFilter
        ? user.is_active === (statusFilter === 'active')
        : true;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-800',
    SITE_MANAGER: 'bg-blue-100 text-blue-800',
    SITE_ATTENDANT: 'bg-green-100 text-green-800',
    RESIDENT: 'bg-gray-100 text-gray-800',
  };

  const columns: Column<User>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'w-20',
    },
    {
      key: 'username',
      header: 'Username',
      render: (user) => (
        <span className="font-medium text-gray-900">{user.username}</span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (user) => (
        <span className="text-gray-600">{user.email}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            roleColors[user.role] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {user.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            user.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'unit_number',
      header: 'Unit',
      render: (user) => (
        <span className="text-gray-500">{user.unit_number || '-'}</span>
      ),
    },
    {
      key: 'created_date',
      header: 'Created',
      render: (user) => (
        <span className="text-gray-500">
          {new Date(user.created_date).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">
            Manage system users and their assignments
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search users by username, email, or contact..."
        filters={[
          {
            key: 'role',
            label: 'All Roles',
            value: roleFilter,
            onChange: (value) => {
              setRoleFilter(value);
              setCurrentPage(1);
            },
            options: [
              { value: 'ADMIN', label: 'Admin' },
              { value: 'SITE_MANAGER', label: 'Site Manager' },
              { value: 'SITE_ATTENDANT', label: 'Site Attendant' },
              { value: 'RESIDENT', label: 'Resident' },
            ],
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
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
          },
        ]}
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
            keyExtractor={(user) => user.id}
            emptyMessage="No users found"
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
    </div>
  );
};

export default UserManagement;
