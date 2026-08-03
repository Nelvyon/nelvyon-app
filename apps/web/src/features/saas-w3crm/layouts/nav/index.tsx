"use client"
import React, { Fragment, useState } from "react";
import SideBar from "./SideBar";
import NavHader from "./NavHader";
import Header from "./Header";
const JobieNav = ({ title }: { title?: string }) => {
  const [toggle, setToggle] = useState("");
  const onClick = (name: string) => setToggle(toggle === name ? "" : name);
  return (
    <Fragment>
	  
        <NavHader />
         <Header
            onNote={() => onClick("chatbox")}
            onNotification={() => onClick("notification")}
            onProfile={() => onClick("profile")}
            toggle={toggle}
            title={title}
            onBox={() => onClick("box")}
            
          /> 
        <SideBar />
    </Fragment>
  );
};

export default JobieNav;
