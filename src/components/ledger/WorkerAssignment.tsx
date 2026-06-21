import { useCitizenStore } from '@/store/citizenStore'

interface Props {
  workerIds: string[]
}

export default function WorkerAssignment({ workerIds }: Props) {
  const getCitizenById = useCitizenStore((s) => s.getCitizenById)

  if (workerIds.length === 0) {
    return <span className="text-xs" style={{ color: '#a78b7d' }}>Unassigned</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {workerIds.map((id) => {
        const citizen = getCitizenById(id)
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
            style={{ color: '#e0c0b1', backgroundColor: 'rgba(64,50,42,0.5)', border: '1px solid rgba(88,66,55,0.4)' }}
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
