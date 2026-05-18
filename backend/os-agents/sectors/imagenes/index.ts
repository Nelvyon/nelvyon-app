export type { ImagenesInput, ImagenesOutput } from "./shared";
export {
  imagenesLlmOpts as imagenesLlmOpts,
  parseImagenesLlmJson,
  buildImagenesPrompt,
  runImagenesAgentCore,
  getDefaultImagenesLlm,
} from "./shared";
export * from "./ImagenesBannersAgent";
export * from "./ImagenesProductoAgent";
export * from "./ImagenesAvatarAgent";
export * from "./ImagenesAbTestAgent";
export * from "./ImagenesFormatsAgent";
export * from "./ImagenesBrandKitAgent";
export * from "./ImagenesSocialAgent";
export * from "./ImagenesPublicidadAgent";

import { resetImagenesAbTestAgentForTests } from "./ImagenesAbTestAgent";
import { resetImagenesAvatarAgentForTests } from "./ImagenesAvatarAgent";
import { resetImagenesBannersAgentForTests } from "./ImagenesBannersAgent";
import { resetImagenesBrandKitAgentForTests } from "./ImagenesBrandKitAgent";
import { resetImagenesFormatsAgentForTests } from "./ImagenesFormatsAgent";
import { resetImagenesProductoAgentForTests } from "./ImagenesProductoAgent";
import { resetImagenesPublicidadAgentForTests } from "./ImagenesPublicidadAgent";
import { resetImagenesSocialAgentForTests } from "./ImagenesSocialAgent";

export function resetAllImagenesAgentsForTests(): void {
  resetImagenesBannersAgentForTests();
  resetImagenesProductoAgentForTests();
  resetImagenesAvatarAgentForTests();
  resetImagenesAbTestAgentForTests();
  resetImagenesFormatsAgentForTests();
  resetImagenesBrandKitAgentForTests();
  resetImagenesSocialAgentForTests();
  resetImagenesPublicidadAgentForTests();
}
