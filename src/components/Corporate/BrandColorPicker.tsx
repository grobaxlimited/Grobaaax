import React from 'react';
import { Check, Palette } from 'lucide-react';
import {
  BRAND_HIGHLIGHT_PRESETS,
  getBrandHighlightStyles,
  normalizeHexColor,
} from '../../utils/brandColor';

interface BrandColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  helperText?: string;
  syncToBrand?: boolean;
  onSyncToBrandChange?: (checked: boolean) => void;
  compact?: boolean;
}

export const BrandColorPicker: React.FC<BrandColorPickerProps> = ({
  value,
  onChange,
  label = 'Brand Text Highlight Color',
  helperText,
  syncToBrand,
  onSyncToBrandChange,
  compact = false,
}) => {
  const activeHex = normalizeHexColor(value);
  const styles = getBrandHighlightStyles(activeHex);

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2.5'}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <Palette className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
        </label>

        <span
          style={styles.pillStyle}
          className="px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold tracking-wide"
        >
          {activeHex}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {BRAND_HIGHLIGHT_PRESETS.map((preset) => {
          const isSelected = activeHex === preset.hex;
          const presetStyle = getBrandHighlightStyles(preset.hex);
          return (
            <button
              key={preset.hex}
              type="button"
              title={preset.name}
              aria-label={`Select ${preset.name} (${preset.hex})`}
              aria-pressed={isSelected}
              onClick={() => onChange(preset.hex)}
              style={{ backgroundColor: preset.hex }}
              className={`w-7 h-7 rounded-full flex items-center justify-center border transition-transform cursor-pointer ${
                isSelected
                  ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 border-white/60'
                  : 'border-black/15 hover:scale-105'
              }`}
            >
              {isSelected && (
                <Check
                  className="w-3.5 h-3.5"
                  style={{ color: presetStyle.contrastText }}
                />
              )}
            </button>
          );
        })}

        <label
          title="Pick a custom hex color"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 cursor-pointer"
        >
          <input
            type="color"
            value={activeHex}
            onChange={(e) => onChange(normalizeHexColor(e.target.value))}
            aria-label="Custom Brand Highlight Color"
            className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer rounded-full overflow-hidden"
          />
          <span>Custom</span>
        </label>
      </div>

      {helperText && (
        <p className="text-[11px] text-slate-500 leading-relaxed">{helperText}</p>
      )}

      {typeof syncToBrand === 'boolean' && onSyncToBrandChange && (
        <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600 cursor-pointer pt-0.5 select-none">
          <input
            type="checkbox"
            checked={syncToBrand}
            onChange={(e) => onSyncToBrandChange(e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span>Apply this highlight color across both Blog Post Ads &amp; Sponsor Ticker</span>
        </label>
      )}
    </div>
  );
};
