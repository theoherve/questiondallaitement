// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeightChart } from "./weight-chart";
import { buildChartData, WeightTooltip } from "./weight-chart";

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

  it("rend un point rond vert-sage pour une pesée à domicile", () => {
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
    // Le vrai SVG Recharts (dans .recharts-surface, pas la légende statique)
    // doit contenir un <circle> avec le fill accent-sage pour une pesée domicile.
    const homeDot = container.querySelector(
      '.recharts-surface circle[fill="#a8c4a0"]',
    );
    expect(homeDot).toBeTruthy();
  });

  it("rend un point losange rouge-primaire pour une pesée en consultation", () => {
    const { container } = render(
      <WeightChart
        measurements={[
          {
            id: "m2",
            child_id: "c1",
            weight_grams: 4800,
            measured_at: "2025-03-01",
            source: "consultation",
            recorded_by: "u1",
            consultant_id: "cons1",
            created_at: "2025-03-01T00:00:00.000Z",
          },
        ]}
        birthDate="2025-01-01"
        sex="female"
      />,
    );
    // Le losange (rect roté à 45°) doit être présent dans le SVG réel
    // pour une pesée en consultation, avec le fill primary-red.
    const consultationDot = container.querySelector(
      '.recharts-surface rect[fill="#a0283e"]',
    );
    expect(consultationDot).toBeTruthy();
    expect(consultationDot?.getAttribute("transform")).toMatch(/^rotate\(45/);
  });
});

describe("WeightTooltip", () => {
  it("affiche la ligne source « Domicile » pour une pesée à domicile", () => {
    render(
      <WeightTooltip
        active
        payload={[
          {
            payload: {
              ageDays: 30,
              measured: 4200,
              source: "home",
              p3: null,
              p15: null,
              p50: null,
              p85: null,
              p97: null,
              d15: null,
              d50: null,
              d85: null,
              d97: null,
            },
          },
        ]}
      />,
    );
    expect(screen.getByText("Domicile")).toBeInTheDocument();
  });

  it("affiche la ligne source « Consultation » pour une pesée en consultation", () => {
    render(
      <WeightTooltip
        active
        payload={[
          {
            payload: {
              ageDays: 60,
              measured: 4800,
              source: "consultation",
              p3: null,
              p15: null,
              p50: null,
              p85: null,
              p97: null,
              d15: null,
              d50: null,
              d85: null,
              d97: null,
            },
          },
        ]}
      />,
    );
    expect(screen.getByText("Consultation")).toBeInTheDocument();
  });
});
