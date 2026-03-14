import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { DynamicForm } from '../../../components/organisms/DynamicForm';
import { issueFormConfig } from '../../../forms/configs';
import { useGetIssueCategoriesQuery, useCreateIssueMutation } from '../../../store/apiSlice';
import { useTranslation } from '../../../locales';
import { FormFieldName } from '../../../store/enums';
import { BottomSheet } from '../../../components/organisms/BottomSheet';
import { Input } from '../../../components/atoms/Input';
import { Text } from '../../../components/atoms/Text';
import { FormContextValue } from '../../../forms/types';

const NewIssueScreen = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: categories = [] } = useGetIssueCategoriesQuery({});
  const [createIssue] = useCreateIssueMutation();
  const [isCategorySheetOpen, setCategorySheetOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [formApi, setFormApi] = useState<FormContextValue | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, router]);

  const filteredCategories = useMemo(() => {
    const search = categorySearch.toLowerCase();
    return categories.filter((cat: any) => cat.name.toLowerCase().includes(search));
  }, [categories, categorySearch]);

  const formConfig = useMemo(() => ({
    ...issueFormConfig,
    sections: issueFormConfig.sections.map(section => ({
      ...section,
      fields: section.fields.map(field => {
        if (field.name === FormFieldName.IssueCategory) {
          return {
            ...field,
            options: categories.map((cat: any) => ({
              value: cat.id,
              labelKey: cat.name,
            })),
          };
        }
        return field;
      }),
    })),
  }), [categories]);

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      await createIssue({
        title: data[FormFieldName.IssueTitle],
        description: data[FormFieldName.IssueDescription],
        category_id: data[FormFieldName.IssueCategory],
      }).unwrap();
      router.back();
    } catch (error) {
      console.error('Failed to create issue:', error);
    }
  };

  const handleCategorySelect = (category: any) => {
    if (formApi) {
      formApi.setValue(FormFieldName.IssueCategory, category.id);
      formApi.setTouched(FormFieldName.IssueCategory);
      formApi.validateField(FormFieldName.IssueCategory);
    }
    setCategorySheetOpen(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <DynamicForm
        config={formConfig}
        onSubmit={handleSubmit}
        onFormReady={setFormApi}
        fieldOverrides={{
          [FormFieldName.IssueCategory]: {
            onPress: () => setCategorySheetOpen(true),
            options: categories.map((cat: any) => ({
              value: cat.id,
              labelKey: cat.name,
            })),
          },
        }}
      />

      <BottomSheet
        visible={isCategorySheetOpen}
        onClose={() => setCategorySheetOpen(false)}
        title={t('issues.form.categoryPickerTitle')}
        height={0.6}
      >
        <View style={styles.sheetContent}>
          <Input
            value={categorySearch}
            onChangeText={setCategorySearch}
            placeholder={t('issues.form.categorySearchPlaceholder')}
            style={styles.searchInput}
          />
          <View style={styles.categoriesList}>
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={() => handleCategorySelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.categoryItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>{t('issues.form.noCategoriesAvailable')}</Text>
              }
            />
          </View>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sheetContent: {
    flex: 1,
  },
  searchInput: {
    marginBottom: 12,
  },
  categoriesList: {
    flex: 1,
    minHeight: 200,
  },
  categoryItem: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#111827',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 24,
  },
});

export default NewIssueScreen;
