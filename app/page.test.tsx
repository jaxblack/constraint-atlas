import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the health status", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { name: "Constraint Atlas" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Healthy");
  });
});
