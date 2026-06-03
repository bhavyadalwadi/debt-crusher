import { beforeEach, describe, expect, it, vi } from "vitest";

const { createWorkerMock, workerMock } = vi.hoisted(() => {
  const worker = {
    setParameters: vi.fn(),
    recognize: vi.fn(),
    terminate: vi.fn(),
  };

  return {
    createWorkerMock: vi.fn(async () => worker),
    workerMock: worker,
  };
});

vi.mock("tesseract.js", () => ({
  PSM: {
    SPARSE_TEXT: "SPARSE_TEXT",
  },
  createWorker: createWorkerMock,
}));

import { analyzeScreenshotImport } from "@/lib/screenshot-import";

describe("analyzeScreenshotImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workerMock.setParameters.mockResolvedValue(undefined);
    workerMock.terminate.mockResolvedValue(undefined);
  });

  it("extracts balances and warnings from OCR text", async () => {
    workerMock.recognize.mockResolvedValue({
      data: {
        text: [
          "Chase Visa",
          "Current Balance $1,234.56",
          "Available Credit $765.44",
          "05/31/2026",
        ].join("\n"),
        confidence: 92,
      },
    });

    const result = await analyzeScreenshotImport(Buffer.from("image"));

    expect(createWorkerMock).toHaveBeenCalledWith("eng", 1, expect.any(Object));
    expect(workerMock.setParameters).toHaveBeenCalledWith({
      tessedit_pageseg_mode: "SPARSE_TEXT",
      preserve_interword_spaces: "1",
    });
    expect(result.extraction.accountKind).toBe("credit");
    expect(result.extraction.currentBalance).toBe(1234.56);
    expect(result.extraction.availableBalance).toBe(765.44);
    expect(result.extraction.capturedAt).toBe("2026-05-31");
    expect(result.extraction.lowConfidence).toBe(true);
    expect(result.warnings).toContain(
      "Multiple balance candidates were found. Pick the right amount before saving.",
    );
    expect(workerMock.terminate).toHaveBeenCalledTimes(1);
  });

  it("terminates the worker and rejects when OCR fails", async () => {
    workerMock.recognize.mockRejectedValue(new Error("Error attempting to read image."));

    await expect(analyzeScreenshotImport(Buffer.from("bad-image"))).rejects.toThrow(
      "Error attempting to read image.",
    );
    expect(workerMock.terminate).toHaveBeenCalledTimes(1);
  });
});
