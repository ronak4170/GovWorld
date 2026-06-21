// Open-Meteo weather API wrapper

export interface WeatherEvent {
  month: number
  description: string
  rainDays: number
  impactDays: number
  severity: 'none' | 'minor' | 'moderate' | 'severe'
}

const DEMO_WEATHER_EVENTS: WeatherEvent[] = [
  { month: 1, description: 'Dry season — clear skies', rainDays: 2, impactDays: 0, severity: 'none' },
  { month: 2, description: 'Mild winter — occasional haze', rainDays: 1, impactDays: 0, severity: 'none' },
  { month: 3, description: 'Pre-monsoon heat — 38°C peak', rainDays: 3, impactDays: 2, severity: 'minor' },
  { month: 4, description: 'Pre-monsoon showers begin', rainDays: 6, impactDays: 3, severity: 'minor' },
  { month: 5, description: 'Humidity rising — 85% RH', rainDays: 8, impactDays: 4, severity: 'minor' },
  { month: 6, description: 'Monsoon arrives — 14 workdays lost', rainDays: 22, impactDays: 14, severity: 'severe' },
  { month: 7, description: 'Peak monsoon — construction paused', rainDays: 25, impactDays: 10, severity: 'severe' },
  { month: 8, description: 'Monsoon receding — sporadic showers', rainDays: 15, impactDays: 5, severity: 'moderate' },
  { month: 9, description: 'Post-monsoon — clear conditions', rainDays: 4, impactDays: 1, severity: 'none' },
  { month: 10, description: 'Dry season returns', rainDays: 2, impactDays: 0, severity: 'none' },
  { month: 11, description: 'Winter approaching — ideal construction', rainDays: 1, impactDays: 0, severity: 'none' },
  { month: 12, description: 'Dry winter — optimal road completion', rainDays: 0, impactDays: 0, severity: 'none' },
]

export async function fetchWeather(lat: number, lng: number, month: number): Promise<WeatherEvent> {
  const demoMode = import.meta.env.VITE_DEMO_MODE === 'true' || import.meta.env.VITE_SKIP_API === 'true'
  if (demoMode) return DEMO_WEATHER_EVENTS[month - 1] ?? DEMO_WEATHER_EVENTS[0]

  try {
    const startDate = `2024-${String(month).padStart(2, '0')}-01`
    const endDate = `2024-${String(month).padStart(2, '0')}-28`
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=precipitation_sum&timezone=Asia%2FKolkata`
    const res = await fetch(url)
    const data = await res.json()
    const rainDays = (data.daily?.precipitation_sum ?? []).filter((v: number) => v > 5).length
    const impactDays = Math.max(0, rainDays - 3)
    return {
      month,
      description: rainDays > 15 ? 'Heavy monsoon rainfall' : rainDays > 5 ? 'Moderate rainfall' : 'Mostly dry',
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
