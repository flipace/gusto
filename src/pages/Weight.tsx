import { useState, useMemo } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { v4 as uuidv4 } from 'uuid'
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import type { WeightEntry } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'

export function Weight() {
  const { data, addWeightEntry, updateWeightEntry, deleteWeightEntry } = useApp()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null)
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')
  const [unit, setUnit] = useState<'kg' | 'lbs'>(data.settings.weightUnit)

  const resetForm = () => {
    setWeight('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setNotes('')
    setUnit(data.settings.weightUnit)
    setEditingEntry(null)
  }

  const openNewEntry = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditEntry = (entry: WeightEntry) => {
    setEditingEntry(entry)
    setWeight(entry.weight.toString())
    setDate(entry.date)
    setNotes(entry.notes || '')
    setUnit(entry.unit)
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    const weightValue = parseFloat(weight)
    if (isNaN(weightValue) || weightValue <= 0) return

    const entry: WeightEntry = {
      id: editingEntry?.id || uuidv4(),
      date,
      weight: weightValue,
      unit,
      notes: notes.trim() || undefined,
    }

    if (editingEntry) {
      updateWeightEntry(entry)
    } else {
      addWeightEntry(entry)
    }

    setIsDialogOpen(false)
    resetForm()
  }

  const handleDelete = (id: string) => {
    if (confirm('Eintrag wirklich löschen?')) {
      deleteWeightEntry(id)
    }
  }

  const stats = useMemo(() => {
    if (data.weightEntries.length < 2) {
      return { change7d: null, change30d: null, trend: 'neutral' as const }
    }

    const now = new Date()
    const entries = [...data.weightEntries].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const latest = entries[entries.length - 1]
    const week7 = entries.find(e => new Date(e.date) <= subDays(now, 7))
    const day30 = entries.find(e => new Date(e.date) <= subDays(now, 30))

    const change7d = week7 ? latest.weight - week7.weight : null
    const change30d = day30 ? latest.weight - day30.weight : null

    let trend: 'up' | 'down' | 'neutral' = 'neutral'
    if (change7d !== null) {
      if (change7d > 0.5) trend = 'up'
      else if (change7d < -0.5) trend = 'down'
    }

    return { change7d, change30d, trend }
  }, [data.weightEntries])

  const TrendIcon = stats.trend === 'up' ? TrendingUp : stats.trend === 'down' ? TrendingDown : Minus

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gewicht</h1>
          <p className="text-muted-foreground">Verfolge deinen Gewichtsverlauf</p>
        </div>
        <Button onClick={openNewEntry}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Eintrag
        </Button>
      </div>

      {/* Stats Cards */}
      {data.weightEntries.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Aktuelles Gewicht</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {data.weightEntries[0].weight} {data.weightEntries[0].unit}
              </div>
              <p className="text-sm text-muted-foreground">
                vom {format(parseISO(data.weightEntries[0].date), 'dd.MM.yyyy')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Veränderung (7 Tage)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendIcon className={`h-6 w-6 ${
                  stats.trend === 'up' ? 'text-red-500' :
                  stats.trend === 'down' ? 'text-green-500' : 'text-muted-foreground'
                }`} />
                <span className="text-3xl font-bold">
                  {stats.change7d !== null
                    ? `${stats.change7d > 0 ? '+' : ''}${stats.change7d.toFixed(1)} ${data.settings.weightUnit}`
                    : '-'
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Veränderung (30 Tage)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.change30d !== null
                  ? `${stats.change30d > 0 ? '+' : ''}${stats.change30d.toFixed(1)} ${data.settings.weightUnit}`
                  : '-'
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weight Chart (Simple visual) */}
      {data.weightEntries.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Gewichtsverlauf</CardTitle>
            <CardDescription>Letzte 30 Einträge</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-end gap-1">
              {[...data.weightEntries].slice(0, 30).reverse().map((entry) => {
                const weights = data.weightEntries.slice(0, 30).map(e => e.weight)
                const min = Math.min(...weights)
                const max = Math.max(...weights)
                const range = max - min || 1
                const height = ((entry.weight - min) / range) * 100 + 20

                return (
                  <div
                    key={entry.id}
                    className="flex-1 bg-primary/80 hover:bg-primary rounded-t transition-colors cursor-pointer group relative"
                    style={{ height: `${height}%` }}
                    title={`${entry.weight} ${entry.unit} - ${format(parseISO(entry.date), 'dd.MM.')}`}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover border rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                      {entry.weight} {entry.unit}<br />
                      {format(parseISO(entry.date), 'dd.MM.yyyy')}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries List */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Einträge</CardTitle>
        </CardHeader>
        <CardContent>
          {data.weightEntries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Noch keine Gewichtseinträge. Füge deinen ersten Eintrag hinzu!
            </p>
          ) : (
            <div className="space-y-2">
              {data.weightEntries.map((entry, index) => {
                const prevEntry = data.weightEntries[index + 1]
                const diff = prevEntry ? entry.weight - prevEntry.weight : null

                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-semibold text-lg">
                          {entry.weight} {entry.unit}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(entry.date), 'EEEE, dd. MMMM yyyy', { locale: de })}
                        </p>
                      </div>
                      {diff !== null && (
                        <span className={`text-sm font-medium ${
                          diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-muted-foreground'
                        }`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)} {entry.unit}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.notes && (
                        <span className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {entry.notes}
                        </span>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEditEntry(entry)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Eintrag bearbeiten' : 'Neuer Gewichtseintrag'}
            </DialogTitle>
            <DialogDescription>
              Erfasse dein aktuelles Gewicht
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Gewicht</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="z.B. 75.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Einheit</Label>
                <select
                  id="unit"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value as 'kg' | 'lbs')}
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Datum</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notizen (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="z.B. Morgens, nüchtern..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={!weight || parseFloat(weight) <= 0}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
