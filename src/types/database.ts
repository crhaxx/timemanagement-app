export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TASK_STATUSES = ['backlog', 'done'] as const;
export const GOAL_STATUSES = ['active', 'done', 'dropped'] as const;
export const EFFORT_MINUTES = [15, 30, 60, 120] as const;
export const ROUTINE_FREQUENCIES = ['daily', 'weekdays', 'weekly', 'monthly', 'custom'] as const;
export const ROUTINE_STATUSES = ['active', 'paused', 'ended'] as const;
export const ROUTINE_LOG_STATUSES = ['done', 'skipped', 'missed'] as const;
export const INBOX_KINDS = ['idea', 'task', 'note', 'link'] as const;
export const INBOX_STATUSES = ['new', 'converted', 'someday', 'discarded'] as const;
export const TIME_SOURCES = ['manual', 'calendar', 'estimate'] as const;
export const SCALE_1_TO_5 = [1, 2, 3, 4, 5] as const;

/** Slug from `focus_areas`. Older tasks may still carry a slug that is no longer listed. */
export type TaskContext = string;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export type EffortMinutes = (typeof EFFORT_MINUTES)[number];
export type RoutineFrequency = (typeof ROUTINE_FREQUENCIES)[number];
export type RoutineStatus = (typeof ROUTINE_STATUSES)[number];
export type RoutineLogStatus = (typeof ROUTINE_LOG_STATUSES)[number];
export type InboxKind = (typeof INBOX_KINDS)[number];
export type InboxStatus = (typeof INBOX_STATUSES)[number];
export type TimeSource = (typeof TIME_SOURCES)[number];
export type Scale1To5 = (typeof SCALE_1_TO_5)[number];

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  context: TaskContext;
  effort_minutes: number;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  goal_id: string | null;
  created_at: string;
};

export type TaskInsert = {
  title: string;
  notes?: string | null;
  context: TaskContext;
  effort_minutes: number;
  priority: TaskPriority;
  status?: TaskStatus;
  deadline?: string | null;
  goal_id?: string | null;
  focus_area_id?: string | null;
};

export type Goal = {
  id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  target_value: string | null;
  current_value: string | null;
  unit: string | null;
  deadline: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
};

export type GoalInsert = {
  parent_id?: string | null;
  title: string;
  description?: string | null;
  target_value?: string | null;
  current_value?: string | null;
  unit?: string | null;
  deadline?: string | null;
  status?: GoalStatus;
  updated_at?: string;
};

export type FocusArea = {
  id: string;
  slug: string;
  name: string;
  color: string | null;
  status: string;
  priority: number | null;
  weekly_target_hours?: number | null;
};

export type JournalEntry = {
  id: string;
  entry_date: string;
  summary: string;
  energy: number | null;
  mood: number | null;
  created_at: string;
  updated_at: string;
};

export type JournalEntryInsert = {
  entry_date: string;
  summary: string;
  energy?: number | null;
  mood?: number | null;
  updated_at?: string;
};

export type InboxItem = {
  id: string;
  content: string;
  kind: InboxKind;
  status: InboxStatus;
  focus_area_id: string | null;
  converted_task_id: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InboxItemInsert = {
  content: string;
  kind?: InboxKind;
  status?: InboxStatus;
  focus_area_id?: string | null;
  converted_task_id?: string | null;
  processed_at?: string | null;
  updated_at?: string;
};

export type SleepLog = {
  id: string;
  wake_date: string;
  bedtime: string | null;
  wake_time: string | null;
  duration_minutes: number | null;
  quality: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type SleepLogInsert = {
  wake_date: string;
  bedtime?: string | null;
  wake_time?: string | null;
  quality?: number | null;
  note?: string | null;
  updated_at?: string;
};

export type TimeEntry = {
  id: string;
  entry_date: string;
  start_at: string | null;
  end_at: string | null;
  duration_minutes: number;
  planned_minutes: number | null;
  focus_area_id: string | null;
  task_id: string | null;
  routine_id: string | null;
  calendar_event_id: string | null;
  title: string;
  source: TimeSource;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeEntryInsert = {
  entry_date?: string;
  start_at?: string | null;
  end_at?: string | null;
  duration_minutes: number;
  planned_minutes?: number | null;
  focus_area_id?: string | null;
  task_id?: string | null;
  routine_id?: string | null;
  calendar_event_id?: string | null;
  title: string;
  source?: TimeSource;
  note?: string | null;
  updated_at?: string;
};

export type Routine = {
  id: string;
  title: string;
  notes: string | null;
  focus_area_id: string | null;
  goal_id: string | null;
  duration_minutes: number | null;
  frequency: RoutineFrequency;
  days_of_week: number[] | null;
  preferred_time: string | null;
  skip_rule: string | null;
  status: RoutineStatus;
  created_at: string;
  updated_at: string;
};

export type RoutineInsert = {
  title: string;
  notes?: string | null;
  focus_area_id?: string | null;
  goal_id?: string | null;
  duration_minutes?: number | null;
  frequency?: RoutineFrequency;
  days_of_week?: number[] | null;
  preferred_time?: string | null;
  skip_rule?: string | null;
  status?: RoutineStatus;
  updated_at?: string;
};

export type RoutineLog = {
  id: string;
  routine_id: string;
  log_date: string;
  status: RoutineLogStatus;
  note: string | null;
  created_at: string;
};

export type RoutineLogInsert = {
  routine_id: string;
  log_date: string;
  status?: RoutineLogStatus;
  note?: string | null;
};

export type Database = {
  public: {
    Tables: {
      tasks: {
        Row: Task;
        Insert: TaskInsert;
        Update: Partial<TaskInsert>;
        Relationships: [];
      };
      journal_entries: {
        Row: JournalEntry;
        Insert: JournalEntryInsert;
        Update: Partial<JournalEntryInsert>;
        Relationships: [];
      };
      goals: {
        Row: Goal;
        Insert: GoalInsert;
        Update: Partial<GoalInsert>;
        Relationships: [];
      };
      focus_areas: {
        Row: FocusArea;
        Insert: Partial<FocusArea>;
        Update: Partial<FocusArea>;
        Relationships: [];
      };
      routines: {
        Row: Routine;
        Insert: RoutineInsert;
        Update: Partial<RoutineInsert>;
        Relationships: [];
      };
      routine_logs: {
        Row: RoutineLog;
        Insert: RoutineLogInsert;
        Update: Partial<RoutineLogInsert>;
        Relationships: [];
      };
      inbox_items: {
        Row: InboxItem;
        Insert: InboxItemInsert;
        Update: Partial<InboxItemInsert>;
        Relationships: [];
      };
      sleep_logs: {
        Row: SleepLog;
        Insert: SleepLogInsert;
        Update: Partial<SleepLogInsert>;
        Relationships: [];
      };
      time_entries: {
        Row: TimeEntry;
        Insert: TimeEntryInsert;
        Update: Partial<TimeEntryInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
