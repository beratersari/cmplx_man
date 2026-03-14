'use client';

import { useState, useMemo } from 'react';
import { Button, Modal, Pagination, Spinner, Alert, Skeleton } from '../atoms';
import { Table, SearchFilter } from '../molecules';
import { Column } from '../molecules/Table';
import PaymentForm from './PaymentForm';
import {
  useAdminListPaymentsQuery,
  useGetComplexesQuery,
  useAdminCreatePaymentForAllMutation,
  useAdminCreatePaymentForSpecificMutation,
  useUpdatePaymentRecordStatusMutation,
  useDeletePaymentMutation,
} from '../../store/apiSlice';
import { Payment, Complex, PaymentRecord, PaymentStatus } from '../../types';
import { useTranslation } from '../../locales';

const PaymentManagement: React.FC = () => {
  const { t } = useTranslation();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [complexFilter, setComplexFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // API hooks
  const { data: complexes, isLoading: complexesLoading } = useGetComplexesQuery({});
  const { 
    data: payments, 
    isLoading: paymentsLoading, 
    refetch, 
    isFetching,
    error: paymentsError 
  } = useAdminListPaymentsQuery({
    complexId: complexFilter ? Number(complexFilter) : undefined,
  }, {
    // Force refetch when component mounts or filters change
    refetchOnMountOrArgChange: true,
  });
  const [createForAll, { isLoading: isCreatingAll }] = useAdminCreatePaymentForAllMutation();
  const [createForSpecific, { isLoading: isCreatingSpecific }] = useAdminCreatePaymentForSpecificMutation();
  const [updateRecordStatus, { isLoading: isUpdatingRecord }] = useUpdatePaymentRecordStatusMutation();
  const [deletePayment, { isLoading: isDeleting }] = useDeletePaymentMutation();

  // Get selected complex name
  const selectedComplex = useMemo(() => {
    return complexes?.find(c => c.id.toString() === complexFilter);
  }, [complexes, complexFilter]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!payments) return [];
    return payments.filter((payment) => {
      const matchesSearch = payment.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [payments, searchTerm]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Handlers
  const handleCreate = async ({ payload, targetType }: { payload: any, targetType: 'ALL' | 'SPECIFIC' }) => {
    if (targetType === 'ALL') {
      await createForAll(payload).unwrap();
    } else {
      await createForSpecific(payload).unwrap();
    }
    setIsCreateModalOpen(false);
    refetch();
  };

  const handleRecordStatusUpdate = async (paymentId: number, recordId: number, newStatus: PaymentStatus) => {
    // 1. Optimistic Update: Update local state immediately
    let previousPayment: Payment | null = null;
    if (selectedPayment && selectedPayment.id === paymentId) {
      previousPayment = { ...selectedPayment };
      const updatedRecords = selectedPayment.records.map(r => 
        r.id === recordId ? { ...r, status: newStatus, paid_date: newStatus === 'PAID' ? new Date().toISOString() : r.paid_date } : r
      );
      setSelectedPayment({ ...selectedPayment, records: updatedRecords });
    }

    try {
      // 2. Perform the actual API request
      await updateRecordStatus({ paymentId, recordId, data: { status: newStatus } }).unwrap();
      refetch();
    } catch (err: any) {
      // 3. Revert on failure
      if (previousPayment) {
        setSelectedPayment(previousPayment);
      }
      console.error('Failed to update record status:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedPayment) return;
    try {
      setDeleteError(null);
      await deletePayment(selectedPayment.id).unwrap();
      setIsDeleteModalOpen(false);
      setSelectedPayment(null);
      refetch();
    } catch (err: any) {
      setDeleteError(err?.data?.detail || 'Failed to delete payment');
    }
  };

  const openDetailModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailModalOpen(true);
  };

  const openDeleteModal = (payment: Payment) => {
    setSelectedPayment(payment);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  // Status colors
  const recordStatusColors: Record<PaymentStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };

  // Table columns
  const columns: Column<Payment>[] = [
    {
      key: 'id',
      header: 'ID',
      className: 'w-16',
    },
    {
      key: 'title',
      header: t('payments.paymentTitle'),
      render: (payment) => (
        <div>
          <span className="font-medium text-gray-900 block">{payment.title}</span>
          <span className="text-xs text-gray-500">
            {payment.target_type === 'ALL' ? t('payments.allUnits') : t('payments.specificUnits')}
          </span>
        </div>
      ),
    },
    {
      key: 'amount',
      header: t('payments.amount'),
      render: (payment) => {
        // Show error if the silent call (refetch) fails
        if (paymentsError) {
          return <span className="text-red-500 text-xs font-medium">{t('common.error')}</span>;
        }
        // Show skeleton when fetching (switching back to page)
        if (isFetching) {
          return <Skeleton width="80px" height="20px" />;
        }
        return <span className="text-gray-900 font-medium">{formatPrice(payment.amount)}</span>;
      },
    },
    {
      key: 'complex',
      header: t('payments.complex'),
      render: (payment) => {
        const complex = complexes?.find(c => c.id === payment.complex_id);
        return (
          <span className="text-gray-600">{complex?.name || `${t('common.complex') || 'Complex'} ${payment.complex_id}`}</span>
        );
      },
    },
    {
      key: 'due_date',
      header: t('payments.dueDate'),
      render: (payment) => (
        <span className="text-gray-500">{formatDate(payment.due_date)}</span>
      ),
    },
    {
      key: 'stats',
      header: t('payments.records'),
      render: (payment) => {
        const total = payment.records?.length || 0;
        const paid = payment.records?.filter(r => r.status === 'PAID').length || 0;
        return (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-700">{paid} / {total} {t('payments.paid')}</span>
            <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
              <div 
                className="h-full bg-green-500" 
                style={{ width: `${total > 0 ? (paid / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: t('common.actions'),
      className: 'w-32',
      render: (payment) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDetailModal(payment);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {t('common.view')}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal(payment);
            }}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            {t('common.delete')}
          </button>
        </div>
      ),
    },
  ];

  const isLoading = paymentsLoading || complexesLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('payments.title')}</h2>
          <p className="text-gray-600 mt-1">
            {t('payments.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('payments.issueNewPayment')}
        </Button>
      </div>

      {/* Search and Filters */}
      <SearchFilter
        searchValue={searchTerm}
        onSearchChange={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        searchPlaceholder={t('payments.searchPlaceholder')}
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
        ]}
      />

      {/* Active Filters Display */}
      {complexFilter && selectedComplex && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">{t('common.activeFilter')}:</span>
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
            {t('payments.complex')}: {selectedComplex.name}
          </span>
          <button
            onClick={() => setComplexFilter('')}
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
            keyExtractor={(payment) => payment.id}
            emptyMessage={t('payments.noPaymentsFound')}
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
        title={t('payments.form.title')}
        size="md"
      >
        <PaymentForm
          complexes={complexes || []}
          onSubmit={handleCreate}
          onCancel={() => setIsCreateModalOpen(false)}
          isLoading={isCreatingAll || isCreatingSpecific}
        />
      </Modal>

      {/* Detail Modal - Records Management */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedPayment(null);
        }}
        title={`${t('payments.managePayment')}: ${selectedPayment?.title}`}
        size="lg"
      >
        {selectedPayment && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">{t('payments.amount')}</span>
                {paymentsError ? (
                  <p className="text-sm font-medium text-red-500 mt-1">{t('common.error')}</p>
                ) : isFetching ? (
                  <Skeleton width="100px" height="28px" className="mt-1" />
                ) : (
                  <p className="text-lg font-bold text-gray-900">{formatPrice(selectedPayment.amount)}</p>
                )}
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">{t('payments.dueDate')}</span>
                <p className="text-sm font-medium text-gray-900">{formatDate(selectedPayment.due_date)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">{t('payments.target')}</span>
                <p className="text-sm font-medium text-gray-900">
                  {selectedPayment.target_type === 'ALL' ? t('payments.allUnits') : t('payments.specificUnits')}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 uppercase font-semibold">{t('common.status')}</span>
                <p className="text-sm font-medium text-gray-900">
                  {selectedPayment.is_active ? t('payments.active') : t('payments.inactive')}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-md font-semibold text-gray-900 mb-3">{t('payments.unitRecords')}</h3>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('payments.unit')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.status')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('payments.paidDate')}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedPayment.records.map((record) => (
                      <tr key={record.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{record.unit_number}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${recordStatusColors[record.status]}`}>
                            {t(`payments.status.${record.status}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(record.paid_date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <select
                            value={record.status}
                            onChange={(e) => handleRecordStatusUpdate(selectedPayment.id, record.id, e.target.value as PaymentStatus)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            disabled={isUpdatingRecord}
                          >
                            <option value="PENDING">{t('payments.status.PENDING')}</option>
                            <option value="PAID">{t('payments.status.PAID')}</option>
                            <option value="OVERDUE">{t('payments.status.OVERDUE')}</option>
                            <option value="CANCELLED">{t('payments.status.CANCELLED')}</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {selectedPayment.records.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500 italic">{t('payments.noRecordsFound')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedPayment(null);
                }}
              >
                {t('common.close')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedPayment(null);
          setDeleteError(null);
        }}
        title={t('payments.deletePayment')}
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <Alert variant="error" title={t('common.error')}>
              {deleteError}
            </Alert>
          )}
          <p className="text-gray-600">
            {t('payments.deleteConfirmMessage')} <strong>{selectedPayment?.title}</strong>?
            {t('payments.deleteConfirmNote')}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedPayment(null);
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

export default PaymentManagement;
