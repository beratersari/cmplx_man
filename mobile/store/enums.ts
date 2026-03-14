/**
 * RTK Query Tag Enums for revalidation
 * Centralized enum definitions for all API tags
 */
export enum TagType {
  // Auth
  Auth = 'Auth',
  
  // User related
  User = 'User',
  UserProfile = 'UserProfile',
  
  // Complex related
  Complex = 'Complex',
  Building = 'Building',
  
  // Community
  Announcement = 'Announcement',
  AnnouncementComment = 'AnnouncementComment',
  AnnouncementEmotion = 'AnnouncementEmotion',
  
  // Services
  Issue = 'Issue',
  IssueCategory = 'IssueCategory',
  Reservation = 'Reservation',
  ReservationCategory = 'ReservationCategory',
  
  // Marketplace
  Marketplace = 'Marketplace',
  MarketplaceCategory = 'MarketplaceCategory',
  MarketplaceItem = 'MarketplaceItem',
  
  // Other
  Visitor = 'Visitor',
  Vehicle = 'Vehicle',
  Payment = 'Payment',
  PaymentRecord = 'PaymentRecord',
}

/**
 * Form field name enums for consistent naming across forms
 */
export enum FormFieldName {
  // Auth fields
  Username = 'username',
  Password = 'password',
  Email = 'email',
  ConfirmPassword = 'confirmPassword',
  
  // User profile fields
  FirstName = 'firstName',
  LastName = 'lastName',
  Contact = 'contact',
  Description = 'description',
  UnitNumber = 'unitNumber',
  
  // Complex fields
  ComplexName = 'complexName',
  ComplexAddress = 'complexAddress',
  
  // Building fields
  BuildingName = 'buildingName',
  
  // Announcement fields
  AnnouncementTitle = 'announcementTitle',
  AnnouncementDescription = 'announcementDescription',
  
  // Issue fields
  IssueTitle = 'issueTitle',
  IssueDescription = 'issueDescription',
  IssueCategory = 'issueCategory',
  
  // Reservation fields
  ReservationDate = 'reservationDate',
  ReservationStartHour = 'reservationStartHour',
  ReservationEndHour = 'reservationEndHour',
  ReservationPersonCount = 'reservationPersonCount',
  ReservationNotes = 'reservationNotes',
  
  // Visitor fields
  VisitorName = 'visitorName',
  VisitorPlateNumber = 'visitorPlateNumber',
  VisitDate = 'visitDate',
  
  // Vehicle fields
  VehiclePlateNumber = 'vehiclePlateNumber',
  
  // Marketplace fields
  MarketplaceItemTitle = 'marketplaceItemTitle',
  MarketplaceItemDescription = 'marketplaceItemDescription',
  MarketplaceItemPrice = 'marketplaceItemPrice',
  MarketplaceItemCategory = 'marketplaceItemCategory',
  
  // Payment fields
  PaymentTitle = 'paymentTitle',
  PaymentAmount = 'paymentAmount',
  PaymentDueDate = 'paymentDueDate',
  
  // Common fields
  Name = 'name',
  Address = 'address',
  Category = 'category',
  Complex = 'complex',
  Status = 'status',
  Notes = 'notes',
}

/**
 * Form section enums for multi-step forms
 */
export enum FormSection {
  // Auth sections
  Credentials = 'credentials',
  Profile = 'profile',
  
  // Registration sections
  BasicInfo = 'basicInfo',
  ContactInfo = 'contactInfo',
  Security = 'security',
  
  // Issue sections
  IssueDetails = 'issueDetails',
  IssueCategorySelection = 'issueCategorySelection',
  
  // Reservation sections
  ReservationCategory = 'reservationCategory',
  ReservationDateTime = 'reservationDateTime',
  ReservationDetails = 'reservationDetails',
  
  // Marketplace sections
  MarketplaceBasic = 'marketplaceBasic',
  MarketplaceDetails = 'marketplaceDetails',
  
  // Payment sections
  PaymentInfo = 'paymentInfo',
  PaymentTarget = 'paymentTarget',
}

/**
 * Validation type enums
 */
export enum ValidationType {
  Required = 'required',
  MinLength = 'minLength',
  MaxLength = 'maxLength',
  Pattern = 'pattern',
  Email = 'email',
  Min = 'min',
  Max = 'max',
  Custom = 'custom',
}

/**
 * Formatter type enums
 */
export enum FormatterType {
  None = 'none',
  Phone = 'phone',
  PlateNumber = 'plateNumber',
  Currency = 'currency',
  Date = 'date',
  Time = 'time',
  Uppercase = 'uppercase',
  Lowercase = 'lowercase',
  Trim = 'trim',
  Capitalize = 'capitalize',
}
