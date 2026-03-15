import React, { useCallback, useState } from 'react';
import { SafeAreaView, View, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useTranslation } from '../../locales';
import {
  useGetMyNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetNotificationPreferencesQuery,
  useUpdateNotificationPreferencesMutation,
} from '../../store/apiSlice';
import { Text } from '../../components/atoms/Text';
import { useAuth } from '../../hooks/useAuth';

const PAGE_SIZE = 20;

const NotificationsScreen = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { data: notifications = [], isLoading, refetch } = useGetMyNotificationsQuery(
    { skip: 0, limit: PAGE_SIZE, unreadOnly: showUnreadOnly },
    { skip: !isAuthenticated }
  );

  const { data: preferences } = useGetNotificationPreferencesQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [markAsRead] = useMarkNotificationReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsReadMutation();
  const [updatePreferences] = useUpdateNotificationPreferencesMutation();

  const handleMarkAsRead = useCallback(async (notificationId: number) => {
    try {
      await markAsRead(notificationId).unwrap();
      refetch();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [markAsRead, refetch]);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead().unwrap();
      refetch();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [markAllAsRead, refetch]);

  const handlePreferenceChange = useCallback(async (key: string, value: boolean | number) => {
    try {
      await updatePreferences({ [key]: value }).unwrap();
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }, [updatePreferences]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_reminder':
      case 'payment_created':
      case 'payment_updated':
        return '💳';
      case 'announcement':
        return '📢';
      case 'issue_update':
        return '⚠️';
      case 'visitor_update':
        return '👤';
      default:
        return '📬';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderNotification = (notification: any) => (
    <TouchableOpacity
      key={notification.id}
      style={[styles.notificationCard, !notification.is_read && styles.unreadCard]}
      onPress={() => !notification.is_read && handleMarkAsRead(notification.id)}
    >
      <View style={styles.notificationHeader}>
        <Text style={styles.notificationIcon}>{getNotificationIcon(notification.type)}</Text>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, !notification.is_read && styles.unreadTitle]}>
            {notification.title}
          </Text>
          {notification.message && (
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {notification.message}
            </Text>
          )}
          <Text style={styles.notificationDate}>
            {formatDate(notification.created_date)}
          </Text>
        </View>
        {!notification.is_read && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('notifications.title') || 'Notifications'}</Text>
        {notifications.some((n: any) => !n.is_read) && (
          <TouchableOpacity onPress={handleMarkAllAsRead}>
            <Text style={styles.markAllText}>{t('notifications.markAllRead') || 'Mark all read'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Preferences Section */}
      {preferences && (
        <View style={styles.preferencesSection}>
          <Text style={styles.preferencesTitle}>{t('notifications.preferences') || 'Preferences'}</Text>
          
          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>{t('notifications.pushEnabled') || 'Push Notifications'}</Text>
            <Switch
              value={preferences.push_notifications_enabled}
              onValueChange={(value) => handlePreferenceChange('push_notifications_enabled', value)}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={preferences.push_notifications_enabled ? '#3b82f6' : '#9ca3af'}
            />
          </View>

          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>{t('notifications.emailEnabled') || 'Email Notifications'}</Text>
            <Switch
              value={preferences.email_notifications_enabled}
              onValueChange={(value) => handlePreferenceChange('email_notifications_enabled', value)}
              trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
              thumbColor={preferences.email_notifications_enabled ? '#3b82f6' : '#9ca3af'}
            />
          </View>

          <View style={styles.preferenceRow}>
            <Text style={styles.preferenceLabel}>{t('notifications.reminderDays') || 'Payment Reminder Days'}</Text>
            <View style={styles.reminderDaysContainer}>
              {[1, 3, 7].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.reminderDayButton,
                    preferences.payment_reminder_days === days && styles.reminderDayButtonActive,
                  ]}
                  onPress={() => handlePreferenceChange('payment_reminder_days', days)}
                >
                  <Text
                    style={[
                      styles.reminderDayText,
                      preferences.payment_reminder_days === days && styles.reminderDayTextActive,
                    ]}
                  >
                    {days}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Filter Toggle */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !showUnreadOnly && styles.filterButtonActive]}
          onPress={() => setShowUnreadOnly(false)}
        >
          <Text style={[styles.filterText, !showUnreadOnly && styles.filterTextActive]}>
            {t('notifications.all') || 'All'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, showUnreadOnly && styles.filterButtonActive]}
          onPress={() => setShowUnreadOnly(true)}
        >
          <Text style={[styles.filterText, showUnreadOnly && styles.filterTextActive]}>
            {t('notifications.unread') || 'Unread'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>
            {showUnreadOnly
              ? t('notifications.noUnread') || 'No unread notifications'
              : t('notifications.noNotifications') || 'No notifications'}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {notifications.map(renderNotification)}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  markAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  preferencesSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  preferencesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  preferenceLabel: {
    fontSize: 14,
    color: '#374151',
  },
  reminderDaysContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderDayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderDayButtonActive: {
    backgroundColor: '#3b82f6',
  },
  reminderDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  reminderDayTextActive: {
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#3b82f6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  notificationCard: {
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
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
    marginTop: 6,
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
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default NotificationsScreen;
