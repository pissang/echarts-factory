export default {
    uniforms: {
        "tDiffuse": {value: null},
        "exposure": {value: 1}
    },

    vertexShader: `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
    `,
    fragmentShader: `
uniform sampler2D tDiffuse;
uniform float exposure;
varying vec2 vUv;
vec3 _ACESFilmicToneMapping( vec3 color ) {
	color *= exposure;
	return saturate( ( color * ( 2.51 * color + 0.03 ) ) / ( color * ( 2.43 * color + 0.59 ) + 0.14 ) );
}
vec4 _LinearToGamma( in vec4 value, in float gammaFactor ) {
    return vec4( pow( value.rgb, vec3( 1.0 / gammaFactor ) ), value.a );
}
void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    color.rgb = _ACESFilmicToneMapping(color.rgb);
    gl_FragColor = _LinearToGamma(color, 2.0);
}
    `
}