"use client";

import dynamic from "next/dynamic";
import type { Data, Layout, Config } from "plotly.js-dist-min";

const Plot = dynamic(
  async () => {
    const Plotly = (await import("plotly.js-dist-min")).default;
    const createPlotlyComponent = (await import("react-plotly.js/factory")).default;
    return createPlotlyComponent(Plotly);
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--ink-soft)]">
        Loading chart…
      </div>
    ),
  }
);

const BASE_LAYOUT: Partial<Layout> = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { family: "inherit", size: 12, color: "#334155" },
  margin: { t: 40, r: 20, b: 40, l: 50 },
  legend: { orientation: "h", y: -0.15 },
};

const BASE_CONFIG: Partial<Config> = {
  displayModeBar: true,
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ["lasso2d", "select2d"],
};

export function PlotlyChart({
  data,
  layout,
  config,
  className,
  height = 320,
}: {
  // Plotly trace shapes vary widely; keep loose for gauges/waterfall/funnel/etc.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
  className?: string;
  height?: number;
}) {
  return (
    <div className={className} style={{ width: "100%", minHeight: height }}>
      <Plot
        data={data}
        layout={{ ...BASE_LAYOUT, height, autosize: true, ...layout }}
        config={{ ...BASE_CONFIG, ...config }}
        style={{ width: "100%", height }}
        useResizeHandler
      />
    </div>
  );
}

export function GanttTimelineChart({
  rows,
  title = "Portfolio timeline",
}: {
  rows: {
    name: string;
    start: string;
    end: string;
    progress?: number;
    rag?: string;
    group?: string;
  }[];
  title?: string;
}) {
  const ragColor: Record<string, string> = {
    Green: "#059669",
    Amber: "#d97706",
    Red: "#e11d48",
  };
  const data: any[] = rows.map((r) => ({
    type: "bar",
    orientation: "h",
    name: r.name,
    x: [Math.max(1, (new Date(r.end).getTime() - new Date(r.start).getTime()) / 86400000)],
    y: [r.name],
    base: [r.start],
    marker: { color: ragColor[r.rag || "Green"] || "#0f766e", opacity: 0.85 },
    hovertemplate: `%{y}<br>${r.start} → ${r.end}<br>Progress ${r.progress ?? 0}%<extra></extra>`,
    showlegend: false,
  }));

  return (
    <PlotlyChart
      data={data}
      height={Math.max(280, rows.length * 28 + 80)}
      layout={{
        title: { text: title, font: { size: 14 } },
        barmode: "overlay",
        xaxis: { type: "date" },
        yaxis: { autorange: "reversed" },
        margin: { t: 48, r: 16, b: 40, l: 140 },
      }}
    />
  );
}

export function HeatmapChart({
  z,
  x,
  y,
  title,
  colorscale = "Teal",
}: {
  z: number[][];
  x: string[];
  y: string[];
  title?: string;
  colorscale?: string;
}) {
  return (
    <PlotlyChart
      data={[
        {
          type: "heatmap",
          z,
          x,
          y,
          colorscale,
          hoverongaps: false,
        },
      ]}
      height={Math.max(280, y.length * 26 + 100)}
      layout={{
        title: title ? { text: title, font: { size: 14 } } : undefined,
        margin: { t: 48, r: 16, b: 60, l: 120 },
      }}
    />
  );
}

export function WaterfallChart({
  labels,
  values,
  title,
}: {
  labels: string[];
  values: number[];
  title?: string;
}) {
  const measure = values.map((_, i) => (i === 0 || i === values.length - 1 ? "absolute" : "relative"));
  return (
    <PlotlyChart
      data={[
        {
          type: "waterfall",
          x: labels,
          y: values,
          measure,
          connector: { line: { color: "#94a3b8" } },
          increasing: { marker: { color: "#059669" } },
          decreasing: { marker: { color: "#e11d48" } },
          totals: { marker: { color: "#0f766e" } },
        } as any,
      ]}
      layout={{ title: title ? { text: title, font: { size: 14 } } : undefined }}
    />
  );
}

export function GaugeChart({
  value,
  max = 100,
  title,
  suffix = "%",
}: {
  value: number;
  max?: number;
  title?: string;
  suffix?: string;
}) {
  return (
    <PlotlyChart
      height={220}
      data={[
        {
          type: "indicator",
          mode: "gauge+number",
          value,
          number: { suffix },
          gauge: {
            axis: { range: [0, max] },
            bar: { color: "#0f766e" },
            steps: [
              { range: [0, max * 0.5], color: "#ecfdf5" },
              { range: [max * 0.5, max * 0.8], color: "#fef3c7" },
              { range: [max * 0.8, max], color: "#ffe4e6" },
            ],
            threshold: {
              line: { color: "#e11d48", width: 3 },
              value: max * 0.9,
            },
          },
          title: title ? { text: title } : undefined,
        },
      ]}
      layout={{ margin: { t: 50, r: 30, b: 10, l: 30 } }}
    />
  );
}

