import React, { useState, useMemo } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

export type CompareType = 'previous_7' | 'previous_period' | 'previous_year' | 'none';

export interface DateRangeValue {
  from: string;
  to: string;
  compareEnabled: boolean;
  compareType: CompareType;
  compareFrom: string;
  compareTo: string;
  presetLabel: string;
}

const PRESETS: { id: string; label: string; getRange: () => { from: Date; to: Date } }[] = [
  { id: 'custom', label: 'Özel', getRange: () => ({ from: new Date(), to: new Date() }) },
  { id: 'today', label: 'Bugün', getRange: () => { const d = new Date(); return { from: d, to: d }; } },
  { id: 'yesterday', label: 'Dün', getRange: () => { const d = new Date(); d.setDate(d.getDate() - 1); return { from: d, to: d }; } },
  { id: '7', label: 'Son 7 gün', getRange: () => { const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - 6); return { from, to }; } },
  { id: '28', label: 'Son 28 gün', getRange: () => { const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - 27); return { from, to }; } },
  { id: '30', label: 'Son 30 gün', getRange: () => { const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - 29); return { from, to }; } },
  { id: 'this_month', label: 'Bu ay', getRange: () => { const to = new Date(); const from = new Date(to.getFullYear(), to.getMonth(), 1); return { from, to }; } },
  { id: 'last_month', label: 'Geçen ay', getRange: () => { const d = new Date(); const from = new Date(d.getFullYear(), d.getMonth() - 1, 1); const to = new Date(d.getFullYear(), d.getMonth(), 0); return { from, to }; } },
  { id: '90', label: 'Son 90 gün', getRange: () => { const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - 89); return { from, to }; } },
  { id: 'all', label: 'Tümü', getRange: () => { const to = new Date(); const from = new Date(2020, 0, 1); return { from, to }; } },
];

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getCompareRange(compareType: CompareType, from: Date, to: Date): { from: Date; to: Date } {
  const fromTime = from.getTime();
  const toTime = to.getTime();
  const span = toTime - fromTime;
  if (compareType === 'previous_7') {
    const toPrev = new Date(to);
    toPrev.setDate(toPrev.getDate() - 7);
    const fromPrev = new Date(toPrev);
    fromPrev.setDate(fromPrev.getDate() - 6);
    return { from: fromPrev, to: toPrev };
  }
  if (compareType === 'previous_period') {
    return { from: new Date(fromTime - span - 1), to: new Date(fromTime - 1) };
  }
  if (compareType === 'previous_year') {
    const fromPrev = new Date(from);
    const toPrev = new Date(to);
    fromPrev.setFullYear(fromPrev.getFullYear() - 1);
    toPrev.setFullYear(toPrev.getFullYear() - 1);
    return { from: fromPrev, to: toPrev };
  }
  return { from, to };
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  onClose?: () => void;
  className?: string;
  /** Trigger button label (e.g. "Son 7 gün 23 Oca - 19 Şub 2026") */
  triggerLabel?: string;
}

