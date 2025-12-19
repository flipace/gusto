import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { v4 as uuidv4 } from 'uuid'
import { Plus, Trash2, Save, Edit2, X } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { TrainingSession, Exercise } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

const defaultExercise: Omit<Exercise, 'id'> = {
  name: '',
  sets: 3,
  reps: 10,
  weight: undefined,
  weightUnit: 'kg',
  effort: 5,
  notes: '',
}

export function Training() {
  const { data, addTrainingSession, updateTrainingSession, deleteTrainingSession } = useApp()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null)
  const [sessionName, setSessionName] = useState('')
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [sessionNotes, setSessionNotes] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])

  const resetForm = () => {
    setSessionName('')
    setSessionDate(format(new Date(), 'yyyy-MM-dd'))
    setSessionNotes('')
    setExercises([])
    setEditingSession(null)
  }

  const openNewSession = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditSession = (session: TrainingSession) => {
    setEditingSession(session)
    setSessionName(session.name)
    setSessionDate(session.date)
    setSessionNotes(session.notes || '')
    setExercises([...session.exercises])
    setIsDialogOpen(true)
  }

  const addExercise = () => {
    setExercises([...exercises, { ...defaultExercise, id: uuidv4() }])
  }

  const updateExercise = (id: string, field: keyof Exercise, value: Exercise[keyof Exercise]) => {
    setExercises(exercises.map(ex =>
      ex.id === id ? { ...ex, [field]: value } : ex
    ))
  }

  const removeExercise = (id: string) => {
    setExercises(exercises.filter(ex => ex.id !== id))
  }

  const handleSave = () => {
    if (!sessionName.trim() || exercises.length === 0) return

    const avgEffort = exercises.reduce((acc, ex) => acc + ex.effort, 0) / exercises.length

    const session: TrainingSession = {
      id: editingSession?.id || uuidv4(),
      date: sessionDate,
      name: sessionName.trim(),
      exercises,
      notes: sessionNotes.trim() || undefined,
      overallEffort: Math.round(avgEffort),
      completed: true,
    }

    if (editingSession) {
      updateTrainingSession(session)
    } else {
      addTrainingSession(session)
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (confirm('Training wirklich löschen?')) {
      deleteTrainingSession(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Training</h1>
          <p className="text-muted-foreground">Erfasse und verwalte deine Trainingseinheiten</p>
        </div>
        <Button onClick={openNewSession}>
          <Plus className="h-4 w-4 mr-2" />
          Neues Training
        </Button>
      </div>

      {data.trainingSessions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground mb-4">Noch keine Trainings erfasst</p>
            <Button onClick={openNewSession}>
              <Plus className="h-4 w-4 mr-2" />
              Erstes Training erfassen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.trainingSessions.map((session) => (
            <Card key={session.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{session.name}</CardTitle>
                    <CardDescription>
                      {format(parseISO(session.date), 'EEEE, dd. MMMM yyyy', { locale: de })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.overallEffort && (
                      <Badge variant={session.overallEffort >= 8 ? 'default' : 'secondary'}>
                        Anstrengung: {session.overallEffort}/10
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEditSession(session)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(session.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {session.exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                      <span className="font-medium">{ex.name}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          {ex.sets}x{ex.reps}
                          {ex.weight && ` @ ${ex.weight}${ex.weightUnit || 'kg'}`}
                        </span>
                        <Badge variant="outline" className="min-w-[60px] justify-center">
                          {ex.effort}/10
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {session.notes && (
                  <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
                    {session.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSession ? 'Training bearbeiten' : 'Neues Training erfassen'}
            </DialogTitle>
            <DialogDescription>
              Füge die Details deines Trainings hinzu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sessionName">Name</Label>
                <Input
                  id="sessionName"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="z.B. Oberkörper, Beine, Cardio..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionDate">Datum</Label>
                <Input
                  id="sessionDate"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Übungen</h3>
                <Button variant="outline" size="sm" onClick={addExercise}>
                  <Plus className="h-4 w-4 mr-2" />
                  Übung hinzufügen
                </Button>
              </div>

              {exercises.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Noch keine Übungen hinzugefügt
                </p>
              ) : (
                <div className="space-y-4">
                  {exercises.map((ex, index) => (
                    <Card key={ex.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-4">
                          <span className="text-sm font-medium text-muted-foreground">
                            Übung {index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeExercise(ex.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label>Name der Übung</Label>
                            <Input
                              value={ex.name}
                              onChange={(e) => updateExercise(ex.id, 'name', e.target.value)}
                              placeholder="z.B. Bankdrücken, Kniebeugen..."
                            />
                          </div>

                          <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label>Sätze</Label>
                              <Input
                                type="number"
                                min="1"
                                value={ex.sets}
                                onChange={(e) => updateExercise(ex.id, 'sets', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Wiederholungen</Label>
                              <Input
                                type="number"
                                min="1"
                                value={ex.reps}
                                onChange={(e) => updateExercise(ex.id, 'reps', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Gewicht</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.5"
                                value={ex.weight || ''}
                                onChange={(e) => updateExercise(ex.id, 'weight', parseFloat(e.target.value) || undefined)}
                                placeholder="optional"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Einheit</Label>
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={ex.weightUnit || 'kg'}
                                onChange={(e) => updateExercise(ex.id, 'weightUnit', e.target.value as 'kg' | 'lbs')}
                              >
                                <option value="kg">kg</option>
                                <option value="lbs">lbs</option>
                              </select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Anstrengung: {ex.effort}/10</Label>
                            <Slider
                              value={[ex.effort]}
                              onValueChange={([value]) => updateExercise(ex.id, 'effort', value)}
                              min={1}
                              max={10}
                              step={1}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Notizen (optional)</Label>
                            <Input
                              value={ex.notes || ''}
                              onChange={(e) => updateExercise(ex.id, 'notes', e.target.value)}
                              placeholder="z.B. Technik, Gefühl, etc."
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="sessionNotes">Notizen zum Training (optional)</Label>
              <Textarea
                id="sessionNotes"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Allgemeine Notizen zum Training..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={!sessionName.trim() || exercises.length === 0}>
              <Save className="h-4 w-4 mr-2" />
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
