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

const captureMaterialSource = (material) => {
    const m = Array.isArray(material) ? material[0] : material;
    if (!m) return null;

    return {
        isEmissiveBake: isEmissiveBakeMaterial(m),
        map: m.map || null,
        emissiveMap: m.emissiveMap || null,
        color: m.color?.clone?.() ?? new THREE.Color(0xffffff),
        emissive: m.emissive?.clone?.() ?? new THREE.Color(0x000000),
        normalMap: m.normalMap || null,
        roughnessMap: m.roughnessMap || null,
        metalnessMap: m.metalnessMap || null,
        aoMap: m.aoMap || null,
        alphaMap: m.alphaMap || null,
        roughness: m.roughness ?? 0.5,
        metalness: m.metalness ?? 0,
        opacity: m.opacity ?? 1,
        transparent: m.transparent ?? false,
    };
};

const storeModelMaterialSources = (object) => {
    object.traverse((child) => {
        if (child.isMesh && !child.userData.materialSource) {
            child.userData.materialSource = captureMaterialSource(child.material);
        }
    });
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

/**
 * Per-URL texture cache. The viewer streams blob:// URLs that may be reused
 * across many state ticks (every slider drag re-runs the effect that applies
 * textures). Loading the same URL multiple times leaks one GPU texture each
 * time — `loadCachedTexture` keeps a single instance per URL until evicted.
 */
const createTextureCache = () => {
    const cache = new Map(); // url -> { texture, refs }
    const loader = new THREE.TextureLoader();

    const get = (url, configure) => {
        if (!url) return Promise.resolve(null);
        const hit = cache.get(url);
        if (hit) {
            hit.refs += 1;
            if (configure) configure(hit.texture);
            return Promise.resolve(hit.texture);
        }
        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (tex) => {
                    cache.set(url, { texture: tex, refs: 1 });
                    if (configure) configure(tex);
                    resolve(tex);
                },
                undefined,
                reject,
            );
        });
    };

    const release = (url) => {
        if (!url) return;
        const hit = cache.get(url);
        if (!hit) return;
        hit.refs -= 1;
        if (hit.refs <= 0) {
            hit.texture.dispose();
            cache.delete(url);
        }
    };

    const disposeAll = () => {
        cache.forEach(({ texture }) => texture.dispose());
        cache.clear();
    };

    return { get, release, disposeAll };
};

/** Detach shared textures before dispose so GLB maps survive render-mode switches */
const disposeDisplayMaterial = (material) => {
    if (!material) return;
    const mats = Array.isArray(material) ? material : [material];
    mats.forEach((m) => {
        if (!m) return;
        m.map = null;
        m.emissiveMap = null;
        m.normalMap = null;
        m.roughnessMap = null;
        m.metalnessMap = null;
        m.aoMap = null;
        m.alphaMap = null;
        m.lightMap = null;
        if (m.dispose) m.dispose();
    });
};

