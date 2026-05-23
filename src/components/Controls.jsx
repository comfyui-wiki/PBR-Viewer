import React, { useState } from 'react';
import {
    X, Box, Circle, Square, Image as ImageIcon, Download,
    Package, Video, Square as StopIcon, ChevronDown, ChevronRight,
    RotateCcw, Sun, Layers, Eye, Palette, Info,
} from 'lucide-react';

const CylinderIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="7" ry="3" />
        <path d="M5 5v14c0 1.66 3.13 3 7 3s7-1.34 7-3V5" />
        <ellipse cx="12" cy="19" rx="7" ry="3" />
    </svg>
);

// Generic collapsible section.
const Section = ({ icon: Icon, title, defaultOpen = true, badge, children }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="mb-3 bg-gray-800/30 rounded-lg border border-white/5 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full px-4 py-3 flex items-center gap-2 text-gray-300 hover:bg-gray-800/40 transition-colors"
            >
                {Icon && <Icon size={14} className="text-gray-400" />}
                <span className="text-xs font-semibold uppercase tracking-wider flex-1 text-left">
                    {title}
                </span>
                {badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/30 text-blue-300 font-medium">
                        {badge}
                    </span>
                )}
                {open ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
            </button>
            {open && (
                <div className="px-4 pb-4 pt-1">
                    {children}
                </div>
            )}
        </div>
    );
};

