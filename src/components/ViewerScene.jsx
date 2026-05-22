import React, { useRef, useEffect, useState } from "react";
import { Canvas, useLoader, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { RGBELoader } from "three-stdlib";
import { EXRLoader } from "three-stdlib";
import { OBJLoader } from "three-stdlib";
import { GLTFLoader } from "three-stdlib";
import { FBXLoader } from "three-stdlib";
import { STLLoader } from "three-stdlib";
import { ColladaLoader } from "three-stdlib";

const PBRMesh = ({ textures, geometryType, settings, renderMode = 'pbr' }) => {
    const meshRef = useRef();

    // Load textures if they exist. Use a placeholder if not, or just null.
    // Actually, useTexture works best with static URLs. For dynamic local blobs,
    // we might want to just instantiate textures manually to avoid suspense issues
    // or use key-based remounting.
    // A simple way is to use a primitive <meshStandardMaterial /> and attach props.

    const materialRef = useRef();

    const applyRepeat = (tex) => {
        if (!tex) return;
        const u = settings.textureRepeat?.u ?? 1;
        const v = settings.textureRepeat?.v ?? 1;
        tex.repeat.set(u, v);
        tex.needsUpdate = true;
    };

    useEffect(() => {
        if (materialRef.current) {
            const mat = materialRef.current;
            const loader = new THREE.TextureLoader();

            const loadMap = (url, mapType) => {
                if (url) {
                    loader.load(url, (tex) => {
                        tex.colorSpace = mapType === 'map' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
                        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                        applyRepeat(tex);
                        mat[mapType] = tex;
                        mat.needsUpdate = true;
                    });
                } else {
                    mat[mapType] = null;
                    mat.needsUpdate = true;
                }
            };

            loadMap(textures.map, 'map');
            loadMap(textures.normalMap, 'normalMap');
            loadMap(textures.roughnessMap, 'roughnessMap');
            loadMap(textures.metalnessMap, 'metalnessMap');
            loadMap(textures.displacementMap, 'displacementMap');

            // Fresnel-ish rim via shader hook
            mat.onBeforeCompile = (shader) => {
                shader.uniforms.fresnelStrength = { value: settings.fresnelStrength };
                shader.uniforms.fresnelPower = { value: settings.fresnelPower };

                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <common>',
                    `
                    #include <common>
                    uniform float fresnelStrength;
                    uniform float fresnelPower;
                    `
                );

                shader.fragmentShader = shader.fragmentShader.replace(
                    '#include <output_fragment>',
                    `
                    {
                        vec3 n = normalize(geometryNormal);
                        vec3 v = normalize(geometry.viewDir);
                        float fresnelTerm = pow(1.0 - saturate(dot(n, v)), fresnelPower);
                        // Add rim to final outgoing light to ensure it shows up regardless of BRDF split
                        outgoingLight += vec3(fresnelTerm * fresnelStrength);
                    }
                    #include <output_fragment>
                    `
                );

                mat.userData.shader = shader;
            };

            mat.needsUpdate = true;
        }
    }, [textures, settings.fresnelStrength, settings.fresnelPower, settings.textureRepeat]);

    useEffect(() => {
        const shader = materialRef.current?.userData?.shader;
        if (shader) {
            shader.uniforms.fresnelStrength.value = settings.fresnelStrength;
            shader.uniforms.fresnelPower.value = settings.fresnelPower;
        }
    }, [settings.fresnelStrength, settings.fresnelPower]);

    useEffect(() => {
        const mat = materialRef.current;
        if (!mat) return;
        const maps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'displacementMap'];
        maps.forEach((m) => applyRepeat(mat[m]));
    }, [settings.textureRepeat]);

    let Geometry;
    switch (geometryType) {
        case "Sphere":
            Geometry = <sphereGeometry args={[1, 128, 128]} />;
            break;
        case "Cube":
            Geometry = <boxGeometry args={[1.5, 1.5, 1.5, 64, 64, 64]} />;
            break;
        case "Cylinder":
            // Closed caps so we see top and bottom instead of a single open surface
            Geometry = <cylinderGeometry args={[1, 1, 2, 128, 64, false]} />;
            break;
        case "Plane":
            Geometry = <planeGeometry args={[2, 2, 128, 128]} />; // High segs for displacement
            break;
        default:
            Geometry = <sphereGeometry args={[1, 128, 128]} />;
    }

    // Render different materials based on renderMode
    let Material;
    if (renderMode === 'normal') {
        // Normal visualization material
        Material = (
            <meshNormalMaterial
                side={settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide}
            />
        );
    } else if (renderMode === 'wireframe') {
        // Wireframe material
        Material = (
            <meshBasicMaterial
                wireframe
                color="#00aaff"
                side={settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide}
            />
        );
    } else {
        // PBR material (default)
        Material = (
            <meshStandardMaterial
                ref={materialRef}
                color={settings.materialColor || '#cccccc'}
                displacementScale={settings.displacementScale}
                displacementBias={-settings.displacementScale / 2}
                normalScale={[settings.normalScale, settings.normalScale]}
                roughness={settings.roughness}
                metalness={settings.metalness}
                side={settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide}
            />
        );
    }

    return (
        <mesh ref={meshRef} castShadow receiveShadow>
            {Geometry}
            {Material}
        </mesh>
    );
};

