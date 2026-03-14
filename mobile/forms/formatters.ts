import { FormFieldName, FormatterType } from '../store/enums';
import { FieldFormatter } from './types';

/**
 * Format a value based on field name or formatter config
 */
export const formatFieldValue = (
  fieldName: FormFieldName | string,
  value: any,
  formatter?: FieldFormatter
): any => {
  if (value === undefined || value === null) return value;

  // Determine formatter type
  let formatterType: FormatterType = FormatterType.None;
  let options: Record<string, any> = {};

  if (formatter) {
    formatterType = formatter.type;
    options = formatter.options || {};
  } else {
    // Get formatter based on field name
    const fieldFormatter = getFormatterForField(fieldName);
    if (fieldFormatter) {
      formatterType = fieldFormatter.type;
      options = fieldFormatter.options || {};
    }
  }

  // Apply formatting
  return applyFormatter(formatterType, value, options);
};

/**
 * Get formatter configuration for a specific field name
 */
export const getFormatterForField = (fieldName: FormFieldName | string): FieldFormatter | null => {
  switch (fieldName) {
    case FormFieldName.Contact:
      return { type: FormatterType.Phone };

    case FormFieldName.VehiclePlateNumber:
    case FormFieldName.VisitorPlateNumber:
      return { type: FormatterType.PlateNumber };

    case FormFieldName.MarketplaceItemPrice:
    case FormFieldName.PaymentAmount:
      return { type: FormatterType.Currency };

    case FormFieldName.ReservationDate:
    case FormFieldName.VisitDate:
    case FormFieldName.PaymentDueDate:
      return { type: FormatterType.Date };

    case FormFieldName.ReservationStartHour:
    case FormFieldName.ReservationEndHour:
      return { type: FormatterType.Time };

    default:
      return null;
  }
};

/**
 * Apply a formatter to a value
 */
const applyFormatter = (type: FormatterType, value: any, options: Record<string, any>): any => {
  if (typeof value !== 'string') {
    value = String(value);
  }

  switch (type) {
    case FormatterType.None:
      return value;

    case FormatterType.Trim:
      return value.trim();

    case FormatterType.Uppercase:
      return value.toUpperCase();

    case FormatterType.Lowercase:
      return value.toLowerCase();

    case FormatterType.Capitalize:
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

    case FormatterType.Phone:
      return formatPhoneNumber(value);

    case FormatterType.PlateNumber:
      return formatPlateNumber(value);

    case FormatterType.Currency:
      return formatCurrency(value, options);

    case FormatterType.Date:
      return formatDate(value, options);

    case FormatterType.Time:
      return formatTime(value);

    default:
      return value;
  }
};

/**
 * Format phone number
 */
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for US numbers
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else if (digits.length <= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else {
    return `+${digits.slice(0, -10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
  }
};

/**
 * Format plate number (uppercase, remove special chars except hyphen)
 */
const formatPlateNumber = (value: string): string => {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 20);
};

/**
 * Format currency
 */
const formatCurrency = (value: string, options: Record<string, any> = {}): string => {
  // Remove non-numeric except decimal point
  let numeric = value.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = numeric.split('.');
  if (parts.length > 2) {
    numeric = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit decimal places
  if (parts.length === 2) {
    numeric = parts[0] + '.' + parts[1].slice(0, 2);
  }
  
  return numeric;
};

/**
 * Format date (YYYY-MM-DD)
 */
const formatDate = (value: string, options: Record<string, any> = {}): string => {
  // Remove non-numeric
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 4) {
    return digits;
  } else if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  } else {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
};

/**
 * Format time (HH:MM)
 */
const formatTime = (value: string): string => {
  // Remove non-numeric
  const digits = value.replace(/\D/g, '');
  
  if (digits.length <= 2) {
    return digits;
  } else {
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
};

/**
 * Parse formatted value back to raw value
 */
export const parseFormattedValue = (fieldName: FormFieldName | string, value: any): any => {
  if (value === undefined || value === null) return value;

  const formatter = getFormatterForField(fieldName);
  if (!formatter) return value;

  switch (formatter.type) {
    case FormatterType.Phone:
      return String(value).replace(/\D/g, '');

    case FormatterType.Currency:
      return parseFloat(String(value).replace(/[^\d.]/g, '')) || 0;

    case FormatterType.Date:
    case FormatterType.Time:
      return value;

    default:
      return value;
  }
};
