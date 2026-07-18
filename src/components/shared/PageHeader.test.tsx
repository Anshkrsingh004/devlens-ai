import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the title as the page's sole level-one heading", () => {
    render(<PageHeader title="Dashboard" />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(<PageHeader title="Dashboard" description="Your recent reviews." />);

    expect(screen.getByText("Your recent reviews.")).toBeInTheDocument();
  });

  it("omits the description entirely when not provided", () => {
    const { container } = render(<PageHeader title="Dashboard" />);

    expect(container.querySelector("p")).toBeNull();
  });

  it("renders trailing actions", () => {
    render(
      <PageHeader title="Dashboard" actions={<button>New review</button>} />,
    );

    expect(
      screen.getByRole("button", { name: "New review" }),
    ).toBeInTheDocument();
  });
});
