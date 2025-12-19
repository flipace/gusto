import { useState, useRef } from 'react'
import { useApp } from '@/context/AppContext'
import { AVAILABLE_MODELS, EQUIPMENT_PRESETS, type Equipment, type Settings as SettingsType, type UserProfile } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Upload, Save, Eye, EyeOff, Plus, X, Trash2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

export function Settings() {
  const { data, updateSettings, exportData, importData } = useApp()
  const [settings, setSettings] = useState<SettingsType>(data.settings)
  const [showApiKey, setShowApiKey] = useState(false)
  const [customEquipment, setCustomEquipment] = useState('')
  const [isSaved, setIsSaved] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleChange = <K extends keyof SettingsType>(key: K, value: SettingsType[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setIsSaved(false)
  }

  const handleProfileChange = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    setSettings(prev => ({
      ...prev,
      userProfile: { ...prev.userProfile, [key]: value }
    }))
    setIsSaved(false)
  }

  const toggleEquipment = (preset: Equipment) => {
    const exists = settings.equipment.some(e => e.id === preset.id)
    if (exists) {
      handleChange('equipment', settings.equipment.filter(e => e.id !== preset.id))
    } else {
      handleChange('equipment', [...settings.equipment, preset])
    }
  }

  const addCustomEquipment = () => {
    if (!customEquipment.trim()) return
    const newEquipment: Equipment = {
      id: uuidv4(),
      name: customEquipment.trim(),
      category: 'other',
    }
    handleChange('equipment', [...settings.equipment, newEquipment])
    setCustomEquipment('')
  }

  const removeEquipment = (id: string) => {
    handleChange('equipment', settings.equipment.filter(e => e.id !== id))
  }

  const handleSave = () => {
    updateSettings(settings)
    setIsSaved(true)
  }

  const handleExport = () => {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fitness-tracker-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const success = importData(content)
      if (success) {
        setSettings(data.settings)
        alert('Daten erfolgreich importiert!')
      } else {
        alert('Fehler beim Importieren der Daten. Bitte überprüfe das Dateiformat.')
      }
    }
    reader.readAsText(file)
  }

  const handleDeleteAllData = () => {
    if (confirm('Wirklich ALLE Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
      if (confirm('Bist du sicher? Alle Trainings, Gewichtseinträge und Pläne werden gelöscht!')) {
        localStorage.clear()
        window.location.reload()
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Einstellungen</h1>
          <p className="text-muted-foreground">Konfiguriere deine App-Einstellungen</p>
        </div>
        <Button onClick={handleSave} disabled={isSaved}>
          <Save className="h-4 w-4 mr-2" />
          {isSaved ? 'Gespeichert' : 'Speichern'}
        </Button>
      </div>

      {/* API Settings */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Einstellungen</CardTitle>
          <CardDescription>
            Konfiguriere die OpenRouter API für die Trainingsplan-Generierung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenRouter API-Key</Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => handleChange('apiKey', e.target.value)}
                placeholder="sk-or-..."
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Hole dir einen API-Key von{' '}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline">
                openrouter.ai/keys
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">AI-Modell</Label>
            <Select value={settings.model} onValueChange={(value) => handleChange('model', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* User Profile */}
      <Card>
        <CardHeader>
          <CardTitle>Benutzerprofil</CardTitle>
          <CardDescription>
            Informationen für personalisierte Trainingspläne
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                value={settings.userProfile.name || ''}
                onChange={(e) => handleProfileChange('name', e.target.value)}
                placeholder="Dein Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="age">Alter (optional)</Label>
              <Input
                id="age"
                type="number"
                value={settings.userProfile.age || ''}
                onChange={(e) => handleProfileChange('age', parseInt(e.target.value) || undefined)}
                placeholder="30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="height">Größe (optional)</Label>
              <Input
                id="height"
                type="number"
                value={settings.userProfile.height || ''}
                onChange={(e) => handleProfileChange('height', parseInt(e.target.value) || undefined)}
                placeholder="175"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heightUnit">Einheit</Label>
              <Select
                value={settings.userProfile.heightUnit || 'cm'}
                onValueChange={(value) => handleProfileChange('heightUnit', value as 'cm' | 'ft')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cm">cm</SelectItem>
                  <SelectItem value="ft">ft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fitnessLevel">Fitness-Level</Label>
            <Select
              value={settings.userProfile.fitnessLevel || ''}
              onValueChange={(value) => handleProfileChange('fitnessLevel', value as 'beginner' | 'intermediate' | 'advanced')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wähle dein Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Anfänger</SelectItem>
                <SelectItem value="intermediate">Fortgeschritten</SelectItem>
                <SelectItem value="advanced">Profi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goals">Ziele (durch Komma getrennt)</Label>
            <Input
              id="goals"
              value={settings.userProfile.goals?.join(', ') || ''}
              onChange={(e) => handleProfileChange('goals', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="Muskelaufbau, Ausdauer, Abnehmen..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="injuries">Verletzungen/Einschränkungen (durch Komma getrennt)</Label>
            <Input
              id="injuries"
              value={settings.userProfile.injuries?.join(', ') || ''}
              onChange={(e) => handleProfileChange('injuries', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="Knieprobleme, Rückenschmerzen..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferences">Präferenzen (durch Komma getrennt)</Label>
            <Input
              id="preferences"
              value={settings.userProfile.preferences?.join(', ') || ''}
              onChange={(e) => handleProfileChange('preferences', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="Keine Übungen mit Springen, Morgentraining..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle>Verfügbare Ausrüstung</CardTitle>
          <CardDescription>
            Wähle die Geräte, die du zu Hause hast
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {EQUIPMENT_PRESETS.map((preset) => {
              const isSelected = settings.equipment.some(e => e.id === preset.id)
              return (
                <div
                  key={preset.id}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                  }`}
                  onClick={() => toggleEquipment(preset)}
                >
                  <Checkbox checked={isSelected} />
                  <span className="text-sm">{preset.name}</span>
                </div>
              )
            })}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Eigene Ausrüstung hinzufügen</Label>
            <div className="flex gap-2">
              <Input
                value={customEquipment}
                onChange={(e) => setCustomEquipment(e.target.value)}
                placeholder="z.B. Crosstrainer, Boxsack..."
                onKeyDown={(e) => e.key === 'Enter' && addCustomEquipment()}
              />
              <Button variant="outline" onClick={addCustomEquipment}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {settings.equipment.filter(e => !EQUIPMENT_PRESETS.some(p => p.id === e.id)).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {settings.equipment
                .filter(e => !EQUIPMENT_PRESETS.some(p => p.id === e.id))
                .map((eq) => (
                  <Badge key={eq.id} variant="secondary" className="gap-1">
                    {eq.name}
                    <button onClick={() => removeEquipment(eq.id)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Allgemeine Einstellungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Standard Gewichtseinheit</Label>
              <Select
                value={settings.weightUnit}
                onValueChange={(value) => handleChange('weightUnit', value as 'kg' | 'lbs')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilogramm (kg)</SelectItem>
                  <SelectItem value="lbs">Pfund (lbs)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(value) => handleChange('theme', value as 'light' | 'dark' | 'system')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Hell</SelectItem>
                  <SelectItem value="dark">Dunkel</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Datenverwaltung</CardTitle>
          <CardDescription>
            Exportiere oder importiere deine Daten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Daten exportieren
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Daten importieren
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-destructive">Gefahrenzone</Label>
            <Button variant="destructive" onClick={handleDeleteAllData}>
              <Trash2 className="h-4 w-4 mr-2" />
              Alle Daten löschen
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