const TextureSlot = ({ label, file, onUpload, onClear, accept = "image/*", hint }) => {
    return (
        <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-gray-400">{label}</label>
                {file && (
                    <button onClick={onClear} className="text-gray-500 hover:text-red-400 transition-colors" title="Clear">
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
          border-2 border-dashed rounded-lg p-2.5 transition-all duration-200 flex items-center gap-3
          ${file
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-gray-700 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-800'
                    }
        `}>
                    {file ? (
                        <div className="w-9 h-9 rounded bg-gray-900 border border-white/10 overflow-hidden flex-shrink-0">
                            <img src={file} className="w-full h-full object-cover" alt="preview" />
                        </div>
                    ) : (
                        <div className="w-9 h-9 rounded bg-gray-800 flex items-center justify-center flex-shrink-0 text-gray-500">
                            <ImageIcon size={16} />
                        </div>
                    )}

                    <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-gray-200 truncate">
                            {file ? 'Loaded — click to replace' : (hint || 'Click or drop file')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const GeometrySelector = ({ current, onChange }) => {
    const options = [
        { id: 'Sphere', icon: Circle, label: 'Sphere' },
        { id: 'Cube', icon: Box, label: 'Cube' },
        { id: 'Plane', icon: Square, label: 'Plane' },
        { id: 'Cylinder', icon: CylinderIcon, label: 'Cylinder' },
        { id: 'Custom', icon: Package, label: 'Model' },
    ];

    return (
        <div className="flex bg-gray-800 p-1 rounded-lg">
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
                    title={opt.label}
                    aria-label={opt.label}
                >
                    <opt.icon size={18} />
                </button>
            ))}
        </div>
    );
};

const SliderControl = ({ label, value, min, max, step, onChange, hint, format }) => {
    const display = format ? format(value) : (Number.isInteger(step) ? value : Number(value).toFixed(2));
    return (
        <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-gray-400 flex items-center gap-1">
                    {label}
                    {hint && <span title={hint} className="text-gray-600 cursor-help"><Info size={11} /></span>}
                </label>
                <span className="text-xs font-mono text-blue-400">{display}</span>
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
};

const ToggleControl = ({ label, checked, onChange, hint }) => (
    <div className="mb-3 flex justify-between items-center">
        <label className="text-xs text-gray-400 flex items-center gap-1">
            {label}
            {hint && <span title={hint} className="text-gray-600 cursor-help"><Info size={11} /></span>}
        </label>
        <button
            onClick={() => onChange(!checked)}
            className={`w-10 h-5 rounded-full relative transition-colors duration-200 ease-in-out flex items-center ${checked ? 'bg-blue-600' : 'bg-gray-700'}`}
            aria-pressed={checked}
        >
            <span className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-1'}`} />
        </button>
    </div>
);

const PillSelector = ({ value, options, onChange, disabled, columns = 3 }) => {
    const cls = `grid grid-cols-${columns} gap-2`;
    return (
        <div className={cls}>
            {options.map((opt) => (
                <button
                    key={opt.id}
                    onClick={() => onChange(opt.id)}
                    disabled={disabled}
                    title={opt.desc || ''}
                    className={`
                        py-1.5 px-2 rounded text-xs font-medium transition-all
                        ${value === opt.id
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {opt.label}
                </button>
            ))}
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
    onResetSettings,
    // Video recording props
    aspectRatio,
    onAspectRatioChange,
    recording,
    onStartRecording,
    onStopRecording,
    onUpdateRecording,
    // Dual view props
    dualViewMode,
    onDualViewModeChange,
    secondRenderMode,
    onSecondRenderModeChange,
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

    const handleModelFile = (file) => {
        const url = URL.createObjectURL(file);
        const ext = file.name.split('.').pop().toLowerCase();
        onModelUpload(null, { file, url, type: ext, name: file.name });
    };

    const loadedTextureCount = Object.values(textures).filter(Boolean).length;

    return (
        <div className="w-80 bg-[#1e1e1e] border-l border-white/5 h-full flex flex-col shadow-2xl z-10">
            <div className="p-4 border-b border-white/5 bg-[#1e1e1e] flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        PBR Viewer
                    </h1>
                    <p className="text-[11px] text-gray-500">Physically Based Rendering Preview</p>
                </div>
                <button
                    onClick={() => {
                        if (window.confirm('Reset all settings to defaults?')) {
                            onResetSettings?.();
                        }
                    }}
                    title="Reset all settings to defaults"
                    className="p-2 rounded-md text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                >
                    <RotateCcw size={15} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                {/* ───────────── Model & Geometry ───────────── */}
                <Section icon={Package} title="Model & Geometry" defaultOpen={true}>
                    <div className="mb-3">
                        <label className="text-xs text-gray-400 mb-2 block">Upload your 3D model</label>
                        <TextureSlot
                            label="3D Model"
                            file={customModel?.file?.url}
                            onUpload={handleModelFile}
                            onClear={() => {
                                onGeometryChange('Sphere');
                                onModelUpload(null, null);
                            }}
                            accept=".obj,.gltf,.glb,.fbx,.stl,.dae"
                            hint="OBJ / GLTF / GLB / FBX / STL / DAE"
                        />
                        {customModel?.file?.name && (
                            <div className="text-[11px] text-gray-500 truncate">
                                <span className="text-gray-400">File:</span> {customModel.file.name}
                            </div>
                        )}
                    </div>

                    <label className="text-xs text-gray-400 mb-2 block">Or pick a primitive</label>
                    <GeometrySelector current={geometry} onChange={onGeometryChange} />
                </Section>

                {/* ───────────── PBR Textures ───────────── */}
                <Section
                    icon={Layers}
                    title="PBR Textures"
                    defaultOpen={true}
                    badge={loadedTextureCount ? `${loadedTextureCount}/5` : null}
                >
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

                    <div className="mt-3 p-3 bg-gray-900/40 rounded-lg border border-white/5">
                        <label className="text-xs font-medium text-gray-400 mb-2 block">Texture Tiling</label>
                        <ToggleControl
                            label="Link U / V"
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
                                label="Tiles"
                                value={settings.textureRepeat?.uniform ?? settings.textureRepeat?.u ?? 1}
                                min={0.1} max={10} step={0.1}
                                onChange={(v) => updateSetting('textureRepeat', { ...settings.textureRepeat, uniform: v, u: v, v: v })}
                            />
                        ) : (
                            <>
                                <SliderControl
                                    label="Tiles U"
                                    value={settings.textureRepeat?.u ?? 1}
                                    min={0.1} max={10} step={0.1}
                                    onChange={(v) => updateSetting('textureRepeat', { ...settings.textureRepeat, u: v })}
                                />
                                <SliderControl
                                    label="Tiles V"
                                    value={settings.textureRepeat?.v ?? 1}
                                    min={0.1} max={10} step={0.1}
                                    onChange={(v) => updateSetting('textureRepeat', { ...settings.textureRepeat, v: v })}
                                />
                            </>
                        )}
                    </div>
                </Section>

                {/* ───────────── Material ───────────── */}
                <Section icon={Palette} title="Material" defaultOpen={true}>
                    <div className="mb-3">
                        <label className="text-xs text-gray-400 mb-1 block">
                            Material Tint
                            <span className="text-gray-600 ml-1">(used when no Base Color texture)</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={settings.materialColor || '#cccccc'}
                                onChange={(e) => updateSetting('materialColor', e.target.value)}
                                className="w-12 h-8 rounded cursor-pointer bg-gray-800 border border-gray-600"
                            />
                            <span className="text-xs text-gray-500 font-mono">{settings.materialColor || '#cccccc'}</span>
                        </div>
                    </div>

                    <SliderControl
                        label="Roughness"
                        value={settings.roughness}
                        min={0} max={1} step={0.01}
                        onChange={(v) => updateSetting('roughness', v)}
                        hint="0 = mirror smooth, 1 = fully matte"
                    />
                    <SliderControl
                        label="Metalness"
                        value={settings.metalness}
                        min={0} max={1} step={0.01}
                        onChange={(v) => updateSetting('metalness', v)}
                        hint="0 = dielectric (plastic, wood), 1 = metallic"
                    />
                    <SliderControl
                        label="Normal Intensity"
                        value={settings.normalScale}
                        min={0} max={3} step={0.1}
                        onChange={(v) => updateSetting('normalScale', v)}
                        hint="Strength of the normal map"
                    />
                    <SliderControl
                        label="Displacement"
                        value={settings.displacementScale}
                        min={0} max={0.3} step={0.01}
                        onChange={(v) => updateSetting('displacementScale', v)}
                        hint="Height map vertex displacement"
                    />
                    <SliderControl
                        label="Rim Light"
                        value={settings.fresnelStrength}
                        min={0} max={2} step={0.05}
                        onChange={(v) => updateSetting('fresnelStrength', v)}
                        hint="Fresnel edge highlight strength"
                    />
                    <SliderControl
                        label="Rim Falloff"
                        value={settings.fresnelPower}
                        min={1} max={6} step={0.1}
                        onChange={(v) => updateSetting('fresnelPower', v)}
                        hint="Higher = tighter rim line"
                    />
                </Section>

                {/* ───────────── Lighting & Environment ───────────── */}
                <Section icon={Sun} title="Lighting & Environment" defaultOpen={false}>
                    <SliderControl
                        label="Environment Intensity"
                        value={settings.envIntensity}
                        min={0} max={5} step={0.1}
                        onChange={(v) => updateSetting('envIntensity', v)}
                        hint="HDRI / IBL contribution"
                    />
                    <SliderControl
                        label="Ambient"
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
                        label="Spot Softness"
                        value={settings.spotPenumbra}
                        min={0} max={1} step={0.05}
                        onChange={(v) => updateSetting('spotPenumbra', v)}
                    />

                    <div className="mt-3 p-3 bg-gray-900/40 rounded-lg border border-white/5">
                        <label className="text-xs font-medium text-gray-400 mb-2 block">HDRI Environment</label>
                        <ToggleControl
                            label="Show as Background"
                            checked={settings.showEnvironment}
                            onChange={(v) => updateSetting('showEnvironment', v)}
                        />
                        <TextureSlot
                            label="HDRI File (.hdr / .exr)"
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

                    <div className="mt-3 p-3 bg-gray-900/40 rounded-lg border border-white/5">
                        <label className="text-xs font-medium text-gray-400 mb-2 block">Background</label>
                        <PillSelector
                            value={settings.backgroundType}
                            onChange={(v) => updateSetting('backgroundType', v)}
                            options={[
                                { id: 'none', label: 'None' },
                                { id: 'color', label: 'Color' },
                                { id: 'image', label: 'Image' },
                            ]}
                        />

                        {settings.backgroundType === 'color' && (
                            <div className="mt-3">
                                <input
                                    type="color"
                                    value={settings.backgroundColor}
                                    onChange={(e) => updateSetting('backgroundColor', e.target.value)}
                                    className="w-full h-9 rounded cursor-pointer bg-gray-800 border border-gray-600"
                                />
                                <div className="mt-1 text-xs text-gray-500 font-mono">{settings.backgroundColor}</div>
                            </div>
                        )}

                        {settings.backgroundType === 'image' && (
                            <div className="mt-3">
                                <TextureSlot
                                    label="Background Image"
                                    file={settings.backgroundImage}
                                    onUpload={(f) => updateSetting('backgroundImage', URL.createObjectURL(f))}
                                    onClear={() => updateSetting('backgroundImage', null)}
                                    accept=".jpg,.jpeg,.png,.webp"
                                    hint="JPG / PNG / WebP"
                                />
                                {settings.backgroundImage && (
                                    <>
                                        <label className="text-xs text-gray-400 mt-2 mb-1 block">Fit Mode</label>
                                        <PillSelector
                                            value={settings.backgroundImageMode}
                                            onChange={(v) => updateSetting('backgroundImageMode', v)}
                                            options={[
                                                { id: 'stretch', label: 'Stretch' },
                                                { id: 'cover', label: 'Cover' },
                                                { id: 'contain', label: 'Contain' },
                                            ]}
                                        />

                                        <label className="text-xs text-gray-400 mt-3 mb-1 block">Overlay</label>
                                        <PillSelector
                                            value={settings.backgroundOverlayMode}
                                            onChange={(v) => updateSetting('backgroundOverlayMode', v)}
                                            options={[
                                                { id: 'none', label: 'None' },
                                                { id: 'uniform', label: 'Tint' },
                                                { id: 'gradient', label: 'Gradient' },
                                            ]}
                                        />

                                        {settings.backgroundOverlayMode !== 'none' && (
                                            <div className="mt-2 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={settings.backgroundOverlayColor || '#000000'}
                                                        onChange={(e) => updateSetting('backgroundOverlayColor', e.target.value)}
                                                        className="w-10 h-7 rounded cursor-pointer bg-gray-800 border border-gray-600"
                                                    />
                                                    <span className="text-[11px] text-gray-500 font-mono">{settings.backgroundOverlayColor}</span>
                                                </div>
                                                <SliderControl
                                                    label="Opacity"
                                                    value={settings.backgroundOverlayOpacity}
                                                    min={0} max={1} step={0.01}
                                                    onChange={(v) => updateSetting('backgroundOverlayOpacity', v)}
                                                />
                                                {settings.backgroundOverlayMode === 'gradient' && (
                                                    <>
                                                        <label className="text-xs text-gray-400 mt-1 mb-1 block">Direction</label>
                                                        <PillSelector
                                                            value={settings.backgroundOverlayGradient}
                                                            onChange={(v) => updateSetting('backgroundOverlayGradient', v)}
                                                            options={[
                                                                { id: 'top', label: 'Top' },
                                                                { id: 'bottom', label: 'Bottom' },
                                                                { id: 'left', label: 'Left' },
                                                                { id: 'right', label: 'Right' },
                                                                { id: 'vignette', label: 'Vignette' },
                                                            ]}
                                                            columns={3}
                                                        />
                                                        <SliderControl
                                                            label="Softness"
                                                            value={settings.backgroundOverlaySoftness}
                                                            min={0.05} max={1} step={0.01}
                                                            onChange={(v) => updateSetting('backgroundOverlaySoftness', v)}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </Section>

                {/* ───────────── View ───────────── */}
                <Section icon={Eye} title="View" defaultOpen={false}>
                    <label className="text-xs text-gray-400 mb-1 block">Render Mode</label>
                    <PillSelector
                        value={renderMode}
                        onChange={onRenderModeChange}
                        options={[
                            { id: 'pbr', label: 'PBR' },
                            { id: 'normal', label: 'Normal' },
                            { id: 'wireframe', label: 'Wireframe' },
                        ]}
                    />

                    <div className="mt-3 p-3 bg-gray-900/40 rounded-lg border border-white/5">
                        <ToggleControl
                            label="Dual View Mode"
                            checked={dualViewMode}
                            onChange={onDualViewModeChange}
                            hint="Show two render modes side-by-side"
                        />
                        {dualViewMode && (
                            <>
                                <label className="text-xs text-gray-400 mt-2 mb-1 block">Right view shows</label>
                                <PillSelector
                                    value={secondRenderMode}
                                    onChange={onSecondRenderModeChange}
                                    options={[
                                        { id: 'pbr', label: 'PBR' },
                                        { id: 'normal', label: 'Normal' },
                                        { id: 'wireframe', label: 'Wireframe' },
                                    ]}
                                />
                            </>
                        )}
                    </div>

                    <label className="text-xs text-gray-400 mt-3 mb-1 block">Canvas Ratio</label>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { id: 'free', label: 'Free' },
                            { id: '1:1', label: '1:1' },
                            { id: '16:9', label: '16:9' },
                            { id: '4:3', label: '4:3' },
                            { id: '9:16', label: '9:16' },
                            { id: '21:9', label: '21:9' },
                        ].map((r) => (
                            <button
                                key={r.id}
                                onClick={() => onAspectRatioChange(r.id)}
                                className={`
                                    py-1.5 px-2 rounded text-xs font-medium transition-all
                                    ${aspectRatio === r.id
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }
                                `}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4 space-y-1">
                        <ToggleControl
                            label="Lock Camera"
                            checked={settings.lockCamera}
                            onChange={(v) => updateSetting('lockCamera', v)}
                            hint="Disable orbit, rotate the model instead"
                        />
                        <ToggleControl
                            label="Double-Sided"
                            checked={settings.doubleSided}
                            onChange={(v) => updateSetting('doubleSided', v)}
                            hint="Render both faces of each triangle"
                        />
                        <ToggleControl
                            label="Contact Shadow"
                            checked={settings.showShadows}
                            onChange={(v) => updateSetting('showShadows', v)}
                        />
                        <ToggleControl
                            label="Auto Rotate"
                            checked={settings.autoRotate}
                            onChange={(v) => updateSetting('autoRotate', v)}
                        />
                    </div>

                    <div className="mt-3 space-y-2">
                        <SliderControl
                            label="Model Scale"
                            value={settings.modelScale ?? 1.0}
                            min={0.1} max={5.0} step={0.05}
                            onChange={(v) => updateSetting('modelScale', v)}
                            hint="Relative to auto-fit size"
                        />
                        <SliderControl
                            label="Rotation X°"
                            value={settings.modelRotation?.x ?? 0}
                            min={-180} max={180} step={1}
                            onChange={(v) => updateSetting('modelRotation', { ...settings.modelRotation, x: v })}
                        />
                        <SliderControl
                            label="Rotation Y°"
                            value={settings.modelRotation?.y ?? 0}
                            min={-180} max={180} step={1}
                            onChange={(v) => updateSetting('modelRotation', { ...settings.modelRotation, y: v })}
                        />
                        <SliderControl
                            label="Rotation Z°"
                            value={settings.modelRotation?.z ?? 0}
                            min={-180} max={180} step={1}
                            onChange={(v) => updateSetting('modelRotation', { ...settings.modelRotation, z: v })}
                        />
                        {settings.autoRotate && (
                            <SliderControl
                                label="Rotate Speed"
                                value={settings.autoRotateSpeed ?? 0}
                                min={-5} max={5} step={0.05}
                                onChange={(v) => updateSetting('autoRotateSpeed', v)}
                            />
                        )}
                    </div>
                </Section>

                {/* ───────────── Recording (collapsed by default) ───────────── */}
                <Section icon={Video} title="Video Recording" defaultOpen={false}>
                    <label className="text-xs text-gray-400 mb-1 block">Output Format</label>
                    <PillSelector
                        value={recording.format}
                        onChange={(v) => {
                            onUpdateRecording('format', v);
                            if (v === 'mp4' && recording.transparentBg) {
                                onUpdateRecording('transparentBg', false);
                            }
                        }}
                        disabled={recording.isRecording}
                        options={[
                            { id: 'webm', label: 'WebM', desc: 'Supports transparency' },
                            { id: 'mp4', label: 'MP4', desc: 'Wider compatibility' },
                        ]}
                        columns={2}
                    />

                    {recording.format === 'webm' && (
                        <div className="mt-3">
                            <ToggleControl
                                label="Transparent Background"
                                checked={recording.transparentBg}
                                onChange={(v) => onUpdateRecording('transparentBg', v)}
                            />
                        </div>
                    )}

                    <label className="text-xs text-gray-400 mt-3 mb-1 block">Frame Rate</label>
                    <PillSelector
                        value={recording.frameRate}
                        onChange={(v) => onUpdateRecording('frameRate', v)}
                        disabled={recording.isRecording}
                        options={[
                            { id: 30, label: '30 fps' },
                            { id: 60, label: '60 fps' },
                            { id: 120, label: '120 fps' },
                        ]}
                    />

                    <label className="text-xs text-gray-400 mt-3 mb-1 block">Quality</label>
                    <PillSelector
                        value={recording.quality}
                        onChange={(v) => onUpdateRecording('quality', v)}
                        disabled={recording.isRecording}
                        options={[
                            { id: 'low', label: 'Low' },
                            { id: 'medium', label: 'Medium' },
                            { id: 'high', label: 'High' },
                        ]}
                    />

                    <label className="text-xs text-gray-400 mt-3 mb-1 block">Resolution</label>
                    <PillSelector
                        value={recording.resolution}
                        onChange={(v) => onUpdateRecording('resolution', v)}
                        disabled={recording.isRecording}
                        options={[
                            { id: 'viewport', label: 'Viewport' },
                            { id: '1280x720', label: '720p' },
                            { id: '1920x1080', label: '1080p' },
                            { id: '3840x2160', label: '4K' },
                        ]}
                        columns={2}
                    />

                    {recording.isRecording && (
                        <div className="mt-3 p-2 bg-red-600/20 border border-red-500/30 rounded flex items-center justify-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            <span className="text-sm font-mono text-red-300">
                                {Math.floor(recording.duration / 60)}:{(recording.duration % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    )}

                    <div className="mt-3 space-y-2">
                        {!recording.isRecording ? (
                            <button
                                onClick={onStartRecording}
                                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-red-500/20"
                            >
                                <Video size={16} />
                                Start Recording
                            </button>
                        ) : (
                            <button
                                onClick={onStopRecording}
                                className="w-full py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                            >
                                <StopIcon size={16} />
                                Stop & Save
                            </button>
                        )}
                    </div>
                </Section>

            </div>

            <div className="p-3 border-t border-white/5 bg-[#181818]">
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={onDownloadRender}
                            title="Save current viewport as PNG"
                            className="py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        >
                            <Download size={13} />
                            PNG
                        </button>
                        <button
                            onClick={onDownloadFull}
                            title="Save high-resolution PNG (2x)"
                            className="py-2 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        >
                            <Download size={13} />
                            PNG (2x)
                        </button>
                    </div>
                    <button
                        onClick={onDownload}
                        disabled={loadedTextureCount === 0}
                        className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                            loadedTextureCount === 0
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/20'
                        }`}
                    >
                        <Download size={16} />
                        Download Material ZIP
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Controls;
