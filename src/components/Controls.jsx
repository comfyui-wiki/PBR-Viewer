import React, { useState } from 'react';
import { Upload, X, Box, Circle, Square, Image as ImageIcon, Sliders, Download, Package, Video, Square as StopIcon, Pause, Play } from 'lucide-react';

const CylinderIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v14c0 1.66 3.13 3 7 3s7-1.34 7-3V5" />
        <ellipse cx="12" cy="19" rx="7" ry="3" />
    </svg>
);

const TextureSlot = ({ label, file, onUpload, onClear, accept = "image/*" }) => {
    return (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>
                {file && (
                    <button onClick={onClear} className="text-gray-500 hover:text-red-400 transition-colors">
                        <X size={14} />
                    </button>
                )}
            </div>

            <div className="relative group">
                <input
                    type="file"
                    accept={accept}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                        if (e.target.files?.[0]) {
                            onUpload(e.target.files[0]);
                        }
                    }}
                />

                <div className={`
          border-2 border-dashed rounded-lg p-3 transition-all duration-200 flex items-center gap-3
          ${file
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800'
                    }
        `}>
                    {file ? (
                        <div className="w-10 h-10 rounded bg-gray-900 border border-white/10 overflow-hidden flex-shrink-0">
                            <img src={file} className="w-full h-full object-cover" alt="preview" />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center flex-shrink-0 text-gray-500">
                            <ImageIcon size={18} />
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-200 truncate">
                            {file ? 'Texture Loaded' : 'Upload Texture'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                            {file ? 'Click to replace' : 'Drag & drop or click'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GeometrySelector = ({ current, onChange }) => {
    const options = [
        { id: 'Sphere', icon: Circle },
        { id: 'Cube', icon: Box },   // 3D cube icon
        { id: 'Plane', icon: Square }, // Flat square icon
        { id: 'Cylinder', icon: CylinderIcon }, // Cylindrical shape
        { id: 'Custom', icon: Package }, // Custom model
    ];

    return (
        <div className="flex bg-gray-800 p-1 rounded-lg mb-6">
            {options.map((opt) => (
                <button
                    key={opt.id}
                    onClick={() => onChange(opt.id)}
                    className={`
            flex-1 flex items-center justify-center py-2 rounded-md transition-all
            ${current === opt.id
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }
          `}
                    title={opt.id}
                >
                    <opt.icon size={18} />
                </button>
            ))}
        </div>
    );
};

const SliderControl = ({ label, value, min, max, step, onChange }) => (
    <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
            <label className="text-xs text-gray-500">{label}</label>
            <span className="text-xs font-mono text-blue-400">{value}</span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
    </div>
);

const ToggleControl = ({ label, checked, onChange }) => (
    <div className="mb-3 flex justify-between items-center">
        <label className="text-xs text-gray-500">{label}</label>
        <button
            onClick={() => onChange(!checked)}
            className={`w-10 h-5 rounded-full relative transition-colors duration-200 ease-in-out flex items-center ${checked ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
            <span className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-1'}`} />
        </button>
    </div>
);

const RenderModeSelector = ({ current, onChange }) => {
    const modes = [
        { id: 'pbr', label: 'PBR' },
        { id: 'normal', label: 'Normal' },
        { id: 'wireframe', label: 'Wireframe' },
    ];

    return (
        <div className="mb-4">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Render Mode</label>
            <div className="flex bg-gray-800 p-1 rounded-lg">
                {modes.map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => onChange(mode.id)}
                        className={`
                            flex-1 py-1.5 px-2 rounded-md transition-all text-xs font-medium
                            ${current === mode.id
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }
                        `}
                    >
                        {mode.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

const AspectRatioSelector = ({ current, onChange }) => {
    const ratios = [
        { id: 'free', label: 'Free', ratio: null },
        { id: '1:1', label: '1:1', ratio: '1 / 1' },
        { id: '16:9', label: '16:9', ratio: '16 / 9' },
        { id: '4:3', label: '4:3', ratio: '4 / 3' },
        { id: '9:16', label: '9:16', ratio: '9 / 16' },
        { id: '21:9', label: '21:9', ratio: '21 / 9' },
    ];

    return (
        <div className="mb-4">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Canvas Ratio</label>
            <div className="grid grid-cols-3 gap-2">
                {ratios.map((r) => (
                    <button
                        key={r.id}
                        onClick={() => onChange(r.id)}
                        className={`
                            py-2 px-2 rounded-md transition-all text-xs font-medium
                            ${current === r.id
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                            }
                        `}
                    >
                        {r.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

const Controls = ({
    textures,
    onTextureChange,
    geometry,
    onGeometryChange,
    customModel,
    onModelUpload,
    renderMode,
    onRenderModeChange,
    settings,
    onSettingsChange,
    onDownload,
    onDownloadRender,
    onDownloadFull,
    // Video recording props
    aspectRatio,
    onAspectRatioChange,
    recording,
    onStartRecording,
    onStopRecording,
    onPauseRecording,
    onResumeRecording,
    onUpdateRecording,
}) => {

    const handleUpload = (key, file) => {
        const url = URL.createObjectURL(file);
        onTextureChange(key, url);
    };

    const handleClear = (key) => {
        onTextureChange(key, null);
    };

    const updateSetting = (key, val) => {
        onSettingsChange(prev => ({ ...prev, [key]: val }));
    };

    return (
        <div className="w-80 bg-[#1e1e1e] border-l border-white/5 h-full flex flex-col shadow-2xl z-10">
            <div className="p-5 border-b border-white/5 bg-[#1e1e1e]">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    PBR Viewer
                </h1>
                <p className="text-xs text-gray-500 mt-1">Physically Based Rendering Preview</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                <div className="mb-6">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 block">Geometry</label>
                    <GeometrySelector current={geometry} onChange={onGeometryChange} />

                    {/* Model Upload - Show when Custom is selected */}
                    {geometry === 'Custom' && (
                        <div className="mt-4 p-3 bg-gray-800/40 rounded-lg border border-white/5">
                            <TextureSlot
                                label="Upload 3D Model"
                                file={customModel?.file?.url}
                                onUpload={(file) => {
                                    // We'll pass the file to parent, parent will handle loading
                                    const url = URL.createObjectURL(file);
                                    onModelUpload(null, { file, url, type: file.name.split('.').pop().toLowerCase() });
                                }}
                                onClear={() => {
                                    onGeometryChange('Sphere'); // Reset to sphere when clearing
                                }}
                                accept=".obj,.gltf,.glb,.fbx,.stl,.dae"
                            />
                            <div className="mt-2 text-xs text-gray-500">
                                Supported: OBJ, GLTF, GLB, FBX, STL, DAE
                            </div>
                        </div>
                    )}
                </div>

                {/* Render Mode Selector */}
                <div className="mb-6">
                    <RenderModeSelector current={renderMode} onChange={onRenderModeChange} />
                </div>

                {/* Aspect Ratio Selector */}
                <div className="mb-6">
                    <AspectRatioSelector current={aspectRatio} onChange={onAspectRatioChange} />
                </div>

                {/* Video Recording Controls */}
                <div className="mb-6 p-4 bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-3 text-purple-300">
                        <Video size={14} />
                        <span className="text-xs font-semibold uppercase tracking-wider">Video Recording</span>
                    </div>

                    {/* Transparent Background Toggle */}
                    <ToggleControl
                        label="Transparent Background"
                        checked={recording.transparentBg}
                        onChange={(v) => onUpdateRecording('transparentBg', v)}
                    />

                    {/* Frame Rate Selector */}
                    <div className="mb-3">
                        <label className="text-xs text-gray-500 mb-1 block">Frame Rate</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[30, 60, 120].map((fps) => (
                                <button
                                    key={fps}
                                    onClick={() => onUpdateRecording('frameRate', fps)}
                                    disabled={recording.isRecording}
                                    className={`
                                        py-1.5 px-2 rounded text-xs font-medium transition-all
                                        ${recording.frameRate === fps
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }
                                        ${recording.isRecording ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    {fps} fps
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quality Selector */}
                    <div className="mb-3">
                        <label className="text-xs text-gray-500 mb-1 block">Quality</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'low', label: 'Low' },
                                { id: 'medium', label: 'Medium' },
                                { id: 'high', label: 'High' }
                            ].map((q) => (
                                <button
                                    key={q.id}
                                    onClick={() => onUpdateRecording('quality', q.id)}
                                    disabled={recording.isRecording}
                                    className={`
                                        py-1.5 px-2 rounded text-xs font-medium transition-all
                                        ${recording.quality === q.id
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                        }
                                        ${recording.isRecording ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    {q.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recording Duration Display */}
                    {recording.isRecording && (
                        <div className="mb-3 p-2 bg-red-600/20 border border-red-500/30 rounded flex items-center justify-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <span className="text-sm font-mono text-red-300">
                                {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    )}

                    {/* Recording Control Buttons */}
                    <div className="space-y-2">
                        {!recording.isRecording ? (
                            <button
                                onClick={onStartRecording}
                                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-red-500/20"
                            >
                                <Video size={16} />
                                Start Recording
                            </button>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {!recording.isPaused ? (
                                    <button
                                        onClick={onPauseRecording}
                                        className="py-2.5 px-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        <Pause size={16} />
                                        Pause
                                    </button>
                                ) : (
                                    <button
                                        onClick={onResumeRecording}
                                        className="py-2.5 px-4 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                                    >
                                        <Play size={16} />
                                        Resume
                                    </button>
                                )}
                                <button
                                    onClick={onStopRecording}
                                    className="py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                                >
                                    <StopIcon size={16} />
                                    Stop
                                </button>
                            </div>
                        )}
                    </div>

                    {recording.transparentBg && (
                        <div className="mt-3 p-2 bg-blue-600/10 border border-blue-500/30 rounded text-xs text-blue-300">
                            ⓘ Transparent background will be exported as WebM with VP9 codec
                        </div>
                    )}
                </div>

                <div className="mb-6 p-4 bg-gray-800/30 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 mb-3 text-gray-300">
                        <Sliders size={14} />
                        <span className="text-xs font-semibold uppercase tracking-wider">Environment</span>
                    </div>

                    <SliderControl
                        label="Lighting Intensity"
                        value={settings.envIntensity}
                        min={0} max={5} step={0.1}
                        onChange={(v) => updateSetting('envIntensity', v)}
                    />

                    <div className="mb-4 p-3 bg-gray-800/40 rounded-lg border border-white/10">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Background Image</label>
                        <ToggleControl
                            label="Show Background"
                            checked={settings.showBackground}
                            onChange={(v) => updateSetting('showBackground', v)}
                        />
                        <TextureSlot
                            label="Upload Image (PNG/JPG)"
                            file={settings.backgroundImage}
                            onUpload={(f) => {
                                const url = URL.createObjectURL(f);
                                updateSetting('backgroundImage', url);
                                updateSetting('showBackground', true);
                            }}
                            onClear={() => {
                                updateSetting('backgroundImage', null);
                                updateSetting('showBackground', false);
                            }}
                            accept=".jpg,.jpeg,.png,.webp"
                        />

                        {/* Background Image Mode Selector */}
                        {settings.backgroundImage && (
                            <div className="mt-3">
                                <label className="text-xs text-gray-500 mb-1 block">Display Mode</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'stretch', label: 'Stretch' },
                                        { id: 'cover', label: 'Cover' },
                                        { id: 'contain', label: 'Contain' }
                                    ].map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => updateSetting('backgroundImageMode', mode.id)}
                                            className={`
                                                py-1.5 px-2 rounded text-xs font-medium transition-all
                                                ${settings.backgroundImageMode === mode.id
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                                }
                                            `}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-2 text-xs text-gray-500">
                                    {settings.backgroundImageMode === 'stretch' && '↔ Stretch to fill (may distort)'}
                                    {settings.backgroundImageMode === 'cover' && '⊞ Cover canvas (crops image)'}
                                    {settings.backgroundImageMode === 'contain' && '⊡ Fit inside (may show borders)'}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mb-4 p-3 bg-gray-800/40 rounded-lg border border-white/10">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">HDRI Environment</label>
                        <ToggleControl
                            label="Show HDRI Background"
                            checked={settings.showEnvironment}
                            onChange={(v) => updateSetting('showEnvironment', v)}
                        />
                        <TextureSlot
                            label="Upload HDRI (.hdr/.exr)"
                            file={settings.envMap}
                            onUpload={(f) => {
                                const url = URL.createObjectURL(f);
                                const ext = f.name.split('.').pop().toLowerCase();
                                updateSetting('envMap', url);
                                updateSetting('envMapExt', ext);
                            }}
                            onClear={() => {
                                updateSetting('envMap', null);
                                updateSetting('envMapExt', null);
                            }}
                            accept=".hdr,.exr"
                        />
                    </div>
                </div>

                <div className="mb-6 p-4 bg-gray-800/30 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 mb-3 text-gray-300">
                        <Sliders size={14} />
                        <span className="text-xs font-semibold uppercase tracking-wider">Lights</span>
                    </div>
                    <SliderControl
                        label="Ambient Intensity"
                        value={settings.ambientIntensity}
                        min={0} max={2} step={0.05}
                        onChange={(v) => updateSetting('ambientIntensity', v)}
                    />
                    <SliderControl
                        label="Spot Intensity"
                        value={settings.spotIntensity}
                        min={0} max={3} step={0.05}
                        onChange={(v) => updateSetting('spotIntensity', v)}
                    />
                    <SliderControl
                        label="Spot Angle"
                        value={settings.spotAngle}
                        min={0.05} max={0.6} step={0.01}
                        onChange={(v) => updateSetting('spotAngle', v)}
                    />
                    <SliderControl
                        label="Spot Penumbra"
                        value={settings.spotPenumbra}
                        min={0} max={1} step={0.05}
                        onChange={(v) => updateSetting('spotPenumbra', v)}
                    />
                </div>

                <div className="mb-6 p-4 bg-gray-800/30 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 mb-3 text-gray-300">
                        <Sliders size={14} />
                        <span className="text-xs font-semibold uppercase tracking-wider">View & Object</span>
                    </div>
                    <ToggleControl
                        label="Lock Camera (disable orbit)"
                        checked={settings.lockCamera}
                        onChange={(v) => updateSetting('lockCamera', v)}
                    />
                    <ToggleControl
                        label="Double-Sided Rendering"
                        checked={settings.doubleSided}
                        onChange={(v) => updateSetting('doubleSided', v)}
                    />
                    <ToggleControl
                        label="Auto Rotate Model"
                        checked={settings.autoRotate}
                        onChange={(v) => updateSetting('autoRotate', v)}
                    />
                    <div className="mt-2 space-y-2">
                        <SliderControl
                            label="Model Rotation X (deg)"
                            value={settings.modelRotation?.x ?? 0}
                            min={-180} max={180} step={1}
                            onChange={(v) => updateSetting('modelRotation', { ...settings.modelRotation, x: v })}
                        />
                        <SliderControl
                            label="Model Rotation Y (deg)"
                            value={settings.modelRotation?.y ?? 0}
                            min={-180} max={180} step={1}
                            onChange={(v) => updateSetting('modelRotation', { ...settings.modelRotation, y: v })}
                        />
                        <SliderControl
                            label="Model Rotation Z (deg)"
                            value={settings.modelRotation?.z ?? 0}
                            min={-180} max={180} step={1}
                            onChange={(v) => updateSetting('modelRotation', { ...settings.modelRotation, z: v })}
                        />
                        <SliderControl
                            label="Auto Rotate Speed (rad/s)"
                            value={settings.autoRotateSpeed ?? 0}
                            min={-5} max={5} step={0.05}
                            onChange={(v) => updateSetting('autoRotateSpeed', v)}
                        />
                    </div>
                </div>

                <div className="mb-6 p-4 bg-gray-800/30 rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 mb-3 text-gray-300">
                        <Sliders size={14} />
                        <span className="text-xs font-semibold uppercase tracking-wider">Material Settings</span>
                    </div>

                    <SliderControl
                        label="Displacement Scale"
                        value={settings.displacementScale}
                        min={0} max={0.3} step={0.01}
                        onChange={(v) => updateSetting('displacementScale', v)}
                    />
                    <SliderControl
                        label="Normal Intensity"
                        value={settings.normalScale}
                        min={0} max={3} step={0.1}
                        onChange={(v) => updateSetting('normalScale', v)}
                    />
                    <SliderControl
                        label="Roughness Factor"
                        value={settings.roughness}
                        min={0} max={1} step={0.01}
                        onChange={(v) => updateSetting('roughness', v)}
                    />
                    <SliderControl
                        label="Metalness Factor"
                        value={settings.metalness}
                        min={0} max={1} step={0.01}
                        onChange={(v) => updateSetting('metalness', v)}
                    />
                    <SliderControl
                        label="Fresnel Strength"
                        value={settings.fresnelStrength}
                        min={0} max={2} step={0.05}
                        onChange={(v) => updateSetting('fresnelStrength', v)}
                    />
                    <SliderControl
                        label="Fresnel Power"
                        value={settings.fresnelPower}
                        min={1} max={6} step={0.1}
                        onChange={(v) => updateSetting('fresnelPower', v)}
                    />
                </div>

                <div className="space-y-1">
                    <TextureSlot
                        label="Base Color / Albedo"
                        file={textures.map}
                        onUpload={(f) => handleUpload('map', f)}
                        onClear={() => handleClear('map')}
                    />
                    <TextureSlot
                        label="Normal Map"
                        file={textures.normalMap}
                        onUpload={(f) => handleUpload('normalMap', f)}
                        onClear={() => handleClear('normalMap')}
                    />
                    <TextureSlot
                        label="Roughness"
                        file={textures.roughnessMap}
                        onUpload={(f) => handleUpload('roughnessMap', f)}
                        onClear={() => handleClear('roughnessMap')}
                    />
                    <TextureSlot
                        label="Metalness"
                        file={textures.metalnessMap}
                        onUpload={(f) => handleUpload('metalnessMap', f)}
                        onClear={() => handleClear('metalnessMap')}
                    />
                    <TextureSlot
                        label="Height / Displacement"
                        file={textures.displacementMap}
                        onUpload={(f) => handleUpload('displacementMap', f)}
                        onClear={() => handleClear('displacementMap')}
                    />
                    <div className="mt-4 p-3 bg-gray-800/40 rounded-lg border border-white/5">
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Texture Repeat</label>
                        <ToggleControl
                            label="Link U/V (Uniform)"
                            checked={settings.textureRepeat?.linked ?? true}
                            onChange={(linked) => {
                                const uniformVal = settings.textureRepeat?.uniform ?? settings.textureRepeat?.u ?? 1;
                                updateSetting('textureRepeat', {
                                    ...settings.textureRepeat,
                                    linked,
                                    ...(linked ? { u: uniformVal, v: uniformVal, uniform: uniformVal } : {})
                                });
                            }}
                        />
                        {(settings.textureRepeat?.linked ?? true) ? (
                            <SliderControl
                                label="Repeat (Uniform)"
                                value={settings.textureRepeat?.uniform ?? settings.textureRepeat?.u ?? 1}
                                min={0.1} max={10} step={0.1}
                                onChange={(v) => updateSetting('textureRepeat', { ...settings.textureRepeat, uniform: v, u: v, v: v })}
                            />
                        ) : (
                            <>
                                <SliderControl
                                    label="Repeat U"
                                    value={settings.textureRepeat?.u ?? 1}
                                    min={0.1} max={10} step={0.1}
                                    onChange={(v) => updateSetting('textureRepeat', { ...settings.textureRepeat, u: v })}
                                />
                                <SliderControl
                                    label="Repeat V"
                                    value={settings.textureRepeat?.v ?? 1}
                                    min={0.1} max={10} step={0.1}
                                    onChange={(v) => updateSetting('textureRepeat', { ...settings.textureRepeat, v: v })}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 border-t border-white/5 bg-[#181818]">
                <div className="space-y-2">
                    <button
                        onClick={onDownloadRender}
                        className="w-full py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                    >
                        <Download size={16} />
                        Download Render PNG
                    </button>
                    <button
                        onClick={onDownloadFull}
                        className="w-full py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                    >
                        <Download size={16} />
                        Download Full UI PNG
                    </button>
                    <button
                        onClick={onDownload}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg hover:shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />
                        Download Material
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Controls;
