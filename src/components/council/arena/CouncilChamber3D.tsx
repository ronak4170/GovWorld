import { useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, Stars } from '@react-three/drei'
import * as THREE from 'three'
import ExpertAvatar3D, {
  getExpertPositions,
  getExpertRotations,
  EXPERT_COLORS,
} from './ExpertAvatar3D'

interface CameraRigProps {
  activeExpertId: string | null
  expertIds: string[]
  introComplete: boolean
}

function CameraRig({ activeExpertId, expertIds, introComplete }: CameraRigProps) {
  const { camera } = useThree()
  const targetRef = useRef(new THREE.Vector3(0, 2.5, 6))
  const lookAtRef = useRef(new THREE.Vector3(0, 1, 0))

  useEffect(() => {
    if (!introComplete) {
      targetRef.current.set(0, 5, 10)
      lookAtRef.current.set(0, 0.5, 0)
      return
    }
    if (!activeExpertId) {
      targetRef.current.set(0, 4, 7)
      lookAtRef.current.set(0, 1, 0)
      return
    }
    const idx = expertIds.indexOf(activeExpertId)
    if (idx === -1) return
    const positions = getExpertPositions(expertIds.length)
    const [ex, , ez] = positions[idx]
    const dist = 2.2
    const len = Math.sqrt(ex * ex + ez * ez) || 1
    targetRef.current.set(ex + (ex / len) * dist, 2.8, ez + (ez / len) * dist)
    lookAtRef.current.set(ex * 0.3, 1.4, ez * 0.3)
  }, [activeExpertId, expertIds, introComplete])

  useFrame((_, delta) => {
    camera.position.lerp(targetRef.current, 1 - Math.pow(0.001, delta))
    const currentLookAt = new THREE.Vector3()
    camera.getWorldDirection(currentLookAt)
    currentLookAt.add(camera.position)
    currentLookAt.lerp(lookAtRef.current, 1 - Math.pow(0.001, delta))
    camera.lookAt(currentLookAt)
  })

  return null
}

interface SceneProps {
  expertIds: string[]
  activeExpertId: string | null
  policyTitle: string
  introComplete: boolean
}

function ChamberScene({ expertIds, activeExpertId, policyTitle, introComplete }: SceneProps) {
  const positions = getExpertPositions(expertIds.length)
  const rotations = getExpertRotations(expertIds.length)

  return (
    <>
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 8, 22]} />
      <Stars radius={80} depth={40} count={1200} factor={3} saturation={0} fade speed={0.5} />

      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 8, 5]} intensity={0.35} color="#a7a7a7" />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[6, 64]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[5.5, 6, 64]} />
        <meshStandardMaterial color="#1a1a1a" emissive="#5a8d00" emissiveIntensity={0.15} />
      </mesh>

      {/* Center policy pedestal */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.6, 0.8, 0.8, 16]} />
        <meshStandardMaterial
          color="#000000"
          emissive="#5a8d00"
          emissiveIntensity={introComplete ? 0.6 : 0.2}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.18}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
        textAlign="center"
        font="https://cdn.jsdelivr.net/npm/@fontsource/lexend@5.0.0/files/lexend-latin-600-normal.woff"
      >
        {policyTitle.length > 48 ? policyTitle.slice(0, 48) + '…' : policyTitle}
      </Text>

      {/* Expert spotlights */}
      {expertIds.map((id, i) => {
        const [x, , z] = positions[i]
        const isActive = id === activeExpertId
        const color = EXPERT_COLORS[id] ?? '#a7a7a7'
        return (
          <spotLight
            key={`spot-${id}`}
            position={[x, 6, z]}
            angle={0.35}
            penumbra={0.8}
            intensity={isActive ? 2.5 : 0.15}
            color={color}
          />
        )
      })}

      {expertIds.map((id, i) => (
        <ExpertAvatar3D
          key={id}
          expertId={id}
          position={positions[i]}
          rotationY={rotations[i]}
          isSpeaking={id === activeExpertId}
          isActive={id === activeExpertId}
        />
      ))}

      <CameraRig
        activeExpertId={activeExpertId}
        expertIds={expertIds}
        introComplete={introComplete}
      />
    </>
  )
}

interface Props {
  expertIds: string[]
  activeExpertId: string | null
  policyTitle: string
  introComplete: boolean
}

export default function CouncilChamber3D({
  expertIds,
  activeExpertId,
  policyTitle,
  introComplete,
}: Props) {
  return (
    <Canvas
      camera={{ position: [0, 5, 10], fov: 50, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: false }}
      style={{ width: '100%', height: '100%' }}
    >
      <ChamberScene
        expertIds={expertIds}
        activeExpertId={activeExpertId}
        policyTitle={policyTitle}
        introComplete={introComplete}
      />
    </Canvas>
  )
}
