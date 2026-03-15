import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { SafeAreaView, View, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Modal, Image } from 'react-native';
import { useTranslation } from '../../locales';
import { useGetMyUnitPaymentsQuery, useGenerateQrPaymentMutation } from '../../store/apiSlice';
import { Text } from '../../components/atoms/Text';
import { useAuth } from '../../hooks/useAuth';

const PAGE_SIZE = 20;

type PaymentCategory = 'unpaid' | 'past' | 'planned';

const PaymentsScreen = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState<PaymentCategory>('unpaid');
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrPayload, setQrPayload] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const { data: payments = [], isLoading, refetch } = useGetMyUnitPaymentsQuery(
    { skip: 0, limit: PAGE_SIZE },
    { skip: !isAuthenticated }
  );

  const [generateQrPayment, { isLoading: isGeneratingQr }] = useGenerateQrPaymentMutation();

  // Categorize payments
  const categorizedPayments = useMemo(() => {
    const now = new Date();
    const categories: Record<PaymentCategory, any[]> = {
      unpaid: [],
      past: [],
      planned: [],
    };

    payments.forEach((payment: any) => {
      const dueDate = payment.due_date ? new Date(payment.due_date) : null;
      const isPaid = payment.status === 'PAID';

      if (isPaid) {
        categories.past.push(payment);
      } else if (dueDate && dueDate < now) {
        // Unpaid and overdue
        categories.unpaid.push(payment);
      } else if (dueDate && dueDate > now) {
        // Planned (future due date)
        categories.planned.push(payment);
      } else {
        // No due date or pending
        categories.unpaid.push(payment);
      }
    });

    return categories;
  }, [payments]);

  const currentPayments = categorizedPayments[activeCategory];

  const handleQrPayment = useCallback(async (payment: any) => {
    try {
      setSelectedPayment(payment);
      const result = await generateQrPayment({ paymentRecordId: payment.id }).unwrap();
      setQrPayload(result.payload);
      setQrModalVisible(true);
    } catch (error) {
      console.error('Error generating QR payment:', error);
    }
  }, [generateQrPayment]);

  const closeQrModal = useCallback(() => {
    setQrModalVisible(false);
    setQrPayload(null);
    setSelectedPayment(null);
  }, []);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return { bg: '#d1fae5', text: '#065f46' };
      case 'PENDING':
        return { bg: '#fef3c7', text: '#92400e' };
      case 'OVERDUE':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  // Render category tab
  const renderTab = (category: PaymentCategory, label: string, count: number) => (
    <TouchableOpacity
      key={category}
      style={[styles.tab, activeCategory === category && styles.activeTab]}
      onPress={() => setActiveCategory(category)}
    >
      <Text style={[styles.tabText, activeCategory === category && styles.activeTabText]}>
        {label}
      </Text>
      <View style={[styles.tabBadge, activeCategory === category && styles.activeTabBadge]}>
        <Text style={[styles.tabBadgeText, activeCategory === category && styles.activeTabBadgeText]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Render payment card
  const renderPaymentCard = (payment: any) => {
    const colors = getStatusColor(payment.status);
    const isUnpaid = payment.status !== 'PAID';

    return (
      <View key={payment.id} style={styles.paymentCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.paymentTitle}>{payment.payment_title || 'Payment'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.statusText, { color: colors.text }]}>
              {payment.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('payments.amount') || 'Amount'}:</Text>
            <Text style={styles.amountValue}>{formatCurrency(payment.amount)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('payments.dueDate') || 'Due Date'}:</Text>
            <Text style={styles.value}>{formatDate(payment.due_date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>{t('common.unit') || 'Unit'}:</Text>
            <Text style={styles.value}>{payment.unit_number}</Text>
          </View>
        </View>

        {isUnpaid && (
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => handleQrPayment(payment)}
            disabled={isGeneratingQr}
          >
            <Text style={styles.payButtonIcon}>📱</Text>
            <Text style={styles.payButtonText}>
              {t('payments.payWithQr') || 'Pay with QR'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('payments.title') || 'My Payments'}</Text>
        <Text style={styles.subtitle}>{t('payments.subtitle') || 'Track your dues and payments'}</Text>
      </View>

      {/* Category Tabs */}
      <View style={styles.tabsContainer}>
        {renderTab('unpaid', t('payments.unpaid') || 'Unpaid', categorizedPayments.unpaid.length)}
        {renderTab('planned', t('payments.planned') || 'Planned', categorizedPayments.planned.length)}
        {renderTab('past', t('payments.past') || 'Past', categorizedPayments.past.length)}
      </View>

      {/* Payment List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : currentPayments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {t('payments.noPayments') || 'No payments found'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {currentPayments.map(renderPaymentCard)}
        </ScrollView>
      )}

      {/* QR Payment Modal */}
      <Modal
        visible={qrModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeQrModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t('payments.qrPayment') || 'QR Payment'}
              </Text>
              <TouchableOpacity onPress={closeQrModal}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            {qrPayload && (
              <View style={styles.qrContainer}>
                <Text style={styles.qrAmount}>
                  {formatCurrency(qrPayload.amount)}
                </Text>
                <Text style={styles.qrDescription}>
                  {qrPayload.description}
                </Text>
                
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrPlaceholderIcon}>📱</Text>
                  <Text style={styles.qrPlaceholderText}>
                    {t('payments.scanQr') || 'Scan to pay'}
                  </Text>
                </View>

                <View style={styles.qrDetails}>
                  <Text style={styles.qrDetailLabel}>
                    {t('payments.qrCodeId') || 'QR Code ID'}:
                  </Text>
                  <Text style={styles.qrDetailValue}>{qrPayload.qr_code_id}</Text>
                  
                  <Text style={styles.qrDetailLabel}>
                    {t('payments.expiresAt') || 'Expires'}:
                  </Text>
                  <Text style={styles.qrDetailValue}>
                    {formatDate(qrPayload.expires_at)}
                  </Text>
                </View>

                <TouchableOpacity style={styles.mockPayButton} onPress={closeQrModal}>
                  <Text style={styles.mockPayButtonText}>
                    {t('payments.mockComplete') || 'Mock Complete Payment'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#eff6ff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginRight: 6,
  },
  activeTabText: {
    color: '#3b82f6',
  },
  tabBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeTabBadge: {
    backgroundColor: '#3b82f6',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabBadgeText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    width: 80,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
  },
  payButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  qrDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  qrPlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  qrPlaceholderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  qrPlaceholderText: {
    fontSize: 14,
    color: '#6b7280',
  },
  qrDetails: {
    width: '100%',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  qrDetailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  qrDetailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  mockPayButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
  },
  mockPayButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default PaymentsScreen;
