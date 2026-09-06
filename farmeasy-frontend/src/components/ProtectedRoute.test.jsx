import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

function LoginTarget() {
  const location = useLocation();
  const from = location.state?.from;
  return <p>返回位置：{from ? `${from.pathname}${from.search}` : "无"}</p>;
}

describe("ProtectedRoute", () => {
  it("redirects anonymous users to login while preserving the target URL", () => {
    render(
      <MemoryRouter initialEntries={["/profile?tab=account"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginTarget />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<p>个人中心</p>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("返回位置：/profile?tab=account")).toBeInTheDocument();
    expect(screen.queryByText("个人中心")).not.toBeInTheDocument();
  });
});
