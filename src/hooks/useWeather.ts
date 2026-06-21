import { useState, useEffect } from 'react'
import { fetchWeather, getWeatherForMonth, type WeatherEvent } from '@/lib/weather'
import { VAN_NESS_COORDS } from '@/lib/constants'

export function useWeather(month: number) {
  const [weather, setWeather] = useState<WeatherEvent>(getWeatherForMonth(month))
  useEffect(() => {
    fetchWeather(VAN_NESS_COORDS.lat, VAN_NESS_COORDS.lng, month).then(setWeather)
  }, [month])
  return weather
}
