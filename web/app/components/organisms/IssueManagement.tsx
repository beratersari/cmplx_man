'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import IssueForm from './IssueForm';
import {
  useGetIssuesQuery,
  useGetComplexesQuery,
  useGetIssueCategoriesQuery,
  useGetUsersQuery,
  useAdminCreateIssueMutation,
  useUpdateIssueMutation,
  useDeleteIssueMutation,
} from '../../store/apiSlice';
import { Issue, Complex, IssueCategory, User, IssueStatus } from '../../types';
import { useTranslation } from '../../locales';

const IssueManagement: React.FC = () => {
  const { t } = useTranslation();
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [complexFilter, setComplexFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // API hooks
  const { data: complexes, isLoading: complexesLoading } = useGetComplexesQuery({});
  const { data: categories, isLoading: categoriesLoading } = useGetIssueCategoriesQuery({});
  const { data: users, isLoading: usersLoading } = useGetUsersQuery({});
  const { data: issues, isLoading: issuesLoading, refetch } = useGetIssuesQuery({
    complexId: complexFilter ? Number(complexFilter) : undefined,
  });
  const [createIssue, { isLoading: isCreating }] = useAdminCreateIssueMutation();
  const [updateIssue, { isLoading: isUpdating }] = useUpdateIssueMutation();
  const [deleteIssue, { isLoading: isDeleting }] = useDeleteIssueMutation();

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
    const map = new Map<number, IssueCategory>();
    categories?.forEach(category => map.set(category.id, category));
    return map;
  }, [categories]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!issues) return [];
    return issues.filter((issue) => {
      const matchesSearch =
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter ? issue.status === statusFilter : true;

      return matchesSearch && matchesStatus;
    });
  }, [issues, searchTerm, statusFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Status colors
  const statusColors: Record<IssueStatus, string> = {
    OPEN: 'bg-red-100 text-red-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
  };

  // Handlers
  const handleCreate = async (data: { title: string; description: string; category_id: number; complex_id: number; img_paths?: string[] }) => {
    await createIssue(data).unwrap();
    setIsCreateModalOpen(false);
    refetch();
  };

  const handleEdit = async (data: { title?: string; description?: string; status?: IssueStatus }) => {
    if (!selectedIssue) return;
    await updateIssue({ id: selectedIssue.id, data }).unwrap();
    setIsEditModalOpen(false);
    setSelectedIssue(null);
    refetch();
  };

  const handleStatusUpdate = async (issue: Issue, newStatus: IssueStatus) => {
    await updateIssue({ id: issue.id, data: { status: newStatus } }).unwrap();
    refetch();
  };

  const handleDelete = async () => {
    if (!selectedIssue) return;
    try {
      setDeleteError(null);
      await deleteIssue(selectedIssue.id).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedIssue(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err?.data?.detail || t('issues.deleteError') || 'Failed to delete issue');
    }
  };

  const openEditModal = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (issue: Issue) => {
    setSelectedIssue(issue);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Table columns
  const columns: Column<Issue>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'w-16',
    },
    {
      key: 'title',
      header: t('issues.issueTitle'),
      render: (issue) => (
        <div>
          <span className="font-medium text-gray-900 block">{issue.title}</span>
          <span className="text-xs text-gray-500 line-clamp-1">{issue.description}</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: t('issues.category'),
      render: (issue) => {
        const category = categoryMap.get(issue.category_id);
        return (
          <span className="text-gray-600">{category?.name || `${t('issues.category')} ${issue.category_id}`}</span>
        );
      },
    },
    {
      key: 'reporter',
      header: t('issues.reporter'),
      render: (issue) => {
        const reporter = userMap.get(issue.user_id);
        return (
          <span className="text-gray-600">{reporter?.username || `${t('users.user')} ${issue.user_id}`}</span>
        );
      },
    },
    {
      key: 'complex',
      header: t('common.complex') || 'Complex',
      render: (issue) => {
        const complex = complexes?.find(c => c.id === issue.complex_id);
        return (
          <span className="text-gray-600">{complex?.name || `${t('common.complex') || 'Complex'} ${issue.complex_id}`}</span>
        );
      },
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (issue) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            statusColors[issue.status]
          }`}
        >
          {t(`issues.status.${issue.status}`) || issue.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'created_date',
      header: t('common.created'),
      render: (issue) => (
        <span className="text-gray-500">{formatDate(issue.created_date)}</span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'w-48',
      render: (issue) => (
        <div className="flex items-center gap-2 flex-wrap">
          {issue.status !== 'CLOSED' && (
            <>
              {issue.status === 'OPEN' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusUpdate(issue, 'IN_PROGRESS');
                  }}
                  className="text-yellow-600 hover:text-yellow-800 text-xs font-medium px-2 py-1 bg-yellow-50 rounded"
                >
                  {t('issues.start')}
                </button>
              )}
              {issue.status === 'IN_PROGRESS' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusUpdate(issue, 'RESOLVED');
                  }}
                  className="text-green-600 hover:text-green-800 text-xs font-medium px-2 py-1 bg-green-50 rounded"
                >
                  {t('issues.resolve')}
                </button>
              )}
              {(issue.status === 'RESOLVED' || issue.status === 'IN_PROGRESS') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusUpdate(issue, 'CLOSED');
                  }}
                  className="text-gray-600 hover:text-gray-800 text-xs font-medium px-2 py-1 bg-gray-50 rounded"
                >
                  {t('issues.close')}
                </button>
              )}
            </>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(issue);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {t('common.edit')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(issue);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ];

  const isLoading = issuesLoading || complexesLoading || categoriesLoading || usersLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('issues.title')}</h2>
          <p className="text-gray-600 mt-1">
            {t('issues.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('issues.newIssue')}
        </Button>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder={t('issues.searchPlaceholder')}
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
            key: 'status',
            label: t('issues.allStatuses'),
            value: statusFilter,
            onChange: (value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            },
            options: [
              { value: 'OPEN', label: t('issues.status.OPEN') },
              { value: 'IN_PROGRESS', label: t('issues.status.IN_PROGRESS') },
              { value: 'RESOLVED', label: t('issues.status.RESOLVED') },
              { value: 'CLOSED', label: t('issues.status.CLOSED') },
            ],
          },
        ]}
      />

      {/* Active Filters Display */}
      {(complexFilter || statusFilter) && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">{t('common.activeFilter')}:</span>
          {complexFilter && selectedComplex && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {t('common.complex') || 'Complex'}: {selectedComplex.name}
            </span>
          )}
          {statusFilter && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {t('common.status')}: {t(`issues.status.${statusFilter}`) || statusFilter.replace('_', ' ')}
            </span>
          )}
          <button
            onClick={() => {
              setComplexFilter('');
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
            keyExtractor={(issue) => issue.id}
            emptyMessage={t('issues.noIssuesFound')}
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
        title={t('issues.form.createIssue')}
        size="lg"
      >
        <IssueForm
          complexes={complexes || []}
          categories={categories || []}
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
          setSelectedIssue(null);
        }}
        title={t('issues.editIssue')}
        size="md"
      >
        <IssueForm
          complexes={complexes || []}
          categories={categories || []}
          initialData={selectedIssue}
          onSubmit={handleEdit}
          onCancel={() => {
            setIsEditModalOpen(false);
            setSelectedIssue(null);
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
          setSelectedIssue(null);
          setDeleteError(null);
        }}
        title={t('issues.deleteIssue')}
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <Alert variant="error" title={t('common.error')}>
              {deleteError}
            </Alert>
          )}
          <p className="text-gray-600">
            {t('issues.deleteConfirmMessage') || 'Are you sure you want to delete issue'} <strong>{selectedIssue?.title}</strong>?
            {t('complexes.deleteConfirmNote')}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedIssue(null);
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

export default IssueManagement;
