import React, { useRef, useEffect, useState } from "react";
import { Canvas, useLoader, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { RGBELoader } from "three-stdlib";
import { EXRLoader } from "three-stdlib";

const PBRMesh = ({ textures, geometryType, settings }) => {
    const meshRef = useRef();

    // Load textures if they exist. Use a placeholder if not, or just null.
    // Actually, useTexture works best with static URLs. For dynamic local blobs,
    // we might want to just instantiate textures manually to avoid suspense issues
    // or use key-based remounting.
    // A simple way is to use a primitive <meshStandardMaterial /> and attach props.

    const materialRef = useRef();

    useEffect(() => {
        if (materialRef.current) {
            const mat = materialRef.current;
            const loader = new THREE.TextureLoader();

            const loadMap = (url, mapType) => {
                if (url) {
                    loader.load(url, (tex) => {
                        tex.colorSpace = mapType === 'map' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
                        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
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
    }, [textures, settings.fresnelStrength, settings.fresnelPower]);

    useEffect(() => {
        const shader = materialRef.current?.userData?.shader;
        if (shader) {
            shader.uniforms.fresnelStrength.value = settings.fresnelStrength;
            shader.uniforms.fresnelPower.value = settings.fresnelPower;
        }
    }, [settings.fresnelStrength, settings.fresnelPower]);

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

    return (
        <mesh ref={meshRef} castShadow receiveShadow>
            {Geometry}
            <meshStandardMaterial
                ref={materialRef}
                displacementScale={settings.displacementScale}
                displacementBias={-settings.displacementScale / 2}
                normalScale={[settings.normalScale, settings.normalScale]}
                roughness={settings.roughness}
                metalness={settings.metalness}
                side={settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide}
            />
        </mesh>
    );
};

const ModelGroup = ({ geometryType, textures, settings, rotationBase }) => {
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
    });

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            <PBRMesh textures={textures} geometryType={geometryType} settings={settings} />
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
    const { envMap, envMapExt, envIntensity, showEnvironment } = settings;

    if (envMap && (envMapExt === 'hdr' || envMapExt === 'exr')) {
        return <HDRIEnvironment map={envMap} ext={envMapExt} background={showEnvironment} intensity={envIntensity} />;
    }

    // Fallback for standard images or presets
    return (
        <Environment
            preset={envMap ? undefined : preset}
            files={envMap || undefined}
            background={showEnvironment}
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

const ViewerScene = ({ textures, geometryType = "Sphere", envPreset = "studio", bgColor = "#121212", settings, onCanvasReady }) => {
    const rot = settings.modelRotation || { x: 0, y: 0, z: 0 };
    const rotRad = {
        x: (rot.x || 0) * Math.PI / 180,
        y: (rot.y || 0) * Math.PI / 180,
        z: (rot.z || 0) * Math.PI / 180,
    };

    return (
        <div className="w-full h-full relative" style={{ background: bgColor }}>
            <Canvas
                shadows
                gl={{ preserveDrawingBuffer: true }}
                camera={{ position: [0, 0, 4], fov: 45 }}
                onCreated={({ gl }) => {
                    if (onCanvasReady) onCanvasReady(gl);
                }}
            >
                <CanvasHandle onReady={onCanvasReady} />
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

                <ModelGroup geometryType={geometryType} textures={textures} settings={settings} rotationBase={rotRad} />

                <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} />
                <OrbitControls
                    makeDefault
                    autoRotate={false}
                    enableRotate={!settings.lockCamera}
                    enableZoom={!settings.lockCamera}
                    enablePan={!settings.lockCamera}
                />
            </Canvas>
        </div>
    );
};

export default ViewerScene;
