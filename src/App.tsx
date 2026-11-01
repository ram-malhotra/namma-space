import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { ThreeEvent } from "@react-three/fiber";
import "./App.css";

function Environment({
  onSelectDestination,
}: {
  onSelectDestination: (point: THREE.Vector3) => void;
}) {
  const { scene } = useGLTF("/models/living_room_interior_free.glb");

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();

    console.log("Clicked 3D point:", event.point);

    onSelectDestination(event.point.clone());
  };

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 8, 5]} intensity={2} />

      <group onClick={handleClick}>
        <primitive object={scene} />
      </group>
    </>
  );
}

function PlayerMovement({
  destination,
}: {
  destination: THREE.Vector3 | null;
}) {
  const { camera, scene } = useThree();

  const keys = useRef<Record<string, boolean>>({});
  const target = useRef<THREE.Vector3 | null>(null);
  const velocity = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());

  const yaw = useRef(0);
  const pitch = useRef(0);

  const speed = 16.0;
  const acceleration = 7.0;
  const eyeHeight = 4.0;
  const arrivalDistance = 0.25;
  const collisionRadius = 0.35;
  const turnSpeed = 1.5;

  // Update the destination when the user clicks the scene.
  useEffect(() => {
    if (destination) {
      console.log("Destination received:", destination);

      target.current = destination.clone();
      target.current.y = eyeHeight;
      velocity.current.set(0, 0, 0);
    }
  }, [destination]);

  // Keyboard input.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Space",
        ].includes(event.code)
      ) {
        event.preventDefault();
      }

      keys.current[event.code] = true;
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keys.current[event.code] = false;
    };

    const handleBlur = () => {
      keys.current = {};
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Approximate collision detection using three horizontal rays.
  const canMove = (
    offset: THREE.Vector3,
    originPosition: THREE.Vector3
  ): boolean => {
    const horizontal = offset.clone();
    horizontal.y = 0;

    const distance = horizontal.length();

    if (distance < 0.0001) return true;

    const direction = horizontal.normalize();

    const side = new THREE.Vector3(
      -direction.z,
      0,
      direction.x
    );

    const origins = [
      new THREE.Vector3(
        originPosition.x,
        eyeHeight - 0.5,
        originPosition.z
      ),
      new THREE.Vector3(
        originPosition.x + side.x * collisionRadius,
        eyeHeight - 0.5,
        originPosition.z + side.z * collisionRadius
      ),
      new THREE.Vector3(
        originPosition.x - side.x * collisionRadius,
        eyeHeight - 0.5,
        originPosition.z - side.z * collisionRadius
      ),
    ];

    for (const origin of origins) {
      raycaster.current.set(origin, direction);
      raycaster.current.far = distance + 0.1;

      const hits = raycaster.current.intersectObjects(
        scene.children,
        true
      );

      const blocked = hits.some((hit) => {
        if (hit.distance > distance + 0.1) return false;

        let object: THREE.Object3D | null = hit.object;

        while (object) {
          if (object.userData.noCollision) return false;
          object = object.parent;
        }

        return true;
      });

      if (blocked) return false;
    }

    return true;
  };

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);

    // 1. Horizontal and vertical camera rotation.
    if (keys.current["ArrowLeft"]) {
      yaw.current += turnSpeed * dt;
    }

    if (keys.current["ArrowRight"]) {
      yaw.current -= turnSpeed * dt;
    }

    if (keys.current["ArrowUp"]) {
      pitch.current += turnSpeed * dt;
    }

    if (keys.current["ArrowDown"]) {
      pitch.current -= turnSpeed * dt;
    }

    pitch.current = THREE.MathUtils.clamp(
      pitch.current,
      -Math.PI / 2 + 0.05,
      Math.PI / 2 - 0.05
    );

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    camera.rotation.z = 0;

    // 2. Calculate horizontal movement directions.
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3()
      .crossVectors(forward, camera.up)
      .normalize();

    // 3. Manual WASD movement takes priority.
    const manualMovement = new THREE.Vector3();

    if (keys.current["KeyW"]) manualMovement.add(forward);
    if (keys.current["KeyS"]) manualMovement.sub(forward);
    if (keys.current["KeyD"]) manualMovement.add(right);
    if (keys.current["KeyA"]) manualMovement.sub(right);

    if (manualMovement.lengthSq() > 0) {
      target.current = null;
      manualMovement.normalize().multiplyScalar(speed);

      velocity.current.lerp(
        manualMovement,
        1 - Math.exp(-acceleration * dt)
      );

      const offset = velocity.current.clone().multiplyScalar(dt);

      // Check collision before manual movement.
      if (canMove(offset, camera.position)) {
        camera.position.x += offset.x;
        camera.position.z += offset.z;
      } else {
        velocity.current.set(0, 0, 0);
      }

      camera.position.y = eyeHeight;
      return;
    }

    // 4. Automatic click-to-move.
    if (target.current) {
      const direction = target.current.clone().sub(camera.position);
      direction.y = 0;

      const remainingDistance = direction.length();

      if (remainingDistance <= arrivalDistance) {
        target.current = null;
        velocity.current.set(0, 0, 0);
        camera.position.y = eyeHeight;
        return;
      }

      direction.normalize();

      const desiredSpeed = Math.min(
        speed,
        Math.sqrt(2 * acceleration * remainingDistance)
      );

      const desiredVelocity = direction.multiplyScalar(desiredSpeed);

      velocity.current.lerp(
        desiredVelocity,
        1 - Math.exp(-acceleration * dt)
      );

      const offset = velocity.current.clone().multiplyScalar(dt);

      // Check collision before automatic movement.
      if (canMove(offset, camera.position)) {
        camera.position.x += offset.x;
        camera.position.z += offset.z;
      } else {
        target.current = null;
        velocity.current.set(0, 0, 0);
      }

      camera.position.y = eyeHeight;
      return;
    }

    // 5. Decelerate when no movement is requested.
    velocity.current.lerp(
      new THREE.Vector3(0, 0, 0),
      1 - Math.exp(-acceleration * dt)
    );

    if (velocity.current.length() < 0.01) {
      velocity.current.set(0, 0, 0);
      return;
    }

    const offset = velocity.current.clone().multiplyScalar(dt);

    if (canMove(offset, camera.position)) {
      camera.position.x += offset.x;
      camera.position.z += offset.z;
    } else {
      velocity.current.set(0, 0, 0);
    }

    camera.position.y = eyeHeight;
  });

  return null;
}

