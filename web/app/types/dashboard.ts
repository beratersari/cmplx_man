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
