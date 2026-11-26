import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import QuestionToChangeSection from "./QuestionToChangeSection";

describe("QuestionToChangeSection", () => {
  it("narrates the four stages from question to change", () => {
    render(<QuestionToChangeSection />);

    expect(screen.getByText("The Engine")).toBeInTheDocument();
    expect(screen.getByText("From a question to a change.")).toBeInTheDocument();

    for (const stage of ["The Question", "The Answer", "The Pattern", "The Change"]) {
      expect(screen.getByText(stage)).toBeInTheDocument();
    }

    // The funnel canvas is present and labelled for assistive tech.
    expect(screen.getByRole("img", { name: /from a question to a change/i })).toBeInTheDocument();
  });
});