export function DateRangePicker({ value, onChange, onClose, className, triggerLabel }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState(value.presetLabel || '7');
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  const [compareEnabled, setCompareEnabled] = useState(value.compareEnabled);
  const [compareType, setCompareType] = useState<CompareType>(value.compareType || 'previous_7');

  const compareRange = useMemo(() => {
    if (!compareEnabled || compareType === 'none') return null;
    return getCompareRange(compareType, new Date(from + 'T00:00:00'), new Date(to + 'T23:59:59'));
  }, [compareEnabled, compareType, from, to]);

  const displayLabel = triggerLabel ?? (value.presetLabel ? `${value.presetLabel} ${formatShortDate(value.from)} – ${formatShortDate(value.to)}` : 'Tarih seç');

  const handlePresetClick = (p: (typeof PRESETS)[0]) => {
    setPreset(p.id);
    if (p.id === 'custom') return;
    const { from: f, to: t } = p.getRange();
    setFrom(toYMD(f));
    setTo(toYMD(t));
  };

  const handleApply = () => {
    const comp = compareEnabled && compareType !== 'none' && compareRange
      ? { compareFrom: toYMD(compareRange.from), compareTo: toYMD(compareRange.to) }
      : { compareFrom: '', compareTo: '' };
    onChange({
      from,
      to,
      compareEnabled,
      compareType,
      ...comp,
      presetLabel: PRESETS.find((p) => p.id === preset)?.label ?? preset,
    });
    setOpen(false);
    onClose?.();
  };

  const handleCancel = () => {
    setFrom(value.from);
    setTo(value.to);
    setPreset(value.presetLabel || '7');
    setCompareEnabled(value.compareEnabled);
    setCompareType(value.compareType || 'previous_7');
    setOpen(false);
    onClose?.();
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm hover:bg-gray-700 focus:ring-2 focus:ring-indigo-500/50"
      >
        <Calendar className="w-4 h-4 text-gray-400" />
        <span>{displayLabel}</span>
        <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 left-0 rounded-xl border border-gray-700 bg-gray-900 shadow-xl overflow-hidden flex min-w-[520px] max-w-[600px]">
            {/* Sol: Preset list */}
            <div className="w-52 border-r border-gray-800 bg-gray-800/50 overflow-y-auto max-h-[400px]">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetClick(p)}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between ${
                    preset === p.id ? 'bg-indigo-600/30 text-indigo-200' : 'text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  {p.label}
                  {preset === p.id && <ChevronRight className="w-4 h-4" />}
                </button>
              ))}
              <div className="border-t border-gray-700 mt-2 pt-2 px-4 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-gray-400">Karşılaştır</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={compareEnabled}
                    onClick={() => setCompareEnabled((e) => !e)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${compareEnabled ? 'bg-indigo-600' : 'bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${compareEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
                {compareEnabled && (
                  <div className="mt-2 space-y-1">
                    {[
                      { id: 'previous_7' as const, label: 'Önceki 7 gün' },
                      { id: 'previous_period' as const, label: 'Önceki dönem' },
                      { id: 'previous_year' as const, label: 'Önceki yıl' },
                    ].map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setCompareType(o.id)}
                        className={`block w-full text-left px-2 py-1 text-xs rounded ${compareType === o.id ? 'bg-indigo-600/30 text-indigo-200' : 'text-gray-400 hover:bg-gray-700/50'}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sağ: Tarih alanları + Apply/Cancel */}
            <div className="flex-1 p-4 flex flex-col">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Başlangıç</label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Bitiş</label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>
              {compareEnabled && compareRange && (
                <div className="grid grid-cols-2 gap-3 mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div>
                    <label className="block text-xs text-amber-200/80 mb-1">Karşılaştırma başlangıç</label>
                    <span className="text-sm text-white">{formatShortDate(toYMD(compareRange.from))}</span>
                  </div>
                  <div>
                    <label className="block text-xs text-amber-200/80 mb-1">Karşılaştırma bitiş</label>
                    <span className="text-sm text-white">{formatShortDate(toYMD(compareRange.to))}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-auto pt-3 border-t border-gray-800">
                <button type="button" onClick={handleCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-white rounded-lg">
                  İptal
                </button>
                <button type="button" onClick={handleApply} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-500">
                  Uygula
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatShortDate(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00');
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function defaultDateRangeValue(compareEnabled = true): DateRangeValue {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  const comp = getCompareRange('previous_7', from, to);
  return {
    from: toYMD(from),
    to: toYMD(to),
    compareEnabled,
    compareType: 'previous_7',
    compareFrom: toYMD(comp.from),
    compareTo: toYMD(comp.to),
    presetLabel: 'Son 7 gün',
  };
}

export function getDateRangeISO(v: DateRangeValue): { from: string; to: string; compareFrom: string; compareTo: string } {
  return {
    from: v.from ? v.from + 'T00:00:00.000Z' : '',
    to: v.to ? v.to + 'T23:59:59.999Z' : '',
    compareFrom: v.compareFrom ? v.compareFrom + 'T00:00:00.000Z' : '',
    compareTo: v.compareTo ? v.compareTo + 'T23:59:59.999Z' : '',
  };
}
