import { FormConfig } from './types';
import { FormFieldName, FormSection } from '../store/enums';

/**
 * Login Form Configuration
 */
export const loginFormConfig: FormConfig = {
  id: 'login',
  sections: [
    {
      id: FormSection.Credentials,
      titleKey: 'form.sections.credentials',
      fields: [
        {
          name: FormFieldName.Username,
          type: 'text',
          labelKey: 'form.fieldLabels.username',
          placeholderKey: 'auth.login.usernamePlaceholder',
          required: true,
        },
        {
          name: FormFieldName.Password,
          type: 'password',
          labelKey: 'form.fieldLabels.password',
          placeholderKey: 'auth.login.passwordPlaceholder',
          required: true,
        },
      ],
    },
  ],
  submitLabelKey: 'auth.login.signIn',
};

/**
 * Issue Form Configuration (Multi-step)
 */
export const issueFormConfig: FormConfig = {
  id: 'issue',
  sections: [
    {
      id: FormSection.IssueDetails,
      titleKey: 'issues.multiStep.step1Title',
      subtitleKey: 'issues.multiStep.step1Subtitle',
      fields: [
        {
          name: FormFieldName.IssueTitle,
          type: 'text',
          labelKey: 'form.fieldLabels.issueTitle',
          placeholderKey: 'issues.form.titlePlaceholder',
          required: true,
        },
        {
          name: FormFieldName.IssueDescription,
          type: 'textarea',
          labelKey: 'form.fieldLabels.issueDescription',
          placeholderKey: 'issues.form.descriptionPlaceholder',
          required: true,
        },
      ],
    },
    {
      id: FormSection.IssueCategorySelection,
      titleKey: 'issues.multiStep.step2Title',
      subtitleKey: 'issues.multiStep.step2Subtitle',
      fields: [
        {
          name: FormFieldName.IssueCategory,
          type: 'select',
          labelKey: 'form.fieldLabels.issueCategory',
          placeholderKey: 'issues.form.selectCategory',
          required: true,
          options: [], // Will be populated dynamically
        },
      ],
    },
  ],
  submitLabelKey: 'issues.form.createIssue',
};

/**
 * Reservation Form Configuration (Multi-step)
 */
export const reservationFormConfig: FormConfig = {
  id: 'reservation',
  sections: [
    {
      id: FormSection.ReservationCategory,
      titleKey: 'reservations.multiStep.step1Title',
      subtitleKey: 'reservations.multiStep.step1Subtitle',
      fields: [
        {
          name: FormFieldName.Category,
          type: 'select',
          labelKey: 'form.fieldLabels.category',
          placeholderKey: 'reservations.form.selectCategory',
          required: true,
          options: [], // Will be populated dynamically
        },
      ],
    },
    {
      id: FormSection.ReservationDateTime,
      titleKey: 'reservations.multiStep.step2Title',
      subtitleKey: 'reservations.multiStep.step2Subtitle',
      fields: [
        {
          name: FormFieldName.ReservationDate,
          type: 'date',
          labelKey: 'form.fieldLabels.reservationDate',
          required: true,
        },
        {
          name: FormFieldName.ReservationStartHour,
          type: 'time',
          labelKey: 'form.fieldLabels.reservationStartHour',
          required: true,
        },
        {
          name: FormFieldName.ReservationEndHour,
          type: 'time',
          labelKey: 'form.fieldLabels.reservationEndHour',
          required: true,
        },
      ],
    },
    {
      id: FormSection.ReservationDetails,
      titleKey: 'reservations.multiStep.step3Title',
      subtitleKey: 'reservations.multiStep.step3Subtitle',
      fields: [
        {
          name: FormFieldName.ReservationPersonCount,
          type: 'number',
          labelKey: 'form.fieldLabels.reservationPersonCount',
          required: true,
          defaultValue: 1,
        },
        {
          name: FormFieldName.ReservationNotes,
          type: 'textarea',
          labelKey: 'form.fieldLabels.reservationNotes',
          placeholderKey: 'reservations.form.notesPlaceholder',
        },
      ],
    },
  ],
  submitLabelKey: 'reservations.form.createReservation',
};