// Component for loading and displaying custom 3D models
const CustomModel = ({ customModel, settings, renderMode, textures, onModelLoaded, onError }) => {
    const [model, setModel] = useState(null);
    const [loading, setLoading] = useState(false);
    const groupRef = useRef();
    const materialRef = useRef();
    // Per-component texture cache so we don't reload + leak GPU textures every
    // time a slider moves. The map remembers which URL is bound to each map
    // slot so we can release the previous one when the user swaps in another.
    const textureCacheRef = useRef(null);
    if (textureCacheRef.current === null) {
        textureCacheRef.current = createTextureCache();
    }
    const boundUrlsRef = useRef({}); // mesh.uuid -> { map: url, normalMap: url, ... }

    useEffect(() => () => textureCacheRef.current?.disposeAll(), []);

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
                onError?.(`Unsupported model format: ${fileType}`);
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

                storeModelMaterialSources(modelObject);
                setModel(modelObject);
                setLoading(false);
                if (onModelLoaded) onModelLoaded(modelObject);
            },
            (progress) => {
                console.log('Loading progress:', (progress.loaded / progress.total) * 100 + '%');
            },
            (error) => {
                console.error('Error loading model:', error);
                onError?.(`Failed to load ${customModel?.file?.name || 'model'}`);
                setLoading(false);
            }
        );
    }, [customModel?.file?.url, customModel?.file?.type]);

    // Apply textures and material settings to the loaded model
    useEffect(() => {
        if (!model) return;

        model.traverse((child) => {
            if (!child.isMesh) return;

            if (!child.userData.materialSource) {
                child.userData.materialSource = captureMaterialSource(child.material);
            }

            const source = child.userData.materialSource;
            const side = settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
            const displayMaterial = child.material;

            if (!child.geometry.attributes.normal) {
                child.geometry.computeVertexNormals();
            }

            if (renderMode === 'normal') {
                if (displayMaterial?.type !== 'MeshNormalMaterial') {
                    disposeDisplayMaterial(displayMaterial);
                    child.material = new THREE.MeshNormalMaterial({
                        side,
                        flatShading: false,
                    });
                } else {
                    child.material.side = side;
                }
                return;
            }

            if (renderMode === 'wireframe') {
                if (!displayMaterial?.wireframe) {
                    disposeDisplayMaterial(displayMaterial);
                    child.material = new THREE.MeshBasicMaterial({
                        wireframe: true,
                        color: 0x00aaff,
                        side,
                    });
                } else {
                    child.material.side = side;
                }
                return;
            }

            // PBR mode
            const useViewerTextures = !!(
                textures.map ||
                textures.normalMap ||
                textures.roughnessMap ||
                textures.metalnessMap ||
                textures.displacementMap
            );

            if (!useViewerTextures && source?.isEmissiveBake) {
                if (!displayMaterial?.userData?.isEmissiveBake) {
                    disposeDisplayMaterial(displayMaterial);
                    child.material = createEmissiveBakeMaterial(source, settings);
                } else {
                    child.material.side = side;
                }
                return;
            }

            const needsStandardMaterial =
                !displayMaterial?.isMeshStandardMaterial &&
                !displayMaterial?.isMeshPhysicalMaterial;

            if (needsStandardMaterial) {
                disposeDisplayMaterial(displayMaterial);
                const baseColor = source?.color || new THREE.Color(settings.materialColor || 0xcccccc);

                child.material = new THREE.MeshStandardMaterial({
                    color: baseColor,
                    side,
                    map: source?.map || null,
                    normalMap: source?.normalMap || null,
                    roughnessMap: source?.roughnessMap || null,
                    metalnessMap: source?.metalnessMap || null,
                    emissiveMap: source?.emissiveMap || null,
                    emissive: source?.emissive || new THREE.Color(0x000000),
                    aoMap: source?.aoMap || null,
                    alphaMap: source?.alphaMap || null,
                    opacity: source?.opacity ?? 1,
                    transparent: source?.transparent ?? false,
                    roughness: source?.roughness ?? settings.roughness,
                    metalness: source?.metalness ?? settings.metalness,
                });
            } else {
                const hasModelBaseMap = !!(source?.map || child.material.map);
                if (!textures.map && !hasModelBaseMap && settings.materialColor) {
                    child.material.color = new THREE.Color(settings.materialColor);
                }
            }

            // Apply viewer-provided PBR textures via the cache. Track which URL
            // is currently bound to each mesh's map slots so we can release the
            // previous texture (and its GPU memory) when the URL changes.
            const cache = textureCacheRef.current;
            const bound = boundUrlsRef.current[child.uuid] || (boundUrlsRef.current[child.uuid] = {});
            const applyMap = (slot, url, colorSpace) => {
                if (bound[slot] === url) return;
                if (bound[slot]) cache.release(bound[slot]);
                bound[slot] = url || null;
                if (!url) {
                    child.material[slot] = null;
                    child.material.needsUpdate = true;
                    return;
                }
                cache.get(url, (tex) => {
                    if (colorSpace) tex.colorSpace = colorSpace;
                }).then((tex) => {
                    child.material[slot] = tex;
                    if (slot === 'normalMap' && child.material.normalScale) {
                        child.material.normalScale.set(settings.normalScale, settings.normalScale);
                    }
                    if (slot === 'displacementMap') {
                        child.material.displacementScale = settings.displacementScale;
                        child.material.displacementBias = -settings.displacementScale / 2;
                    }
                    child.material.needsUpdate = true;
                }).catch((err) => {
                    console.error(`Failed to load ${slot}:`, err);
                    onError?.(`Failed to load ${slot}`);
                });
            };

            applyMap('map', textures.map, THREE.SRGBColorSpace);
            if (child.material.normalScale) applyMap('normalMap', textures.normalMap);
            applyMap('roughnessMap', textures.roughnessMap);
            applyMap('metalnessMap', textures.metalnessMap);
            if ('displacementScale' in child.material) applyMap('displacementMap', textures.displacementMap);

            if ('roughness' in child.material) {
                child.material.roughness = settings.roughness;
            }
            if ('metalness' in child.material) {
                child.material.metalness = settings.metalness;
            }
            child.material.side = side;
            child.material.needsUpdate = true;
        });
    }, [model, renderMode, textures, settings]);

    if (loading) {
        return <mesh><boxGeometry args={[0.1, 0.1, 0.1]} /><meshBasicMaterial color="orange" /></mesh>;
    }

    if (!model) return null;

    return <primitive object={model} ref={groupRef} />;
};

