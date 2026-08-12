// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotesEditor } from "./notes-editor";

const { mockGetNoteHistory } = vi.hoisted(() => ({
  mockGetNoteHistory: vi.fn(),
}));

vi.mock("../actions", () => ({
  createNote: vi.fn(),
  updateNote: vi.fn(),
  getNoteHistory: mockGetNoteHistory,
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const notes = [
  {
    id: "note-1",
    content: "Contenu actuel",
    created_at: "2026-08-01T10:00:00.000Z",
    updated_at: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "note-2",
    content: "Jamais modifiée",
    created_at: "2026-08-05T10:00:00.000Z",
    updated_at: "2026-08-05T10:00:00.000Z",
  },
];

describe("NotesEditor", () => {
  beforeEach(() => {
    mockGetNoteHistory.mockReset();
  });

  it("n'affiche pas de bouton de suppression", () => {
    render(<NotesEditor clientId="client-1" notes={notes} />);

    expect(
      screen.queryByRole("button", { name: /supprimer/i }),
    ).not.toBeInTheDocument();
  });

  it("affiche le lien historique seulement pour une note modifiée", () => {
    render(<NotesEditor clientId="client-1" notes={notes} />);

    expect(screen.getByText(/voir l'historique/i)).toBeInTheDocument();
    // Une seule note (note-1) a updated_at !== created_at.
    expect(screen.getAllByText(/voir l'historique/i)).toHaveLength(1);
  });

  it("charge et affiche les versions précédentes au clic", async () => {
    mockGetNoteHistory.mockResolvedValue([
      { id: "h-1", content: "Ancien contenu", edited_at: "2026-08-05T10:00:00.000Z" },
    ]);
    render(<NotesEditor clientId="client-1" notes={notes} />);

    fireEvent.click(screen.getByText(/voir l'historique/i));

    await waitFor(() => {
      expect(screen.getByText("Ancien contenu")).toBeInTheDocument();
    });
    expect(mockGetNoteHistory).toHaveBeenCalledWith("note-1");
  });
});
