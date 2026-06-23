import clsx from "clsx";
import React from "react";

export const Container = (props: any) => {
  const { children, className } = props;

  return <main className={clsx("antialiased ", className)}>{children}</main>;
};
