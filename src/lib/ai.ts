import type { AppData, TrainingPlan, PlannedWorkout, PlannedExercise } from '@/types'
import { v4 as uuidv4 } from 'uuid'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { de } from 'date-fns/locale'

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenRouterResponse {
  choices: {
    message: {
      content: string
    }
  }[]
}

export async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: OpenRouterMessage[]
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Fitness Tracker AI',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'OpenRouter API error')
  }

  const data = (await response.json()) as OpenRouterResponse
  return data.choices[0]?.message?.content || ''
}

function buildContextFromData(appData: AppData): string {
  const { weightEntries, trainingSessions, trainingPlans, settings } = appData

  let context = '## Benutzerprofil\n'

  if (settings.userProfile) {
    const profile = settings.userProfile
    if (profile.name) context += `- Name: ${profile.name}\n`
    if (profile.age) context += `- Alter: ${profile.age}\n`
    if (profile.height) context += `- Größe: ${profile.height} ${profile.heightUnit || 'cm'}\n`
    if (profile.fitnessLevel) context += `- Fitness-Level: ${profile.fitnessLevel}\n`
    if (profile.goals?.length) context += `- Ziele: ${profile.goals.join(', ')}\n`
    if (profile.injuries?.length) context += `- Verletzungen/Einschränkungen: ${profile.injuries.join(', ')}\n`
    if (profile.preferences?.length) context += `- Präferenzen: ${profile.preferences.join(', ')}\n`
  }

  context += '\n## Verfügbare Ausrüstung\n'
  if (settings.equipment.length > 0) {
    settings.equipment.forEach(eq => {
      context += `- ${eq.name}${eq.details ? ` (${eq.details})` : ''}\n`
    })
  } else {
    context += '- Nur Körpergewichtsübungen (keine Geräte)\n'
  }

  context += '\n## Gewichtsverlauf (letzte 10 Einträge)\n'
  const recentWeights = weightEntries.slice(0, 10)
  if (recentWeights.length > 0) {
    recentWeights.forEach(w => {
      context += `- ${format(new Date(w.date), 'dd.MM.yyyy', { locale: de })}: ${w.weight} ${w.unit}${w.notes ? ` (${w.notes})` : ''}\n`
    })
  } else {
    context += '- Keine Einträge\n'
  }

  context += '\n## Letzte Trainingseinheiten (letzte 10)\n'
  const recentSessions = trainingSessions.slice(0, 10)
  if (recentSessions.length > 0) {
    recentSessions.forEach(s => {
      context += `\n### ${s.name} - ${format(new Date(s.date), 'dd.MM.yyyy', { locale: de })}\n`
      if (s.overallEffort) context += `Gesamtanstrengung: ${s.overallEffort}/10\n`
      s.exercises.forEach(ex => {
        context += `- ${ex.name}: ${ex.sets}x${ex.reps}${ex.weight ? ` @ ${ex.weight}${ex.weightUnit || 'kg'}` : ''} (Anstrengung: ${ex.effort}/10)${ex.notes ? ` - ${ex.notes}` : ''}\n`
      })
      if (s.notes) context += `Notizen: ${s.notes}\n`
    })
  } else {
    context += '- Keine Einträge\n'
  }

  context += '\n## Bisherige Trainingspläne (letzte 3)\n'
  const recentPlans = trainingPlans.slice(0, 3)
  if (recentPlans.length > 0) {
    recentPlans.forEach(p => {
      context += `\n### Plan vom ${format(new Date(p.createdAt), 'dd.MM.yyyy', { locale: de })} (${p.weekStartDate} - ${p.weekEndDate})\n`
      if (p.goals?.length) context += `Ziele: ${p.goals.join(', ')}\n`
      p.workouts.forEach(w => {
        context += `\n#### ${w.name} - ${format(new Date(w.date), 'EEEE, dd.MM.', { locale: de })}\n`
        w.exercises.forEach(ex => {
          context += `- ${ex.name}: ${ex.sets}x${ex.reps}${ex.weight ? ` @ ${ex.weight}${ex.weightUnit || 'kg'}` : ''}\n`
        })
        if (w.completed && w.actualSession) {
          context += `Status: Abgeschlossen\n`
        }
      })
    })
  } else {
    context += '- Keine bisherigen Pläne\n'
  }

  return context
}

