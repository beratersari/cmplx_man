import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from '../../locales';
import { useRouter } from 'expo-router';
import { useGetIssuesQuery, useGetIssueCategoriesQuery, useGetComplexesQuery, useGetIssueHeatmapQuery } from '../../store/apiSlice';
import { IssuesList } from '../../components/organisms/IssuesList';
import { Text } from '../../components/atoms/Text';
import { Input } from '../../components/atoms/Input';

const PAGE_SIZE = 20;

const IssuesScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedComplexId, setSelectedComplexId] = useState<number | undefined>(undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [selectedPriority, setSelectedPriority] = useState<string | undefined>(undefined);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [complexSearch, setComplexSearch] = useState('');

  const { data: complexes = [] } = useGetComplexesQuery({});
  const { data: categories = [] } = useGetIssueCategoriesQuery({ complexId: selectedComplexId });
  const { data: heatmapPoints = [] } = useGetIssueHeatmapQuery({
    complexId: selectedComplexId,
    categoryId: selectedCategoryId,
    priority: selectedPriority,
  });

  const { data: issues = [], isFetching, refetch } = useGetIssuesQuery({
    skip,
    limit: PAGE_SIZE,
    complexId: selectedComplexId,
    categoryId: selectedCategoryId,
    priority: selectedPriority,
  });

  const filteredComplexes = useMemo(() => {
    const search = complexSearch.toLowerCase();
    return complexes.filter((complex: any) => complex.name.toLowerCase().includes(search));
  }, [complexes, complexSearch]);

  const priorityOptions = useMemo(() => ([
    { value: 'LOW', label: t('issues.priority.low') },
    { value: 'MEDIUM', label: t('issues.priority.medium') },
    { value: 'HIGH', label: t('issues.priority.high') },
    { value: 'URGENT', label: t('issues.priority.urgent') },
  ]), [t]);

  const heatmapMatrix = useMemo(() => {
    const matrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    heatmapPoints.forEach((point: any) => {
      if (point.day >= 0 && point.day < 7 && point.hour >= 0 && point.hour < 24) {
        matrix[point.day][point.hour] = point.count;
      }
    });
    return matrix;
  }, [heatmapPoints]);

  const maxHeatmapValue = useMemo(() => {
    return heatmapMatrix.flat().reduce((max, value) => (value > max ? value : max), 0);
  }, [heatmapMatrix]);

  const handleSelectComplex = (complexId?: number) => {
    setSelectedComplexId(complexId);
    setSelectedCategoryId(undefined);
    setSkip(0);
    setHasMore(true);
    setFilterOpen(false);
  };

  const handleSelectCategory = (categoryId?: number) => {
    setSelectedCategoryId(categoryId);
    setSkip(0);
    setHasMore(true);
  };

  const handleSelectPriority = (priority?: string) => {
    setSelectedPriority(priority);
    setSkip(0);
    setHasMore(true);
  };

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

  const getHeatColor = (value: number) => {
    if (maxHeatmapValue === 0) return '#f3f4f6';
    const intensity = Math.min(value / maxHeatmapValue, 1);
    if (intensity === 0) return '#f3f4f6';
    if (intensity < 0.34) return '#bfdbfe';
    if (intensity < 0.67) return '#60a5fa';
    return '#1d4ed8';
  };

  const dayLabels = useMemo(() => ([
    t('common.sunday') || 'Sun',
    t('common.monday') || 'Mon',
    t('common.tuesday') || 'Tue',
    t('common.wednesday') || 'Wed',
    t('common.thursday') || 'Thu',
    t('common.friday') || 'Fri',
    t('common.saturday') || 'Sat',
  ]), [t]);

  const selectedComplexName = selectedComplexId
    ? complexes.find((complex: any) => complex.id === selectedComplexId)?.name
    : t('issues.filters.allComplexes') || 'All complexes';
  const selectedCategoryName = selectedCategoryId
    ? categories.find((cat: any) => cat.id === selectedCategoryId)?.name
    : t('issues.filters.allCategories') || 'All categories';
  const selectedPriorityLabel = selectedPriority
    ? priorityOptions.find((option) => option.value === selectedPriority)?.label
    : t('issues.filters.allPriorities') || 'All priorities';

  const handleSelectIssue = useCallback((issueId: number) => {
    router.push(`/issues/${issueId}`);
  }, [router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{t('navigation.issues')}</Text>
          <Text style={styles.subtitle}>{t('issues.subtitle')}</Text>
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterOpen(!isFilterOpen)}>
          <Text style={styles.filterButtonText}>{t('common.filter')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t('issues.heatmapTitle') || 'Maintenance activity heatmap'}</Text>
          <Text style={styles.summarySubtitle}>{t('issues.heatmapSubtitle') || 'Issue volume by day and hour'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.heatmapScroll}>
            <View>
              <View style={styles.heatmapRowHeader}>
                <Text style={styles.heatmapCorner}>
                  {t('issues.heatmapHours') || 'Hours'}
                </Text>
                {Array.from({ length: 24 }, (_, hour) => (
                  <Text key={hour} style={styles.heatmapHeaderText}>{hour}</Text>
                ))}
              </View>
              {heatmapMatrix.map((row, dayIndex) => (
                <View key={dayIndex} style={styles.heatmapRow}>
                  <Text style={styles.heatmapDayLabel}>{dayLabels[dayIndex]}</Text>
                  {row.map((value, hourIndex) => (
                    <View
                      key={`${dayIndex}-${hourIndex}`}
                      style={[styles.heatmapCell, { backgroundColor: getHeatColor(value) }]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.legendRow}>
            <Text style={styles.legendText}>{t('issues.heatmapLow') || 'Low'}</Text>
            <View style={styles.legendGradient}>
              {['#f3f4f6', '#bfdbfe', '#60a5fa', '#1d4ed8'].map(color => (
                <View key={color} style={[styles.legendSwatch, { backgroundColor: color }]} />
              ))}
            </View>
            <Text style={styles.legendText}>{t('issues.heatmapHigh') || 'High'}</Text>
          </View>
        </View>

        {isFilterOpen && (
          <View style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>{t('issues.filters.title') || 'Filters'}</Text>
              <TouchableOpacity onPress={() => setFilterOpen(false)}>
                <Text style={styles.filterClose}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>{t('issues.filters.complex') || 'Complex'}</Text>
              <Input
                value={complexSearch}
                onChangeText={setComplexSearch}
                placeholder={t('issues.filters.searchComplex') || 'Search complexes'}
              />
              <ScrollView style={styles.optionList}>
                <TouchableOpacity
                  style={[styles.optionItem, !selectedComplexId && styles.optionItemActive]}
                  onPress={() => handleSelectComplex(undefined)}
                >
                  <Text style={[styles.optionText, !selectedComplexId && styles.optionTextActive]}>
                    {t('issues.filters.allComplexes') || 'All complexes'}
                  </Text>
                </TouchableOpacity>
                {filteredComplexes.map((complex: any) => (
                  <TouchableOpacity
                    key={complex.id}
                    style={[styles.optionItem, selectedComplexId === complex.id && styles.optionItemActive]}
                    onPress={() => handleSelectComplex(complex.id)}
                  >
                    <Text style={[styles.optionText, selectedComplexId === complex.id && styles.optionTextActive]}>
                      {complex.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>{t('issues.filters.category') || 'Category'}</Text>
              <ScrollView style={styles.optionList}>
                <TouchableOpacity
                  style={[styles.optionItem, !selectedCategoryId && styles.optionItemActive]}
                  onPress={() => handleSelectCategory(undefined)}
                >
                  <Text style={[styles.optionText, !selectedCategoryId && styles.optionTextActive]}>
                    {t('issues.filters.allCategories') || 'All categories'}
                  </Text>
                </TouchableOpacity>
                {categories.map((category: any) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.optionItem, selectedCategoryId === category.id && styles.optionItemActive]}
                    onPress={() => handleSelectCategory(category.id)}
                  >
                    <Text style={[styles.optionText, selectedCategoryId === category.id && styles.optionTextActive]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>{t('issues.filters.priority') || 'Priority'}</Text>
              <ScrollView style={styles.optionList}>
                <TouchableOpacity
                  style={[styles.optionItem, !selectedPriority && styles.optionItemActive]}
                  onPress={() => handleSelectPriority(undefined)}
                >
                  <Text style={[styles.optionText, !selectedPriority && styles.optionTextActive]}>
                    {t('issues.filters.allPriorities') || 'All priorities'}
                  </Text>
                </TouchableOpacity>
                {priorityOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionItem, selectedPriority === option.value && styles.optionItemActive]}
                    onPress={() => handleSelectPriority(option.value)}
                  >
                    <Text style={[styles.optionText, selectedPriority === option.value && styles.optionTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        <View style={styles.filterSummary}>
          <Text style={styles.filterSummaryText}>
            {selectedComplexName} · {selectedCategoryName} · {selectedPriorityLabel}
          </Text>
        </View>

        <View style={styles.listContainer}>
          <IssuesList
            issues={issues}
            loading={isFetching && issues.length > 0}
            onLoadMore={handleLoadMore}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            hasMore={hasMore}
            onSelectIssue={handleSelectIssue}
          />
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  summarySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  heatmapScroll: {
    marginTop: 12,
  },
  heatmapRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  heatmapCorner: {
    width: 60,
    fontSize: 11,
    color: '#6b7280',
  },
  heatmapHeaderText: {
    width: 18,
    textAlign: 'center',
    fontSize: 10,
    color: '#9ca3af',
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heatmapDayLabel: {
    width: 60,
    fontSize: 11,
    color: '#6b7280',
  },
  heatmapCell: {
    width: 18,
    height: 18,
    marginHorizontal: 1,
    borderRadius: 4,
  },
  legendRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legendText: {
    fontSize: 11,
    color: '#6b7280',
  },
  legendGradient: {
    flexDirection: 'row',
    gap: 4,
  },
  legendSwatch: {
    width: 16,
    height: 6,
    borderRadius: 3,
  },
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  filterClose: {
    fontSize: 13,
    color: '#3b82f6',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  optionList: {
    maxHeight: 160,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  optionItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionItemActive: {
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 13,
    color: '#374151',
  },
  optionTextActive: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  filterSummary: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  filterSummaryText: {
    fontSize: 12,
    color: '#6b7280',
  },
  listContainer: {
    minHeight: 200,
  },
});

export default IssuesScreen;

