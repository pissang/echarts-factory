import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { TextureLoader, Object3D, Mesh, MeshStandardMaterial, LinearFilter, VideoTexture, BufferGeometry, BufferAttribute, Box3, Group } from "three";
import {map as lightMapConfiuration, textures as lightMapTexturesUrls} from './lightmap';

DRACOLoader.setDecoderPath('dep/draco/');

function initCharts(sceneNode: Object3D) {
    let textureLoader = new TextureLoader();
    sceneNode.traverse(node => {
        let mesh = node as Mesh;
        if (mesh.name.match(/chart-/)) {
            let textureUrl = `asset/chart-shots/${mesh.name.replace('chart-', '')}.png`;
            let texture = textureLoader.load(textureUrl);
            texture.flipY = false;
            let material = (mesh.material as MeshStandardMaterial).clone();
            texture.minFilter = LinearFilter;
            material.emissiveMap = texture;
            mesh.material = material;
            material.emissiveIntensity = 3;
        }
        if (mesh.name === 'video') {
            let video = document.createElement('video');
            let played = false;
            video.muted = true;
            video.loop = true;
            video.src = 'asset/video.mp4';
            video.oncanplay = function () {
                if (played) {
                    return
                }
                played = true;
                video.play();
                let videoTexture = new VideoTexture(video);
                videoTexture.flipY = false;
                videoTexture.minFilter = LinearFilter;
                let material = mesh.material as MeshStandardMaterial;
                material.emissiveMap = videoTexture;
                material.emissiveIntensity = 2;
                material.needsUpdate = true;
            }
        }
    })
}

export function loadMainScene(): Promise<{opaque: Object3D, glass: Object3D}> {
    return new Promise(resolve => {

        let sceneLoader = new GLTFLoader();
        sceneLoader.setDRACOLoader( new DRACOLoader() );
        let now = Date.now();
        sceneLoader.load('asset/scene-draco.glb', gltf => {
            console.log(Date.now() - now);

            let loader = new TextureLoader();
            let lightMapTextures = lightMapTexturesUrls.map(url => {
                return loader.load(url, onTextureLoad);
            });

            let loading = lightMapTexturesUrls.length;
            function onTextureLoad(loadedTexture) {
                loading--;
                loadedTexture.flipY = true;
                loadedTexture.minFilter = LinearFilter;
                if (loading === 0) {
                    updateLightMap();
                }
            }

            function updateLightMap() {
                let opaqueList = [];
                let glassList = [];
                gltf.scene.updateMatrixWorld(true);
                gltf.scene.traverse(object => {
                    let mesh = object as Mesh;
                    if (mesh.geometry) {
                        let lightMapConf = lightMapConfiuration.data.find(a => a.name === mesh.name);
                        // console.log(mesh.name);
                        if (lightMapConf) {
                            if (mesh.material) {
                                // Make sure material is unique for meshes using different lightmap
                                let material = (mesh.material as MeshStandardMaterial).clone();
                                material.lightMap = lightMapTextures[lightMapConf.mapIndex];
                                material.needsUpdate = true;
                                material.emissiveIntensity = 2;

                                mesh.material = material;

                                // material.onBeforeCompile = shader => {
                                //     shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>',
                                //     `#include <dithering_fragment>
                                //     gl_FragColor = vec4(vUv2, 1.0, 1.0);
                                //     `);
                                // };
                            }
                            let tilingX = lightMapConf.tilingX;
                            let tilingY = lightMapConf.tilingY;
                            let offsetX = lightMapConf.offsetX;
                            let offsetY = lightMapConf.offsetY;

                            let geo = mesh.geometry as BufferGeometry;
                            let uv2 = geo.attributes.uv2.array;
                            let newUv = new Float32Array(uv2.length);

                            for (let i = 0; i < uv2.length; i += 2) {
                                newUv[i] = uv2[i] * tilingX + offsetX;
                                // UnityGLTF will flip Y when exporting
                                newUv[i + 1] = (1 - uv2[i + 1]) * tilingY + offsetY;
                            }

                            geo.attributes.uv2.array = newUv;
                            (geo.attributes.uv2 as BufferAttribute).needsUpdate = true;
                        }

                        mesh.matrixWorld.decompose(mesh.position, mesh.quaternion, mesh.scale);
                        if (mesh.name.match('-glass')) {
                            glassList.push(mesh);
                        }
                        else {
                            opaqueList.push(mesh);
                        }
                    }
                });

                let opaque = new Group();
                let glass = new Group();
                opaqueList.forEach(obj => opaque.add(obj));
                glassList.forEach(obj => {
                    let mesh = obj as Mesh;
                    let material = obj.material.clone() as MeshStandardMaterial;
                    material.transparent = true;
                    material.opacity = 0.5;
                    mesh.material = material;
                    glass.add(obj)
                });

                resolve({
                    opaque,
                    glass
                });
            }

            initCharts(gltf.scene);
        });
    });
}