/** Rodin basic_shaded: baked color in emissiveTexture, black base, no baseColor map */
const isEmissiveBakeMaterial = (material) => {
    if (!material?.emissiveMap) return false;
    if (material.map) return false;
    const c = material.color;
    const luminance = c ? c.r + c.g + c.b : 0;
    return luminance < 0.15;
};

const createEmissiveBakeMaterial = (source, settings) => {
    const side = settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
    const tex = source.emissiveMap;
    if (tex) tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshBasicMaterial({
        map: tex,
        side,
        transparent: source.transparent ?? false,
        opacity: source.opacity ?? 1,
    });
    mat.userData.isEmissiveBake = true;
    return mat;
};

const disposeMaterial = (material) => {
    if (!material) return;
    if (Array.isArray(material)) {
        material.forEach(disposeMaterial);
        return;
    }
    if (material.dispose) material.dispose();
};

// Component for loading and displaying custom 3D models
const CustomModel = ({ customModel, settings, renderMode, textures, onModelLoaded }) => {
    const [model, setModel] = useState(null);
    const [loading, setLoading] = useState(false);
    const groupRef = useRef();
    const materialRef = useRef();

    useEffect(() => {
        if (!customModel?.file?.url) return;

        const fileUrl = customModel.file.url;
        const fileType = customModel.file.type;

        setLoading(true);

        let loader;
        switch (fileType) {
            case 'obj':
                loader = new OBJLoader();
                break;
            case 'gltf':
            case 'glb':
                loader = new GLTFLoader();
                break;
            case 'fbx':
                loader = new FBXLoader();
                break;
            case 'stl':
                loader = new STLLoader();
                break;
            case 'dae':
                loader = new ColladaLoader();
                break;
            default:
                console.error('Unsupported model format:', fileType);
                setLoading(false);
                return;
        }

        loader.load(
            fileUrl,
            (loadedModel) => {
                let modelObject;

                // Handle different loader output formats
                if (fileType === 'gltf' || fileType === 'glb') {
                    modelObject = loadedModel.scene;
                } else if (fileType === 'dae') {
                    modelObject = loadedModel.scene;
                } else if (fileType === 'stl') {
                    // STL only provides geometry, need to create mesh
                    const geometry = loadedModel;
                    const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
                    modelObject = new THREE.Mesh(geometry, material);
                } else {
                    modelObject = loadedModel;
                }

                // Calculate bounding box and center the model
                const box = new THREE.Box3().setFromObject(modelObject);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2 / maxDim; // Scale to fit in a 2-unit box

                modelObject.position.sub(center); // Center the model
                modelObject.scale.setScalar(scale); // Scale to fit

                setModel(modelObject);
                setLoading(false);
                if (onModelLoaded) onModelLoaded(modelObject);
            },
            (progress) => {
                console.log('Loading progress:', (progress.loaded / progress.total) * 100 + '%');
            },
            (error) => {
                console.error('Error loading model:', error);
                setLoading(false);
            }
        );
    }, [customModel?.file?.url, customModel?.file?.type]);

    // Apply textures and material settings to the loaded model
    useEffect(() => {
        if (!model) return;

        model.traverse((child) => {
            if (child.isMesh) {
                // Ensure geometry has normals
                if (!child.geometry.attributes.normal) {
                    child.geometry.computeVertexNormals();
                }

                // Apply render mode
                if (renderMode === 'normal') {
                    const normalMat = new THREE.MeshNormalMaterial({
                        side: settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
                        flatShading: false,
                    });
                    child.material = normalMat;
                } else if (renderMode === 'wireframe') {
                    child.material = new THREE.MeshBasicMaterial({
                        wireframe: true,
                        color: 0x00aaff,
                        side: settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
                    });
                } else {
                    const oldMaterial = child.material;
                    const side = settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
                    const useViewerTextures = !!(
                        textures.map ||
                        textures.normalMap ||
                        textures.roughnessMap ||
                        textures.metalnessMap ||
                        textures.displacementMap
                    );

                    // Baked preview (e.g. Rodin base_basic_shaded): unlit display unless user uploads PBR maps
                    if (!useViewerTextures && isEmissiveBakeMaterial(oldMaterial)) {
                        if (!child.material.userData?.isEmissiveBake) {
                            disposeMaterial(oldMaterial);
                            child.material = createEmissiveBakeMaterial(oldMaterial, settings);
                        } else {
                            child.material.side = side;
                        }
                        child.material.needsUpdate = true;
                        return;
                    }

                    // Standard PBR path
                    if (!child.material.isMeshStandardMaterial && !child.material.isMeshPhysicalMaterial) {
                        const baseColor = oldMaterial.color || new THREE.Color(settings.materialColor || 0xcccccc);

                        const newMaterial = new THREE.MeshStandardMaterial({
                            color: baseColor,
                            side,
                            map: oldMaterial.map || null,
                            normalMap: oldMaterial.normalMap || null,
                            roughnessMap: oldMaterial.roughnessMap || null,
                            metalnessMap: oldMaterial.metalnessMap || null,
                            emissiveMap: oldMaterial.emissiveMap || null,
                            emissive: oldMaterial.emissive || new THREE.Color(0x000000),
                            aoMap: oldMaterial.aoMap || null,
                            alphaMap: oldMaterial.alphaMap || null,
                            lightMap: oldMaterial.lightMap || null,
                            opacity: oldMaterial.opacity !== undefined ? oldMaterial.opacity : 1,
                            transparent: oldMaterial.transparent || false,
                            roughness: oldMaterial.roughness ?? settings.roughness,
                            metalness: oldMaterial.metalness ?? settings.metalness,
                        });

                        disposeMaterial(oldMaterial);
                        child.material = newMaterial;
                    } else {
                        const hasModelBaseMap = !!child.material.map;
                        if (!textures.map && !hasModelBaseMap && settings.materialColor) {
                            child.material.color = new THREE.Color(settings.materialColor);
                        }
                    }

                    const loader = new THREE.TextureLoader();
                    if (textures.map) {
                        loader.load(textures.map, (tex) => {
                            tex.colorSpace = THREE.SRGBColorSpace;
                            child.material.map = tex;
                            child.material.needsUpdate = true;
                        });
                    }
                    if (textures.normalMap && child.material.normalScale) {
                        loader.load(textures.normalMap, (tex) => {
                            child.material.normalMap = tex;
                            child.material.normalScale.set(settings.normalScale, settings.normalScale);
                            child.material.needsUpdate = true;
                        });
                    }
                    if (textures.roughnessMap) {
                        loader.load(textures.roughnessMap, (tex) => {
                            child.material.roughnessMap = tex;
                            child.material.needsUpdate = true;
                        });
                    }
                    if (textures.metalnessMap) {
                        loader.load(textures.metalnessMap, (tex) => {
                            child.material.metalnessMap = tex;
                            child.material.needsUpdate = true;
                        });
                    }
                    if (textures.displacementMap && 'displacementScale' in child.material) {
                        loader.load(textures.displacementMap, (tex) => {
                            child.material.displacementMap = tex;
                            child.material.displacementScale = settings.displacementScale;
                            child.material.displacementBias = -settings.displacementScale / 2;
                            child.material.needsUpdate = true;
                        });
                    }

                    if ('roughness' in child.material) {
                        child.material.roughness = settings.roughness;
                    }
                    if ('metalness' in child.material) {
                        child.material.metalness = settings.metalness;
                    }
                    child.material.side = side;
                }
                child.material.needsUpdate = true;
            }
        });
    }, [model, renderMode, textures, settings]);

    if (loading) {
        return <mesh><boxGeometry args={[0.1, 0.1, 0.1]} /><meshBasicMaterial color="orange" /></mesh>;
    }

    if (!model) return null;

    return <primitive object={model} ref={groupRef} />;
};

