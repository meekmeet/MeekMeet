import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ManyNamesSection from "./ManyNamesSection";

describe("ManyNamesSection", () => {
  it("renders the promise thread across nine traditions with citations", () => {
    render(<ManyNamesSection />);

    expect(screen.getByText("One Promise, Many Names")).toBeInTheDocument();
    expect(screen.getByText("The promise belongs to no one faith.")).toBeInTheDocument();

    // Every tradition is named and every quote carries its source.
    const expected = [
      { tradition: "Christianity", ref: "Matthew 5:5" },
      { tradition: "Judaism", ref: "Psalm 37:11" },
      { tradition: "Islam", ref: "Qur\u2019an 21:105" },
      { tradition: "Hinduism", ref: "Bhagavad Gita 5:18" },
      { tradition: "Buddhism", ref: "Dhammapada 17:223" },
      { tradition: "Sikhism", ref: "Japji Sahib 27" },
      { tradition: "Taoism", ref: "Tao Te Ching 66" },
      { tradition: "Bah\u00e1\u2019\u00ed", ref: "Bah\u00e1\u2019u\u2019ll\u00e1h" },
      { tradition: "Indigenous wisdom", ref: "Traditional teaching" },
    ];
    for (const { tradition, ref } of expected) {
      expect(screen.getByText(tradition)).toBeInTheDocument();
      expect(screen.getByText(`\u2014 ${ref}`)).toBeInTheDocument();
    }

    // The spark framing: Christian is the spark, the table is for everyone.
    expect(screen.getByText(/Christian is the spark/i)).toBeInTheDocument();
    // The Jewish entry is annotated as the verse Matthew was quoting.
    expect(screen.getByText("the verse Matthew was quoting")).toBeInTheDocument();
  });
});
