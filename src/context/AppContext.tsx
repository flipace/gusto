import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AppData, WeightEntry, TrainingSession, TrainingPlan, Settings } from '@/types'
import * as storage from '@/lib/storage'

interface AppContextType {
  data: AppData
  // Weight entries
  addWeightEntry: (entry: WeightEntry) => void
  updateWeightEntry: (entry: WeightEntry) => void
  deleteWeightEntry: (id: string) => void
  // Training sessions
  addTrainingSession: (session: TrainingSession) => void
  updateTrainingSession: (session: TrainingSession) => void
  deleteTrainingSession: (id: string) => void
  // Training plans
  addTrainingPlan: (plan: TrainingPlan) => void
  updateTrainingPlan: (plan: TrainingPlan) => void
  deleteTrainingPlan: (id: string) => void
  // Settings
  updateSettings: (settings: Settings) => void
  // Data management
  exportData: () => string
  importData: (jsonString: string) => boolean
  refreshData: () => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => storage.loadData())

  const refreshData = useCallback(() => {
    setData(storage.loadData())
  }, [])

  // Weight entries
  const addWeightEntry = useCallback((entry: WeightEntry) => {
    storage.addWeightEntry(entry)
    refreshData()
  }, [refreshData])

  const updateWeightEntry = useCallback((entry: WeightEntry) => {
    storage.updateWeightEntry(entry)
    refreshData()
  }, [refreshData])

  const deleteWeightEntry = useCallback((id: string) => {
    storage.deleteWeightEntry(id)
    refreshData()
  }, [refreshData])

  // Training sessions
  const addTrainingSession = useCallback((session: TrainingSession) => {
    storage.addTrainingSession(session)
    refreshData()
  }, [refreshData])

  const updateTrainingSession = useCallback((session: TrainingSession) => {
    storage.updateTrainingSession(session)
    refreshData()
  }, [refreshData])

  const deleteTrainingSession = useCallback((id: string) => {
    storage.deleteTrainingSession(id)
    refreshData()
  }, [refreshData])

  // Training plans
  const addTrainingPlan = useCallback((plan: TrainingPlan) => {
    storage.addTrainingPlan(plan)
    refreshData()
  }, [refreshData])

  const updateTrainingPlan = useCallback((plan: TrainingPlan) => {
    storage.updateTrainingPlan(plan)
    refreshData()
  }, [refreshData])

  const deleteTrainingPlan = useCallback((id: string) => {
    storage.deleteTrainingPlan(id)
    refreshData()
  }, [refreshData])

  // Settings
  const updateSettings = useCallback((settings: Settings) => {
    storage.updateSettings(settings)
    refreshData()
  }, [refreshData])

  // Data management
  const exportData = useCallback(() => {
    return storage.exportData()
  }, [])

  const importData = useCallback((jsonString: string) => {
    const result = storage.importData(jsonString)
    if (result) {
      refreshData()
      return true
    }
    return false
  }, [refreshData])

  // Apply theme
  useEffect(() => {
    const theme = data.settings.theme
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(theme)
    }
  }, [data.settings.theme])

  return (
    <AppContext.Provider
      value={{
        data,
        addWeightEntry,
        updateWeightEntry,
        deleteWeightEntry,
        addTrainingSession,
        updateTrainingSession,
        deleteTrainingSession,
        addTrainingPlan,
        updateTrainingPlan,
        deleteTrainingPlan,
        updateSettings,
        exportData,
        importData,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
