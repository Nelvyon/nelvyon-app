import React, {  useState } from "react";

import Link from "next/link";

export function  NavMenuToggle(){
	setTimeout(()=>{	
		const mainwrapper = document.querySelector("#main-wrapper");
		if (!mainwrapper) return;
		if(mainwrapper.classList.contains('menu-toggle')){
			mainwrapper.classList.remove("menu-toggle");
		}else{
			mainwrapper.classList.add("menu-toggle");
		}
	},200);
}


const NavHader = () => {
  const [toggle, setToggle] = useState(false);
  return (
    <div className="nav-header">
      <Link href="/saas/dashboard" className="brand-logo"> 
          <svg className="logo-abbr" width="39" height="23" viewBox="0 0 39 23" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="NELVYON">
            <text x="0" y="19" fill="var(--primary)" fontFamily="system-ui, -apple-system, Segoe UI, sans-serif" fontSize="22" fontWeight="700" letterSpacing="-0.02em">N</text>
          </svg>
          <svg className="brand-title" width="47" height="16" viewBox="0 0 47 16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="NELVYON">
            <text x="0" y="12" fill="currentColor" fontFamily="system-ui, -apple-system, Segoe UI, sans-serif" fontSize="11" fontWeight="700" letterSpacing="-0.02em">NELVYON</text>
          </svg>
      </Link>

      <div
        className="nav-control"
        onClick={() => {
          setToggle(!toggle);          
          NavMenuToggle();
        }}
      >
        <div className={`hamburger ${toggle ? "is-active" : ""}`}>
          <span className="line"></span>
          <span className="line"></span>
          <span className="line"></span>          
        </div>
      </div>
    </div>
  );
};

export default NavHader;
