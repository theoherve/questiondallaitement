// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { WeightChart } from "./weight-chart";
import { buildChartData } from "./weight-chart";

// Mock Recharts pour rendre du SVG réel avec les classes appropriées
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children, width, height }: any) => (
      <div style={{ width: width || "100%", height: height || 320 }}>
        {React.Children.map(children, (child: any) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child as any, {
              width: 800,
              height: 320,
            });
          }
          return child;
        })}
      </div>
    ),
    ComposedChart: ({ children, width = 800, height = 320, data }: any) => (
      <svg width={width} height={height} className="recharts-svg">
        <g className="recharts-surface">{children}</g>
      </svg>
    ),
    Area: ({ dataKey, fill, fillOpacity, stroke, stackId, name }: any) => (
      <g className={`recharts-area ${stackId ? `stack-${stackId}` : ""}`} />
    ),
    Line: ({ dataKey, stroke, strokeWidth, strokeDasharray, className, name }: any) => (
      <g className={`recharts-line ${className || ""}`}>
        <line
          x1="0"
          y1="0"
          x2="100"
          y2="100"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
        />
      </g>
    ),
    XAxis: () => <g className="recharts-xaxis" />,
    YAxis: () => <g className="recharts-yaxis" />,
    CartesianGrid: () => <g className="recharts-cartesian-grid" />,
    Tooltip: () => null,
  };
});

describe("buildChartData", () => {
  it("calcule des deltas empilables entre percentiles adjacents", () => {
    const [point] = buildChartData(
      [
        {
          id: "m1",
          child_id: "c1",
          weight_grams: 4200,
          measured_at: "2025-02-01",
          source: "home",
          recorded_by: "u1",
          consultant_id: null,
          created_at: "2025-02-01T00:00:00.000Z",
        },
      ],
      "2025-01-01",
      "female",
    );

    expect(point.d15).toBeCloseTo((point.p15 ?? 0) - (point.p3 ?? 0));
    expect(point.d50).toBeCloseTo((point.p50 ?? 0) - (point.p15 ?? 0));
    expect(point.d85).toBeCloseTo((point.p85 ?? 0) - (point.p50 ?? 0));
    expect(point.d97).toBeCloseTo((point.p97 ?? 0) - (point.p85 ?? 0));
  });
});

describe("WeightChart", () => {
  it("affiche un message si aucune pesée n'est enregistrée", () => {
    const { container } = render(
      <WeightChart measurements={[]} birthDate="2025-01-01" sex="female" />,
    );
    expect(
      container.textContent?.includes("Pas de pesée enregistrée"),
    ).toBeTruthy();
  });

  it("affiche la mention de non-diagnostic quand des pesées existent", () => {
    const { container } = render(
      <WeightChart
        measurements={[
          {
            id: "m1",
            child_id: "c1",
            weight_grams: 4200,
            measured_at: "2025-02-01",
            source: "home",
            recorded_by: "u1",
            consultant_id: null,
            created_at: "2025-02-01T00:00:00.000Z",
          },
        ]}
        birthDate="2025-01-01"
        sex="female"
      />,
    );
    expect(
      container.textContent?.includes(
        "ne remplacent pas un avis médical",
      ),
    ).toBeTruthy();
  });

  it("affiche une ligne dédiée à la médiane P50", () => {
    const { container } = render(
      <WeightChart
        measurements={[
          {
            id: "m1",
            child_id: "c1",
            weight_grams: 4200,
            measured_at: "2025-02-01",
            source: "home",
            recorded_by: "u1",
            consultant_id: null,
            created_at: "2025-02-01T00:00:00.000Z",
          },
        ]}
        birthDate="2025-01-01"
        sex="female"
      />,
    );
    // Avec la mock Recharts, le composant Line avec className="who-median-line"
    // rend une <g> avec cette classe. Cherchons-la directement.
    const medianElement = container.querySelector(".who-median-line");
    expect(medianElement).toBeTruthy();
  });
});
