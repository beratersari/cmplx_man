import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { FormProvider, useForm } from '../../forms/FormProvider';
import { FormConfig, FormContextValue } from '../../forms/types';
import { useTranslation } from '../../locales';
import { LocaleProvider } from '../../locales';
import { FormField } from '../molecules/FormField';
import { Text } from '../atoms/Text';
import { Button } from '../atoms/Button';

interface DynamicFormProps {
  config: FormConfig;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
  initialValues?: Record<string, any>;
  fieldOverrides?: Record<string, Partial<React.ComponentProps<typeof FormField>>>;
  onFormReady?: (formApi: FormContextValue) => void;
}

const DynamicFormContent = ({
  config,
  fieldOverrides,
  onFormReady,
}: {
  config: FormConfig;
  fieldOverrides?: Record<string, Partial<React.ComponentProps<typeof FormField>>>;
  onFormReady?: (formApi: FormContextValue) => void;
}) => {
  const { t } = useTranslation();
  const formApi = useForm();
  const {
    state,
    getVisibleFields,
    getVisibleSections,
    currentSectionIndex,
    nextSection,
    previousSection,
    canGoNext,
    canGoPrevious,
    submit,
  } = formApi;

  const visibleSections = getVisibleSections();
  const currentSection = visibleSections[currentSectionIndex];
  const visibleFields = getVisibleFields().filter(
    field => currentSection?.fields.some(f => f.name === field.name)
  );

  const isMultiStep = visibleSections.length > 1;

  useEffect(() => {
    if (onFormReady) {
      onFormReady(formApi);
    }
  }, [onFormReady]);

  const handleNext = () => {
    nextSection();
  };

  const handlePrevious = () => {
    previousSection();
  };

  const handleSubmit = async () => {
    await submit();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {isMultiStep && (
        <View style={styles.progressContainer}>
          {visibleSections.map((section, index) => (
            <View
              key={section.id.toString()}
              style={[
                styles.progressDot,
                index === currentSectionIndex && styles.progressDotActive,
                index < currentSectionIndex && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>
      )}

      {currentSection && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t(currentSection.titleKey)}</Text>
          {currentSection.subtitleKey && (
            <Text style={styles.sectionSubtitle}>{t(currentSection.subtitleKey)}</Text>
          )}
        </View>
      )}

      <View style={styles.fields}>
        {visibleFields.map(field => (
          <FormField
            key={field.name}
            name={field.name}
            labelKey={field.labelKey}
            placeholderKey={field.placeholderKey}
            type={field.type}
            required={field.required}
            options={field.options}
            disabled={field.disabled}
            {...(fieldOverrides?.[String(field.name)] || {})}
          />
        ))}
      </View>

      <View style={styles.actions}>
        {isMultiStep && (
          <Button
            title={t('common.previous')}
            onPress={handlePrevious}
            disabled={!canGoPrevious()}
            variant="secondary"
          />
        )}

        {isMultiStep && canGoNext() ? (
          <Button
            title={t('common.next')}
            onPress={handleNext}
          />
        ) : (
          <Button
            title={config.submitLabelKey ? t(config.submitLabelKey) : t('common.submit')}
            onPress={handleSubmit}
            disabled={!state.isValid || state.isSubmitting}
            loading={state.isSubmitting}
          />
        )}
      </View>
    </ScrollView>
  );
};

export const DynamicForm = ({ config, onSubmit, initialValues, fieldOverrides, onFormReady }: DynamicFormProps) => {
  return (
    <LocaleProvider>
      <FormProvider config={config} onSubmit={onSubmit} initialValues={initialValues}>
        <DynamicFormContent config={config} fieldOverrides={fieldOverrides} onFormReady={onFormReady} />
      </FormProvider>
    </LocaleProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  progressDotActive: {
    backgroundColor: '#3b82f6',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  progressDotCompleted: {
    backgroundColor: '#10b981',
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  fields: {
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
});

export default DynamicForm;
