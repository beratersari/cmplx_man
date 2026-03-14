import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode, useEffect } from 'react';
import { FormConfig, FormState, FormContextValue, FieldConfig, SectionConfig } from './types';
import { FormFieldName } from '../store/enums';
import { validateField, validateAllFields } from './validators';
import { formatFieldValue } from './formatters';
import { useTranslation } from '../locales';

const FormContext = createContext<FormContextValue | null>(null);

interface FormProviderProps {
  children: ReactNode;
  config: FormConfig;
  initialValues?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
}

export const FormProvider = ({ children, config, initialValues = {}, onSubmit }: FormProviderProps) => {
  const { t } = useTranslation();

  // Initialize form state
  const [state, setState] = useState<FormState>(() => {
    const values: Record<string, any> = {};
    
    // Set default values from config
    config.sections.forEach(section => {
      section.fields.forEach(field => {
        values[field.name] = field.defaultValue !== undefined ? field.defaultValue : '';
      });
    });

    // Override with initial values
    Object.assign(values, initialValues);

    return {
      values,
      errors: {},
      touched: {},
      isValid: true,
      isDirty: false,
      isSubmitting: false,
    };
  });

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // Get visible sections based on dependencies
  const getVisibleSections = useCallback((): SectionConfig[] => {
    return config.sections.filter(section => {
      if (section.hidden) return false;
      
      if (section.dependsOn) {
        const depValue = state.values[section.dependsOn.field];
        switch (section.dependsOn.condition || 'equals') {
          case 'equals':
            return depValue === section.dependsOn.value;
          case 'notEquals':
            return depValue !== section.dependsOn.value;
          case 'in':
            return Array.isArray(section.dependsOn.value) && section.dependsOn.value.includes(depValue);
          case 'notIn':
            return Array.isArray(section.dependsOn.value) && !section.dependsOn.value.includes(depValue);
          default:
            return true;
        }
      }
      return true;
    });
  }, [config.sections, state.values]);

  // Get visible fields for current section
  const getVisibleFields = useCallback((): FieldConfig[] => {
    const visibleSections = getVisibleSections();
    const fields: FieldConfig[] = [];
    
    visibleSections.forEach(section => {
      section.fields.forEach(field => {
        if (field.hidden) return;
        
        if (field.dependsOn) {
          const depValue = state.values[field.dependsOn.field];
          switch (field.dependsOn.condition || 'equals') {
            case 'equals':
              if (depValue !== field.dependsOn.value) return;
              break;
            case 'notEquals':
              if (depValue === field.dependsOn.value) return;
              break;
            case 'in':
              if (!Array.isArray(field.dependsOn.value) || !field.dependsOn.value.includes(depValue)) return;
              break;
            case 'notIn':
              if (!Array.isArray(field.dependsOn.value) || field.dependsOn.value.includes(depValue)) return;
              break;
          }
        }
        fields.push(field);
      });
    });
    
    return fields;
  }, [getVisibleSections, state.values]);

  // Set field value with formatting
  const setValue = useCallback((field: string, value: any) => {
    setState(prev => {
      // Apply formatter
      const formattedValue = formatFieldValue(field as FormFieldName, value);
      
      const newValues = { ...prev.values, [field]: formattedValue };
      const isDirty = JSON.stringify(newValues) !== JSON.stringify(prev.values);
      
      // Real-time validation for touched fields
      let newErrors = { ...prev.errors };
      if (prev.touched[field]) {
        const result = validateField(field as FormFieldName, formattedValue, newValues, t);
        if (result.isValid) {
          delete newErrors[field];
        } else if (result.error) {
          newErrors[field] = result.error;
        }
      }

      return {
        ...prev,
        values: newValues,
        errors: newErrors,
        isDirty,
        isValid: Object.keys(newErrors).length === 0,
      };
    });
  }, [t]);

  // Set error for a field
  const setError = useCallback((field: string, error: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [field]: error },
      isValid: false,
    }));
  }, []);

  // Clear error for a field
  const clearError = useCallback((field: string) => {
    setState(prev => {
      const newErrors = { ...prev.errors };
      delete newErrors[field];
      return {
        ...prev,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0,
      };
    });
  }, []);

  // Mark field as touched
  const setTouched = useCallback((field: string) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [field]: true },
    }));
  }, []);

  // Validate a single field
  const validateFieldFn = useCallback((field: string): string | null => {
    const result = validateField(field as FormFieldName, state.values[field], state.values, t);
    if (!result.isValid && result.error) {
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, [field]: result.error! },
        isValid: false,
      }));
      return result.error;
    }
    clearError(field);
    return null;
  }, [state.values, t, clearError]);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    const visibleFields = getVisibleFields();
    const fieldNames = visibleFields.map(f => f.name);
    const errors = validateAllFields(state.values, fieldNames, t);
    
    setState(prev => ({
      ...prev,
      errors,
      touched: fieldNames.reduce((acc, name) => ({ ...acc, [name]: true }), prev.touched),
      isValid: Object.keys(errors).length === 0,
    }));

    return Object.keys(errors).length === 0;
  }, [state.values, getVisibleFields, t]);

  // Reset form
  const reset = useCallback(() => {
    const values: Record<string, any> = {};
    
    config.sections.forEach(section => {
      section.fields.forEach(field => {
        values[field.name] = field.defaultValue !== undefined ? field.defaultValue : '';
      });
    });

    Object.assign(values, initialValues);

    setState({
      values,
      errors: {},
      touched: {},
      isValid: true,
      isDirty: false,
      isSubmitting: false,
    });
    setCurrentSectionIndex(0);
  }, [config.sections, initialValues]);

  // Submit form
  const submit = useCallback(async () => {
    if (!validateAll()) return;

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      if (onSubmit) {
        await onSubmit(state.values);
      } else if (config.onSubmit) {
        await config.onSubmit(state.values);
      }
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [validateAll, state.values, onSubmit, config.onSubmit]);

  // Section navigation
  const goToSection = useCallback((index: number) => {
    const visibleSections = getVisibleSections();
    if (index >= 0 && index < visibleSections.length) {
      setCurrentSectionIndex(index);
    }
  }, [getVisibleSections]);

  const nextSection = useCallback(() => {
    const visibleSections = getVisibleSections();
    const currentSection = visibleSections[currentSectionIndex];
    
    // Validate current section fields before moving
    const fieldNames = currentSection.fields.map(f => f.name);
    const errors = validateAllFields(state.values, fieldNames, t);
    
    if (Object.keys(errors).length > 0) {
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, ...errors },
        touched: { ...prev.touched, ...fieldNames.reduce((acc, name) => ({ ...acc, [name]: true }), {}) },
      }));
      return;
    }

    if (currentSectionIndex < visibleSections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  }, [currentSectionIndex, getVisibleSections, state.values, t]);

  const previousSection = useCallback(() => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  }, [currentSectionIndex]);

  const canGoNext = useCallback((): boolean => {
    const visibleSections = getVisibleSections();
    return currentSectionIndex < visibleSections.length - 1;
  }, [currentSectionIndex, getVisibleSections]);

  const canGoPrevious = useCallback((): boolean => {
    return currentSectionIndex > 0;
  }, [currentSectionIndex]);

  // Revalidate when values change (for dependent fields)
  useEffect(() => {
    const visibleFields = getVisibleFields();
    visibleFields.forEach(field => {
      if (field.dependsOn && state.touched[field.dependsOn.field]) {
        validateFieldFn(field.name);
      }
    });
  }, [state.values, getVisibleFields, validateFieldFn]);

  const contextValue: FormContextValue = useMemo(() => ({
    state,
    setValue,
    setError,
    clearError,
    setTouched,
    validateField: validateFieldFn,
    validateAll,
    reset,
    submit,
    getVisibleFields,
    getVisibleSections,
    currentSectionIndex,
    goToSection,
    nextSection,
    previousSection,
    canGoNext,
    canGoPrevious,
  }), [
    state,
    setValue,
    setError,
    clearError,
    setTouched,
    validateFieldFn,
    validateAll,
    reset,
    submit,
    getVisibleFields,
    getVisibleSections,
    currentSectionIndex,
    goToSection,
    nextSection,
    previousSection,
    canGoNext,
    canGoPrevious,
  ]);

  return (
    <FormContext.Provider value={contextValue}>
      {children}
    </FormContext.Provider>
  );
};

export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
};

export default FormProvider;
