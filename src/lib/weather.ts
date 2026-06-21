// Open-Meteo weather API wrapper

export interface WeatherEvent {
  month: number
  description: string
  rainDays: number
  impactDays: number
  severity: 'none' | 'minor' | 'moderate' | 'severe'
}

// San Francisco climate — dry summer/fall, wet winter (Pacific storms & atmospheric rivers)
const DEMO_WEATHER_EVENTS: WeatherEvent[] = [
  { month: 1, description: 'Dry late summer — clear skies', rainDays: 1, impactDays: 0, severity: 'none' },
  { month: 2, description: 'Coastal fog — mild mornings', rainDays: 1, impactDays: 0, severity: 'none' },
  { month: 3, description: 'Early autumn — dry and clear', rainDays: 2, impactDays: 0, severity: 'none' },
  { month: 4, description: 'First autumn rains arrive', rainDays: 6, impactDays: 2, severity: 'minor' },
  { month: 5, description: 'Pacific fronts — rain increasing', rainDays: 9, impactDays: 4, severity: 'minor' },
  { month: 6, description: 'Atmospheric river — 14 workdays lost', rainDays: 22, impactDays: 14, severity: 'severe' },
  { month: 7, description: 'Peak winter storms — construction paused', rainDays: 24, impactDays: 10, severity: 'severe' },
  { month: 8, description: 'Storms receding — intermittent rain', rainDays: 14, impactDays: 5, severity: 'moderate' },
  { month: 9, description: 'Late winter — conditions clearing', rainDays: 5, impactDays: 1, severity: 'none' },
  { month: 10, description: 'Spring — dry season returns', rainDays: 2, impactDays: 0, severity: 'none' },
  { month: 11, description: 'Dry spring — ideal construction', rainDays: 1, impactDays: 0, severity: 'none' },
  { month: 12, description: 'Dry early summer — optimal road completion', rainDays: 0, impactDays: 0, severity: 'none' },
]

export async function fetchWeather(lat: number, lng: number, month: number): Promise<WeatherEvent> {
  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.VITE_SKIP_API === 'true'
  if (demoMode) return DEMO_WEATHER_EVENTS[month - 1] ?? DEMO_WEATHER_EVENTS[0]

  try {
    const startDate = `2024-${String(month).padStart(2, '0')}-01`
    const endDate = `2024-${String(month).padStart(2, '0')}-28`
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum&timezone=America%2FLos_Angeles`
    const res = await fetch(url)
    const data = await res.json()
    const rainDays = (data.daily?.precipitation_sum ?? []).filter((v: number) => v > 5).length
    const impactDays = Math.max(0, rainDays - 3)
    return {
      month,
      description: rainDays > 15 ? 'Heavy winter rainfall' : rainDays > 5 ? 'Moderate rainfall' : 'Mostly dry',
      rainDays,
      impactDays,
      severity: impactDays > 10 ? 'severe' : impactDays > 5 ? 'moderate' : impactDays > 0 ? 'minor' : 'none',
    }
  } catch {
    return DEMO_WEATHER_EVENTS[month - 1] ?? DEMO_WEATHER_EVENTS[0]
  }
}

export function getWeatherForMonth(month: number): WeatherEvent {
  return DEMO_WEATHER_EVENTS[month - 1] ?? DEMO_WEATHER_EVENTS[0]
}
