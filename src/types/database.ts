export const TASK_CONTEXTS = ['osobni', 'dibsido', 'weply', 'nccore', 'skola'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const TASK_STATUSES = ['backlog', 'done'] as const;
export const GOAL_STATUSES = ['active', 'done', 'dropped'] as const;
export const EFFORT_MINUTES = [15, 30, 60, 120] as const;

export type TaskContext = (typeof TASK_CONTEXTS)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type GoalStatus = (typeof GOAL_STATUSES)[number];
export type EffortMinutes = (typeof EFFORT_MINUTES)[number];

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

export type JournalEntry = {
  id: string;
  entry_date: string;
  summary: string;
  created_at: string;
  updated_at: string;
};

export type JournalEntryInsert = {
  entry_date: string;
  summary: string;
  updated_at?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
