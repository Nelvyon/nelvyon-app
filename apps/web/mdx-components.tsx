import type { MDXComponents } from "mdx/types";

import { getMDXComponents } from "./src/mdx-components-pa";

export function useMDXComponents(components?: MDXComponents): MDXComponents {
  return getMDXComponents(components);
}
