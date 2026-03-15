import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { SafeAreaView, View, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useTranslation } from '../../locales';
import { useGetReservationsQuery, useGetCurrentUserQuery } from '../../store/apiSlice';
import { Text } from '../../components/atoms/Text';
import { useAuth } from '../../hooks/useAuth';

// Contact info for support when user doesn't have a complex assigned
const SUPPORT_CONTACT = {
  name: 'Management Office',
  phone: '+1-555-123-4567',
};

const PAGE_SIZE = 20;

// Checker function to validate if user can access reservations
const canAccessReservations = (user: any): { canAccess: boolean; error?: string } => {
  if (!user) {
    return { canAccess: false, error: 'userNotLoaded' };
  }
  
  // Check if user has a complex assigned
  // User can be assigned via assigned_complexes array or complex_id
  // Handle both array and potentially undefined/null cases safely
  const assignedComplexes = user.assigned_complexes;
  const hasComplex = 
    (assignedComplexes && Array.isArray(assignedComplexes) && assignedComplexes.length > 0) ||
    (user.complex_id !== undefined && user.complex_id !== null) ||
    (user.complex_name !== undefined && user.complex_name !== null);
  
  if (!hasComplex) {
    return { canAccess: false, error: 'noComplexAssigned' };
  }
  
  // Admins, managers, and attendants can access all reservations
  // Residents can access but will see blurred names for other complexes
  return { canAccess: true };
};

// Get user's complex ID(s)
const getUserComplexIds = (user: any): number[] => {
  if (!user) return [];
  
  if (user.assigned_complexes && user.assigned_complexes.length > 0) {
    return user.assigned_complexes.map((c: any) => c.id);
  }
  
  if (user.complex_id) {
    return [user.complex_id];
  }
  
  return [];
};

