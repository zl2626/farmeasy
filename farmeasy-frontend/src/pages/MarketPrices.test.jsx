import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MarketPrices from "./MarketPrices";
import { api } from "../services/api";

vi.mock("../components/Navbar", () => ({ default: () => <nav>导航</nav> }));
vi.mock("../services/api", () => ({
  api: { get: vi.fn() },
}));

describe("MarketPrices", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the non-real-time notice and backend records", async () => {
    api.get.mockResolvedValue({
      records: [{ commodity: "小麦", category: "粮食", market: "示例市场", province: "河南省", city: "郑州市", modal_price: 2.65, min_price: 2.4, max_price: 2.8, unit: "元/公斤", arrival_date: "2026-08-31" }],
      meta: { notice: "不可作为生产经营决策依据。", snapshot_date: "2026-08-31", source: "非官方演示快照" },
    });
    render(<MarketPrices />);

    expect(await screen.findByText("当前为非实时演示快照")).toBeInTheDocument();
    expect(screen.getByText("示例市场")).toBeInTheDocument();
    expect(screen.getByText(/不可作为生产经营决策依据/)).toBeInTheDocument();
  });
});
