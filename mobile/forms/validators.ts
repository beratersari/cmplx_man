import { FormFieldName, ValidationType } from '../store/enums';
import { ValidationRule } from './types';
import { useTranslation } from '../locales';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Get validation rules for a specific field name
 */
export const getValidationRulesForField = (
  fieldName: FormFieldName | string,
  t: (key: string, params?: Record<string, string | number>) => string
): ValidationRule[] => {
  const rules: ValidationRule[] = [];

  switch (fieldName) {
    // Auth fields
    case FormFieldName.Username:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.username') } },
        { type: ValidationType.MinLength, value: 3, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.username'), min: 3 } },
        { type: ValidationType.MaxLength, value: 50, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.username'), max: 50 } },
        { type: ValidationType.Pattern, value: /^[a-zA-Z0-9_-]+$/, messageKey: 'form.validation.pattern', params: { field: t('form.fieldLabels.username') } }
      );
      break;

    case FormFieldName.Password:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.password') } },
        { type: ValidationType.MinLength, value: 8, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.password'), min: 8 } }
      );
      break;

    case FormFieldName.Email:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.email') } },
        { type: ValidationType.Email, messageKey: 'form.validation.email' }
      );
      break;

    case FormFieldName.ConfirmPassword:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.password') } }
      );
      break;

    // Common fields
    case FormFieldName.Name:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.name') } },
        { type: ValidationType.MaxLength, value: 100, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.name'), max: 100 } }
      );
      break;

    case FormFieldName.Address:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.address') } },
        { type: ValidationType.MinLength, value: 5, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.address'), min: 5 } },
        { type: ValidationType.MaxLength, value: 200, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.address'), max: 200 } }
      );
      break;

    // Complex fields
    case FormFieldName.ComplexName:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.complexName') } },
        { type: ValidationType.MinLength, value: 3, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.complexName'), min: 3 } },
        { type: ValidationType.MaxLength, value: 100, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.complexName'), max: 100 } }
      );
      break;

    case FormFieldName.ComplexAddress:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.complexAddress') } },
        { type: ValidationType.MinLength, value: 5, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.complexAddress'), min: 5 } },
        { type: ValidationType.MaxLength, value: 200, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.complexAddress'), max: 200 } }
      );
      break;

    // Building fields
    case FormFieldName.BuildingName:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.buildingName') } },
        { type: ValidationType.MinLength, value: 2, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.buildingName'), min: 2 } },
        { type: ValidationType.MaxLength, value: 100, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.buildingName'), max: 100 } }
      );
      break;

    // Announcement fields
    case FormFieldName.AnnouncementTitle:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.announcementTitle') } },
        { type: ValidationType.MinLength, value: 3, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.announcementTitle'), min: 3 } },
        { type: ValidationType.MaxLength, value: 200, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.announcementTitle'), max: 200 } }
      );
      break;

    case FormFieldName.AnnouncementDescription:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.announcementDescription') } },
        { type: ValidationType.MinLength, value: 10, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.announcementDescription'), min: 10 } },
        { type: ValidationType.MaxLength, value: 2000, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.announcementDescription'), max: 2000 } }
      );
      break;

    // Issue fields
    case FormFieldName.IssueTitle:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.issueTitle') } },
        { type: ValidationType.MinLength, value: 3, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.issueTitle'), min: 3 } },
        { type: ValidationType.MaxLength, value: 100, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.issueTitle'), max: 100 } }
      );
      break;

    case FormFieldName.IssueDescription:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.issueDescription') } },
        { type: ValidationType.MinLength, value: 5, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.issueDescription'), min: 5 } },
        { type: ValidationType.MaxLength, value: 2000, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.issueDescription'), max: 2000 } }
      );
      break;

    case FormFieldName.IssueCategory:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.issueCategory') } }
      );
      break;

    // Reservation fields
    case FormFieldName.ReservationDate:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.reservationDate') } }
      );
      break;

    case FormFieldName.ReservationStartHour:
    case FormFieldName.ReservationEndHour:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.reservationStartHour') } },
        { type: ValidationType.Pattern, value: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, messageKey: 'form.validation.pattern', params: { field: t('form.fieldLabels.reservationStartHour') } }
      );
      break;

    case FormFieldName.ReservationPersonCount:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.reservationPersonCount') } },
        { type: ValidationType.Min, value: 1, messageKey: 'form.validation.min', params: { field: t('form.fieldLabels.reservationPersonCount'), min: 1 } }
      );
      break;

    // Visitor fields
    case FormFieldName.VisitorName:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.visitorName') } },
        { type: ValidationType.MaxLength, value: 100, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.visitorName'), max: 100 } }
      );
      break;

    case FormFieldName.VisitorPlateNumber:
      rules.push(
        { type: ValidationType.MaxLength, value: 20, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.visitorPlateNumber'), max: 20 } }
      );
      break;

    case FormFieldName.VehiclePlateNumber:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.vehiclePlateNumber') } },
        { type: ValidationType.MinLength, value: 3, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.vehiclePlateNumber'), min: 3 } },
        { type: ValidationType.MaxLength, value: 20, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.vehiclePlateNumber'), max: 20 } }
      );
      break;

    // Marketplace fields
    case FormFieldName.MarketplaceItemTitle:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.marketplaceItemTitle') } },
        { type: ValidationType.MinLength, value: 3, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.marketplaceItemTitle'), min: 3 } },
        { type: ValidationType.MaxLength, value: 100, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.marketplaceItemTitle'), max: 100 } }
      );
      break;

    case FormFieldName.MarketplaceItemDescription:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.marketplaceItemDescription') } },
        { type: ValidationType.MinLength, value: 5, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.marketplaceItemDescription'), min: 5 } },
        { type: ValidationType.MaxLength, value: 1000, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.marketplaceItemDescription'), max: 1000 } }
      );
      break;

    case FormFieldName.MarketplaceItemPrice:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.marketplaceItemPrice') } },
        { type: ValidationType.Min, value: 0, messageKey: 'form.validation.min', params: { field: t('form.fieldLabels.marketplaceItemPrice'), min: 0 } }
      );
      break;

    case FormFieldName.MarketplaceItemCategory:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.marketplaceItemCategory') } }
      );
      break;

    // Payment fields
    case FormFieldName.PaymentTitle:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.paymentTitle') } },
        { type: ValidationType.MinLength, value: 3, messageKey: 'form.validation.minLength', params: { field: t('form.fieldLabels.paymentTitle'), min: 3 } },
        { type: ValidationType.MaxLength, value: 100, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.paymentTitle'), max: 100 } }
      );
      break;

    case FormFieldName.PaymentAmount:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.paymentAmount') } },
        { type: ValidationType.Min, value: 0.01, messageKey: 'form.validation.min', params: { field: t('form.fieldLabels.paymentAmount'), min: 0.01 } }
      );
      break;

    case FormFieldName.PaymentDueDate:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.paymentDueDate') } }
      );
      break;

    // Category fields
    case FormFieldName.Category:
      rules.push(
        { type: ValidationType.Required, messageKey: 'form.validation.required', params: { field: t('form.fieldLabels.category') } },
        { type: ValidationType.MaxLength, value: 100, messageKey: 'form.validation.maxLength', params: { field: t('form.fieldLabels.category'), max: 100 } }
      );
      break;

    default:
      // No specific rules for unknown fields
      break;
  }

  return rules;
};

/**
 * Validate a single field value
 */
export const validateField = (
  fieldName: FormFieldName | string,
  value: any,
  allValues?: Record<string, any>,
  t?: (key: string, params?: Record<string, string | number>) => string
): ValidationResult => {
  const translate = t || ((key: string) => key);
  const rules = getValidationRulesForField(fieldName, translate);

  for (const rule of rules) {
    const result = applyValidationRule(rule, value, allValues, translate);
    if (!result.isValid) {
      return result;
    }
  }

  // Special case: confirm password must match password
  if (fieldName === FormFieldName.ConfirmPassword && allValues) {
    if (value !== allValues[FormFieldName.Password]) {
      return {
        isValid: false,
        error: translate('form.validation.passwordMatch'),
      };
    }
  }

  return { isValid: true };
};

/**
 * Apply a single validation rule
 */
const applyValidationRule = (
  rule: ValidationRule,
  value: any,
  allValues?: Record<string, any>,
  t?: (key: string, params?: Record<string, string | number>) => string
): ValidationResult => {
  const translate = t || ((key: string) => key);

  // Skip validation if value is empty and not required
  if ((value === undefined || value === null || value === '') && rule.type !== ValidationType.Required) {
    return { isValid: true };
  }

  let isValid = true;

  switch (rule.type) {
    case ValidationType.Required:
      isValid = value !== undefined && value !== null && value !== '';
      break;

    case ValidationType.MinLength:
      isValid = typeof value === 'string' && value.length >= (rule.value as number);
      break;

    case ValidationType.MaxLength:
      isValid = typeof value === 'string' && value.length <= (rule.value as number);
      break;

    case ValidationType.Pattern:
      if (typeof value === 'string') {
        const pattern = rule.value as RegExp;
        isValid = pattern.test(value);
      } else {
        isValid = false;
      }
      break;

    case ValidationType.Email:
      if (typeof value === 'string') {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailPattern.test(value);
      } else {
        isValid = false;
      }
      break;

    case ValidationType.Min:
      isValid = Number(value) >= (rule.value as number);
      break;

    case ValidationType.Max:
      isValid = Number(value) <= (rule.value as number);
      break;

    case ValidationType.Custom:
      // Custom validation would be handled separately
      isValid = true;
      break;

    default:
      isValid = true;
  }

  if (!isValid) {
    let error = rule.message;
    if (!error && rule.messageKey) {
      error = translate(rule.messageKey, rule.params);
    }
    if (!error) {
      error = translate('form.validation.invalidFormat');
    }
    return { isValid: false, error };
  }

  return { isValid: true };
};

/**
 * Validate all fields in a form
 */
export const validateAllFields = (
  values: Record<string, any>,
  fieldNames: (FormFieldName | string)[],
  t?: (key: string, params?: Record<string, string | number>) => string
): Record<string, string> => {
  const errors: Record<string, string> = {};

  for (const fieldName of fieldNames) {
    const result = validateField(fieldName, values[fieldName], values, t);
    if (!result.isValid && result.error) {
      errors[fieldName] = result.error;
    }
  }

  return errors;
};
