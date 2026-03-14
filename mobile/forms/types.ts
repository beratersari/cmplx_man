import { FormFieldName, FormSection, ValidationType, FormatterType } from '../store/enums';

/**
 * Validation rule interface
 */
export interface ValidationRule {
  type: ValidationType;
  value?: string | number | RegExp;
  message?: string;
  messageKey?: string;
  params?: Record<string, string | number>;
}

/**
 * Field formatter interface
 */
export interface FieldFormatter {
  type: FormatterType;
  options?: Record<string, any>;
}

/**
 * Field configuration interface
 */
export interface FieldConfig {
  name: FormFieldName | string;
  type: 'text' | 'password' | 'email' | 'number' | 'date' | 'time' | 'select' | 'textarea' | 'checkbox' | 'radio';
  labelKey: string;
  placeholderKey?: string;
  required?: boolean;
  validations?: ValidationRule[];
  formatter?: FieldFormatter;
  defaultValue?: any;
  options?: Array<{ value: any; labelKey: string }>;
  dependsOn?: {
    field: FormFieldName | string;
    value: any;
    condition?: 'equals' | 'notEquals' | 'in' | 'notIn';
  };
  hidden?: boolean;
  disabled?: boolean;
}

/**
 * Section configuration interface for multi-step forms
 */
export interface SectionConfig {
  id: FormSection | string;
  titleKey: string;
  subtitleKey?: string;
  fields: FieldConfig[];
  dependsOn?: {
    field: FormFieldName | string;
    value: any;
    condition?: 'equals' | 'notEquals' | 'in' | 'notIn';
  };
  hidden?: boolean;
}

/**
 * Form configuration interface
 */
export interface FormConfig {
  id: string;
  sections: SectionConfig[];
  submitLabelKey?: string;
  onSubmit?: (data: Record<string, any>) => void | Promise<void>;
}

/**
 * Form state interface
 */
export interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
}

/**
 * Form context interface
 */
export interface FormContextValue {
  state: FormState;
  setValue: (field: string, value: any) => void;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  setTouched: (field: string) => void;
  validateField: (field: string) => string | null;
  validateAll: () => boolean;
  reset: () => void;
  submit: () => void;
  getVisibleFields: () => FieldConfig[];
  getVisibleSections: () => SectionConfig[];
  currentSectionIndex: number;
  goToSection: (index: number) => void;
  nextSection: () => void;
  previousSection: () => void;
  canGoNext: () => boolean;
  canGoPrevious: () => boolean;
}
