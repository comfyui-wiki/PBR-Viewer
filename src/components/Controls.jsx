import React, { useState } from 'react';
import { Upload, X, Box, Circle, Square, Image as ImageIcon, Sliders, Download } from 'lucide-react';

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

const Controls = ({
    textures,
    onTextureChange,
    geometry,
    onGeometryChange,
    settings,
    onSettingsChange,
    onDownload,
    onDownloadRender,
    onDownloadFull,
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
                    <ToggleControl
                        label="Show HDRI Background"
                        checked={settings.showEnvironment}
                        onChange={(v) => updateSetting('showEnvironment', v)}
                    />
                    <TextureSlot
                        label="Custom HDRI (.hdr/.exr)"
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
                        accept=".hdr,.exr,.jpg,.png,.jpeg"
                    />
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
                            min={0} max={5} step={0.05}
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
