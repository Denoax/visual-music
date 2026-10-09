import * as THREE from "three";
export function showUniforms() {
  return {
    uTime: { value: 0 },
    uDensity: { value: 0.24 },
    uMorph: { value: 0.13 },
    uGroupPulse: { value: new THREE.Vector3() },
    uRelease: { value: 0 },
    uRibbons: { value: 0.2 },
    uBeams: { value: 0.2 },
    uPalette: { value: 0 },
    uBrightness: { value: 1 },
    uAccent: { value: 0 },
    uLow: { value: 0 },
    uHigh: { value: 0 },
    uWaveAge: { value: -1 },
    uWaveOrigin: { value: new THREE.Vector2() },
    uEye: { value: new THREE.Vector3() },
    uPixelRatio: { value: 1 },
    uRestrained: { value: 0 },
    uPools: { value: Array.from({ length: 6 }, () => new THREE.Vector4()) },
  };
}
export type ShowUniforms = ReturnType<typeof showUniforms>;
export const globals = `
uniform float uTime,uDensity,uMorph,uRelease,uRibbons,uBeams,uPalette,uBrightness,uAccent,uLow,uHigh,uWaveAge,uRestrained;
uniform vec3 uGroupPulse; uniform vec2 uWaveOrigin; uniform vec3 uEye;
float hill(vec2 p){return 4.1*sin(p.x*.045+p.y*.018)+3.2*cos(p.y*.049-p.x*.013)+1.7*sin(p.x*.092+p.y*.037);}
vec3 colour(float seed,float height){
 vec3 cyan=vec3(.001,.55,1.1),pink=vec3(.85,.002,.18),violet=vec3(.12,.001,.62),gold=vec3(1.5,.29,.003);
 float region=sin(seed*4.0+uPalette*2.7);
 vec3 a=mix(cyan,pink,smoothstep(-.4,.45,region));
 vec3 b=mix(violet,cyan,smoothstep(-.2,.6,region));
 vec3 c=mix(b,a,smoothstep(-.55,.9,height));
 return mix(c,gold,smoothstep(.91,1.,fract(seed*7.13))*.8);
}
float fogAmount(vec3 p){return 1.0-exp(-length(p-uEye)*.008);}
float wave(vec2 p){float d=length(p-uWaveOrigin);return uWaveAge<0.?0.:exp(-pow((d-uWaveAge*18.)/4.,2.))*(1.-smoothstep(4.,8.,uWaveAge));}
vec3 litFog(vec3 c,vec3 p){return mix(c,vec3(.002,.005,.014),fogAmount(p))*uBrightness;}
`;
export function shader(
  uniforms: ShowUniforms,
  vertexShader: string,
  fragmentShader: string,
  options: THREE.ShaderMaterialParameters = {},
) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: globals + vertexShader,
    fragmentShader: globals + fragmentShader,
    ...options,
  });
}