export async function generateTrainingPlan(
  appData: AppData,
  additionalInstructions?: string
): Promise<TrainingPlan> {
  const { settings } = appData

  if (!settings.apiKey) {
    throw new Error('Bitte API-Key in den Einstellungen hinterlegen')
  }

  const context = buildContextFromData(appData)
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })

  const systemPrompt = `Du bist ein erfahrener Personal Trainer und Fitness-Experte. Deine Aufgabe ist es, personalisierte Trainingspläne zu erstellen.

Wichtige Regeln:
1. Berücksichtige IMMER die verfügbare Ausrüstung des Benutzers
2. Beachte das Fitness-Level und eventuelle Verletzungen
3. Passe die Intensität basierend auf den letzten Trainingseinheiten an
4. Variiere die Übungen, aber bleibe konsistent in der Progression
5. Erkläre IMMER warum du bestimmte Übungen gewählt hast
6. Antworte IMMER auf Deutsch

Dein Output muss ein valides JSON-Objekt sein mit folgendem Format:
{
  "explanation": "Detaillierte Erklärung des Plans (warum diese Übungen, Progression, etc.)",
  "goals": ["Ziel 1", "Ziel 2"],
  "workouts": [
    {
      "date": "YYYY-MM-DD",
      "name": "Name des Workouts",
      "exercises": [
        {
          "name": "Übungsname",
          "sets": 3,
          "reps": "10-12",
          "weight": 20,
          "weightUnit": "kg",
          "restBetweenSets": 60,
          "notes": "Optionale Hinweise"
        }
      ],
      "notes": "Optionale Workout-Notizen"
    }
  ]
}`

  const userPrompt = `Hier sind alle relevanten Informationen über den Benutzer und seine Trainingshistorie:

${context}

Erstelle einen Trainingsplan für die kommende Woche (${format(weekStart, 'dd.MM.yyyy')} - ${format(weekEnd, 'dd.MM.yyyy')}).

${additionalInstructions ? `Zusätzliche Anweisungen: ${additionalInstructions}` : ''}

Antworte NUR mit dem JSON-Objekt, ohne zusätzlichen Text oder Markdown-Formatierung.`

  const response = await callOpenRouter(settings.apiKey, settings.model, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ])

  // Parse the JSON response
  let planData: {
    explanation: string
    goals?: string[]
    workouts: {
      date: string
      name: string
      exercises: {
        name: string
        sets: number
        reps: number | string
        weight?: number
        weightUnit?: 'kg' | 'lbs'
        restBetweenSets?: number
        notes?: string
      }[]
      notes?: string
    }[]
  }

  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    planData = JSON.parse(jsonMatch[0])
  } catch {
    console.error('Failed to parse AI response:', response)
    throw new Error('Konnte AI-Antwort nicht verarbeiten. Bitte erneut versuchen.')
  }

  // Convert to our TrainingPlan format
  const workouts: PlannedWorkout[] = planData.workouts.map((w) => ({
    id: uuidv4(),
    date: w.date,
    name: w.name,
    exercises: w.exercises.map((ex): PlannedExercise => ({
      id: uuidv4(),
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      weightUnit: ex.weightUnit,
      restBetweenSets: ex.restBetweenSets,
      notes: ex.notes,
    })),
    notes: w.notes,
    completed: false,
  }))

  const plan: TrainingPlan = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    weekStartDate: format(weekStart, 'yyyy-MM-dd'),
    weekEndDate: format(weekEnd, 'yyyy-MM-dd'),
    workouts,
    aiExplanation: planData.explanation,
    goals: planData.goals,
  }

  return plan
}

export function generateICS(plan: TrainingPlan): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fitness Tracker AI//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  plan.workouts.forEach((workout) => {
    const date = workout.date.replace(/-/g, '')
    const uid = `${workout.id}@fitness-tracker`

    const description = workout.exercises
      .map((ex) => `${ex.name}: ${ex.sets}x${ex.reps}${ex.weight ? ` @ ${ex.weight}${ex.weightUnit || 'kg'}` : ''}`)
      .join('\\n')

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
      `DTSTART;VALUE=DATE:${date}`,
      `SUMMARY:${workout.name}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT'
    )
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
