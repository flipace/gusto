export interface WeightEntry {
  id: string
  date: string // ISO date string
  weight: number
  unit: 'kg' | 'lbs'
  notes?: string
}

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  weight?: number
  weightUnit?: 'kg' | 'lbs'
  duration?: number // in minutes
  effort: number // 1-10
  notes?: string
}

export interface TrainingSession {
  id: string
  date: string // ISO date string
  name: string
  exercises: Exercise[]
  totalDuration?: number // in minutes
  overallEffort?: number // 1-10 average
  notes?: string
  completed: boolean
}

export interface PlannedWorkout {
  id: string
  date: string // ISO date string
  name: string
  exercises: PlannedExercise[]
  notes?: string
  aiExplanation?: string
  completed: boolean
  actualSession?: TrainingSession
}

export interface PlannedExercise {
  id: string
  name: string
  sets: number
  reps: number | string // can be "8-12" range
  weight?: number
  weightUnit?: 'kg' | 'lbs'
  duration?: number
  restBetweenSets?: number // in seconds
  notes?: string
}

export interface TrainingPlan {
  id: string
  createdAt: string
  weekStartDate: string
  weekEndDate: string
  workouts: PlannedWorkout[]
  aiExplanation: string
  goals?: string[]
}

export interface Equipment {
  id: string
  name: string
  category: 'weights' | 'cardio' | 'resistance' | 'other'
  details?: string
}

export interface UserProfile {
  name?: string
  age?: number
  height?: number
  heightUnit?: 'cm' | 'ft'
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced'
  goals?: string[]
  injuries?: string[]
  preferences?: string[]
}

export interface Settings {
  apiKey: string
  model: string
  weightUnit: 'kg' | 'lbs'
  equipment: Equipment[]
  userProfile: UserProfile
  theme: 'light' | 'dark' | 'system'
  language: string
}

export interface AppData {
  weightEntries: WeightEntry[]
  trainingSessions: TrainingSession[]
  trainingPlans: TrainingPlan[]
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = {
  apiKey: '',
  model: 'anthropic/claude-3.5-haiku',
  weightUnit: 'kg',
  equipment: [],
  userProfile: {},
  theme: 'system',
  language: 'de'
}

export const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku (Recommended)' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
]

export const EQUIPMENT_PRESETS: Equipment[] = [
  { id: 'dumbbells', name: 'Kurzhanteln', category: 'weights' },
  { id: 'barbell', name: 'Langhantel', category: 'weights' },
  { id: 'kettlebell', name: 'Kettlebell', category: 'weights' },
  { id: 'pull-up-bar', name: 'Klimmzugstange', category: 'resistance' },
  { id: 'resistance-bands', name: 'Widerstandsbänder', category: 'resistance' },
  { id: 'bench', name: 'Hantelbank', category: 'other' },
  { id: 'yoga-mat', name: 'Yogamatte', category: 'other' },
  { id: 'jump-rope', name: 'Springseil', category: 'cardio' },
  { id: 'treadmill', name: 'Laufband', category: 'cardio' },
  { id: 'bike', name: 'Heimtrainer/Fahrrad', category: 'cardio' },
  { id: 'rowing-machine', name: 'Rudergerät', category: 'cardio' },
  { id: 'foam-roller', name: 'Faszienrolle', category: 'other' },
]