const ModelGroup = ({ geometryType, textures, settings, rotationBase, customModel, renderMode, onModelLoaded }) => {
    const groupRef = useRef();
    const autoRotRef = useRef(0);

    useFrame((_, delta) => {
        if (!groupRef.current) return;
        if (settings.autoRotate) {
            autoRotRef.current += settings.autoRotateSpeed * delta;
        }
        groupRef.current.rotation.x = rotationBase.x;
        groupRef.current.rotation.y = rotationBase.y + autoRotRef.current;
        groupRef.current.rotation.z = rotationBase.z;

        // Apply model scale
        const scale = settings.modelScale || 1.0;
        groupRef.current.scale.set(scale, scale, scale);
    });

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            {geometryType === 'Custom' && customModel?.file ? (
                <CustomModel
                    customModel={customModel}
                    settings={settings}
                    renderMode={renderMode}
                    textures={textures}
                    onModelLoaded={onModelLoaded}
                />
            ) : (
                <PBRMesh
                    textures={textures}
                    geometryType={geometryType}
                    settings={settings}
                    renderMode={renderMode}
                />
            )}
        </group>
    );
};

const HDRIEnvironment = ({ map, ext, background, intensity }) => {
    const Loader = ext === 'exr' ? EXRLoader : RGBELoader;
    const texture = useLoader(Loader, map);
    texture.mapping = THREE.EquirectangularReflectionMapping;

    return (
        <Environment
            map={texture}
            background={background}
            environmentIntensity={intensity}
            blur={0.5}
        />
    );
};

