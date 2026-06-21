import { useCouncilStore } from '@/store/councilStore'
import { generateCouncilArgument } from '@/lib/llm'

export function useCouncil() {
  const store = useCouncilStore()

  const runDebate = async (policy: any) => {
    store.startDebate()
    const currentMembers = useCouncilStore.getState().members
    const promises = currentMembers.map(async (member) => {
      try {
        // Cast to any because DebateMember.id is string while CouncilMember.id is a union;
        // generateCouncilArgument only reads member.id and member.systemPrompt at runtime.
        const argument = await generateCouncilArgument(member as any, policy)
        store.updateMember(member.id, { argument, isStreaming: false, isComplete: true })
      } catch {
        store.updateMember(member.id, {
          argument: member.argument || 'Analysis unavailable.',
          isStreaming: false,
          isComplete: true,
        })
      }
    })
    await Promise.all(promises)
    store.completeDebate()
  }

  return { ...store, runDebate }
}
