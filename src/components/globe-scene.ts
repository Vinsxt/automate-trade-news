import {
  Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial,
  MeshPhongMaterial, OrthographicCamera, Scene, SphereGeometry, SRGBColorSpace,
  TextureLoader, Vector3, WebGLRenderer,
} from "three";

const radians = Math.PI / 180;

export async function mountGlobe(host: HTMLElement, onContextLost: () => void) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", { alpha: true, antialias: true });
  if (!context) throw new Error("WebGL2 is unavailable");
  const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  const texture = await new TextureLoader().loadAsync("/trade/globe-map.webp").catch(error => {
    renderer.dispose();
    renderer.forceContextLoss();
    throw error;
  });
  texture.colorSpace = SRGBColorSpace;

  const scene = new Scene();
  const camera = new OrthographicCamera(-1.5, 1.5, 1.5, -1.5, 0.1, 10);
  camera.position.z = 4;

  const axis = new Group();
  axis.rotation.x = 8 * radians;
  const earth = new Group();
  earth.rotation.y = (270 - 117) * radians;
  axis.add(earth);
  scene.add(axis);

  const geometry = new SphereGeometry(1, 56, 40);
  const material = new MeshPhongMaterial({ map: texture, shininess: 12, specular: new Color("#2d5f94") });
  earth.add(new Mesh(geometry, material));

  const latitude = -6.21 * radians;
  const longitude = 106.85 * radians;
  const surface = new Vector3(Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), -Math.cos(latitude) * Math.sin(longitude));
  const markerGeometry = new SphereGeometry(0.021, 12, 8);
  const markerMaterial = new MeshBasicMaterial({ color: "#99f6e4" });
  const marker = new Mesh(markerGeometry, markerMaterial);
  marker.position.copy(surface.multiplyScalar(1.008));
  earth.add(marker);

  scene.add(new HemisphereLight("#f5fbff", "#82a5cd", 1.6));
  const sunlight = new DirectionalLight("#ffffff", 1.1);
  sunlight.position.set(-3, 3, 5);
  scene.add(sunlight);

  const hero = host.closest("[data-landing]")?.querySelector<HTMLElement>("[data-landing-hero]");
  let running = false;
  let lastFrame: number | undefined;
  let width = 1;
  let height = 1;
  let passage = 0;

  const render = () => {
    const aspect = width / height;
    const desktop = width >= 900 && aspect >= 9 / 8;
    const eased = passage * passage * (3 - 2 * passage);

    axis.position.set(
      desktop ? 0.69 * aspect + eased * 0.62 : 0.07 + eased * 0.35,
      (desktop ? 0.06 : -0.73) + eased * 2.75,
      0,
    );
    const baseScale = desktop ? 0.95 : Math.min(0.73, aspect * 1.22);
    axis.scale.setScalar(baseScale * (1 - eased * 0.72));
    renderer.render(scene, camera);
  };

  const updateScroll = (weight: number) => {
    const requestedDistance = Math.max(0, window.scrollY);
    const requestedPassage = Math.min(1, requestedDistance / Math.max(height * 0.72, (hero?.offsetHeight ?? height) * 0.86));
    passage += (requestedPassage - passage) * weight;
  };

  const resize = () => {
    if (!host.clientWidth || !host.clientHeight) return;
    width = host.clientWidth;
    height = host.clientHeight;
    camera.left = -1.5 * width / height;
    camera.right = -camera.left;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    render();
  };
  const observer = new ResizeObserver(resize);
  const contextLost = (event: Event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    running = false;
    onContextLost();
  };
  renderer.domElement.className = "block size-full";
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  host.append(renderer.domElement);
  observer.observe(host);
  width = Math.max(host.clientWidth, 1);
  height = Math.max(host.clientHeight, 1);
  updateScroll(1);
  resize();

  return {
    setRunning(active: boolean) {
      if (running === active) return;
      running = active;
      lastFrame = undefined;
      renderer.setAnimationLoop(active ? time => {
        const delta = lastFrame === undefined ? 0 : Math.min(time - lastFrame, 60);
        earth.rotation.y += delta * 0.000145;
        lastFrame = time;
        updateScroll(1 - Math.exp(-delta / 190));
        render();
      } : null);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      renderer.domElement.remove();
      geometry.dispose();
      material.dispose();
      markerGeometry.dispose();
      markerMaterial.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
