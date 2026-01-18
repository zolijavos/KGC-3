// Type augmentation for Recharts to work with React 19
// This is a known compatibility issue between Recharts types and React 19
// The Recharts library components are typed for React 18 which has different JSX types

import type { ComponentType } from 'react';

declare module 'recharts' {
  // Re-export all components with JSX-compatible types
  export const ResponsiveContainer: ComponentType<any>;
  export const LineChart: ComponentType<any>;
  export const BarChart: ComponentType<any>;
  export const PieChart: ComponentType<any>;
  export const AreaChart: ComponentType<any>;
  export const RadarChart: ComponentType<any>;
  export const ComposedChart: ComponentType<any>;
  export const ScatterChart: ComponentType<any>;
  export const Treemap: ComponentType<any>;
  export const Sankey: ComponentType<any>;
  export const RadialBarChart: ComponentType<any>;
  export const FunnelChart: ComponentType<any>;

  export const Line: ComponentType<any>;
  export const Bar: ComponentType<any>;
  export const Pie: ComponentType<any>;
  export const Area: ComponentType<any>;
  export const Radar: ComponentType<any>;
  export const Scatter: ComponentType<any>;
  export const Cell: ComponentType<any>;
  export const Sector: ComponentType<any>;
  export const Curve: ComponentType<any>;
  export const Cross: ComponentType<any>;
  export const Dot: ComponentType<any>;
  export const Rectangle: ComponentType<any>;
  export const Polygon: ComponentType<any>;
  export const Symbols: ComponentType<any>;
  export const Trapezoid: ComponentType<any>;
  export const Funnel: ComponentType<any>;
  export const RadialBar: ComponentType<any>;

  export const XAxis: ComponentType<any>;
  export const YAxis: ComponentType<any>;
  export const ZAxis: ComponentType<any>;
  export const CartesianAxis: ComponentType<any>;
  export const CartesianGrid: ComponentType<any>;
  export const PolarAngleAxis: ComponentType<any>;
  export const PolarRadiusAxis: ComponentType<any>;
  export const PolarGrid: ComponentType<any>;

  export const Brush: ComponentType<any>;
  export const ReferenceArea: ComponentType<any>;
  export const ReferenceDot: ComponentType<any>;
  export const ReferenceLine: ComponentType<any>;
  export const ErrorBar: ComponentType<any>;

  export const Legend: ComponentType<any>;
  export const Tooltip: ComponentType<any>;
  export const Label: ComponentType<any>;
  export const LabelList: ComponentType<any>;

  export const Text: ComponentType<any>;
  export const Layer: ComponentType<any>;
  export const Surface: ComponentType<any>;
}
