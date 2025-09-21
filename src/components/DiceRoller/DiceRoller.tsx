import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { World, Body, Box, Vec3, Quaternion, ContactEquation } from "cannon-es";
import useAudio from "../../contexts/useAudio";

export type FaceSpec =
  | string
  | number
  | {
      value: string | number;
      label?: string;
      colour?: string;
    };

export type DiceRollerHandle = {
  roll: (faces?: FaceSpec[] | null) => Promise<number | string>;
};

const DiceRoller = forwardRef<DiceRollerHandle, object>((_props, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const resolveRef = useRef<((result: number | string) => void) | null>(null);
  const faceSpecsRef = useRef<FaceSpec[] | null>(null);
  const worldRef = useRef<World | null>(null);
  const diceBodyRef = useRef<Body | null>(null);
  const diceMeshRef = useRef<THREE.Mesh | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  const startRollRef = useRef<() => void>(() => {});
  const mountedRef = useRef(false);
  const queuedStartCallsRef = useRef<Array<() => void>>([]);

  const { playDing, playTick } = useAudio();

  useImperativeHandle(ref, () => ({
    roll: (faces?: FaceSpec[] | null) => {
      return new Promise<number | string>((resolve) => {
        resolveRef.current = resolve;
        faceSpecsRef.current = faces ?? null;
        // if effect hasn't finished mounting, queue the call
        if (!mountedRef.current) {
          queuedStartCallsRef.current.push(() => startRollRef.current());
        } else {
          startRollRef.current();
        }
      });
    },
    // also expose a startRoll for callers that want to trigger without promise
    startRoll: () => {
      startRollRef.current();
    },
  }));

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    // Three.js setup
    const scene = new THREE.Scene();
    // no debug visuals in production build
    const camera = new THREE.PerspectiveCamera(5, 1, 0.1, 2500);
    // Top-down view: position high on Y and look at the plane so the top face points toward the viewer
    // position camera so the full play area (walls) is visible; base on viewport
    const viewportSpan = Math.max(window.innerWidth, window.innerHeight);
    const cameraY = Math.max(240, viewportSpan * 0.9);
    camera.position.set(0, cameraY, 0);
    camera.lookAt(0, 0, 0);
    // camera positioned based on viewport span
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    // keep transparent background for overlay

    function setRendererSize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    // make canvas cover viewport and not block UI interactions
    setRendererSize();
    // enable shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.width = "100vw";
    renderer.domElement.style.height = "100vh";
    renderer.domElement.style.pointerEvents = "none";
    // put the canvas above the UI so it's visible
    renderer.domElement.style.zIndex = "9999";
    // no debug border
    // append to document.body so it covers the full viewport reliably
    document.body.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    // renderer appended to document.body

    // Lighting: ambient + directional so the dice has depth; directional casts shadows
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 4.5);
    dir.position.set(50, 100, 50);
    dir.castShadow = true;
    dir.shadow.mapSize.width = 2048;
    dir.shadow.mapSize.height = 2048;
    const d = 100;
    // configure shadow camera frustum for large scene (OrthographicCamera)
    const shadowCam = dir.shadow.camera as THREE.OrthographicCamera;
    shadowCam.left = -d;
    shadowCam.right = d;
    shadowCam.top = d;
    shadowCam.bottom = -d;
    shadowCam.near = 0.5;
    shadowCam.far = 500;
    scene.add(dir);

    // Cannon-es setup
    const world = new World({ gravity: new Vec3(0, -20, 0) });
    worldRef.current = world;

    // Dice body (double the previous visual size)
    const diceBody = new Body({
      mass: 50,
      shape: new Box(new Vec3(12, 12, 12)),
      position: new Vec3(0, 36, 0),
      angularDamping: 0.12,
      linearDamping: 0.08,
    });
    world.addBody(diceBody);
    diceBodyRef.current = diceBody;

    // Dice mesh with numbered face textures generated via canvas
    // match the visual size to the physics body (now doubled)
    const diceGeometry = new THREE.BoxGeometry(24, 24, 24);

    function createPipTexture(n: number) {
      const size = 512;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      // background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      // pip drawing helper
      const pip = (x: number, y: number) => {
        const r = size * 0.06;
        ctx.beginPath();
        ctx.fillStyle = "#000000";
        ctx.arc(x * size, y * size, r, 0, Math.PI * 2);
        ctx.fill();
      };

      // positions (normalized 0..1)
      const C = 0.5;
      const L = 0.25;
      const R = 0.75;
      const T = 0.25;
      const B = 0.75;

      // draw pips for each face
      switch (n) {
        case 1:
          pip(C, C);
          break;
        case 2:
          pip(L, T);
          pip(R, B);
          break;
        case 3:
          pip(L, T);
          pip(C, C);
          pip(R, B);
          break;
        case 4:
          pip(L, T);
          pip(R, T);
          pip(L, B);
          pip(R, B);
          break;
        case 5:
          pip(L, T);
          pip(R, T);
          pip(C, C);
          pip(L, B);
          pip(R, B);
          break;
        case 6:
          pip(L, T);
          pip(R, T);
          pip(L, C);
          pip(R, C);
          pip(L, B);
          pip(R, B);
          break;
        default:
          pip(C, C);
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    }

    function createFaceTextureFromSpec(spec: FaceSpec, size = 1024) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      // background
      const bg =
        typeof spec === "object" && spec.colour ? spec.colour : "#10f898";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);

      // border
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = size * 0.1;
      ctx.strokeRect(0, 0, size, size);
      // make "outset" border so the top left edges are lighter, and the bottom right edges are darker
      ctx.beginPath();
      ctx.moveTo(0, size);
      ctx.lineTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size, 0);
      ctx.lineTo(size, size);
      ctx.lineTo(0, size);
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.stroke();

      // text to display
      const text =
        typeof spec === "object"
          ? String(spec.label ?? spec.value)
          : String(spec);
      // draw centered
      let fontSize = Math.floor(size * 0.28);
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${fontSize}px sans-serif`;
      // break long text if necessary
      const maxWidth = size * 0.8;

      const maxTries = 5;
      let tries = 0;
      while (ctx.measureText(text).width > maxWidth) {
        tries++;
        if (tries >= maxTries) break;
        fontSize = fontSize * 0.9;
        ctx.font = `${fontSize}px sans-serif`;
      }

      ctx.fillText(text, size / 2, size / 2);

      const tex = new THREE.CanvasTexture(canvas);
      tex.needsUpdate = true;
      return tex;
    }

    function materialsFromSpecs(
      specs?: FaceSpec[] | null
    ): THREE.MeshStandardMaterial[] | null {
      // mapping for cube materials array: +X, -X, +Y, -Y, +Z, -Z
      // user-provided specs are expected in face order 1..6 (traditional die):
      // 1: top (+Y), 2: front (+Z), 3: right (+X), 4: left (-X), 5: back (-Z), 6: bottom (-Y)
      // mapping indices: [3,4,1,6,2,5] -> zero-based: [2,3,0,5,1,4]
      if (!specs || specs.length !== 6) return null;
      const mapIdx = [2, 3, 0, 5, 1, 4];
      return mapIdx.map((i) => {
        const tex = createFaceTextureFromSpec(specs[i]);
        return new THREE.MeshStandardMaterial({
          map: tex,
          color: new THREE.Color("#10f898"),
          roughness: 0.6,
          metalness: 0.05,
        });
      });
    }

    const materials = [
      new THREE.MeshBasicMaterial({ map: createPipTexture(3) }),
      new THREE.MeshBasicMaterial({ map: createPipTexture(4) }),
      new THREE.MeshBasicMaterial({ map: createPipTexture(1) }),
      new THREE.MeshBasicMaterial({ map: createPipTexture(6) }),
      new THREE.MeshBasicMaterial({ map: createPipTexture(2) }),
      new THREE.MeshBasicMaterial({ map: createPipTexture(5) }),
    ];

    // Use MeshStandardMaterial so lighting affects the faces; tint with base color #10f898
    const baseColor = new THREE.Color("#10f898");
    const stdMaterials = materials.map((m) => {
      const map = (m as THREE.MeshBasicMaterial).map ?? null;
      return new THREE.MeshStandardMaterial({
        map,
        color: baseColor,
        roughness: 0.6,
        metalness: 0.05,
      });
    });
    const diceMesh = new THREE.Mesh(diceGeometry, stdMaterials);
    scene.add(diceMesh);
    diceMeshRef.current = diceMesh;
    diceMesh.castShadow = true;
    diceMesh.receiveShadow = false;
    // ensure visual matches physics start position
    diceMesh.position.copy(diceBody.position as unknown as THREE.Vector3);

    // Add an invisible floor that only receives shadows so it doesn't obscure the page
    const floorGeo = new THREE.PlaneGeometry(2000, 2000);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.6 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -1;
    // receiveShadow must be true so shadows are drawn on the shadow material
    floorMesh.receiveShadow = true;
    // make sure the plane itself doesn't render color (ShadowMaterial handles this)
    scene.add(floorMesh);

    // Floor (much larger so big die can roll across viewport)
    const floorBody = new Body({
      mass: 0,
      shape: new Box(new Vec3(1000, 1, 1000)),
      position: new Vec3(0, -1, 0),
    });
    world.addBody(floorBody);

    // physics boundary walls (can be created/cleared dynamically)
    const boundaryWalls: Body[] = [];

    function clearBoundaryWalls() {
      boundaryWalls.forEach((b) => world.removeBody(b));
      boundaryWalls.length = 0;
    }

    function createBoundaryWallsForSides(
      sides: Array<"left" | "right" | "top" | "bottom">,
      limit = 100
    ) {
      // remove any previous
      clearBoundaryWalls();
      if (!sides || sides.length === 0) return;
      const t = 1; // wall thickness (half-extent on thin axis)
      const h = 100; // wall height half-extent
      // left wall at x = -limit - t
      if (sides.includes("left")) {
        const left = new Body({
          mass: 0,
          shape: new Box(new Vec3(t, h, limit)),
          position: new Vec3(-limit - t, h - 1, 0),
        });
        world.addBody(left);
        boundaryWalls.push(left);
      }
      if (sides.includes("right")) {
        const right = new Body({
          mass: 0,
          shape: new Box(new Vec3(t, h, limit)),
          position: new Vec3(limit + t, h - 1, 0),
        });
        world.addBody(right);
        boundaryWalls.push(right);
      }
      if (sides.includes("top")) {
        // top means negative Z
        const top = new Body({
          mass: 0,
          shape: new Box(new Vec3(limit, h, t)),
          position: new Vec3(0, h - 1, -(limit / 2) - t),
        });
        world.addBody(top);
        boundaryWalls.push(top);
      }
      if (sides.includes("bottom")) {
        // bottom means positive Z
        const bottom = new Body({
          mass: 0,
          shape: new Box(new Vec3(limit, h, t)),
          position: new Vec3(0, h - 1, limit / 2 + t),
        });
        world.addBody(bottom);
        boundaryWalls.push(bottom);
      }
      // no debug visuals
    }

    // play rolling tick sound on collisions
    let lastPlayTime = 0;
    diceBody.addEventListener("collide", (e: { contact: ContactEquation }) => {
      const linearVelocity = e.contact.bi.velocity.length();

      if (linearVelocity < 5) return;

      if (lastPlayTime && Date.now() - lastPlayTime < 100) return;
      lastPlayTime = Date.now();

      playTick();
    });

    // no visual debug wall helpers

    let lastFrameTime = 0;
    const animate: FrameRequestCallback = (time) => {
      const delta = Math.min(1 / 20, (time - lastFrameTime) / 1000);
      lastFrameTime = time;

      world.step(delta * 2.5);

      let isSettled = false;
      if (diceMesh && diceBody) {
        // sync positions between Cannon and Three
        diceMesh.position.copy(diceBody.position as unknown as THREE.Vector3);
        diceMesh.quaternion.copy(
          diceBody.quaternion as unknown as THREE.Quaternion
        );
      }
      renderer.render(scene, camera);

      // Check if dice has settled and resolve promise if present
      if (
        diceBody.velocity.length() < 0.01 &&
        diceBody.angularVelocity.length() < 0.01 &&
        diceBody.position.y < 18
      ) {
        isSettled = true;
        playDing();

        if (resolveRef.current) {
          const result = getDiceResult(
            diceBody.quaternion,
            faceSpecsRef.current
          );
          resolveRef.current(result);
          resolveRef.current = null;
          // clear temporary boundary walls once the die has settled
          try {
            clearBoundaryWalls();
          } catch {
            // ignore
          }
          // after the roll, clear any faceSpecs to avoid leaking into next roll
          faceSpecsRef.current = null;
          // schedule fade-out 5s after roll finishes
          try {
            const el = renderer.domElement;
            if (fadeTimeoutRef.current) {
              clearTimeout(fadeTimeoutRef.current);
              fadeTimeoutRef.current = null;
            }
            fadeTimeoutRef.current = window.setTimeout(() => {
              try {
                el.style.transition = "opacity 2000ms ease";
                el.style.opacity = "0";
              } catch {
                // ignore
              }
            }, 5000);
          } catch {
            // ignore
          }
        }
      }

      if (!isSettled) {
        frameIdRef.current = requestAnimationFrame(animate);
      } else {
        frameIdRef.current = null;
      }
    };

    function startRoll() {
      if (!diceBody) return;
      // ensure canvas is visible immediately when a roll starts
      try {
        const el = renderer.domElement;
        el.style.transition = "none";
        el.style.opacity = "1";
        if (fadeTimeoutRef.current) {
          clearTimeout(fadeTimeoutRef.current);
          fadeTimeoutRef.current = null;
        }
      } catch {
        // ignore
      }
      // larger span so the die is thrown farther across the viewport
      const spanLarge = 300;
      // compute spawn margin so die starts outside the walls considering die half-size
      const dieHalf = 9; // physics half-extent used when creating the die
      const spawnMargin = Math.max(40, dieHalf + 12);
      // pick a random side (0=left,1=right)
      const side = Math.floor(Math.random() * 2);
      let px = 0,
        pz = 0,
        vx = 0,
        vz = 0;
      const baseSpeed = (Math.random() * 6 + 14) * 6; // boosted speed for longer throws
      switch (side) {
        case 0: // left
          px = -spanLarge - spawnMargin;
          pz = 0;
          vx = baseSpeed + Math.random() * 12;
          vz = (Math.random() - 0.5) * 12;
          // create walls on top/right/bottom to limit roll to 100 from center
          createBoundaryWallsForSides(["top", "right", "bottom"], 100);
          break;
        case 1: // right
          px = spanLarge + spawnMargin;
          pz = 0;
          vx = -baseSpeed - Math.random() * 12;
          vz = (Math.random() - 0.5) * 12;
          // create walls on left/top/bottom
          createBoundaryWallsForSides(["left", "top", "bottom"], 100);
          break;
      }

      // if custom face specs provided for this roll, apply them now
      try {
        const specs = faceSpecsRef.current;
        const newMats = materialsFromSpecs(specs ?? null);
        if (newMats && diceMesh) {
          // dispose previous maps
          const prev = diceMesh.material as unknown as THREE.Material[];
          if (Array.isArray(prev)) {
            prev.forEach((pm) => {
              const m = pm as THREE.MeshStandardMaterial;
              if (m.map) m.map.dispose();
              m.dispose();
            });
          }
          diceMesh.material =
            newMats as unknown as THREE.MeshStandardMaterial[];
        }
      } catch {
        // ignore errors generating custom faces and fall back to default pips
      }

      // put dice well above ground to allow tumble
      diceBody.position.set(px, 36 + Math.random() * 18, pz);
      // no spawn marker in production
      diceBody.velocity.set(vx, 8 + Math.random() * 8, vz);
      diceBody.angularVelocity.set(
        Math.random() * 10,
        Math.random() * 10,
        Math.random() * 10
      );
      diceBody.quaternion.setFromEuler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      // kick off animation loop if not running
      if (frameIdRef.current == null)
        frameIdRef.current = requestAnimationFrame(animate);
      // throw initiated
    }

    // expose startRoll via ref so the imperative handle can call it
    startRollRef.current = startRoll;
    // mark mounted and flush any queued start calls requested before mount
    mountedRef.current = true;
    if (queuedStartCallsRef.current.length) {
      queuedStartCallsRef.current.forEach((fn) => fn());
      queuedStartCallsRef.current.length = 0;
    }

    // handle resize
    function handleResize() {
      setRendererSize();
      // no debug visuals to update on resize
    }
    window.addEventListener("resize", handleResize);

    // cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      // dispose three renderer and remove DOM element
      try {
        renderer.dispose();
      } catch {
        // ignore
      }
      if (mount && renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      } else if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      // clear world
      world.bodies.forEach((b) => world.removeBody(b));
      // no debug meshes to cleanup
    };
  }, []);

  function getDiceResult(
    q: Quaternion,
    faceSpecs: FaceSpec[] | null
  ): number | string {
    // Map quaternion to up face (cube)
    const up = new Vec3(0, 1, 0);
    // 1: top (+Y), 2: front (+Z), 3: right (+X), 4: left (-X), 5: back (-Z), 6: bottom (-Y)
    const faces = [
      new Vec3(0, 1, 0), // 1
      new Vec3(0, 0, 1), // 2
      new Vec3(1, 0, 0), // 3
      new Vec3(-1, 0, 0), // 4
      new Vec3(0, 0, -1), // 5
      new Vec3(0, -1, 0), // 6
    ];
    let maxDot = -Infinity;
    let result = 1;
    for (let i = 0; i < faces.length; i++) {
      const worldFace = faces[i].clone();
      q.vmult(worldFace, worldFace);
      const dot = worldFace.dot(up);
      if (dot > maxDot) {
        maxDot = dot;
        result = i + 1;
      }
    }

    if (faceSpecs && faceSpecs.length === 6) {
      const spec = faceSpecs[result - 1];
      if (typeof spec === "object") {
        return spec.value;
      } else if (typeof spec === "number") {
        return spec;
      } else if (typeof spec === "string") {
        return spec;
      }
    }

    return result;
  }

  // startRoll is provided via startRollRef

  return <div ref={mountRef} />;
});

export { DiceRoller };