const CustomEnvironment = ({ settings, preset }) => {
    const { envMap, envMapExt, envIntensity, showEnvironment, showBackground } = settings;

    // Don't show HDRI background if simple background is enabled
    const showHDRIBackground = showEnvironment && !showBackground;

    if (envMap && (envMapExt === 'hdr' || envMapExt === 'exr')) {
        return <HDRIEnvironment map={envMap} ext={envMapExt} background={showHDRIBackground} intensity={envIntensity} />;
    }

    // Fallback for standard images or presets
    return (
        <Environment
            preset={envMap ? undefined : preset}
            files={envMap || undefined}
            background={showHDRIBackground}
            environmentIntensity={envIntensity}
            blur={0.5}
        />
    );
};

const CanvasHandle = ({ onReady }) => {
    const { gl } = useThree();
    useEffect(() => {
        if (gl && onReady) onReady(gl);
    }, [gl, onReady]);
    return null;
};

const GRADIENT_TYPE = {
    uniform: 0,
    top: 1,
    bottom: 2,
    left: 3,
    right: 4,
    vignette: 5,
};

const backgroundOverlayVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const backgroundOverlayFragmentShader = `
uniform float opacity;
uniform vec3 overlayColor;
uniform int gradientType;
uniform float softness;
varying vec2 vUv;

void main() {
    float alpha = opacity;
    float edge = clamp(softness, 0.02, 1.0);

    if (gradientType == 1) {
        alpha *= smoothstep(1.0 - edge, 1.0, vUv.y);
    } else if (gradientType == 2) {
        alpha *= smoothstep(edge, 0.0, vUv.y);
    } else if (gradientType == 3) {
        alpha *= smoothstep(1.0 - edge, 1.0, vUv.x);
    } else if (gradientType == 4) {
        alpha *= smoothstep(edge, 0.0, vUv.x);
    } else if (gradientType == 5) {
        float d = distance(vUv, vec2(0.5));
        alpha *= smoothstep(0.22, 0.5 + edge * 0.35, d);
    }

    if (alpha <= 0.001) discard;
    gl_FragColor = vec4(overlayColor, alpha);
}
`;