/**
 * Marketplace Item Form Configuration (Multi-step)
 */
export const marketplaceItemFormConfig: FormConfig = {
  id: 'marketplaceItem',
  sections: [
    {
      id: FormSection.MarketplaceBasic,
      titleKey: 'marketplace.multiStep.step1Title',
      subtitleKey: 'marketplace.multiStep.step1Subtitle',
      fields: [
        {
          name: FormFieldName.MarketplaceItemTitle,
          type: 'text',
          labelKey: 'form.fieldLabels.marketplaceItemTitle',
          placeholderKey: 'marketplace.form.titlePlaceholder',
          required: true,
        },
        {
          name: FormFieldName.MarketplaceItemCategory,
          type: 'select',
          labelKey: 'form.fieldLabels.marketplaceItemCategory',
          placeholderKey: 'marketplace.form.selectCategory',
          required: true,
          options: [], // Will be populated dynamically
        },
      ],
    },
    {
      id: FormSection.MarketplaceDetails,
      titleKey: 'marketplace.multiStep.step2Title',
      subtitleKey: 'marketplace.multiStep.step2Subtitle',
      fields: [
        {
          name: FormFieldName.MarketplaceItemDescription,
          type: 'textarea',
          labelKey: 'form.fieldLabels.marketplaceItemDescription',
          placeholderKey: 'marketplace.form.descriptionPlaceholder',
          required: true,
        },
        {
          name: FormFieldName.MarketplaceItemPrice,
          type: 'number',
          labelKey: 'form.fieldLabels.marketplaceItemPrice',
          placeholderKey: 'marketplace.form.pricePlaceholder',
          required: true,
        },
      ],
    },
  ],
  submitLabelKey: 'marketplace.form.createItem',
};

/**
 * Visitor Form Configuration
 */
export const visitorFormConfig: FormConfig = {
  id: 'visitor',
  sections: [
    {
      id: 'visitorInfo',
      titleKey: 'visitors.form.createVisitor',
      fields: [
        {
          name: FormFieldName.VisitorName,
          type: 'text',
          labelKey: 'form.fieldLabels.visitorName',
          placeholderKey: 'visitors.form.namePlaceholder',
          required: true,
        },
        {
          name: FormFieldName.VisitorPlateNumber,
          type: 'text',
          labelKey: 'form.fieldLabels.visitorPlateNumber',
          placeholderKey: 'visitors.form.plateNumberPlaceholder',
        },
        {
          name: FormFieldName.VisitDate,
          type: 'date',
          labelKey: 'form.fieldLabels.visitDate',
          required: true,
        },
      ],
    },
  ],
  submitLabelKey: 'visitors.form.createVisitor',
};

/**
 * Vehicle Form Configuration
 */
export const vehicleFormConfig: FormConfig = {
  id: 'vehicle',
  sections: [
    {
      id: 'vehicleInfo',
      titleKey: 'vehicles.form.registerVehicle',
      fields: [
        {
          name: FormFieldName.VehiclePlateNumber,
          type: 'text',
          labelKey: 'form.fieldLabels.vehiclePlateNumber',
          placeholderKey: 'vehicles.form.plateNumberPlaceholder',
          required: true,
        },
      ],
    },
  ],
  submitLabelKey: 'vehicles.form.registerVehicle',
};

/**
 * Get form config by ID
 */
export const getFormConfig = (formId: string): FormConfig | null => {
  switch (formId) {
    case 'login':
      return loginFormConfig;
    case 'issue':
      return issueFormConfig;
    case 'reservation':
      return reservationFormConfig;
    case 'marketplaceItem':
      return marketplaceItemFormConfig;
    case 'visitor':
      return visitorFormConfig;
    case 'vehicle':
      return vehicleFormConfig;
    default:
      return null;
  }
};

export default {
  loginFormConfig,
  issueFormConfig,
  reservationFormConfig,
  marketplaceItemFormConfig,
  visitorFormConfig,
  vehicleFormConfig,
  getFormConfig,
};
