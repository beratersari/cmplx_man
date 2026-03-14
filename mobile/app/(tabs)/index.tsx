import React, { useState, useCallback } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '../../locales';
import { Text } from '../../components/atoms/Text';
import { useGetAnnouncementsQuery, useGetCurrentUserQuery } from '../../store/apiSlice';
import { useAuth } from '../../hooks/useAuth';

const ANNOUNCEMENTS_LIMIT = 4;

const HomeScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const { data: user } = useGetCurrentUserQuery(undefined, { skip: !isAuthenticated });
  const { data: announcements = [], isFetching, refetch } = useGetAnnouncementsQuery(
    { skip, limit: ANNOUNCEMENTS_LIMIT },
    { skip: !isAuthenticated }
  );

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      if (announcements.length < ANNOUNCEMENTS_LIMIT) {
        setHasMore(false);
      } else {
        setSkip(prev => prev + ANNOUNCEMENTS_LIMIT);
      }
    }
  }, [isFetching, hasMore, announcements.length]);

  const handleRefresh = useCallback(() => {
    setSkip(0);
    setHasMore(true);
    refetch();
  }, [refetch]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Info Section */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('dashboard.title')}</Text>
          {user && (
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>
                {t('dashboard.welcome')}, {user.first_name || user.username}
              </Text>
              {user.email && (
                <Text style={styles.userDetail}>{user.email}</Text>
              )}
              {user.complex_name && (
                <Text style={styles.userDetail}>{user.complex_name}</Text>
              )}
            </View>
          )}
        </View>

        {/* Announcements Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.recentAnnouncements')}</Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Text style={styles.refreshText}>{t('common.refresh')}</Text>
            </TouchableOpacity>
          </View>

          {announcements.length === 0 && !isFetching ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t('announcements.noAnnouncementsFound')}</Text>
            </View>
          ) : (
            announcements.map((announcement: any) => (
              <TouchableOpacity
                key={announcement.id}
                style={styles.announcementCard}
                onPress={() => router.push(`/(tabs)/announcements/${announcement.id}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.announcementTitle}>{announcement.title}</Text>
                <Text style={styles.announcementDate}>
                  {announcement.created_at
                    ? new Date(announcement.created_at).toLocaleDateString()
                    : ''}
                </Text>
                <Text style={styles.announcementContent} numberOfLines={2}>
                  {announcement.content?.replace(/<[^>]+>/g, '') || ''}
                </Text>
              </TouchableOpacity>
            ))
          )}

          {isFetching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3b82f6" />
            </View>
          )}

          {hasMore && announcements.length > 0 && !isFetching && (
            <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
              <Text style={styles.loadMoreText}>{t('common.loadMore')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
          <View style={styles.card}>
            <Text style={styles.cardText}>{t('dashboard.pendingIssues')}</Text>
            <Text style={styles.cardText}>{t('dashboard.upcomingReservations')}</Text>
            <Text style={styles.cardText}>{t('dashboard.recentAnnouncements')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  userInfo: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  refreshText: {
    fontSize: 14,
    color: '#3b82f6',
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  announcementDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 6,
  },
  announcementContent: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
});

export default HomeScreen;