const ModelGroup = ({ geometryType, textures, settings, rotationBase, customModel, renderMode, onModelLoaded, onError }) => {
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
                    onError={onError}
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

// Sync the primary camera into a shared ref so the secondary view can copy
// it. Uses pre-allocated Vector3/Quaternion to avoid per-frame GC pressure.
const CameraSync = ({ cameraStateRef, isPrimaryView, syncCamera }) => {
    const { camera } = useThree();

    useEffect(() => {
        if (!cameraStateRef?.current) return;
        if (!cameraStateRef.current.position) cameraStateRef.current.position = new THREE.Vector3();
        if (!cameraStateRef.current.quaternion) cameraStateRef.current.quaternion = new THREE.Quaternion();
    }, [cameraStateRef]);

    useFrame(() => {
        const state = cameraStateRef?.current;
        if (!state) return;
        if (isPrimaryView) {
            state.position.copy(camera.position);
            state.quaternion.copy(camera.quaternion);
        } else if (syncCamera) {
            camera.position.copy(state.position);
            camera.quaternion.copy(state.quaternion);
        }
    });

    return null;
};

const ViewerScene = ({ textures, geometryType = "Sphere", customModel, renderMode = 'pbr', envPreset = "studio", bgColor = "#121212", settings, aspectRatio = 'free', transparentBg = false, onCanvasReady, isPrimaryView = true, cameraStateRef = null, syncCamera = false, onError }) => {
    const rot = settings.modelRotation || { x: 0, y: 0, z: 0 };
    const rotRad = {
        x: (rot.x || 0) * Math.PI / 180,
        y: (rot.y || 0) * Math.PI / 180,
        z: (rot.z || 0) * Math.PI / 180,
    };

    // Aspect ratio mapping (numeric so we can fit-to-container without collapsing)
    const aspectRatioMap = {
        'free': null,
        '1:1': 1,
        '16:9': 16 / 9,
        '4:3': 4 / 3,
        '9:16': 9 / 16,
        '21:9': 21 / 9,
    };
    const ratio = aspectRatioMap[aspectRatio];

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

    // Aspect-ratio fitting: cap both dimensions and let the browser pick the
    // largest box that satisfies the ratio. We use min(100%, parentH * ratio)
    // for width and the symmetric expression for height so neither dimension
    // overflows the parent regardless of which is the limiting one.
    const innerClass = ratio
        ? 'relative max-w-full max-h-full'
        : 'w-full h-full relative';
    const containerStyle = {
        background: transparentBg ? 'transparent' :
                   settings.backgroundType === 'color' ? settings.backgroundColor : bgColor,
        ...(ratio
            ? {
                aspectRatio: String(ratio),
                width: `min(100%, calc(100% * ${ratio}))`,
                height: `min(100%, calc(100% / ${ratio}))`,
            }
            : {}),
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
        <div className="w-full h-full flex items-center justify-center overflow-hidden" style={outerContainerStyle}>
            <div className={innerClass} style={containerStyle}>
                <Canvas
                    shadows
                    // Cap DPR at 2 so Retina displays render crisp without paying 3x on
                    // phones. The previous hard-coded dpr={1} blurred every pixel on
                    // high-density screens.
                    dpr={[1, 2]}
                    gl={{
                        preserveDrawingBuffer: true,
                        alpha: transparentBg,
                        premultipliedAlpha: false,
                        antialias: true,
                        toneMapping: THREE.ACESFilmicToneMapping,
                        toneMappingExposure: 1.0,
                        outputColorSpace: THREE.SRGBColorSpace,
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
                {/* Closer + brighter than the previous (10,10,10) so the spot
                    actually illuminates the model — at that distance with the
                    default narrow angle, almost no light reached it. */}
                <spotLight
                    position={[4, 5, 3]}
                    angle={settings.spotAngle}
                    penumbra={settings.spotPenumbra}
                    intensity={settings.spotIntensity * 30}
                    distance={20}
                    decay={1.5}
                    castShadow
                    shadow-mapSize-width={1024}
                    shadow-mapSize-height={1024}
                />

                <ModelGroup
                    geometryType={geometryType}
                    textures={textures}
                    settings={settings}
                    rotationBase={rotRad}
                    customModel={customModel}
                    renderMode={renderMode}
                    onError={onError}
                />

                {settings.showShadows && (
                    <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                )}
                {/* In dual-view, only the primary view drives OrbitControls;
                    the secondary view receives camera state via CameraSync.
                    Mounting controls on both fought the per-frame copy. */}
                {(!syncCamera || isPrimaryView) && (
                    <OrbitControls
                        makeDefault
                        autoRotate={false}
                        enableRotate={!settings.lockCamera}
                        enableZoom={!settings.lockCamera}
                        enablePan={!settings.lockCamera}
                    />
                )}
                </Canvas>
            </div>
        </div>
    );
};

export default ViewerScene;
