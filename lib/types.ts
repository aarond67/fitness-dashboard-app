export type OccupancyRow = {
  timestamp: string;
  day_of_week: string;
  date: string;
  time: string;
  time_bucket_15?: string;
  bucket_index_15?: string | number;
  time_bucket_30?: string;
  bucket_index?: string | number;
  facility_name: string;
  status: string;
  percent_full: string | number;
  raw_text?: string;
  people?: string | number;
  capacity?: string | number;
  is_open?: string | boolean;
  hour_summary?: string;
  is_data_unavailable?: string | boolean;
  is_valid_percent?: string | boolean;
  is_valid_predictor_row?: string | boolean;
};

export type BestTimeRow = {
  facility_name: string;
  day?: string;
  day_of_week?: string;
  hour?: string | number;
  bucket_index?: string | number;
  time_bucket_30?: string;
  avg_percent: string | number;
  sample_count?: string | number;
  confidence?: string;
  median_percent?: string | number;
  p75_percent?: string | number;
};

export type MealItem = {
  id: string;
  name: string;
  calories: number;
  protein: number;
  recipe?: string;
  checked?: boolean;
  notes?: string;
  category: "breakfast" | "lunch" | "dinner" | "shake" | "snack";
};

export type WorkoutExercise = {
  id: string;
  name: string;
  sets: string;
  reps: string;
  notes?: string;
  done?: boolean;
};

export type WorkoutDay = {
  id: string;
  title: string;
  focus: string;
  timeWindow: string;
  notes?: string;
  exercises: WorkoutExercise[];
};

export type CalendarMeal = {
  id: string;
  type: "meal";
  title: string;
  mealId: string;
  day: string;
  checked?: boolean;
  notes?: string;
};

export type CalendarWorkout = {
  id: string;
  type: "workout";
  title: string;
  workoutId: string;
  day: string;
  checked?: boolean;
  notes?: string;
};

export type CalendarEntry = CalendarMeal | CalendarWorkout;
