import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders sentinel dashboard heading", () => {
  localStorage.setItem("token", "test-token");
  localStorage.setItem("apiKey", "sk_test");

  render(<App />);

  const headingElement = screen.getByText(/sentinelai dashboard/i);
  expect(headingElement).toBeInTheDocument();
});
