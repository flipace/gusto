import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Sparkles, Download, Trash2, ChevronDown, ChevronUp, Calendar, Loader2, CheckCircle2, Circle } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { generateTrainingPlan, generateICS } from '@/lib/ai'
import type { TrainingPlan, PlannedWorkout } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function Plans() {
  const { data, addTrainingPlan, updateTrainingPlan, deleteTrainingPlan } = useApp()
  const [isGenerating, setIsGenerating] = useState(false)
  const [instructions, setInstructions] = useState('')
  const [error, setError] = useState('')
  const [expandedPlan, setExpandedPlan] = useState<string | null>(data.trainingPlans[0]?.id || null)

  const handleGeneratePlan = async () => {
    if (!data.settings.apiKey) {
      setError('Bitte API-Key in den Einstellungen hinterlegen')
      return
    }

    setIsGenerating(true)
    setError('')

    try {
      const plan = await generateTrainingPlan(data, instructions.trim() || undefined)
      addTrainingPlan(plan)
      setExpandedPlan(plan.id)
      setInstructions('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportICS = (plan: TrainingPlan) => {
    const ics = generateICS(plan)
    const blob = new Blob([ics], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trainingsplan-${plan.weekStartDate}.ics`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDeletePlan = (id: string) => {
    if (confirm('Trainingsplan wirklich löschen?')) {
      deleteTrainingPlan(id)
    }
  }

  const toggleWorkoutComplete = (plan: TrainingPlan, workoutId: string) => {
    const updatedPlan = {
      ...plan,
      workouts: plan.workouts.map(w =>
        w.id === workoutId ? { ...w, completed: !w.completed } : w
      )
    }
    updateTrainingPlan(updatedPlan)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Trainingspläne</h1>
        <p className="text-muted-foreground">Erstelle AI-generierte Trainingspläne basierend auf deiner Historie</p>
      </div>

      {/* Generate Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Neuen Plan generieren
          </CardTitle>
          <CardDescription>
            Die AI analysiert deine Trainingshistorie, Gewichtsverlauf und verfügbare Ausrüstung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="instructions">Zusätzliche Anweisungen (optional)</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="z.B. Fokus auf Oberkörper, mehr Cardio, weniger Beine wegen Knieproblemen..."
              rows={3}
              disabled={isGenerating}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleGeneratePlan}
            disabled={isGenerating || !data.settings.apiKey}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Plan wird generiert...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Trainingsplan generieren
              </>
            )}
          </Button>

          {!data.settings.apiKey && (
            <p className="text-sm text-muted-foreground text-center">
              Bitte zuerst einen OpenRouter API-Key in den Einstellungen hinterlegen
            </p>
          )}
        </CardContent>
      </Card>

      {/* Plans List */}
      {data.trainingPlans.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">Noch keine Trainingspläne erstellt</p>
            <p className="text-sm text-muted-foreground">
              Generiere deinen ersten AI-Trainingsplan basierend auf deiner Historie
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.trainingPlans.map((plan) => {
            const isExpanded = expandedPlan === plan.id
            const completedCount = plan.workouts.filter(w => w.completed).length

            return (
              <Card key={plan.id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Woche {format(parseISO(plan.weekStartDate), 'dd.MM.')} - {format(parseISO(plan.weekEndDate), 'dd.MM.yyyy')}
                      </CardTitle>
                      <CardDescription>
                        Erstellt am {format(parseISO(plan.createdAt), 'dd.MM.yyyy HH:mm', { locale: de })}
                        {' '} | {completedCount}/{plan.workouts.length} Workouts abgeschlossen
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleExportICS(plan)
                        }}
                        title="Als ICS exportieren"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePlan(plan.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {plan.goals && plan.goals.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {plan.goals.map((goal, i) => (
                        <Badge key={i} variant="secondary">{goal}</Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 space-y-6">
                    {plan.aiExplanation && (
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          AI-Erklärung
                        </h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {plan.aiExplanation}
                        </p>
                      </div>
                    )}

                    <Separator />

                    <div className="space-y-4">
                      {plan.workouts.map((workout) => (
                        <WorkoutCard
                          key={workout.id}
                          workout={workout}
                          onToggleComplete={() => toggleWorkoutComplete(plan, workout.id)}
                        />
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface WorkoutCardProps {
  workout: PlannedWorkout
  onToggleComplete: () => void
}

function WorkoutCard({ workout, onToggleComplete }: WorkoutCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={`border rounded-lg ${workout.completed ? 'bg-muted/30' : ''}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleComplete()
            }}
            className="hover:scale-110 transition-transform"
          >
            {workout.completed ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <Circle className="h-6 w-6 text-muted-foreground" />
            )}
          </button>
          <div>
            <h4 className={`font-semibold ${workout.completed ? 'line-through text-muted-foreground' : ''}`}>
              {workout.name}
            </h4>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(workout.date), 'EEEE, dd. MMMM', { locale: de })}
              {' '} | {workout.exercises.length} Übungen
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 pt-0">
          <Separator className="mb-4" />
          <div className="space-y-3">
            {workout.exercises.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{ex.name}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>
                    {ex.sets}x{ex.reps}
                    {ex.weight && ` @ ${ex.weight}${ex.weightUnit || 'kg'}`}
                  </span>
                  {ex.restBetweenSets && (
                    <Badge variant="outline" className="text-xs">
                      {ex.restBetweenSets}s Pause
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          {workout.notes && (
            <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
              {workout.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