export function BubbleScatterChart({
  points,
  title,
  xTitle,
  yTitle,
}: {
  points: { x: number; y: number; size: number; label: string; color?: string }[];
  title?: string;
  xTitle?: string;
  yTitle?: string;
}) {
  return (
    <PlotlyChart
      data={[
        {
          type: "scatter",
          mode: "markers",
          x: points.map((p) => p.x),
          y: points.map((p) => p.y),
          text: points.map((p) => p.label),
          marker: {
            size: points.map((p) => Math.max(8, Math.min(48, Math.sqrt(p.size + 1) * 2))),
            color: points.map((p) => p.color || "#0f766e"),
            opacity: 0.75,
          },
          hovertemplate: "%{text}<br>x=%{x}<br>y=%{y}<extra></extra>",
        },
      ]}
      layout={{
        title: title ? { text: title, font: { size: 14 } } : undefined,
        xaxis: { title: { text: xTitle || "" } },
        yaxis: { title: { text: yTitle || "" } },
      }}
    />
  );
}

export function FunnelChart({
  stages,
  title,
}: {
  stages: { label: string; value: number }[];
  title?: string;
}) {
  return (
    <PlotlyChart
      data={[
        {
          type: "funnel",
          y: stages.map((s) => s.label),
          x: stages.map((s) => s.value),
          textinfo: "value+percent",
          marker: { color: "#0f766e" },
        } as any,
      ]}
      layout={{ title: title ? { text: title, font: { size: 14 } } : undefined }}
    />
  );
}

export function HistogramChart({
  values,
  title,
  nbins = 20,
}: {
  values: number[];
  title?: string;
  nbins?: number;
}) {
  return (
    <PlotlyChart
      data={[
        {
          type: "histogram",
          x: values,
          nbinsx: nbins,
          marker: { color: "#134e4a" },
        },
      ]}
      layout={{
        title: title ? { text: title, font: { size: 14 } } : undefined,
        xaxis: { title: { text: "Cost outcome" } },
        yaxis: { title: { text: "Frequency" } },
      }}
    />
  );
}

export function Sparkline({ values, color = "#0f766e" }: { values: number[]; color?: string }) {
  return (
    <PlotlyChart
      height={48}
      data={[
        {
          type: "scatter",
          mode: "lines",
          y: values,
          line: { color, width: 2 },
          fill: "tozeroy",
          fillcolor: `${color}22`,
          hoverinfo: "y",
        },
      ]}
      config={{ displayModeBar: false }}
      layout={{
        margin: { t: 4, r: 4, b: 4, l: 4 },
        xaxis: { visible: false },
        yaxis: { visible: false },
        height: 48,
      }}
    />
  );
}

export function DonutChart({
  data,
  title,
  colors,
}: {
  data: { name: string; value: number }[];
  title?: string;
  colors?: string[];
}) {
  const defaultColors = ["#059669", "#d97706", "#e11d48", "#0f766e", "#0284c7", "#7c3aed"];
  return (
    <PlotlyChart
      data={[
        {
          type: "pie",
          labels: data.map((d) => d.name),
          values: data.map((d) => d.value),
          hole: 0.55,
          marker: { colors: colors || defaultColors },
          textinfo: "label+percent",
        },
      ]}
      layout={{ title: title ? { text: title, font: { size: 14 } } : undefined }}
    />
  );
}

export function HorizontalBarChart({
  labels,
  values,
  title,
  colorScale,
}: {
  labels: string[];
  values: number[];
  title?: string;
  colorScale?: boolean;
}) {
  return (
    <PlotlyChart
      height={Math.max(280, labels.length * 24 + 80)}
      data={[
        {
          type: "bar",
          orientation: "h",
          y: labels,
          x: values,
          marker: colorScale
            ? {
                color: values,
                colorscale: "Blues",
              }
            : { color: "#0f766e" },
        },
      ]}
      layout={{
        title: title ? { text: title, font: { size: 14 } } : undefined,
        yaxis: { autorange: "reversed" },
        margin: { t: 48, r: 16, b: 40, l: 140 },
      }}
    />
  );
}
