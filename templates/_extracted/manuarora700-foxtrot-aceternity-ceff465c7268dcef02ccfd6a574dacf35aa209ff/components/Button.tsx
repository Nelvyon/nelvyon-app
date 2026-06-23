"use client";
import React from "react";

import { twMerge } from "tailwind-merge";

export interface IButton {
  variant?: "small" | "medium" | "large" | string;
  className?: string;
  icon?: "rightArrow" | "rightArrowBlue" | "downArrow" | string;
  customIcon?: any;
  onClick?: Function;
  iconStyle?: React.CSSProperties;
  as?: "a" | "button" | "Link" | string | any;
  to?: string;
  href?: string;
  target?: string;
  children?: JSX.Element | JSX.Element[] | string | string[];
  [x: string]: any;
}

const Button = (props: IButton) => {
  const {
    variant,
    className,
    icon,
    iconStyle,
    as: Tag = "button",
    children,
    ...remainingProps
  } = props;

  const getVariantStyles = () => {
    switch (variant) {
      case "small":
        return "text-white inline-flex items-center justify-center rounded-[10px] bg-gradient-to-b from-[#464d55] to-[#25292e] text-sm px-4 py-2 transition duration-150 shadow-[0_10px_20px_rgba(0,_0,_0,_.1),0_3px_6px_rgba(0,_0,_0,_.05)] hover:shadow-[rgba(0,_1,_0,_.2)_0_2px_8px] active:outline-none hover:opacity-80 ";
      case "medium":
        return "text-white inline-flex items-center justify-center rounded-[10px] bg-gradient-to-b from-[#464d55] to-[#25292e] text-sm px-4 py-2 transition duration-150 shadow-[0_10px_20px_rgba(0,_0,_0,_.1),0_3px_6px_rgba(0,_0,_0,_.05)] hover:shadow-[rgba(0,_1,_0,_.2)_0_2px_8px] active:outline-none hover:opacity-80 ";
      case "large":
        return "text-white inline-flex items-center justify-center rounded-[10px] bg-gradient-to-b from-[#464d55] to-[#25292e] text-base px-6 py-2 transition duration-150 shadow-[0_10px_20px_rgba(0,_0,_0,_.1),0_3px_6px_rgba(0,_0,_0,_.05)] hover:shadow-[rgba(0,_1,_0,_.2)_0_2px_8px] active:outline-none hover:opacity-80 ";
      case "outline":
        return "text-zinc-700 inline-flex items-center justify-center rounded-[10px] bg-white  text-base px-6 py-2 transition duration-150 shadow-[0_10px_20px_rgba(0,_0,_0,_.1),0_3px_6px_rgba(0,_0,_0,_.05)] hover:shadow-[rgba(0,_1,_0,_.2)_0_2px_8px] active:outline-none hover:opacity-80 ";
      default:
        return "rounded-xl bg-zinc-700 text-white font-bold px-6 py-2 hover:bg-zinc-800 transition duration-200 hover:shadow-xl";
    }
  };

  return (
    <Tag
      {...props}
      className={twMerge(getVariantStyles(), className)}
      {...remainingProps}
    >
      {children}
    </Tag>
  );
};

export default Button;
