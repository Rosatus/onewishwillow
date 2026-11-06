import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

type SceneStage = 'hero' | 'opening' | 'ritual' | 'oracle' | 'answer'

interface WillowSceneProps {
  stage: SceneStage
  onReady?: () => void
}

function seededRandom(seed = 1986) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function radialTexture(inner: string, outer = 'rgba(0,0,0,0)') {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')!
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, inner)
  gradient.addColorStop(0.18, inner)
  gradient.addColorStop(1, outer)
  context.fillStyle = gradient
  context.fillRect(0, 0, 256, 256)
  return new THREE.CanvasTexture(canvas)
}

function sandalwoodTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 512
  const context = canvas.getContext('2d')!
  const random = seededRandom(73)
  const base = context.createLinearGradient(0, 0, 0, 512)
  base.addColorStop(0, '#3b1b13')
  base.addColorStop(0.45, '#24100d')
  base.addColorStop(1, '#401d13')
  context.fillStyle = base
  context.fillRect(0, 0, 1024, 512)

  for (let i = 0; i < 240; i += 1) {
    const y = random() * 512
    const amplitude = 2 + random() * 13
    const frequency = 0.006 + random() * 0.018
    context.strokeStyle = random() > 0.48
      ? `rgba(123,66,40,${0.035 + random() * 0.13})`
      : `rgba(8,2,2,${0.04 + random() * 0.16})`
    context.lineWidth = 0.4 + random() * 2.4
    context.beginPath()
    for (let x = 0; x <= 1024; x += 8) {
      const grainY = y + Math.sin(x * frequency + i) * amplitude + Math.sin(x * 0.05) * 0.8
      if (x === 0) context.moveTo(x, grainY)
      else context.lineTo(x, grainY)
    }
    context.stroke()
  }

  for (let i = 0; i < 8; i += 1) {
    const x = random() * 1024
    const y = random() * 512
    for (let ring = 0; ring < 9; ring += 1) {
      context.strokeStyle = `rgba(8,2,1,${0.16 - ring * 0.012})`
      context.lineWidth = 1.2
      context.beginPath()
      context.ellipse(x, y, 9 + ring * 10, 2 + ring * 3.2, random() * 0.15, 0, Math.PI * 2)
      context.stroke()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1.8, 1.2)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function makeTube(points: THREE.Vector3[], radius: number, material: THREE.Material, segments = 20) {
  const curve = new THREE.CatmullRomCurve3(points)
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 6, false), material)
  mesh.castShadow = true
  return mesh
}

function createBox() {
  const group = new THREE.Group()
  const loader = new THREE.TextureLoader()
  const imagePlane = (file: string, width: number, height: number, opacity = 1) => {
    const texture = loader.load(`./assets/images/${file}`)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: '#e0d8c4',
      roughness: 0.83,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
  }

  const closed = imagePlane('box-closed.png', 4.65, 1.29)
  const branch = imagePlane('willow-branch.png', 4.1, 0.66, 0)
  const lidPivot = new THREE.Group()
  lidPivot.position.z = -0.595
  closed.position.z = 0.595
  closed.rotation.x = -Math.PI / 2
  lidPivot.add(closed)
  branch.rotation.x = -Math.PI / 2
  branch.position.set(0, 0.025, 0.02)
  closed.renderOrder = 2
  branch.renderOrder = 4
  group.add(lidPivot, branch)
  group.userData.parts = { closed, branch }
  group.userData.lidPivot = lidPivot
  return group
}

