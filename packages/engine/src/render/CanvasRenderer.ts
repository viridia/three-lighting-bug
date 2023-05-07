import {
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Plane,
  Scene,
  sRGBEncoding,
  Vector3,
  WebGLRenderer,
} from 'three';

/** Renderer that renders to a canvas element. */
export class CanvasRenderer {
  public readonly scene = new Scene();
  public readonly camera: PerspectiveCamera;
  public readonly sunlight: DirectionalLight;
  public readonly ambient: HemisphereLight;
  public clearColor: Color = new Color('#787898');
  private renderer: WebGLRenderer;

  constructor(canvas: HTMLCanvasElement) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * 4;
    canvas.height = height * 4;

    this.renderer = new WebGLRenderer({ antialias: true, canvas, stencil: false });
    this.renderer.shadowMap.enabled = true;
    this.renderer.autoClear = true;
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.clippingPlanes = [new Plane(new Vector3(0, -1, 0), 20)];
    this.renderer.setClearColor(this.clearColor, 0);

    this.camera = new PerspectiveCamera(10, 1, 0.1, 100);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    const skyColor = 0xb1e1ff; // light blue
    const groundColor = 0xb97a20; // brownish orange
    const intensity = 0.9;
    this.ambient = new HemisphereLight(skyColor, groundColor, intensity);
    this.scene.add(this.ambient);

    this.sunlight = new DirectionalLight('#ffffff', 0.7);
    this.sunlight.position.set(3, 17, -6);
    this.sunlight.target.position.set(0, 0, 0);
    this.sunlight.castShadow = true;
    this.sunlight.shadow.camera.near = 1;
    this.sunlight.shadow.camera.far = 32;
    this.sunlight.shadow.camera.left = -11;
    this.sunlight.shadow.camera.right = 11;
    this.sunlight.shadow.camera.top = 10;
    this.sunlight.shadow.camera.bottom = -10;
    this.scene.add(this.sunlight);
    this.scene.add(this.sunlight.target);
  }

  public dispose() {
    this.scene.clear();
    this.sunlight.dispose();
    this.ambient.dispose();
    this.renderer.dispose();
  }

  /** Render to canvas element. */
  public render() {
    this.renderer.render(this.scene, this.camera);
  }
}
