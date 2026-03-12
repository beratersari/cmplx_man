// Complex types
export interface Complex {
  id: number;
  name: string;
  address: string;
  created_date: string;
  created_by: number | null;
  updated_date: string | null;
  updated_by: number | null;
  is_active: boolean;
}

export interface ComplexCreate {
  name: string;
  address: string;
}

export interface ComplexUpdate {
  name: string;
  address: string;
}

export interface Building {
  id: number;
  name: string;
  complex_id: number;
  created_date: string;
  created_by: number | null;
  updated_date: string | null;
  updated_by: number | null;
  is_active: boolean;
}

export interface BuildingCreate {
  name: string;
  complex_id: number;
}

export interface BuildingUpdate {
  name: string;
  complex_id: number;
}

// User types
export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  contact: string | null;
  description: string | null;
  unit_number: string | null;
  created_date: string;
  created_by: number | null;
  updated_date: string | null;
  updated_by: number | null;
}

// Assignment types
export interface AdminComplexAssignment {
  user_id: number;
  complex_id: number;
}

// Issue status summary
export interface IssueStatusSummary {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
}

// Visitor count by building
export interface VisitorCountByBuilding {
  building_id: number;
  building_name: string;
  visitor_count: number;
}

// Vehicle stats
export interface VehicleCountByComplex {
  complex_id: number;
  complex_name: string;
  vehicle_count: number;
}

export interface VehicleStats {
  total_vehicles: number;
  vehicles_by_complex: VehicleCountByComplex[];
}

// Vehicle types
export interface Vehicle {
  id: number;
  user_id: number;
  plate_number: string;
  created_date: string;
  created_by: number | null;
  updated_date: string | null;
  updated_by: number | null;
  is_active: boolean;
}

export interface VehicleCreate {
  user_id: number;
  plate_number: string;
}

export interface VehicleUpdate {
  plate_number?: string;
}

// Payment stats by building
export interface PaymentStatsByBuilding {
  building_id: number;
  building_name: string;
  total_records: number;
  pending_count: number;
  paid_count: number;
  overdue_count: number;
  cancelled_count: number;
  total_amount: number;
  collected_amount: number;
  pending_amount: number;
}

// Announcement types
export interface Announcement {
  id: number;
  title: string;
  description: string;
  img_path: string | null;
  complex_id: number;
  comments_enabled: boolean;
  created_date: string;
  created_by: number | null;
  updated_date: string | null;
  updated_by: number | null;
  is_active: boolean;
}

export interface AnnouncementCreate {
  title: string;
  description: string;
  img_path?: string;
  complex_id: number;
  comments_enabled: boolean;
}

export interface AnnouncementUpdate {
  title: string;
  description: string;
  img_path?: string;
  complex_id: number;
  comments_enabled: boolean;
}

export interface AnnouncementEmotion {
  id: number;
  announcement_id: number;
  user_id: number;
  emoji: string;
  user?: User;
}

export interface Comment {
  id: number;
  content: string;
  announcement_id: number;
  user_id: number;
  parent_id: number | null;
  created_date: string;
  user?: User;
  replies?: Comment[];
}

export interface AnnouncementRead {
  id: number;
  announcement_id: number;
  user_id: number;
  read_date: string;
}

// Visitor types
export type VisitorStatus = 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW';

export interface Visitor {
  id: number;
  name: string;
  plate_number: string | null;
  visit_date: string;
  complex_id: number;
  building_id: number;
  user_id: number;
  status: VisitorStatus;
  status_updated_by: number | null;
  status_updated_date: string | null;
  created_date: string;
  created_by: number | null;
  updated_date: string | null;
  updated_by: number | null;
  is_active: boolean;
}

export interface VisitorCreate {
  name: string;
  plate_number?: string;
}

export interface AdminVisitorCreate {
  name: string;
  plate_number?: string;
  complex_id: number;
}

export interface VisitorUpdate {
  name?: string;
  plate_number?: string;
  visit_date?: string;
}

export interface VisitorStatusUpdate {
  status: VisitorStatus;
}

// Issue Status
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

// Issue types
export interface IssueImage {
  id: number;
  img_path: string;
}

export interface Issue {
  id: number;
  title: string;
  description: string;
  user_id: number;
  complex_id: number;
  building_id: number;
  category_id: number;
  status: IssueStatus;
  created_date: string;
  updated_date: string | null;
  updated_by: number | null;
  images: IssueImage[];
  is_active: boolean;
}

export interface IssueCreate {
  title: string;
  description: string;
  category_id: number;
  img_paths?: string[];
}

export interface AdminIssueCreate extends IssueCreate {
  complex_id: number;
}

export interface IssueUpdate {
  title?: string;
  description?: string;
  status?: IssueStatus;
}

export interface IssueStatusSummary {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  total: number;
}

export interface IssueCountByCategory {
  category_id: number;
  category_name: string;
  issue_count: number;
}

// Issue Category types
export interface IssueCategory {
  id: number;
  name: string;
  complex_id: number;
  created_date: string;
  created_by: number | null;
  updated_date: string | null;
  updated_by: number | null;
  is_active: boolean;
}

export interface IssueCategoryCreate {
  name: string;
}

export interface AdminIssueCategoryCreate extends IssueCategoryCreate {
  complex_id: number;
}

export interface IssueCategoryUpdate {
  name?: string;
}

// Reservation Status
export type ReservationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

// Reservation Category types
export interface ReservationCategory {
  id: number;
  name: string;
  complex_id: number;
  created_date: string;
  created_by: number | null;
  updated_date: string | null;
  updated_by: number | null;
  is_active: boolean;
}

export interface ReservationCategoryCreate {
  name: string;
}

export interface AdminReservationCategoryCreate extends ReservationCategoryCreate {
  complex_id: number;
}

export interface ReservationCategoryUpdate {
  name?: string;
}

// Reservation types
export interface Reservation {
  id: number;
  category_id: number;
  user_id: number;
  complex_id: number;
  reservation_date: string;
  start_hour: string;
  end_hour: string;
  person_count: number;
  notes: string | null;
  status: ReservationStatus;
  status_updated_by: number | null;
  status_updated_date: string | null;
  created_date: string;
  created_by: number | null;
  updated_date: string | null;
  updated_by: number | null;
}

export interface ReservationCreate {
  category_id: number;
  reservation_date: string;
  start_hour: string;
  end_hour: string;
  person_count: number;
  notes?: string;
}

export interface AdminReservationCreate extends ReservationCreate {
  user_id: number;
  complex_id: number;
}

export interface ReservationUpdate {
  category_id?: number;
  reservation_date?: string;
  start_hour?: string;
  end_hour?: string;
  person_count?: number;
  notes?: string;
}

export interface ReservationStatusUpdate {
  status: ReservationStatus;
}

export interface ReservationOverlapStats {
  other_reservations_count: number;
  total_people_count: number;
}

export interface ReservationOverlapStatsById {
  reservation_id: number;
  other_accepted_reservations_count: number;
  total_people_count: number;
}
