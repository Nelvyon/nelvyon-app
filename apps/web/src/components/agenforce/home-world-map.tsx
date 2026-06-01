import { WorldMap } from "@/components/premium/world-map";

import { HOME_COPY } from "./home-copy";

export function HomeWorldMap() {
  return (
    <WorldMap className="nelvyon-home-block nelvyon-home-world nelvyon-home-world--bare">
      <p className="nelvyon-home-world__caption">{HOME_COPY.worldMap.caption}</p>
    </WorldMap>
  );
}
