"use client"

import React, { createContext, useEffect, useReducer } from "react";


export const ThemeContext = createContext<any>(null);
/** La plantilla mezcla strings y objetos {value,label} en el mismo estado. */
type W3crmState = Record<string, any>;

const reducer = (previousState: W3crmState, updatedState: W3crmState): W3crmState => ({
  ...previousState,
  ...updatedState,
});

const initialState = {
  sideBarStyle : { value: "full", label: "Full"},
  sidebarposition : { value: "fixed", label: "Fixed"},
  headerposition : { value: "fixed", label: "Fixed"},
  sidebarLayout : { value: "vertical", label: "Vertical"},
  direction:{ value: "ltr", label: "LTR" },
  primaryColor : "color_1",
  secondaryColor : "color_1",
  navigationHader: "color_4",
  haderColor: "color_4",
  sidebarColor: "color_1",
  background : {value:"light", label:"Light"},
  containerPositionSize: {value: "wide-boxed", label: "Wide Boxed"},
  iconHover: false,
  menuToggle: false,
  windowWidth: 0,
  windowHeight: 0,   
};



const ThemeContextProvider = (props: { children?: React.ReactNode }) => {

const [state, dispatch] = useReducer(reducer, initialState);	
const { 
    sideBarStyle, 
    sidebarposition,
    headerposition,
    sidebarLayout,
    direction,
    primaryColor , 
    secondaryColor,
    navigationHader, 
    haderColor,
    sidebarColor,
    background,
    containerPositionSize,        
    iconHover,
    menuToggle,
    windowWidth,
    windowHeight,        
} = state;

// const body = use(document.body)


  // Restaurado: la plantilla lo dejo comentado pero las funciones de abajo lo usan.
  const body = typeof document !== "undefined" ? document.body : null;
    // layout
  const layoutOption = [
    { value: "vertical", label: "Vertical" },
    { value: "horizontal", label: "Horizontal" },
  ];
  const sideBarOption = [
    { value: "compact", label: "Compact" },
    { value: "full", label: "Full" },
    { value: "mini", label: "Mini" },
    { value: "modern", label: "Modern" },
    { value: "overlay", label: "Overlay" },
    { value: "icon-hover", label: "Icon-hover" },
  ];
  const backgroundOption = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];
  const sidebarpositions = [
    { value: "fixed", label: "Fixed" },
    { value: "static", label: "Static" },
  ];
  const headerPositions = [
    { value: "fixed", label: "Fixed" },
    { value: "static", label: "Static" },
  ];
  const containerPosition = [
    { value: "wide-boxed", label: "Wide Boxed" },
    { value: "boxed", label: "Boxed" },
    { value: "wide", label: "Wide" },
  ];
  const colors = [
    "color_1",
    "color_2",
    "color_3",
    "color_4",
    "color_5",
    "color_6",
    "color_7",
    "color_8",
    "color_9",
    "color_10",
    "color_11",
    "color_12",
    //"color_13",
    //"color_14",
    //"color_15",
  ];
  const directionPosition = [
    { value: "ltr", label: "LTR" },
    { value: "rtl", label: "RTL" },
  ];
  const fontFamily = [
    { value: "poppins", label: "Poppins" },
    { value: "roboto", label: "Roboto" },
    { value: "nunito", label: "Nunito" },
    { value: "opensans", label: "Open Sans" },
    { value: "HelveticaNeue", label: "HelveticaNeue" },
  ];
  const changePrimaryColor = (name: any) => {	
    dispatch({primaryColor: name});
    body?.setAttribute("data-primary", name);
  };
  const changeSecondaryColor = (name: any) => {	  
    dispatch({secondaryColor: name});
    body?.setAttribute("data-secondary", name);
  };
  const changeNavigationHader = (name: any) => {    
    dispatch({navigationHader : name});
    body?.setAttribute("data-nav-headerbg", name);
  };
  const chnageHaderColor = (name: any) => {    
    dispatch({haderColor: name});
    body?.setAttribute("data-headerbg", name);
  };
  const chnageSidebarColor = (name: any) => {    
    dispatch({sidebarColor: name});
    body?.setAttribute("data-sidebarbg", name);
  };
  const changeSideBarPostion = (name: any) => {    
    dispatch({sidebarposition: name});
    body?.setAttribute("data-sidebar-position", name.value);
  };
  const changeDirectionLayout = (name: any) => {    
    dispatch({direction: name});
    body?.setAttribute("direction", name.value);
    const html = document.querySelector("html");
    html?.setAttribute("dir", name.value);
    if (html) html.className = name.value;
  };
  const changeSideBarLayout = (name: any) => {
    if (name.value === "horizontal") {
      if (sideBarStyle.value === "overlay") {        
        dispatch({sidebarLayout: name});
        body?.setAttribute("data-layout", name.value);        
        dispatch({sideBarStyle : {value:'full', label:'Full'}});
        body?.setAttribute("data-sidebar-style", "full");
      } else {        
        dispatch({sidebarLayout: name});
        body?.setAttribute("data-layout", name.value);
      }
    } else {      
      dispatch({sidebarLayout: name});
      body?.setAttribute("data-layout", name.value);
    }

  };
  const changeSideBarStyle = (name: any) => {
    if (sidebarLayout.value === "horizontal") {
      if (name.value === "overlay") {
        alert("Sorry! Overlay is not possible in Horizontal layout.");
      } else {        
        dispatch({sideBarStyle: name});        
        dispatch({iconHover: name.value === "icon-hover" ? "_i-hover" : ""});
        body?.setAttribute("data-sidebar-style", name.value);
      }
    } else {      
      dispatch({sideBarStyle: name});      
      dispatch({iconHover: name.value === "icon-hover" ? "_i-hover" : ""});
      body?.setAttribute("data-sidebar-style", name.value);
    }
  };

  const changeHeaderPostion = (name: any) => {    
    dispatch({headerposition: name});
    body?.setAttribute("data-header-position", name.value);
  };

  const openMenuToggle = () => {    
    sideBarStyle.value === "overly"  
      ? dispatch({menuToggle : true})
      : dispatch({menuToggle: false})
  };

  const changeBackground = (name: any) => {
    // body?.setAttribute("data-theme-version", name.value);
    // dispatch({background: name});
    if (typeof document !== 'undefined') {
      const body = document.body;
      body?.setAttribute('data-theme-version', name.value);
      dispatch({ background: name });
    }
  };

  const changeContainerPosition = (name: any) => {
    dispatch({containerPositionSize: name});
    body?.setAttribute("data-container", name.value);
    name.value === "boxed" &&
      changeSideBarStyle({ value: "overlay", label: "Overlay" });
  };
  
 