export default function App() {
  const [destination, setDestination] =
    useState<THREE.Vector3 | null>(null);

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <div>
            <h1>Namma Space</h1>
            <p>Intelligent Spatial Engine</p>
          </div>
        </div>

        <div className="status">
          <span className="status-dot" />
          VIEWER ONLINE
        </div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <p className="eyebrow">WORKSPACE</p>
          <h2>3D Explorer</h2>
          <p className="muted">
            Explore a reconstructed indoor environment.
          </p>

          <div className="info-card">
            <span className="eyebrow">CURRENT SCENE</span>
            <h3>Living Room</h3>
            <p className="muted">3D environment</p>
            <span className="badge">DEVELOPMENT</span>
          </div>

          <div className="controls-card">
            <p className="eyebrow">CONTROLS</p>

            <div>
              <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>
              <span> Walk</span>
            </div>

            <div>
              <kbd>←</kbd> <kbd>→</kbd>
              <span> Turn left/right</span>
            </div>

            <div>
              <kbd>↑</kbd> <kbd>↓</kbd>
              <span> Look up/down</span>
            </div>

            <div>
              <kbd>Click</kbd>
              <span> Walk to location</span>
            </div>

            <p className="muted small">
              Click a location in the scene to walk there. The camera
              stops when it reaches the destination.
            </p>
          </div>
        </aside>

        <section className="viewport">
          <div className="viewport-label">FIRST-PERSON VIEW</div>

          <Canvas camera={{ position: [0, 4, 6], fov: 65 }}>
            <Suspense fallback={null}>
              <Environment onSelectDestination={setDestination} />
              <PlayerMovement destination={destination} />
            </Suspense>
          </Canvas>

          <div className="crosshair">+</div>

          <div className="viewport-footer">
            NAMMA SPACE / PREVIEW BUILD
          </div>
        </section>
      </section>
    </main>
  );
}

useGLTF.preload("/models/living_room_interior_free.glb");