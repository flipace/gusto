import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format, isToday, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { de } from 'date-fns/locale'
import { Dumbbell, Scale, Calendar as CalendarIcon, TrendingUp, ChevronRight, Sparkles } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'

export function Dashboard() {
  const { data } = useApp()

  const latestWeight = data.weightEntries[0]
  const currentPlan = data.trainingPlans[0]

  const todaysWorkout = useMemo(() => {
    if (!currentPlan) return null
    return currentPlan.workouts.find(w => isToday(parseISO(w.date)))
  }, [currentPlan])

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })

  const calendarMarkers = useMemo(() => {
    const markers: { date: Date; color: string }[] = []

    // Add training session markers
    data.trainingSessions.forEach(s => {
      markers.push({
        date: parseISO(s.date),
        color: 'bg-green-500',
      })
    })

    // Add planned workout markers
    if (currentPlan) {
      currentPlan.workouts.forEach(w => {
        if (!w.completed) {
          markers.push({
            date: parseISO(w.date),
            color: 'bg-blue-500',
          })
        }
      })
    }

    return markers
  }, [data.trainingSessions, currentPlan])

  const stats = useMemo(() => {
    const thisWeekSessions = data.trainingSessions.filter(s => {
      const date = parseISO(s.date)
      return date >= weekStart && date <= weekEnd
    })

    const totalExercises = thisWeekSessions.reduce((acc, s) => acc + s.exercises.length, 0)
    const avgEffort = thisWeekSessions.length > 0
      ? thisWeekSessions.reduce((acc, s) => acc + (s.overallEffort || 0), 0) / thisWeekSessions.length
      : 0

    return {
      sessionsThisWeek: thisWeekSessions.length,
      totalExercises,
      avgEffort: avgEffort.toFixed(1),
    }
  }, [data.trainingSessions, weekStart, weekEnd])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {format(new Date(), "EEEE, dd. MMMM yyyy", { locale: de })}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktuelles Gewicht</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestWeight ? `${latestWeight.weight} ${latestWeight.unit}` : '-'}
            </div>
            {latestWeight && (
              <p className="text-xs text-muted-foreground">
                vom {format(parseISO(latestWeight.date), 'dd.MM.yyyy')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trainings diese Woche</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sessionsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalExercises} Übungen absolviert
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durchschn. Anstrengung</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgEffort}/10</div>
            <p className="text-xs text-muted-foreground">diese Woche</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktiver Plan</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentPlan ? currentPlan.workouts.filter(w => !w.completed).length : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentPlan ? 'Workouts ausstehend' : 'Kein aktiver Plan'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Workout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Heutiges Workout
            </CardTitle>
            <CardDescription>
              {todaysWorkout ? todaysWorkout.name : 'Kein Workout für heute geplant'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaysWorkout ? (
              <div className="space-y-4">
                <ul className="space-y-2">
                  {todaysWorkout.exercises.slice(0, 4).map((ex) => (
                    <li key={ex.id} className="flex items-center justify-between text-sm">
                      <span>{ex.name}</span>
                      <Badge variant="outline">
                        {ex.sets}x{ex.reps}
                        {ex.weight && ` @ ${ex.weight}${ex.weightUnit || 'kg'}`}
                      </Badge>
                    </li>
                  ))}
                  {todaysWorkout.exercises.length > 4 && (
                    <li className="text-sm text-muted-foreground">
                      +{todaysWorkout.exercises.length - 4} weitere Übungen
                    </li>
                  )}
                </ul>
                <Link to="/training">
                  <Button className="w-full">
                    Training starten
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Erstelle einen AI-Trainingsplan oder füge ein manuelles Training hinzu.
                </p>
                <div className="flex gap-2">
                  <Link to="/plans" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Plan erstellen
                    </Button>
                  </Link>
                  <Link to="/training" className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Dumbbell className="h-4 w-4 mr-2" />
                      Training erfassen
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Kalender</CardTitle>
            <CardDescription>
              <span className="inline-flex items-center gap-2 mr-4">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Absolviert
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Geplant
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Calendar markers={calendarMarkers} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Aktivitäten</CardTitle>
        </CardHeader>
        <CardContent>
          {data.trainingSessions.length > 0 ? (
            <ul className="space-y-4">
              {data.trainingSessions.slice(0, 5).map((session) => (
                <li key={session.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{session.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(session.date), 'dd.MM.yyyy')} - {session.exercises.length} Übungen
                    </p>
                  </div>
                  {session.overallEffort && (
                    <Badge variant={session.overallEffort >= 8 ? 'default' : 'secondary'}>
                      {session.overallEffort}/10
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              Noch keine Trainings erfasst. Starte dein erstes Training!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