useEffect(() => {
	  const body = document.querySelector("body");
    body?.setAttribute("data-typography", "poppins");
    body?.setAttribute("data-theme-version", "light");
    body?.setAttribute("data-layout", "vertical");
    body?.setAttribute("data-primary", "color_1");
    body?.setAttribute("data-nav-headerbg", "color_4");
    body?.setAttribute("data-headerbg", "color_4");
    body?.setAttribute("data-sidebar-style", "overlay");
    body?.setAttribute("data-sidebarbg", "color_1");
	  body?.setAttribute("data-secondary", "color_1");
    body?.setAttribute("data-sidebar-position", "fixed");
    body?.setAttribute("data-header-position", "fixed");
    body?.setAttribute("data-container", "wide");
    body?.setAttribute("direction", "ltr");
		const resizeWindow = () => {			
      dispatch({windowWidth : window.innerWidth});
      dispatch({windowHeight : window.innerHeight});
			if(window.innerWidth >= 768 && window.innerWidth < 1024)
			{
        body?.setAttribute("data-sidebar-style", "mini")
      }
			else if(window.innerWidth <= 768){
        body?.setAttribute("data-sidebar-style", "overlay") 
        body?.setAttribute("data-layout", "vertical")
      } 
      else{
        body?.setAttribute("data-sidebar-style", "full");
      }

		};
    resizeWindow();
    window.addEventListener("resize", resizeWindow);
    return () => window.removeEventListener("resize", resizeWindow);
}, []);

  return (
    <ThemeContext.Provider
      value={{
        // body,
        sideBarOption,
        layoutOption,
        backgroundOption,
        sidebarposition,
        headerPositions,
        containerPosition,
        directionPosition,
        fontFamily,
	    	primaryColor,
        secondaryColor,
        navigationHader,
		    windowWidth,
		    windowHeight,
        changePrimaryColor,
        changeSecondaryColor,
        changeNavigationHader,
        changeSideBarStyle,
        sideBarStyle,
        changeSideBarPostion,
        sidebarpositions,
        changeHeaderPostion,
        headerposition,
        changeSideBarLayout,
        sidebarLayout,
        changeDirectionLayout,
        changeContainerPosition,
        direction,
        colors,
        haderColor,
        chnageHaderColor,
        chnageSidebarColor,
        sidebarColor,
        iconHover,
        menuToggle,
        openMenuToggle,
        changeBackground,
        background,        
        containerPositionSize,    
        
	}}
    >
      {props.children}
    </ThemeContext.Provider>
  );
};

export default ThemeContextProvider;