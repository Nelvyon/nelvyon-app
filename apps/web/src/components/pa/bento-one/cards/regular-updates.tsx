import { SquareDots } from "@/components/pa/square-dots";
import { SkeletonTwo } from "@/components/pa/bento-one/skeletons/second";

export const RegularUpdates = () => {
  return (
    <div className="h-full">
      <div className="absolute top-0 -right-20 size-40 w-full mask-b-from-10% mask-radial-[100%_100%] mask-radial-from-25% mask-radial-at-right opacity-[0.04]">
        <SquareDots color="#000000" className="absolute" />
      </div>
      <h2 className="text-base font-medium text-black">
        Seguimiento operativo <br />
        y optimización continua
      </h2>
      <SkeletonTwo />
    </div>
  );
};

