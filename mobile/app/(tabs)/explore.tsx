import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { useTranslation } from '../../locales';
import { useGetIssuesQuery } from '../../store/apiSlice';
import { IssuesList } from '../../components/organisms/IssuesList';
import { Text } from '../../components/atoms/Text';

const PAGE_SIZE = 20;

const IssuesScreen = () => {
  const { t } = useTranslation();
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { data: issues = [], isFetching, refetch } = useGetIssuesQuery({ skip, limit: PAGE_SIZE });

  useEffect(() => {
    if (issues.length < skip + PAGE_SIZE) {
      setHasMore(false);
    }
  }, [issues, skip]);

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore) {
      setSkip(prev => prev + PAGE_SIZE);
    }
  }, [isFetching, hasMore]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setSkip(0);
    setHasMore(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('navigation.issues')}</Text>
        <Text style={styles.subtitle}>{t('issues.subtitle')}</Text>
      </View>

      <IssuesList
        issues={issues}
        loading={isFetching && issues.length > 0}
        onLoadMore={handleLoadMore}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        hasMore={hasMore}
      />
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
});

export default IssuesScreen;

