import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CropList from "./CropList";
import { api } from "../services/api";

vi.mock("../components/Navbar", () => ({ default: () => <nav>导航</nav> }));
vi.mock("../services/api", () => ({
  api: { get: vi.fn() },
  mediaUrl: (path) => path,
}));

describe("CropList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not display an unverified crop image", async () => {
    api.get.mockResolvedValue([{ id: 1, name: "小麦", category: "粮食", description: "主要口粮作物", image: "/media/crops/wheat.jpg", image_status: "unverified" }]);
    render(<CropList />);

    expect(await screen.findByText("小麦")).toBeInTheDocument();
    expect(screen.getByLabelText("小麦暂无已核验图片")).toBeInTheDocument();
    expect(screen.queryByAltText("小麦实物照片")).not.toBeInTheDocument();
  });
});
