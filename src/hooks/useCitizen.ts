import { useCitizenStore } from '@/store/citizenStore'
import { useUIStore } from '@/store/uiStore'

export function useCitizen(id?: string) {
  const getCitizenById = useCitizenStore((s) => s.getCitizenById)
  const selectedCitizenId = useUIStore((s) => s.selectedCitizenId)
  const selectCitizen = useUIStore((s) => s.selectCitizen)
  const citizen = getCitizenById(id ?? selectedCitizenId ?? '')
  return { citizen, selectCitizen }
}
