export interface StudentProfile {
  id: string;
  school_id?: string | null;
  learner_reference_number?: string | null;
  last_name?: string | null;
  first_name?: string | null;
  rfid_tag?: string | null;
  grade_level?: string | null;
  school_year?: string | null;
  guardian_contact_number?: string | null;
  /** URL or storage path for image in bucket `student_image` */
  student_image_url?: string | null;
  [key: string]: unknown;
}

export interface QueuedScan {
  id: string;
  rfid_tag: string;
  action: 'time_in' | 'time_out';
  timestamp_iso: string;
  synced: boolean;
}
