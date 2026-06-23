import React from "react";

export const Banner = () => {
  return (
    <>
      <div className="fixed top-0 h-14 w-full bg-gray-100 text-sm z-[999] bg-transparent backdrop-blur-2xl flex justify-center items-center">
        Use LAUNCH25 for a 25% discount!
        <a
          className="text-white inline-flex items-center justify-center rounded-[10px] bg-gradient-to-b from-[#464d55] to-[#25292e] text-sm px-4 py-2 transition duration-150 shadow-[0_10px_20px_rgba(0,_0,_0,_.1),0_3px_6px_rgba(0,_0,_0,_.05)] hover:shadow-[rgba(0,_1,_0,_.2)_0_2px_8px] active:outline-none hover:opacity-80 ml-1"
          href="https://aceternity.lemonsqueezy.com/checkout/buy/ad25bad9-a669-4c62-ad84-5970ec0c0c12"
          target="__blank"
        >
          Buy Now
        </a>
      </div>
      <div className="h-10"></div>
    </>
  );
};
