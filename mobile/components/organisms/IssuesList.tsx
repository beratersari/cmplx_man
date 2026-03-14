import React from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '../atoms/Text';
import { useTranslation } from '../../locales';

interface IssuesListProps {
  issues: any[];
  loading: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  hasMore: boolean;
}

export const IssuesList = ({
  issues,
  loading,
  onLoadMore,
  onRefresh,
  refreshing,
  hasMore,
}: IssuesListProps) => {
  const { t } = useTranslation();

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.meta}>{t('issues.issueTitle')} #{item.id}</Text>
        <Text style={styles.meta}>{item.status}</Text>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  };

  return (
    <FlatList
      data={issues}
      renderItem={renderItem}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.listContent}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.6}
      onRefresh={onRefresh}
      refreshing={refreshing}
      ListEmptyComponent={!loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{t('issues.noIssuesFound')}</Text>
        </View>
      ) : null}
      ListFooterComponent={renderFooter}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  card: {
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
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 10,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  meta: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default IssuesList;
