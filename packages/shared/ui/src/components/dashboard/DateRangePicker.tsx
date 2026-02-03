import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';

export type Period = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateRangePickerProps {
  onChange?: (from: Date, to: Date, period: Period, comparison: boolean) => void;
  defaultPeriod?: Period;
  defaultComparison?: boolean;
}

/**
 * DateRangePicker Component
 *
 * Provides period selector, date range picker, and comparison toggle
 *
 * Features:
 * - Period dropdown (Napi, Heti, Havi, Negyedéves, Éves)
 * - Custom date range picker (Calendar komponens)
 * - Comparison toggle switch
 * - Preset buttons (Ma, Tegnap, Ez a hét, etc.)
 *
 * @param onChange - Callback when date range changes
 * @param defaultPeriod - Default period selection
 * @param defaultComparison - Default comparison toggle state
 */
export function DateRangePicker({
  onChange,
  defaultPeriod = 'daily',
  defaultComparison = false,
}: DateRangePickerProps) {
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [comparison, setComparison] = useState<boolean>(defaultComparison);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });

  const handlePeriodChange = (value: Period) => {
    setPeriod(value);
    onChange?.(dateRange.from, dateRange.to, value, comparison);
  };

  const handleComparisonToggle = (checked: boolean) => {
    setComparison(checked);
    onChange?.(dateRange.from, dateRange.to, period, checked);
  };

  const handlePresetClick = (preset: string) => {
    const today = new Date();
    let from: Date;
    let to: Date;

    switch (preset) {
      case 'today':
        from = to = today;
        break;
      case 'yesterday':
        from = to = new Date(today.setDate(today.getDate() - 1));
        break;
      case 'thisWeek':
        from = new Date(today.setDate(today.getDate() - today.getDay()));
        to = new Date();
        break;
      case 'lastWeek':
        from = new Date(today.setDate(today.getDate() - today.getDay() - 7));
        to = new Date(today.setDate(today.getDate() - today.getDay() - 1));
        break;
      case 'thisMonth':
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        to = new Date();
        break;
      case 'lastMonth':
        from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        to = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'thisYear':
        from = new Date(today.getFullYear(), 0, 1);
        to = new Date();
        break;
      default:
        from = to = today;
    }

    setDateRange({ from, to });
    onChange?.(from, to, period, comparison);
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <Label htmlFor="period">Időszak:</Label>
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger id="period" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Napi</SelectItem>
            <SelectItem value="weekly">Heti</SelectItem>
            <SelectItem value="monthly">Havi</SelectItem>
            <SelectItem value="quarterly">Negyedéves</SelectItem>
            <SelectItem value="yearly">Éves</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => handlePresetClick('today')}>
          Ma
        </Button>
        <Button variant="outline" size="sm" onClick={() => handlePresetClick('yesterday')}>
          Tegnap
        </Button>
        <Button variant="outline" size="sm" onClick={() => handlePresetClick('thisWeek')}>
          Ez a hét
        </Button>
        <Button variant="outline" size="sm" onClick={() => handlePresetClick('lastWeek')}>
          Előző hét
        </Button>
        <Button variant="outline" size="sm" onClick={() => handlePresetClick('thisMonth')}>
          Ez a hónap
        </Button>
        <Button variant="outline" size="sm" onClick={() => handlePresetClick('lastMonth')}>
          Előző hónap
        </Button>
        <Button variant="outline" size="sm" onClick={() => handlePresetClick('thisYear')}>
          Ez az év
        </Button>
      </div>

      {/* Comparison Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="comparison"
          checked={comparison}
          onCheckedChange={handleComparisonToggle}
        />
        <Label htmlFor="comparison">Összehasonlítás előző időszakkal</Label>
      </div>

      {/* Custom Date Range Display (Calendar komponens integration TODO) */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Calendar className="h-4 w-4" />
        <span>
          {dateRange.from.toLocaleDateString('hu-HU')} -{' '}
          {dateRange.to.toLocaleDateString('hu-HU')}
        </span>
      </div>
    </div>
  );
}
