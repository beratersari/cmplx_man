'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import { useGetUsersQuery } from '../../store/apiSlice';
import { User } from '../../types';
import { useTranslation } from '../../locales';

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
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
      header: t('users.username'),
      render: (user) => (
        <span className="font-medium text-gray-900">{user.username}</span>
      ),
    },
    {
      key: 'email',
      header: t('users.email'),
      render: (user) => (
        <span className="text-gray-600">{user.email}</span>
      ),
    },
    {
      key: 'role',
      header: t('users.role'),
      render: (user) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            roleColors[user.role] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {t(`users.roles.${user.role}`) || user.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (user) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            user.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {user.is_active ? t('users.active') : t('users.inactive')}
        </span>
      ),
    },
    {
      key: 'unit_number',
      header: t('users.unit'),
      render: (user) => (
        <span className="text-gray-500">{user.unit_number || '-'}</span>
      ),
    },
    {
      key: 'created_date',
      header: t('common.created'),
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
          <h2 className="text-xl font-semibold text-gray-900">{t('users.title')}</h2>
          <p className="text-gray-600 mt-1">
            {t('users.subtitle')}
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
        searchPlaceholder={t('users.searchPlaceholder')}
        filters={[
          {
            key: 'role',
            label: t('users.allRoles'),
            value: roleFilter,
            onChange: (value) => {
              setRoleFilter(value);
              setCurrentPage(1);
            },
            options: [
              { value: 'ADMIN', label: t('users.roles.ADMIN') },
              { value: 'SITE_MANAGER', label: t('users.roles.SITE_MANAGER') },
              { value: 'SITE_ATTENDANT', label: t('users.roles.SITE_ATTENDANT') },
              { value: 'RESIDENT', label: t('users.roles.RESIDENT') },
            ],
          },
          {
            key: 'status',
            label: t('users.allStatuses'),
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            },
            options: [
              { value: 'active', label: t('users.active') },
              { value: 'inactive', label: t('users.inactive') },
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
            emptyMessage={t('users.noUsersFound')}
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
