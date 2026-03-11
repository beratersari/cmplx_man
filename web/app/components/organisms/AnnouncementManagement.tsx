'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import AnnouncementForm from './AnnouncementForm';
import AnnouncementDetailModal from './AnnouncementDetailModal';
import {
  useGetAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
  useGetComplexesQuery,
  useGetAnnouncementEmotionsQuery,
  useGetAnnouncementCommentsQuery,
  useAddAnnouncementEmotionMutation,
  useAddAnnouncementCommentMutation,
} from '../../store/apiSlice';
import { Announcement, Complex } from '../../types';

interface AnnouncementWithComplex extends Announcement {
  complex?: Complex;
}

const AnnouncementManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [complexFilter, setComplexFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: complexes, isLoading: complexesLoading } = useGetComplexesQuery({
    skip: 0,
    limit: 1000,
  });

  const { data: announcements, isLoading: announcementsLoading, refetch } = useGetAnnouncementsQuery({
    skip: 0,
    limit: 1000,
  });

  const { data: emotions } = useGetAnnouncementEmotionsQuery(selectedAnnouncement?.id || 0, {
    skip: !selectedAnnouncement,
  });

  const { data: comments, isLoading: commentsLoading } = useGetAnnouncementCommentsQuery(selectedAnnouncement?.id || 0, {
    skip: !selectedAnnouncement,
  });

  const [createAnnouncement, { isLoading: isCreating }] = useCreateAnnouncementMutation();
  const [updateAnnouncement, { isLoading: isUpdating }] = useUpdateAnnouncementMutation();
  const [deleteAnnouncement, { isLoading: isDeleting }] = useDeleteAnnouncementMutation();
  const [addEmotion] = useAddAnnouncementEmotionMutation();
  const [addComment] = useAddAnnouncementCommentMutation();

  const announcementsWithComplex = useMemo(() => {
    if (!announcements || !complexes) return [];
    return announcements.map((announcement) => ({
      ...announcement,
      complex: complexes.find((c) => c.id === announcement.complex_id),
    }));
  }, [announcements, complexes]);

  const filteredData = useMemo(() => {
    return announcementsWithComplex.filter((announcement) => {
      const matchesSearch =
        announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesComplex = complexFilter
        ? announcement.complex_id === Number(complexFilter)
        : true;

      return matchesSearch && matchesComplex;
    });
  }, [announcementsWithComplex, searchTerm, complexFilter]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleCreate = async (data: { title: string; description: string; complex_id: number; img_path?: string; comments_enabled: boolean }) => {
    try {
      setError(null);
      await createAnnouncement(data).unwrap();
      setIsCreateModalOpen(false);
      refetch();
    } catch (err: any) {
      setError(err?.data?.detail || 'Failed to create announcement');
    }
  };

  const handleEdit = async (data: { title: string; description: string; complex_id: number; img_path?: string; comments_enabled: boolean }) => {
    if (!selectedAnnouncement) return;
    try {
      setError(null);
      await updateAnnouncement({ id: selectedAnnouncement.id, data }).unwrap();
      setIsEditModalOpen(false);
      setSelectedAnnouncement(null);
      refetch();
    } catch (err: any) {
      setError(err?.data?.detail || 'Failed to update announcement');
    }
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;
    try {
      setDeleteError(null);
      await deleteAnnouncement(selectedAnnouncement.id).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedAnnouncement(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err?.data?.detail || 'Failed to delete announcement');
    }
  };

  const handleAddEmotion = async (emoji: string) => {
    if (!selectedAnnouncement) return;
    try {
      await addEmotion({ announcementId: selectedAnnouncement.id, emoji }).unwrap();
    } catch (err) {
      console.error('Failed to add emotion:', err);
    }
  };

  const handleAddComment = async (content: string, parentId?: number) => {
    if (!selectedAnnouncement) return;
    try {
      await addComment({ announcementId: selectedAnnouncement.id, content, parentId }).unwrap();
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const openEditModal = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setError(null);
    setIsEditModalOpen(true);
  };

  const openDetailModal = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setIsDetailModalOpen(true);
  };

  const openDeleteModal = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  const columns: Column<AnnouncementWithComplex>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'w-20',
    },
    {
      key: 'title',
      header: 'Title',
      render: (announcement) => (
        <div>
          <span className="font-medium text-gray-900">{announcement.title}</span>
          {announcement.img_path && (
            <span className="ml-2 text-gray-400">📷</span>
          )}
        </div>
      ),
    },
    {
      key: 'complex',
      header: 'Complex',
      render: (announcement) => (
        <span className="text-gray-600">{announcement.complex?.name || 'Unknown'}</span>
      ),
    },
    {
      key: 'comments',
      header: 'Comments',
      render: (announcement) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          announcement.comments_enabled
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {announcement.comments_enabled ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'created_date',
      header: 'Created',
      render: (announcement) => (
        <span className="text-gray-500">
          {new Date(announcement.created_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-48',
      render: (announcement) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDetailModal(announcement);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(announcement);
            }}
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(announcement);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  const isLoading = announcementsLoading || complexesLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Announcement Management</h2>
          <p className="text-gray-600 mt-1">
            Manage announcements across all complexes
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Announcement
        </Button>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search announcements..."
        filters={[
          {
            key: 'complex',
            label: 'All Complexes',
            value: complexFilter,
            onChange: (value) => {
              setComplexFilter(value);
              setCurrentPage(1);
            },
            options: complexes?.map((c) => ({ value: String(c.id), label: c.name })) || [],
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
            keyExtractor={(announcement) => announcement.id}
            emptyMessage="No announcements found"
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
        onClose={() => {
          setIsCreateModalOpen(false);
          setError(null);
        }}
        title="Create New Announcement"
        size="lg"
      >
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}
        {complexes ? (
          <AnnouncementForm
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

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAnnouncement(null);
          setError(null);
        }}
        title="Edit Announcement"
        size="lg"
      >
        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}
        {complexes && selectedAnnouncement ? (
          <AnnouncementForm
            complexes={complexes}
            initialData={selectedAnnouncement}
            onSubmit={handleEdit}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedAnnouncement(null);
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

      {/* Detail Modal */}
      <AnnouncementDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedAnnouncement(null);
        }}
        announcement={selectedAnnouncement}
        complex={selectedAnnouncement ? complexes?.find(c => c.id === selectedAnnouncement.complex_id) : undefined}
        emotions={emotions || []}
        comments={comments || []}
        isLoading={commentsLoading}
        onAddEmotion={handleAddEmotion}
        onAddComment={handleAddComment}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedAnnouncement(null);
          setDeleteError(null);
        }}
        title="Delete Announcement"
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <Alert variant="error" title="Error">
              {deleteError}
            </Alert>
          )}
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{selectedAnnouncement?.title}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedAnnouncement(null);
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

export default AnnouncementManagement;
