export type OccupancyRow = {
  timestamp: string;
  day_of_week: string;
  date: string;
  time: string;
  facility_name: string;
  status: string;
  percent_full: string | number;
  raw_text?: string;
};

export type BestTimeRow = {
  facility_name: string;
  day: string;
  hour: string | number;
  avg_percent: string | number;
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
