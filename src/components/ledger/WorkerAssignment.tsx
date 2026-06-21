import { useCitizenStore } from '@/store/citizenStore'

interface Props {
  workerIds: string[]
}

export default function WorkerAssignment({ workerIds }: Props) {
  const getCitizenById = useCitizenStore((s) => s.getCitizenById)

  if (workerIds.length === 0) {
    return <span className="text-slate-500 text-xs">Unassigned</span>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {workerIds.map((id) => {
        const citizen = getCitizenById(id)
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5 text-[10px] text-slate-300"
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
