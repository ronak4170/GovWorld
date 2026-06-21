import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { EXPERT_POOL } from '@/store/councilStore'

const EXPERT_COLORS: Record<string, string> = {
  economist: '#60a5fa',
  advocate: '#34d399',
  engineer: '#fb923c',
  watchdog: '#f87171',
  climate: '#2dd4bf',
  lawyer: '#c084fc',
  urbanplanner: '#38bdf8',
  health: '#f472b6',
  transport: '#facc15',
  heritage: '#fbbf24',
}

const HAIR_COLORS: Record<string, string> = {
  economist: '#1e3a5f',
  advocate: '#2d4a3e',
  engineer: '#4a3728',
  watchdog: '#1a1a2e',
  climate: '#2d3a4a',
}

interface Props {
  expertId: string
  position: [number, number, number]
  rotationY: number
  isSpeaking: boolean
  isActive: boolean
}

export default function ExpertAvatar3D({
  expertId,
  position,
  rotationY,
  isSpeaking,
  isActive,
}: Props) {
  const groupRef = useRef<THREE.Group>(null)
  const characterRef = useRef<THREE.Group>(null)
  const mouthRef = useRef<THREE.Mesh>(null)
  const leftArmRef = useRef<THREE.Group>(null)
  const rightArmRef = useRef<THREE.Group>(null)

  const expert = EXPERT_POOL.find((e) => e.id === expertId)
  const shirtColor = EXPERT_COLORS[expertId] ?? '#94a3b8'
  const hairColor = HAIR_COLORS[expertId] ?? '#1e293b'
  const skinColor = '#fcd9b6'

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()

    if (groupRef.current) {
      const breathe = Math.sin(t * 1.4) * 0.025
      groupRef.current.position.y = position[1] + breathe
    }

    if (characterRef.current) {
      if (isSpeaking) {
        characterRef.current.rotation.y = rotationY + Math.sin(t * 6) * 0.06
        const bounce = 1 + Math.sin(t * 8) * 0.025
        characterRef.current.scale.setScalar(bounce)
      } else {
        characterRef.current.rotation.y = rotationY
        characterRef.current.scale.setScalar(1)
      }
    }

    // Lip-sync mouth — opens rapidly while speaking
    if (mouthRef.current) {
      const openAmount = isSpeaking ? 0.08 + Math.abs(Math.sin(t * 14)) * 0.14 : 0.04
      mouthRef.current.scale.y = openAmount / 0.08
    }

    // Gesture arms while speaking
    if (leftArmRef.current && rightArmRef.current) {
      const armSwing = isSpeaking ? Math.sin(t * 5) * 0.35 : 0.05
      leftArmRef.current.rotation.x = 0.4 + armSwing
      leftArmRef.current.rotation.z = 0.25
      rightArmRef.current.rotation.x = 0.4 - armSwing
      rightArmRef.current.rotation.z = -0.25
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Spotlight ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.6, 0.85, 32]} />
        <meshStandardMaterial
          color={shirtColor}
          emissive={shirtColor}
          emissiveIntensity={isActive ? 1.4 : 0.12}
          transparent
          opacity={isActive ? 0.95 : 0.3}
        />
      </mesh>

      <group ref={characterRef}>
        {/* --- Legs (chibi stubby) --- */}
        <mesh position={[-0.18, 0.35, 0]}>
          <capsuleGeometry args={[0.14, 0.35, 6, 12]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>
        <mesh position={[0.18, 0.35, 0]}>
          <capsuleGeometry args={[0.14, 0.35, 6, 12]} />
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </mesh>

        {/* --- Torso (cartoon shirt) --- */}
        <mesh position={[0, 0.85, 0]}>
          <capsuleGeometry args={[0.32, 0.55, 8, 16]} />
          <meshStandardMaterial
            color={shirtColor}
            emissive={shirtColor}
            emissiveIntensity={isActive ? 0.35 : 0.08}
            roughness={0.45}
          />
        </mesh>

        {/* Collar */}
        <mesh position={[0, 1.1, 0]}>
          <torusGeometry args={[0.22, 0.04, 8, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>

        {/* --- Left arm --- */}
        <group ref={leftArmRef} position={[-0.42, 0.95, 0]}>
          <mesh position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.1, 0.35, 6, 10]} />
            <meshStandardMaterial color={shirtColor} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.48, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
        </group>

        {/* --- Right arm --- */}
        <group ref={rightArmRef} position={[0.42, 0.95, 0]}>
          <mesh position={[0, -0.2, 0]}>
            <capsuleGeometry args={[0.1, 0.35, 6, 10]} />
            <meshStandardMaterial color={shirtColor} roughness={0.5} />
          </mesh>
          <mesh position={[0, -0.48, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.6} />
          </mesh>
        </group>

        {/* --- Head (anime large) --- */}
        <mesh position={[0, 1.55, 0]}>
          <sphereGeometry args={[0.42, 20, 20]} />
          <meshStandardMaterial color={skinColor} roughness={0.55} />
        </mesh>

        {/* Hair cap */}
        <mesh position={[0, 1.78, -0.05]}>
          <sphereGeometry args={[0.44, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={hairColor} roughness={0.4} />
        </mesh>
        {/* Hair bangs */}
        <mesh position={[0, 1.72, 0.28]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.55, 0.12, 0.15]} />
          <meshStandardMaterial color={hairColor} roughness={0.4} />
        </mesh>

        {/* Eyes (anime style — large ovals) */}
        <mesh position={[-0.14, 1.58, 0.34]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        <mesh position={[0.14, 1.58, 0.34]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} />
        </mesh>
        {/* Pupils */}
        <mesh position={[-0.14, 1.56, 0.42]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} />
        </mesh>
        <mesh position={[0.14, 1.56, 0.42]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color="#0f172a" roughness={0.1} />
        </mesh>
        {/* Eye shine */}
        <mesh position={[-0.11, 1.6, 0.44]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.17, 1.6, 0.44]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>

        {/* Blush when active */}
        {isActive && (
          <>
            <mesh position={[-0.24, 1.48, 0.3]} rotation={[0, 0.4, 0]}>
              <circleGeometry args={[0.06, 12]} />
              <meshStandardMaterial color="#f472b6" transparent opacity={0.35} />
            </mesh>
            <mesh position={[0.24, 1.48, 0.3]} rotation={[0, -0.4, 0]}>
              <circleGeometry args={[0.06, 12]} />
              <meshStandardMaterial color="#f472b6" transparent opacity={0.35} />
            </mesh>
          </>
        )}

        {/* Mouth — animates when speaking */}
        <mesh ref={mouthRef} position={[0, 1.38, 0.38]}>
          <boxGeometry args={[0.12, 0.08, 0.04]} />
          <meshStandardMaterial
            color={isSpeaking ? '#be123c' : '#c084fc'}
            emissive={isSpeaking ? '#be123c' : '#000000'}
            emissiveIntensity={isSpeaking ? 0.3 : 0}
          />
        </mesh>
      </group>

      {/* Name tag */}
      <Html position={[0, 2.35, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div
          className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide"
          style={{
            fontFamily: 'Lexend, sans-serif',
            background: 'rgba(0,0,0,0.8)',
            border: `2px solid ${shirtColor}`,
            color: shirtColor,
            boxShadow: isSpeaking ? `0 0 16px ${shirtColor}88` : 'none',
          }}
        >
          {expert?.name.split(' ')[0] ?? expertId}
        </div>
      </Html>
    </group>
  )
}

export function getExpertPositions(count: number, radius = 4.2): Array<[number, number, number]> {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius]
  })
}

export function getExpertRotations(count: number): number[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    return -angle + Math.PI
  })
}

export { EXPERT_COLORS }
