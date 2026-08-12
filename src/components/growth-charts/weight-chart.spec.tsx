// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeightChart } from "./weight-chart";
import { buildChartData } from "./weight-chart";

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
});
