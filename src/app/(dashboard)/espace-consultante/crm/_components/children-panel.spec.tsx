// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChildrenPanel } from "./children-panel";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../actions", () => ({
  addWeightMeasurementAsConsultant: vi.fn(),
  deleteChildAsConsultant: vi.fn(),
  deleteWeightMeasurementAsConsultant: vi.fn(),
}));

const child = {
  id: "child-1",
  client_id: "client-1",
  first_name: "Léo",
  birth_date: "2026-01-01",
  sex: "female" as const,
  is_premature: false,
  gestational_age_weeks: null,
  birth_weight_grams: 3200,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("ChildrenPanel — bloc alertes", () => {
  it("affiche le message d'une alerte active", () => {
    render(
      <ChildrenPanel
        childrenList={[child]}
        measurementsByChild={{
          "child-1": [
            {
              id: "m1",
              child_id: "child-1",
              weight_grams: 2800,
              measured_at: "2026-01-05",
              source: "home",
              recorded_by: "client-1",
              consultant_id: null,
              created_at: "2026-01-05T00:00:00.000Z",
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByText(/Perte de poids importante/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/aide à la décision/i),
    ).toBeInTheDocument();
  });

  it("n'affiche aucun bloc alerte quand il n'y en a pas", () => {
    render(
      <ChildrenPanel
        childrenList={[child]}
        measurementsByChild={{
          "child-1": [
            {
              id: "m1",
              child_id: "child-1",
              weight_grams: 3190,
              measured_at: "2026-01-05",
              source: "home",
              recorded_by: "client-1",
              consultant_id: null,
              created_at: "2026-01-05T00:00:00.000Z",
            },
          ],
        }}
      />,
    );
    expect(screen.queryByText(/aide à la décision/i)).not.toBeInTheDocument();
  });

  it("déduplique les alertes d'une même règle et affiche la date de la mesure la plus récente", () => {
    render(
      <ChildrenPanel
        childrenList={[child]}
        measurementsByChild={{
          "child-1": [
            {
              id: "m1",
              child_id: "child-1",
              weight_grams: 2800, // -12.5% avant J14 : déclenche loss_alert (et loss_vigilance)
              measured_at: "2026-01-06",
              source: "home",
              recorded_by: "client-1",
              consultant_id: null,
              created_at: "2026-01-06T00:00:00.000Z",
            },
            {
              id: "m2",
              child_id: "child-1",
              weight_grams: 2700, // -15.6% avant J14 : déclenche la même règle, date plus récente
              measured_at: "2026-01-11",
              source: "home",
              recorded_by: "client-1",
              consultant_id: null,
              created_at: "2026-01-11T00:00:00.000Z",
            },
          ],
        }}
      />,
    );

    // Une seule ligne "Perte de poids importante" (loss_alert) doit être affichée,
    // malgré deux mesures qui déclenchent chacune cette règle.
    const lossAlertRows = screen.getAllByText(/Perte de poids importante/i);
    expect(lossAlertRows).toHaveLength(1);
    // C'est bien la date de la mesure la plus récente (m2, 11/01/2026) qui est affichée.
    expect(lossAlertRows[0].textContent).toContain("Le 11/01/2026");
    // La date de l'ancienne mesure (m1, 06/01/2026) ne doit plus apparaître nulle part.
    expect(screen.queryByText(/Le 06\/01\/2026/)).not.toBeInTheDocument();
  });
});
