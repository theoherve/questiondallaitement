// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeightChart } from "./weight-chart";
import { buildChartData } from "./weight-chart";

// Polyfill ResizeObserver pour jsdom
// ResizeObserver est utilisé par ResponsiveContainer de Recharts pour mesurer la taille
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverMock);

// Forcer les dimensions du conteneur pour que ResponsiveContainer ait une taille non nulle
beforeEach(() => {
  // Mock getBoundingClientRect pour retourner des dimensions non nulles
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    width: 400,
    height: 320,
    top: 0,
    left: 0,
    bottom: 320,
    right: 400,
    x: 0,
    y: 0,
    toJSON: () => {},
  }));
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
    render(
      <WeightChart measurements={[]} birthDate="2025-01-01" sex="female" />,
    );
    expect(
      screen.getByText(/pas de pesée enregistrée/i),
    ).toBeInTheDocument();
  });

  it("affiche la mention de non-diagnostic quand des pesées existent", () => {
    render(
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
      screen.getByText(/ne remplacent pas un avis médical/i),
    ).toBeInTheDocument();
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
    // Recharts applique la classe .who-median-line sur le groupe SVG parent.
    // Avec le polyfill ResizeObserver, ResponsiveContainer rend le SVG réel.
    const medianElement = container.querySelector(".who-median-line");
    expect(medianElement).toBeTruthy();
  });

  it("affiche une légende distinguant domicile et consultation", () => {
    render(
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
    expect(screen.getByText("Pesée à domicile")).toBeInTheDocument();
    expect(screen.getByText("Pesée en consultation")).toBeInTheDocument();
  });
});
