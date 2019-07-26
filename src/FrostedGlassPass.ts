import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { Scene, WebGLRenderer, WebGLRenderTarget, FloatType, DepthTexture, Vector2 } from "three";
import { Pass } from "three/examples/jsm/postprocessing/Pass";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass";

const blurFilter = {
    uniforms: {
        tDiffuse: {value: null},
        glassMask: {value: null},
        v: {value: new Vector2(0, 0)},
        blendColor: {value: false}
    },

    vertexShader: `varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,

    fragmentShader: `uniform sampler2D tDiffuse;
uniform sampler2D glassMask;
uniform vec2 v;
uniform bool blendColor;

varying vec2 vUv;

uniform mediump float distanceNormalizationFactor;

vec4 getBlendedColor(vec2 uv) {
    if (!blendColor) {
        return texture2D(tDiffuse, uv);
    }
    vec4 sourceColor = texture2D(tDiffuse, uv);
    vec4 targetColor = texture2D(glassMask, uv);

    return vec4(sourceColor.rgb * (1.0 - targetColor.a) + targetColor.rgb * targetColor.a, 1.0);
}

void main()
{
    vec4 sum = vec4( 0.0 );

    vec4 center = texture2D(glassMask, vUv);
    if (center.a == 0.0) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
    }

    sum += getBlendedColor(vUv ) * 0.1633;

    sum += getBlendedColor(vUv - 4.0 * v) * 0.051;
    sum += getBlendedColor(vUv - 3.0 * v) * 0.0918;
    sum += getBlendedColor(vUv - 2.0 * v) * 0.12245;
    sum += getBlendedColor(vUv - 1.0 * v) * 0.1531;
    sum += getBlendedColor(vUv + 1.0 * v) * 0.1531;
    sum += getBlendedColor(vUv + 2.0 * v) * 0.12245;
    sum += getBlendedColor(vUv + 3.0 * v) * 0.0918;
    sum += getBlendedColor(vUv + 4.0 * v) * 0.051;

    gl_FragColor = sum;
}
`
};

export class FrostedGlassPass extends Pass {

    private renderPass: RenderPass
    private blurPass1: ShaderPass
    private blurPass2: ShaderPass

    private glassScene: Scene

    private colorBuffer: WebGLRenderTarget
    private glassMask: WebGLRenderTarget
    private depthTexture: DepthTexture

    private pixelRatio = 1

    constructor(renderer: WebGLRenderer, renderPass: RenderPass, glassScene: Scene) {
        super();

        this.renderPass = renderPass;
        this.glassScene = glassScene;
        this.pixelRatio = renderer.getPixelRatio();

        this.depthTexture = new DepthTexture(512, 512);
        this.colorBuffer = new WebGLRenderTarget(512, 512, {
            type: FloatType
        });
        this.colorBuffer.depthTexture = this.depthTexture;
        this.glassMask = new WebGLRenderTarget(512, 512);
        this.glassMask.depthTexture = this.depthTexture;

        this.blurPass1 = new ShaderPass(blurFilter);
        this.blurPass2 = new ShaderPass(blurFilter);

        this.needsSwap = true;
    }

    setSize(width, height) {
        let width2 = width * this.pixelRatio;
        let height2 = height * this.pixelRatio;
        this.depthTexture.image.width = width2;
        this.depthTexture.image.height = height2;
        this.colorBuffer.setSize(width2, height2);
        this.glassMask.setSize(width2, height2);

        (this.blurPass1.uniforms as any).v.value.x = 1 / width;
        (this.blurPass2.uniforms as any).v.value.y = 1 / height;
    }

    render(renderer: WebGLRenderer, writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget, deltaTime, maskActive) {
        this.renderPass.render(renderer, null, this.colorBuffer, null, null);

        // Render glass mask
        renderer.autoClearDepth = false;
        renderer.setRenderTarget(this.glassMask);
        renderer.render(this.glassScene, this.renderPass.camera);
        renderer.autoClearDepth = true;
        // Blur glass
        (this.blurPass1.uniforms as any).glassMask.value = this.glassMask.texture;
        (this.blurPass2.uniforms as any).glassMask.value = this.glassMask.texture;

        for (let i = 0; i < 2; i++) {
            (this.blurPass1.uniforms as any).blendColor.value = i === 0;
            this.blurPass1.render(renderer, readBuffer, i === 0 ? this.colorBuffer : writeBuffer, null, null);
            this.blurPass2.render(renderer, writeBuffer, readBuffer, null, null);
        }
    }
}