const syncBackgroundPlane = (mesh, camera, size, { texture, color, mode }) => {
    if (!mesh || !camera) return;

    const distance = 15;
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);

    const position = camera.position.clone().add(direction.multiplyScalar(distance));
    mesh.position.copy(position);
    mesh.quaternion.copy(camera.quaternion);

    const canvasAspect = size.width / size.height;
    const vFov = camera.fov * Math.PI / 180;
    const planeHeight = 2 * Math.tan(vFov / 2) * distance;
    const planeWidth = planeHeight * canvasAspect;

    let finalWidth = planeWidth;
    let finalHeight = planeHeight;

    if (color || mode === 'stretch') {
        finalWidth = planeWidth;
        finalHeight = planeHeight;
    } else if (texture?.image) {
        const imageAspect = texture.image.width / texture.image.height;

        if (mode === 'cover') {
            if (canvasAspect > imageAspect) {
                finalWidth = planeWidth;
                finalHeight = finalWidth / imageAspect;
            } else {
                finalHeight = planeHeight;
                finalWidth = finalHeight * imageAspect;
            }
        } else if (mode === 'contain') {
            if (canvasAspect > imageAspect) {
                finalHeight = planeHeight;
                finalWidth = finalHeight * imageAspect;
            } else {
                finalWidth = planeWidth;
                finalHeight = finalWidth / imageAspect;
            }
        }
    }

    mesh.scale.set(finalWidth, finalHeight, 1);
};

// Background plane + optional darken / gradient overlay (included in canvas export)
const BackgroundPlane = ({ imageUrl, color, show, mode = 'cover', overlaySettings }) => {
    const { camera, size } = useThree();
    const [texture, setTexture] = useState(null);
    const bgMeshRef = useRef();
    const overlayMeshRef = useRef();
    const [overlayMaterial, setOverlayMaterial] = useState(null);

    const overlayMode = overlaySettings?.backgroundOverlayMode ?? 'none';
    const showOverlay =
        overlayMode === 'uniform' || overlayMode === 'gradient';

    useEffect(() => {
        if (!show || !imageUrl) {
            setTexture(null);
            return;
        }

        const loader = new THREE.TextureLoader();
        loader.load(
            imageUrl,
            (loadedTexture) => {
                loadedTexture.colorSpace = THREE.SRGBColorSpace;
                setTexture(loadedTexture);
            },
            undefined,
            () => setTexture(null)
        );
    }, [imageUrl, show]);

    useEffect(() => {
        if (!showOverlay) {
            setOverlayMaterial((prev) => {
                if (prev) prev.dispose();
                return null;
            });
            return;
        }

        const color = new THREE.Color(overlaySettings?.backgroundOverlayColor ?? '#000000');
        const gradientKey =
            overlayMode === 'gradient'
                ? (overlaySettings?.backgroundOverlayGradient ?? 'bottom')
                : 'uniform';

        const material = new THREE.ShaderMaterial({
            vertexShader: backgroundOverlayVertexShader,
            fragmentShader: backgroundOverlayFragmentShader,
            uniforms: {
                opacity: { value: overlaySettings?.backgroundOverlayOpacity ?? 0.45 },
                overlayColor: { value: color },
                gradientType: { value: GRADIENT_TYPE[gradientKey] ?? 0 },
                softness: { value: overlaySettings?.backgroundOverlaySoftness ?? 0.55 },
            },
            transparent: true,
            depthTest: true,
            depthWrite: false,
            toneMapped: false,
        });

        setOverlayMaterial((prev) => {
            if (prev) prev.dispose();
            return material;
        });
    }, [
        showOverlay,
        overlayMode,
        overlaySettings?.backgroundOverlayColor,
        overlaySettings?.backgroundOverlayGradient,
    ]);

    useEffect(() => {
        if (!overlayMaterial) return;

        overlayMaterial.uniforms.opacity.value = overlaySettings?.backgroundOverlayOpacity ?? 0.45;
        overlayMaterial.uniforms.overlayColor.value.set(overlaySettings?.backgroundOverlayColor ?? '#000000');
        overlayMaterial.uniforms.softness.value = overlaySettings?.backgroundOverlaySoftness ?? 0.55;

        const gradientKey =
            overlayMode === 'gradient'
                ? (overlaySettings?.backgroundOverlayGradient ?? 'bottom')
                : 'uniform';
        overlayMaterial.uniforms.gradientType.value = GRADIENT_TYPE[gradientKey] ?? 0;
    }, [overlayMaterial, overlaySettings, overlayMode]);

    useFrame(() => {
        if (!camera) return;
        const planeState = { texture, color, mode };
        syncBackgroundPlane(bgMeshRef.current, camera, size, planeState);
        if (showOverlay) {
            syncBackgroundPlane(overlayMeshRef.current, camera, size, planeState);
        }
    });

    if (!show) return null;
    if (imageUrl && !texture) return null;

    return (
        <>
            <mesh ref={bgMeshRef} renderOrder={-2}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial
                    map={texture || null}
                    color={color || '#ffffff'}
                    depthTest={true}
                    depthWrite={true}
                    toneMapped={false}
                />
            </mesh>
            {showOverlay && overlayMaterial && (
                <mesh ref={overlayMeshRef} renderOrder={-1} material={overlayMaterial}>
                    <planeGeometry args={[1, 1]} />
                </mesh>
            )}
        </>
    );
};

