import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders a named page heading and description", () => {
    render(<PageHeader title="Hospitals" description="Find care" />);
    expect(screen.getByRole("heading", { level: 1, name: "Hospitals" })).toBeInTheDocument();
    expect(screen.getByText("Find care")).toBeInTheDocument();
  });
});
