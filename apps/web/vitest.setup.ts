import * as matchers from "@testing-library/jest-dom/matchers";
import React from "react";
import { expect, vi } from "vitest";

expect.extend(matchers);

vi.stubGlobal("React", React);

process.env.JWT_SECRET ??= "super-secret-key-min-32-chars-change-in-production";