const getBackgroundOverlayCss = (settings) => {
    const mode = settings.backgroundOverlayMode ?? 'none';
    if (mode === 'none' || settings.backgroundType !== 'image' || !settings.backgroundImage) {
        return null;
    }

    const color = settings.backgroundOverlayColor ?? '#000000';
    const opacity = settings.backgroundOverlayOpacity ?? 0.45;
    const soft = Math.round((settings.backgroundOverlaySoftness ?? 0.55) * 100);
    const rgba = (a) => {
        const hex = color.replace('#', '');
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r},${g},${b},${a})`;
    };

    if (mode === 'uniform') {
        return rgba(opacity);
    }

    const grad = settings.backgroundOverlayGradient ?? 'bottom';
    const edge = `${100 - soft}%`;
    const maps = {
        top: `linear-gradient(to bottom, ${rgba(opacity)} 0%, transparent ${edge})`,
        bottom: `linear-gradient(to top, ${rgba(opacity)} 0%, transparent ${edge})`,
        left: `linear-gradient(to right, ${rgba(opacity)} 0%, transparent ${edge})`,
        right: `linear-gradient(to left, ${rgba(opacity)} 0%, transparent ${edge})`,
        vignette: `radial-gradient(ellipse at center, transparent ${edge}, ${rgba(opacity)} 100%)`,
    };
    return maps[grad] ?? maps.bottom;
};

// Camera sync component for syncing cameras between dual views
const CameraSync = ({ cameraStateRef, isPrimaryView, syncCamera }) => {
    const { camera } = useThree();

    useFrame(() => {
        if (isPrimaryView) {
            // Primary view: update camera state
            if (cameraStateRef && cameraStateRef.current) {
                cameraStateRef.current.position = camera.position.clone();
                cameraStateRef.current.quaternion = camera.quaternion.clone();
            }
        } else if (syncCamera && cameraStateRef && cameraStateRef.current) {
            // Secondary view: sync from primary camera
            if (cameraStateRef.current.position) {
                camera.position.copy(cameraStateRef.current.position);
            }
            if (cameraStateRef.current.quaternion) {
                camera.quaternion.copy(cameraStateRef.current.quaternion);
            }
        }
    });

    return null;
};

const ViewerScene = ({ textures, geometryType = "Sphere", customModel, renderMode = 'pbr', envPreset = "studio", bgColor = "#121212", settings, aspectRatio = 'free', transparentBg = false, onCanvasReady, isPrimaryView = true, cameraStateRef = null, syncCamera = false }) => {
    const rot = settings.modelRotation || { x: 0, y: 0, z: 0 };
    const rotRad = {
        x: (rot.x || 0) * Math.PI / 180,
        y: (rot.y || 0) * Math.PI / 180,
        z: (rot.z || 0) * Math.PI / 180,
    };

    // Aspect ratio mapping
    const aspectRatioMap = {
        'free': null,
        '1:1': '1 / 1',
        '16:9': '16 / 9',
        '4:3': '4 / 3',
        '9:16': '9 / 16',
        '21:9': '21 / 9',
    };

    // Background image CSS mode mapping
    const getBackgroundSize = () => {
        if (!settings.backgroundImage || settings.backgroundType !== 'image' || transparentBg) return 'auto';
        switch (settings.backgroundImageMode) {
            case 'stretch': return '100% 100%';
            case 'cover': return 'cover';
            case 'contain': return 'contain';
            default: return 'cover';
        }
    };

    const outerContainerStyle = {
        background: transparentBg ? 'transparent' :
                   settings.backgroundType === 'color' ? settings.backgroundColor : bgColor,
    };

    const overlayCss = getBackgroundOverlayCss(settings);
    const hasImageBackground =
        settings.backgroundImage && settings.backgroundType === 'image' && !transparentBg;

    const containerStyle = {
        background: transparentBg ? 'transparent' :
                   settings.backgroundType === 'color' ? settings.backgroundColor : bgColor,
        ...(aspectRatioMap[aspectRatio] ? { aspectRatio: aspectRatioMap[aspectRatio] } : {}),
        ...(hasImageBackground ? {
            backgroundImage: overlayCss
                ? `${overlayCss}, url(${settings.backgroundImage})`
                : `url(${settings.backgroundImage})`,
            backgroundSize: overlayCss
                ? `${getBackgroundSize()}, ${getBackgroundSize()}`
                : getBackgroundSize(),
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
        } : {})
    };

    return (
        <div className="w-full h-full flex items-center justify-center" style={outerContainerStyle}>
            <div className="w-full relative" style={containerStyle}>
                <Canvas
                    shadows
                    dpr={1}
                    gl={{
                        preserveDrawingBuffer: true,
                        alpha: transparentBg, // Enable alpha only for transparent background
                        premultipliedAlpha: false,
                    }}
                    camera={{ position: [0, 0, 4], fov: 45 }}
                    onCreated={({ gl, scene }) => {
                        // Set scene background based on background type
                        if (!transparentBg) {
                            if (settings.backgroundType === 'color') {
                                scene.background = new THREE.Color(settings.backgroundColor);
                            } else if (settings.backgroundType === 'none') {
                                scene.background = new THREE.Color(bgColor);
                            } else {
                                scene.background = null;
                            }
                        } else {
                            scene.background = null;
                        }
                        if (onCanvasReady) onCanvasReady(gl);
                    }}
                >
                <CanvasHandle onReady={onCanvasReady} />

                {/* Camera sync for dual view mode */}
                {cameraStateRef && (
                    <CameraSync
                        cameraStateRef={cameraStateRef}
                        isPrimaryView={isPrimaryView}
                        syncCamera={syncCamera}
                    />
                )}

                {/* Background plane for recording - renders in 3D scene */}
                {!transparentBg && settings.backgroundType === 'image' && settings.backgroundImage && (
                    <BackgroundPlane
                        imageUrl={settings.backgroundImage}
                        show={true}
                        mode={settings.backgroundImageMode}
                        overlaySettings={settings}
                    />
                )}
                {!transparentBg && settings.backgroundType === 'color' && (
                    <BackgroundPlane
                        color={settings.backgroundColor}
                        show={true}
                        mode="stretch"
                    />
                )}

                <React.Suspense fallback={null}>
                    <CustomEnvironment settings={settings} preset={envPreset} />
                </React.Suspense>

                <ambientLight intensity={settings.ambientIntensity} />
                <spotLight
                    position={[10, 10, 10]}
                    angle={settings.spotAngle}
                    penumbra={settings.spotPenumbra}
                    intensity={settings.spotIntensity}
                    castShadow
                />

                <ModelGroup
                    geometryType={geometryType}
                    textures={textures}
                    settings={settings}
                    rotationBase={rotRad}
                    customModel={customModel}
                    renderMode={renderMode}
                />

                {settings.showShadows && (
                    <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                )}
                <OrbitControls
                    makeDefault
                    autoRotate={false}
                    enableRotate={!settings.lockCamera && (isPrimaryView || !syncCamera)}
                    enableZoom={!settings.lockCamera && (isPrimaryView || !syncCamera)}
                    enablePan={!settings.lockCamera && (isPrimaryView || !syncCamera)}
                />
                </Canvas>
            </div>
        </div>
    );
};

export default ViewerScene;
