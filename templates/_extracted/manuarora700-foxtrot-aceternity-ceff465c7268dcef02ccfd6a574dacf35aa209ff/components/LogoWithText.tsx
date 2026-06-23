import clsx from "clsx";

import Link from "next/link";
import React from "react";

const LogoWithText = ({
  textClassName,
  logoClassName,
}: {
  textClassName?: string;
  logoClassName?: string;
}) => {
  return (
    <div className="flex flex-row justify-between items-center space-x-1">
      {/* <LogoMain className={clsx(logoClassName)} /> */}
      <Link href="/" className={clsx("font-bold text-2xl", textClassName)}>
        Foxtrot
      </Link>
    </div>
  );
};

export default LogoWithText;
