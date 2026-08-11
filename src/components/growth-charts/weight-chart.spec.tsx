// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeightChart } from "./weight-chart";

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
