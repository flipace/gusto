import type { AppData, WeightEntry, TrainingSession, TrainingPlan, Settings } from '@/types'

const STORAGE_KEY = 'fitness-tracker-data'

export function loadData(): AppData {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data) as AppData
      // Ensure all required fields exist with defaults
      return {
        weightEntries: parsed.weightEntries || [],
        trainingSessions: parsed.trainingSessions || [],
        trainingPlans: parsed.trainingPlans || [],
        settings: {
          apiKey: parsed.settings?.apiKey || '',
          model: parsed.settings?.model || 'anthropic/claude-3.5-haiku',
          weightUnit: parsed.settings?.weightUnit || 'kg',
          equipment: parsed.settings?.equipment || [],
          userProfile: parsed.settings?.userProfile || {},
          theme: parsed.settings?.theme || 'system',
          language: parsed.settings?.language || 'de'
        }
      }
    }
  } catch (error) {
    console.error('Error loading data from localStorage:', error)
  }

  return {
    weightEntries: [],
    trainingSessions: [],
    trainingPlans: [],
    settings: {
      apiKey: '',
      model: 'anthropic/claude-3.5-haiku',
      weightUnit: 'kg',
      equipment: [],
      userProfile: {},
      theme: 'system',
      language: 'de'
    }
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Error saving data to localStorage:', error)
  }
}

export function exportData(): string {
  const data = loadData()
  return JSON.stringify(data, null, 2)
}

export function importData(jsonString: string): AppData | null {
  try {
    const data = JSON.parse(jsonString) as AppData
    // Validate structure
    if (!data.weightEntries || !data.trainingSessions || !data.trainingPlans || !data.settings) {
      throw new Error('Invalid data structure')
    }
    saveData(data)
    return data
  } catch (error) {
    console.error('Error importing data:', error)
    return null
  }
}

// Helper functions for specific data operations
export function addWeightEntry(entry: WeightEntry): void {
  const data = loadData()
  data.weightEntries.push(entry)
  data.weightEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  saveData(data)
}

export function updateWeightEntry(entry: WeightEntry): void {
  const data = loadData()
  const index = data.weightEntries.findIndex(e => e.id === entry.id)
  if (index !== -1) {
    data.weightEntries[index] = entry
    data.weightEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    saveData(data)
  }
}

export function deleteWeightEntry(id: string): void {
  const data = loadData()
  data.weightEntries = data.weightEntries.filter(e => e.id !== id)
  saveData(data)
}

export function addTrainingSession(session: TrainingSession): void {
  const data = loadData()
  data.trainingSessions.push(session)
  data.trainingSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  saveData(data)
}

export function updateTrainingSession(session: TrainingSession): void {
  const data = loadData()
  const index = data.trainingSessions.findIndex(s => s.id === session.id)
  if (index !== -1) {
    data.trainingSessions[index] = session
    data.trainingSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    saveData(data)
  }
}

export function deleteTrainingSession(id: string): void {
  const data = loadData()
  data.trainingSessions = data.trainingSessions.filter(s => s.id !== id)
  saveData(data)
}

export function addTrainingPlan(plan: TrainingPlan): void {
  const data = loadData()
  data.trainingPlans.push(plan)
  data.trainingPlans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  saveData(data)
}

export function updateTrainingPlan(plan: TrainingPlan): void {
  const data = loadData()
  const index = data.trainingPlans.findIndex(p => p.id === plan.id)
  if (index !== -1) {
    data.trainingPlans[index] = plan
    saveData(data)
  }
}

export function deleteTrainingPlan(id: string): void {
  const data = loadData()
  data.trainingPlans = data.trainingPlans.filter(p => p.id !== id)
  saveData(data)
}

export function updateSettings(settings: Settings): void {
  const data = loadData()
  data.settings = settings
  saveData(data)
}

export function getSettings(): Settings {
  return loadData().settings
}