const ReservationsScreen = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkerError, setCheckerError] = useState<string | null>(null);

  const { data: user, isLoading: userLoading, refetch: refetchUser } = useGetCurrentUserQuery(undefined, { skip: !isAuthenticated });
  
  // Run checker synchronously before API call
  const accessCheck = useMemo(() => {
    if (!user) return { canAccess: false, error: undefined };
    return canAccessReservations(user);
  }, [user]);
  
  // Set checker error state
  useEffect(() => {
    if (accessCheck.error && !checkerError) {
      setCheckerError(accessCheck.error);
    } else if (!accessCheck.error && checkerError) {
      setCheckerError(null);
    }
  }, [accessCheck.error, checkerError]);
  
  // Only fetch reservations if user is authenticated, user data is loaded, and checker passes
  const shouldFetchReservations = isAuthenticated && user && accessCheck.canAccess;
  
  const { data: reservations = [], isFetching, refetch: refetchReservations, error: apiError } = useGetReservationsQuery(
    { skip, limit: PAGE_SIZE },
    { skip: !shouldFetchReservations }
  );

  useEffect(() => {
    if (reservations.length < skip + PAGE_SIZE) {
      setHasMore(false);
    }
  }, [reservations, skip]);

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setSkip(prev => prev + PAGE_SIZE);
    }
  }, [isFetching, hasMore]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setSkip(0);
    setHasMore(true);
    if (shouldFetchReservations) {
      await refetchReservations();
    } else {
      await refetchUser();
    }
    setRefreshing(false);
  }, [refetchReservations, refetchUser, shouldFetchReservations]);

  // Get user's complex IDs for comparison
  const userComplexIds = useMemo(() => getUserComplexIds(user), [user]);

  // Check if a reservation is in user's own complex
  const isOwnComplex = useCallback((reservation: any) => {
    return userComplexIds.includes(reservation.complex_id);
  }, [userComplexIds]);

  // Blur username for reservations not in user's complex
  const getDisplayUsername = useCallback((reservation: any) => {
    if (isOwnComplex(reservation)) {
      // Try to get username from reservation if available, otherwise use user_id
      return reservation.username || reservation.user?.username || `User ${reservation.user_id}`;
    }
    // Blur the username for other complexes
    return '••••••••';
  }, [isOwnComplex]);

  // Render status badge
  const renderStatus = (status: string) => {
    const statusColors: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: '#fef3c7', text: '#92400e' },
      ACCEPTED: { bg: '#d1fae5', text: '#065f46' },
      REJECTED: { bg: '#fee2e2', text: '#991b1b' },
    };
    const colors = statusColors[status] || { bg: '#f3f4f6', text: '#374151' };
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
        <Text style={[styles.statusText, { color: colors.text }]}>
          {t(`reservations.status.${status}`) || status}
        </Text>
      </View>
    );
  };

  // Render loading state
  if (userLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle calling support contact
  const handleCallSupport = useCallback(async () => {
    const phoneUrl = `tel:${SUPPORT_CONTACT.phone}`;
    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        await Linking.openURL(phoneUrl);
      }
    } catch (err) {
      console.error('Error opening phone dialer:', err);
    }
  }, []);

  // Render checker error (before service call)
  if (checkerError) {
    const isNoComplex = checkerError === 'noComplexAssigned';
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('navigation.reservations')}</Text>
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>⚠️</Text>
          </View>
          <Text style={styles.errorTitle}>{t('common.error')}</Text>
          <Text style={styles.errorMessage}>
            {isNoComplex
              ? (t('reservations.errors.noComplexAssigned') || 'You are not assigned to any complex. Please contact an administrator.')
              : (t('reservations.errors.accessDenied') || 'You do not have permission to view reservations.')}
          </Text>
          
          {isNoComplex && (
            <View style={styles.contactContainer}>
              <Text style={styles.contactLabel}>{t('reservations.contact.title') || 'Contact Support:'}</Text>
              <Text style={styles.contactName}>{SUPPORT_CONTACT.name}</Text>
              <TouchableOpacity style={styles.callButton} onPress={handleCallSupport}>
                <Text style={styles.callButtonIcon}>📞</Text>
                <Text style={styles.callButtonText}>{SUPPORT_CONTACT.phone}</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              // Re-fetch user data to check if complex was assigned
              refetchUser();
            }}
          >
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render API error
  if (apiError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('navigation.reservations')}</Text>
        </View>
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Text style={styles.errorIconText}>❌</Text>
          </View>
          <Text style={styles.errorTitle}>{t('common.error')}</Text>
          <Text style={styles.errorMessage}>
            {t('errors.network') || 'An error occurred while loading reservations.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('navigation.reservations')}</Text>
        <Text style={styles.subtitle}>{t('reservations.subtitle')}</Text>
      </View>

      {reservations.length === 0 && !isFetching ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('reservations.noReservationsFound')}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
            if (isCloseToBottom && hasMore && !isFetching) {
              handleLoadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          {reservations.map((reservation: any) => (
            <View key={reservation.id} style={styles.reservationCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.reservationTitle}>
                  {reservation.category?.name || `Category ${reservation.category_id}`}
                </Text>
                {renderStatus(reservation.status)}
              </View>
              
              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>{t('reservations.form.user') || 'User'}:</Text>
                  <Text style={[styles.value, !isOwnComplex(reservation) && styles.blurredText]}>
                    {getDisplayUsername(reservation)}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.label}>{t('reservations.dateTime')}:</Text>
                  <Text style={styles.value}>
                    {reservation.reservation_date
                      ? new Date(reservation.reservation_date).toLocaleDateString()
                      : ''} {reservation.start_hour} - {reservation.end_hour}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Text style={styles.label}>{t('reservations.people')}:</Text>
                  <Text style={styles.value}>{reservation.person_count}</Text>
                </View>
                
                {reservation.notes && (
                  <View style={styles.infoRow}>
                    <Text style={styles.label}>{t('reservations.form.notes')}:</Text>
                    <Text style={styles.value} numberOfLines={2}>{reservation.notes}</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.cardFooter}>
                <Text style={styles.complexText}>
                  {reservation.complex?.name || `Complex ${reservation.complex_id}`}
                </Text>
              </View>
            </View>
          ))}
          
          {isFetching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          )}
          
          {hasMore && reservations.length > 0 && !isFetching && (
            <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
              <Text style={styles.loadMoreText}>{t('common.loadMore')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  reservationCard: {
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
  reservationTitle: {
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
    width: 100,
  },
  value: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  blurredText: {
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
  },
  complexText: {
    fontSize: 12,
    color: '#9ca3af',
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
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  loadMoreButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorIconText: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  contactContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  contactLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  callButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ReservationsScreen;
