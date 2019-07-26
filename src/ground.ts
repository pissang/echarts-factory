import { Mesh, PlaneBufferGeometry, MeshStandardMaterial, TextureLoader, RepeatWrapping, Texture } from "three";

export function makeGround(): Promise<Mesh> {
    let groundMesh = new Mesh(
        new PlaneBufferGeometry(),
        new MeshStandardMaterial({
            metalness: 0,
            roughness: 1,
            transparent: true,
            opacity: 0.5
        })
    );
    groundMesh.position.y = 0.8;
    groundMesh.scale.set(500, 500, 1);
    groundMesh.rotation.x = -Math.PI / 2;
    let loader = new TextureLoader();
    return new Promise(resolve => {
        let count = 3;
        function onLoad() {
            count--;
            if (count === 0) {
                resolve(groundMesh);
            }
        }
        function setRepeat(texture: Texture) {
            texture.repeat.set(200, 200);
            texture.wrapS = RepeatWrapping;
            texture.wrapT = RepeatWrapping;
            texture.anisotropy = 8;
        }
        let material = groundMesh.material as MeshStandardMaterial;
        material.onBeforeCompile = shader => {
            shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>',
            `#include <dithering_fragment>
gl_FragColor.a *= max(1.0 - length(vViewPosition.xz) / 50.0, 0.0);
            `)
        };
        material.map = loader.load('asset/cell/albedo.jpg', onLoad);
        material.normalMap = loader.load('asset/cell/normal.jpg', onLoad);
        material.emissiveMap = loader.load('asset/cell/emissive.jpg', onLoad);
        setRepeat(material.map);
        setRepeat(material.normalMap);
        setRepeat(material.emissiveMap);
        material.color.set(0xffffff);
        material.emissive.set(0xffffff);
        material.emissiveIntensity = 20;
        material.needsUpdate = true;
    });
}