function createDust(timeUniform: { value: number }) {
  const random = seededRandom(92)
  const count = 120
  const positions = new Float32Array(count * 3)
  const phases = new Float32Array(count)
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (random() - 0.5) * 20
    positions[i * 3 + 1] = -0.2 + random() * 8
    positions[i * 3 + 2] = -6 + random() * 13
    phases[i] = random() * Math.PI * 2
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: timeUniform },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      attribute float aPhase;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * .12 + aPhase) * .3;
        p.y += sin(uTime * .18 + aPhase * 2.0) * .22;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vAlpha = .15 + .35 * (.5 + .5 * sin(uTime * .5 + aPhase));
        gl_PointSize = 2.2 * (14.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = distance(gl_PointCoord, vec2(.5));
        gl_FragColor = vec4(.88, .69, .39, smoothstep(.5, .0, d) * vAlpha);
      }
    `,
  })
  return new THREE.Points(geometry, material)
}

function createCandle(height: number, radius: number, flameTexture: THREE.Texture) {
  const group = new THREE.Group()
  const brass = new THREE.MeshStandardMaterial({ color: '#655035', metalness: 0.72, roughness: 0.46 })
  const wax = new THREE.MeshStandardMaterial({ color: '#95856a', roughness: 0.92 })
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.8, radius * 2.15, 0.1, 32), brass)
  holder.castShadow = true
  group.add(holder)
  const candle = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.88, radius, height, 28), wax)
  candle.position.y = height / 2 + 0.06
  candle.castShadow = true
  group.add(candle)
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.09, 6), new THREE.MeshBasicMaterial({ color: '#160d08' }))
  wick.position.y = height + 0.08
  group.add(wick)
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flameTexture,
    color: '#ffc36b',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }))
  flame.position.y = height + 0.22
  flame.scale.set(0.28, 0.47, 1)
  group.add(flame)
  group.userData.flame = flame
  return group
}

export default function WillowScene({ stage, onReady }: WillowSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef(stage)
  const readyRef = useRef(onReady)

  useEffect(() => { stageRef.current = stage }, [stage])
  useEffect(() => { readyRef.current = onReady }, [onReady])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#070805')
    scene.fog = new THREE.FogExp2('#0a0b07', 0.032)
    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 90)
    camera.position.set(0, 3.7, 13.8)
    const lookTarget = new THREE.Vector3(0, 0.55, 0)

    const wallMaterial = new THREE.MeshStandardMaterial({ color: '#302e20', roughness: 1 })
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(32, 16), wallMaterial)
    wall.position.set(0, 4.2, -7.4)
    wall.receiveShadow = true
    scene.add(wall)

    const wood = sandalwoodTexture()
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: '#d7a17b',
      map: wood,
      bumpMap: wood,
      bumpScale: 0.09,
      roughness: 0.62,
      metalness: 0.03,
    })
    const darkWood = new THREE.MeshStandardMaterial({ color: '#79513a', map: wood, roughness: 0.74 })
    const table = new THREE.Mesh(new THREE.BoxGeometry(19, 0.42, 9), woodMaterial)
    table.position.set(0, -1.03, 0.75)
    table.receiveShadow = true
    table.castShadow = true
    scene.add(table)
    const apron = new THREE.Mesh(new THREE.BoxGeometry(19, 1.05, 0.28), darkWood)
    apron.position.set(0, -1.55, 5.08)
    apron.castShadow = true
    scene.add(apron)
    const trimMaterial = new THREE.MeshStandardMaterial({ color: '#50321e', metalness: 0.15, roughness: 0.7 })
    ;[-1.15, -1.92].forEach((y) => {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(19.1, 0.065, 0.08), trimMaterial)
      trim.position.set(0, y, 5.25)
      scene.add(trim)
    })
    for (let i = -7; i <= 7; i += 2) {
      const ornament = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 8, 24), trimMaterial)
      ornament.position.set(i, -1.52, 5.25)
      scene.add(ornament)
    }

    const panelMaterial = new THREE.MeshStandardMaterial({ color: '#1c1b12', roughness: 0.9 })
    for (let x = -12; x <= 12; x += 3) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 13, 0.08), panelMaterial)
      panel.position.set(x, 4.1, -7.25)
      scene.add(panel)
    }
    ;[1.85, 4.05].forEach((y) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(18, 0.16, 1.05), darkWood)
      shelf.position.set(0, y, -6.65)
      shelf.castShadow = true
      scene.add(shelf)
    })

    const random = seededRandom(98)
    const bottleGlass = new THREE.MeshStandardMaterial({ color: '#273326', roughness: 0.32, metalness: 0.1, transparent: true, opacity: 0.75 })
    const bookColors = ['#30251b', '#242a20', '#3a2019', '#29241d']
    ;[1.94, 4.14].forEach((shelfY, row) => {
      for (let i = 0; i < 21; i += 1) {
        const x = -8 + i * 0.78 + random() * 0.16
        if ((i + row) % 3 === 0) {
          const bottle = new THREE.Group()
          const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.45 + random() * 0.3, 14), bottleGlass)
          body.position.y = 0.3
          const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 12), bottleGlass)
          neck.position.y = 0.65
          bottle.add(body, neck)
          bottle.position.set(x, shelfY, -6.6)
          scene.add(bottle)
        } else {
          const book = new THREE.Mesh(
            new THREE.BoxGeometry(0.22 + random() * 0.2, 0.6 + random() * 0.45, 0.5),
            new THREE.MeshStandardMaterial({ color: bookColors[(i + row) % bookColors.length], roughness: 0.95 }),
          )
          book.position.set(x, shelfY + 0.4, -6.62)
          book.rotation.z = (random() - 0.5) * 0.12
          scene.add(book)
        }
      }
    })

    // A bound bundle of willow twigs is the only tree form left in the room.
    const twigMaterial = new THREE.MeshStandardMaterial({ color: '#403a28', roughness: 1 })
    const hanging = new THREE.Group()
    for (let i = 0; i < 12; i += 1) {
      const x = (random() - 0.5) * 0.55
      const length = 1.8 + random() * 1.25
      hanging.add(makeTube([
        new THREE.Vector3(x, 0, 0),
        new THREE.Vector3(x + (random() - 0.5) * 0.25, -length * 0.4, 0.04),
        new THREE.Vector3(x + (random() - 0.5) * 0.45, -length, 0),
      ], 0.015 + random() * 0.012, twigMaterial, 14))
    }
    const twine = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.025, 8, 30), new THREE.MeshStandardMaterial({ color: '#766444', roughness: 1 }))
    twine.rotation.x = Math.PI / 2
    twine.position.y = -0.35
    hanging.add(twine)
    hanging.position.set(5.4, 6.5, -6.95)
    scene.add(hanging)

    const hemi = new THREE.HemisphereLight('#b6b8a0', '#25100a', 1.15)
    scene.add(hemi)
    const moonlight = new THREE.DirectionalLight('#c6cbb2', 2.25)
    moonlight.position.set(-4, 8, 5)
    moonlight.castShadow = true
    moonlight.shadow.mapSize.set(1024, 1024)
    moonlight.shadow.camera.left = -10
    moonlight.shadow.camera.right = 10
    moonlight.shadow.camera.top = 9
    moonlight.shadow.camera.bottom = -5
    scene.add(moonlight)
    const amber = new THREE.PointLight('#e7a457', 32, 15, 2)
    amber.position.set(3.8, 1.4, 3.2)
    scene.add(amber)
    const boxLight = new THREE.SpotLight('#e6c58d', 58, 20, 0.6, 0.85, 1.6)
    boxLight.position.set(0.5, 6.5, 4.5)
    boxLight.target.position.set(2.8, -0.7, 1.2)
    scene.add(boxLight, boxLight.target)

    const flameTexture = radialTexture('rgba(255,231,154,.95)')
    const candles: THREE.Group[] = []
    ;[
      { x: 5.1, z: -0.9, h: 1.05, r: 0.13 },
      { x: 5.65, z: -1.35, h: 0.67, r: 0.15 },
      { x: 4.7, z: -1.6, h: 0.48, r: 0.11 },
    ].forEach(({ x, z, h, r }, index) => {
      const candle = createCandle(h, r, flameTexture)
      candle.position.set(x, -0.78, z)
      scene.add(candle)
      candles.push(candle)
      const light = new THREE.PointLight('#f2a64d', 5 + index * 2, 5, 2)
      light.position.set(x, h - 0.35, z)
      scene.add(light)
    })

    const brass = new THREE.MeshStandardMaterial({ color: '#79623b', metalness: 0.8, roughness: 0.4 })
    const key = new THREE.Group()
    const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 10, 32), brass)
    keyRing.rotation.x = -Math.PI / 2
    key.add(keyRing)
    const keyStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 10), brass)
    keyStem.rotation.z = Math.PI / 2
    keyStem.position.x = 0.48
    key.add(keyStem)
    const keyTooth = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 0.22), brass)
    keyTooth.position.set(0.82, 0, 0.09)
    key.add(keyTooth)
    key.position.set(0.05, -0.77, 2.35)
    key.rotation.y = -0.38
    scene.add(key)

    const willowPackage = new THREE.Group()
    willowPackage.position.set(2.8, -0.82, 1.25)
    const boxFrontTexture = new THREE.TextureLoader().load('./assets/images/box-closed.png')
    boxFrontTexture.colorSpace = THREE.SRGBColorSpace
    boxFrontTexture.anisotropy = 8
    const boxRed = new THREE.MeshStandardMaterial({ color: '#81281e', roughness: 0.82, transparent: true })
    const boxFront = new THREE.MeshStandardMaterial({ map: boxFrontTexture, color: '#e0d8c4', roughness: 0.85, transparent: true })
    // Build an open tray. A solid cuboid or another printed lid texture
    // would leave a false cover behind after the lid has lifted.
    const boxInside = new THREE.MeshStandardMaterial({ color: '#927652', roughness: 1, transparent: true })
    const boxBase = new THREE.Group()
    const addWall = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
      wall.position.set(x, y, z)
      wall.castShadow = true
      wall.receiveShadow = true
      boxBase.add(wall)
    }
    addWall(4.55, 0.08, 1.19, 0, 0.04, 0, boxInside)
    addWall(4.55, 1, 0.055, 0, 0.58, 0.57, boxFront)
    addWall(4.55, 1, 0.055, 0, 0.58, -0.57, boxRed)
    addWall(0.055, 1, 1.08, -2.25, 0.58, 0, boxInside)
    addWall(0.055, 1, 1.08, 2.25, 0.58, 0, boxInside)
    boxBase.rotation.y = 0.09
    boxBase.castShadow = true
    boxBase.receiveShadow = true
    willowPackage.add(boxBase)
    const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(5.7, 2.2), new THREE.MeshBasicMaterial({
      map: radialTexture('rgba(0,0,0,.62)'), transparent: true, depthWrite: false, opacity: 0.7,
    }))
    contactShadow.rotation.x = -Math.PI / 2
    contactShadow.position.set(2.8, -0.806, 1.3)
    scene.add(contactShadow)
    const box = createBox()
    box.position.y = 1.095
    box.rotation.y = 0.09
    willowPackage.add(box)
    scene.add(willowPackage)

    const timeUniform = { value: 0 }
    const dust = createDust(timeUniform)
    scene.add(dust)

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(new THREE.Vector2(mount.clientWidth, mount.clientHeight), 0.42, 0.7, 0.8)
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    const pointer = new THREE.Vector2(0, 0)
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      composer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', resize)

    const clock = new THREE.Clock()
    let frame = 0
    let ready = false
    let previousStage = stageRef.current
    let stageStarted = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      const elapsed = clock.getElapsedTime()
      timeUniform.value = reducedMotion ? 0 : elapsed
      const currentStage = stageRef.current
      if (currentStage !== previousStage) {
        previousStage = currentStage
        stageStarted = elapsed
      }
      const mobile = mount.clientWidth < 760
      const ritual = currentStage === 'ritual' || currentStage === 'oracle'
      const opening = currentStage === 'opening'
      const openingTime = opening ? elapsed - stageStarted : 0
      const smooth = (value: number) => {
        const t = THREE.MathUtils.clamp(value, 0, 1)
        return t * t * (3 - 2 * t)
      }
      const targetX = opening && !mobile ? 2.8 : mobile ? 0 : ritual ? 3.7 : 0
      const targetY = opening ? 3.15 : mobile ? 3.2 : ritual ? 3.4 : 3.7
      const targetZ = opening ? (mobile ? 14.8 : 10.8) : mobile ? 16.8 : ritual ? 12.6 : 13.8
      const parallax = reducedMotion || opening ? 0 : pointer.x * 0.13
      const cameraEase = opening ? 0.045 : 0.025
      camera.position.x += (targetX + parallax - camera.position.x) * cameraEase
      camera.position.y += (targetY - pointer.y * 0.055 - camera.position.y) * cameraEase
      camera.position.z += (targetZ - camera.position.z) * cameraEase
      lookTarget.x += ((opening ? 2.8 : mobile ? 3.8 : ritual ? 5.35 : 0) - lookTarget.x) * cameraEase
      lookTarget.y += ((opening ? 0.35 : mobile ? -2 : 0.55) - lookTarget.y) * cameraEase
      camera.lookAt(lookTarget)

      const parts = box.userData.parts as Record<'closed' | 'branch', THREE.Mesh>
      const lidPivot = box.userData.lidPivot as THREE.Group
      const lidOpen = opening ? smooth((openingTime - 0.15) / 1.1) : 0
      const boxFade = opening ? 1 - smooth((openingTime - 1.65) / 0.75) : 1
      const branchLift = opening ? smooth((openingTime - 0.65) / 1.15) : 0
      const branchAlpha = opening ? smooth((openingTime - 0.55) / 0.45) : 0
      lidPivot.rotation.x = -1.85 * lidOpen
      const lidAlpha = opening ? 1 - smooth((openingTime - 0.65) / 0.55) : 1
      lidPivot.visible = lidAlpha > 0.01
      ;[boxRed, boxFront, boxInside].forEach((material) => {
        material.opacity = boxFade
        material.depthWrite = boxFade > 0.5
      })
      boxBase.visible = boxFade > 0.01
      ;(parts.closed.material as THREE.MeshStandardMaterial).opacity = lidAlpha
      ;(parts.branch.material as THREE.MeshStandardMaterial).opacity = branchAlpha
      parts.branch.position.y = 0.025 + branchLift * 2.1
      parts.branch.position.z = 0.02 + branchLift * 0.2
      parts.branch.rotation.x = -Math.PI / 2 + branchLift * 1.32
      parts.branch.rotation.z = -0.12 * branchLift
      parts.branch.scale.setScalar(1 + branchLift * 0.12)
      willowPackage.visible = currentStage === 'hero' || opening
      contactShadow.visible = willowPackage.visible
      ;(contactShadow.material as THREE.MeshBasicMaterial).opacity = 0.7 * boxFade
      const scale = mobile ? 0.68 : 1
      willowPackage.scale.setScalar(scale)
      amber.intensity += ((currentStage === 'oracle' ? 34 : ritual ? 28 : opening ? 38 : 24) - amber.intensity) * 0.03
      bloom.strength += ((currentStage === 'oracle' ? 0.72 : opening ? 0.58 : 0.42) - bloom.strength) * 0.035
      candles.forEach((candle, index) => {
        const flame = candle.userData.flame as THREE.Sprite
        const flicker = reducedMotion ? 1 : 1 + Math.sin(elapsed * (7 + index) + index) * 0.07
        flame.scale.set(0.28 * flicker, 0.47 / flicker, 1)
      })
      composer.render()
      if (!ready) {
        ready = true
        readyRef.current?.()
      }
    }
    animate()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('resize', resize)
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
          object.geometry?.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => material?.dispose())
        }
      })
      composer.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className="willow-scene" ref={mountRef} aria-hidden="true" />
}
