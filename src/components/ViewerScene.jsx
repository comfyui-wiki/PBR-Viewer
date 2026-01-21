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
                    // PBR mode - apply textures if available
                    if (!child.material.isMeshStandardMaterial) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: child.material.color || 0xcccccc,
                            side: settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
                        });
                    }

                    // Load and apply textures
                    const loader = new THREE.TextureLoader();
                    if (textures.map) {
                        loader.load(textures.map, (tex) => {
                            tex.colorSpace = THREE.SRGBColorSpace;
                            child.material.map = tex;
                            child.material.needsUpdate = true;
                        });
                    }
                    if (textures.normalMap) {
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
                    if (textures.displacementMap) {
                        loader.load(textures.displacementMap, (tex) => {
                            child.material.displacementMap = tex;
                            child.material.displacementScale = settings.displacementScale;
                            child.material.displacementBias = -settings.displacementScale / 2;
                            child.material.needsUpdate = true;
                        });
                    }

                    // Apply material settings
                    child.material.roughness = settings.roughness;
                    child.material.metalness = settings.metalness;
                    child.material.side = settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
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

// Background plane that follows camera (for recording)
const BackgroundPlane = ({ imageUrl, color, show, mode = 'cover' }) => {
    const { camera, size } = useThree();
    const [texture, setTexture] = useState(null);
    const meshRef = useRef();

    // Load texture if image URL provided
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
            (error) => {
                console.error('Error loading background image:', error);
            }
        );
    }, [imageUrl, show]);

    // Update plane position and size every frame to follow camera
    useFrame(() => {
        if (!meshRef.current || !camera) return;

        // Position plane behind camera
        const distance = 15; // Distance behind camera
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(camera.quaternion);

        const position = camera.position.clone().add(direction.multiplyScalar(distance));
        meshRef.current.position.copy(position);
        meshRef.current.quaternion.copy(camera.quaternion);

        // Calculate plane size based on camera FOV
        const canvasAspect = size.width / size.height;

        const vFov = camera.fov * Math.PI / 180;
        const planeHeight = 2 * Math.tan(vFov / 2) * distance;
        const planeWidth = planeHeight * canvasAspect;

        let finalWidth = planeWidth;
        let finalHeight = planeHeight;

        if (color || mode === 'stretch') {
            // For solid color or stretch mode, fill the entire view
            finalWidth = planeWidth;
            finalHeight = planeHeight;
        } else if (texture) {
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

        meshRef.current.scale.set(finalWidth, finalHeight, 1);
    });

    if (!show) return null;

    return (
        <mesh ref={meshRef} renderOrder={-999}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
                map={texture || null}
                color={color || '#ffffff'}
                depthTest={false}
                depthWrite={false}
                toneMapped={false}
            />
        </mesh>
    );
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

    const containerStyle = {
        background: transparentBg ? 'transparent' :
                   settings.backgroundType === 'color' ? settings.backgroundColor : bgColor,
        ...(aspectRatioMap[aspectRatio] ? { aspectRatio: aspectRatioMap[aspectRatio] } : {}),
        // Apply background image if enabled
        ...(settings.backgroundImage && settings.backgroundType === 'image' && !transparentBg ? {
            backgroundImage: `url(${settings.backgroundImage})`,
            backgroundSize: getBackgroundSize(),
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
        } : {})
    };

    return (
        <div className="w-full h-full flex items-center justify-center" style={outerContainerStyle}>
            <div className="w-full" style={containerStyle}>
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
