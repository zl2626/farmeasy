import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LanguageProvider, useLanguage } from "../context/LanguageContext";
import LanguageToggle from "./LanguageToggle";

function LanguageStatus() {
  const { toLang, translationEnabled } = useLanguage();

  return (
    <output>
      {toLang}:{translationEnabled ? "enabled" : "disabled"}
    </output>
  );
}

describe("LanguageToggle", () => {
  it("updates the shared language state when the user selects English", async () => {
    const user = userEvent.setup();

    render(
      <LanguageProvider>
        <LanguageToggle />
        <LanguageStatus />
      </LanguageProvider>,
    );

    await user.selectOptions(screen.getByRole("combobox"), "en");

    expect(screen.getByText("en:enabled")).toBeInTheDocument();
  });
});
