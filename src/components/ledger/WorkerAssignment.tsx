import { useCitizenStore } from '@/store/citizenStore'

interface Props {
  workerIds: string[]
}

export default function WorkerAssignment({ workerIds }: Props) {
  const getCitizenById = useCitizenStore((s) => s.getCitizenById)

  if (workerIds.length === 0) {
    return <span className="text-xs" style={{ color: '#5e5e5e' }}>Unassigned</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {workerIds.map((id) => {
        const citizen = getCitizenById(id)
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
            style={{ color: '#a7a7a7', backgroundColor: 'rgba(26,26,26,0.5)', border: '1px solid rgba(94,94,94,0.4)' }}
          >
            {citizen ? (
              <>
                <span>{citizen.avatarEmoji}</span>
                <span>{citizen.name.split(' ')[0]}</span>
              </>
            ) : (
              <span>{id}</span>
            )}
          </span>
        )
      })}
    </div>
  )
}
