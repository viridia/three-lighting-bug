import { DoubleSide, ShaderMaterial, UniformsLib } from 'three';
import { ShaderChunk } from 'three';
import glsl from '../../materials/glsl';

const portalVert = glsl`
#define STANDARD

${ShaderChunk.common}
${ShaderChunk.clipping_planes_pars_vertex}

void main() {
  vec3 transformed = vec3(position);
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * mvPosition;
	${ShaderChunk.clipping_planes_vertex}
}`;

const portalFrag = glsl`
#define STANDARD

${ShaderChunk.common}
${ShaderChunk.clipping_planes_pars_fragment}

uniform sampler2D portalTexture;
uniform vec4 viewportRect;

void main() {
  ${ShaderChunk.clipping_planes_fragment}
  vec2 txCoord = (gl_FragCoord.xy - viewportRect.xy) / viewportRect.zw;
  gl_FragColor = texture2D(portalTexture, txCoord);
	${ShaderChunk.encodings_fragment}
	${ShaderChunk.premultiplied_alpha_fragment}
}`;

export class ActivePortalMaterial extends ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        ...UniformsLib.common,
      },
      fragmentShader: portalFrag,
      vertexShader: portalVert,
      clipping: true,
      lights: false,
      side: DoubleSide,
    });
  }
}
