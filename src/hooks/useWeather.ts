import { useState, useEffect } from 'react'
import { fetchWeather, getWeatherForMonth, type WeatherEvent } from '@/lib/weather'
import { ANDHERI_EAST_COORDS } from '@/lib/constants'

export function useWeather(month: number) {
  const [weather, setWeather] = useState<WeatherEvent>(getWeatherForMonth(month))
  useEffect(() => {
    fetchWeather(ANDHERI_EAST_COORDS.lat, ANDHERI_EAST_COORDS.lng, month).then(setWeather)
  }, [month])
  return weather
}
