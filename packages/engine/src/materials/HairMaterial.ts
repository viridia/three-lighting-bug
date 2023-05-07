import { Color, ShaderMaterial, UniformsLib } from 'three';
import { ShaderChunk } from 'three';
import glsl from './glsl';

const hairVert = glsl`
#define STANDARD

varying vec3 vViewPosition;
varying vec3 vNormal;

${ShaderChunk.common}
${ShaderChunk.uv_pars_vertex}
${ShaderChunk.color_pars_vertex}
${ShaderChunk.fog_pars_vertex}
${ShaderChunk.shadowmap_pars_vertex}
${ShaderChunk.skinning_pars_vertex}
${ShaderChunk.clipping_planes_pars_vertex}

void main() {
	${ShaderChunk.uv_vertex}
	${ShaderChunk.color_vertex}
	${ShaderChunk.beginnormal_vertex}
  ${ShaderChunk.skinbase_vertex}
  ${ShaderChunk.skinnormal_vertex}
	${ShaderChunk.morphnormal_vertex}
	${ShaderChunk.defaultnormal_vertex}
	vNormal = normalize(transformedNormal);
	${ShaderChunk.begin_vertex}
  ${ShaderChunk.skinning_vertex}
	${ShaderChunk.project_vertex}
	${ShaderChunk.clipping_planes_vertex}

	vViewPosition = -mvPosition.xyz;

	${ShaderChunk.worldpos_vertex}
	${ShaderChunk.shadowmap_vertex}
	${ShaderChunk.fog_vertex}
}`;

const hairFrag = glsl`
#define STANDARD

uniform vec3 diffuse;
uniform vec3 specular;
uniform float shininess;

varying vec3 vPosition;
varying vec3 vNormal;

${ShaderChunk.common}
${ShaderChunk.packing}
${ShaderChunk.uv_pars_fragment}
${ShaderChunk.uv2_pars_fragment}
${ShaderChunk.lightmap_pars_fragment}
${ShaderChunk.bsdfs}
${ShaderChunk.lights_pars_begin}
${ShaderChunk.lights_phong_pars_fragment}
${ShaderChunk.shadowmap_pars_fragment}
${ShaderChunk.clipping_planes_pars_fragment}

vec3 HairShine_Specular(
		const in IncidentLight incidentLight,
		const in GeometricContext geometry,
		const in vec3 specularColor,
		const in float shininess) {

	vec3 r = normalize(reflect(-incidentLight.direction, geometry.normal));
	vec3 v = normalize(geometry.viewDir);
	float specular = pow(sin(max(dot(r, v), 0.) * 3.141), shininess) * 1.;
	return specularColor * specular;
}

void RE_Direct_HairShine(
		const in IncidentLight directLight,
		const in GeometricContext geometry,
		const in BlinnPhongMaterial material,
		inout ReflectedLight reflectedLight) {
	float dotNL = saturate(dot(geometry.normal, directLight.direction));
	vec3 irradiance = dotNL * directLight.color;
	// reflectedLight.directDiffuse += irradiance * 0.5 * BRDF_Diffuse_Lambert(material.diffuseColor);
	reflectedLight.directSpecular += irradiance * HairShine_Specular(
			directLight,
			geometry,
			material.specularColor,
			material.specularShininess) * material.specularStrength;
}

#undef RE_Direct
#define RE_Direct RE_Direct_HairShine

void main() {
  ${ShaderChunk.clipping_planes_fragment}

	// Color computation
	vec4 diffuseColor = vec4(diffuse, 1.);
	float specularStrength = 0.5;

	${ShaderChunk.normal_fragment_begin}

	ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));

	// accumulation
	${ShaderChunk.lights_phong_fragment}
	${ShaderChunk.lights_fragment_begin}
	${ShaderChunk.lights_fragment_end}

	vec3 outgoingLight =
		reflectedLight.directDiffuse +
		reflectedLight.indirectDiffuse +
		reflectedLight.directSpecular +
		reflectedLight.indirectSpecular;
	gl_FragColor = vec4(outgoingLight, 1.);

	${ShaderChunk.encodings_fragment}
	${ShaderChunk.premultiplied_alpha_fragment}
}`;

export class HairMaterial extends ShaderMaterial {
  constructor({ color }: { color: Color }) {
    super({
      uniforms: {
        ...UniformsLib.common,
        ...UniformsLib.lights,
        diffuse: { value: color },
        specular: { value: getShineColor(color) },
        shininess: { value: 2 },
      },
      fragmentShader: hairFrag,
      vertexShader: hairVert,
      transparent: false,
      lights: true,
      clipping: true,
    });
  }

  public get color(): Color {
    return this.uniforms.diffuse.value;
  }

  public set color(value: Color) {
    this.uniforms.diffuse.value = value;
    this.uniforms.specular.value = getShineColor(value);
  }

  public updateShine() {
    this.uniforms.specular.value = getShineColor(this.uniforms.diffuse.value);
  }
}

function getShineColor(color: Color) {
  return new Color(color).offsetHSL(0, 0, 0.1);
}
