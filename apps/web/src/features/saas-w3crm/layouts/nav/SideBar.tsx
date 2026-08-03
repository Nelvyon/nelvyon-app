/// Menu
import React, { useContext, useEffect, useReducer, useState } from "react";
import Collapse from 'react-bootstrap/Collapse';

/// Link
import Link from "next/link";

import {MenuList, type W3crmMenuItem} from './Menu';
import {useScrollPosition} from "@n8tb1t/use-scroll-position";
import { ThemeContext } from "@/features/saas-w3crm/context/ThemeContext";

const reducer = (previousState: any, updatedState: any) => ({
  ...previousState,
  ...updatedState,
});

const initialState = {
  active : "",
  activeSubmenu : "",
}

/** `menuList` permite inyectar la navegacion de NELVYON sin tocar el marcado. */
const SideBar = ({ menuList = MenuList }: { menuList?: W3crmMenuItem[] }) => {
	const {
		iconHover,
		sidebarposition,
		headerposition,
		sidebarLayout,
	} = useContext(ThemeContext);

  const [state, setState] = useReducer(reducer, initialState);	
	useEffect(() => {
			
	}, []);
 //For scroll
 	const [hideOnScroll, setHideOnScroll] = useState(true)
	useScrollPosition(
		({ prevPos, currPos }) => {
		  const isShow = currPos.y > prevPos.y
		  if (isShow !== hideOnScroll) setHideOnScroll(isShow)
		},
		[hideOnScroll]
	)

 
  const handleMenuActive = (status: string) => {	
    setState({active : status});		
		if(state.active === status){			
      setState({active : ""});
    }   
	}
	const handleSubmenuActive = (status: string) => {		
    setState({activeSubmenu : status})
		if(state.activeSubmenu === status){
      setState({activeSubmenu : ""})
			
		}
    
	}
	// Menu dropdown list End

  /// Path
  // La plantilla comparaba solo el ULTIMO segmento porque sus rutas son de un
  // nivel (`/dashboard`). Las de NELVYON son completas (`/saas/dashboard`), asi
  // que se usa el pathname entero y su deteccion de activo vuelve a funcionar:
  // el grupo que contiene la ruta actual se abre solo, como en la demo original.
  const path = typeof window !== "undefined" ? window.location.pathname : "";
 	
  useEffect(() => {
    menuList.forEach((data) => {
      data.content?.forEach((item) => {        
        if(path === item.to){         
          setState({active : data.title})          
        }
        item.content?.forEach(ele => {
          if(path === ele.to){
            setState({activeSubmenu : item.title, active : data.title})
          }
        })
      })
  })
  },[path, menuList]);

  return (
    <div
      className={`deznav  border-right ${iconHover} ${
        sidebarposition.value === "fixed" &&
        sidebarLayout.value === "horizontal" &&
        headerposition.value === "static"
          ? Number(hideOnScroll) > 120
            ? "fixed"
            : ""
          : ""
      }`} data-testid="saas-sidebar"      
    >
        <div className="deznav-scroll">         
          <ul className="metismenu" id="menu">              
              {menuList.map((data, index)=>{
                const menuClass = data.classsChange;
                  if(menuClass === "menu-title"){
                    return(
                      <li className={menuClass}  key={index} >{data.title}</li>
                    )
                  }else{
                    return(				
                      <li className={` ${ state.active === data.title ? 'mm-active' : ''}`}
                        key={index} 
                      >                        
                        {data.content && data.content.length > 0 ?
                            <>
                              <Link href={"#"} scroll={false}
                                className="has-arrow"
                                onClick={() => {handleMenuActive(data.title)}}
                                >		
                                  <div className="menu-icon">
                                    {data.iconStyle}
                                  </div>
                                  {" "}<span className="nav-text">{data.title}
                                  {
                                    data.update && data.update.length > 0 ?
                                      <span className="badge badge-xs badge-danger ms-2">{data.update}</span>
                                    :
                                    ''
                                  } 
                                </span>
                              </Link>
                              <Collapse in={state.active === data.title ? true :false}>
                                  <ul className={`${menuClass === "mm-collapse" ? "mm-show" : ""}`}>
                                    {data.content && data.content.map((data,index) => {									
                                      return(	
                                          <li key={index}
                                            className={`${ state.activeSubmenu === data.title ? "mm-active" : ""}`}                                    
                                          >
                                            {data.content && data.content.length > 0 ?
                                                <>
                                                  <Link href={"#"} scroll={false} className={data.hasMenu ? 'has-arrow' : ''}
                                                    onClick={() => { handleSubmenuActive(data.title)}}
                                                  >
                                                    {data.title}
                                                  </Link>
                                                  <Collapse in={state.activeSubmenu === data.title ? true :false}>
                                                      <ul className={`${menuClass === "mm-collapse" ? "mm-show" : ""}`}>
                                                        {data.content && data.content.map((data,ind) => {
                                                          return(	                                                           
                                                            <li key={ind}>
                                                                <Link className={`${path === data.to ? "mm-active" : ""}`} href={data.to ?? "#"}>{data.title}</Link>
                                                            </li>                                                            
                                                          )
                                                        })}
                                                      </ul>
                                                  </Collapse>
                                                </>
                                              :
                                              <Link href={data.to ?? "#"} className={`${data.to === path ? 'mm-active' : ''}`}>
                                                {data.title}
                                              </Link>
                                            }                                            
                                        </li>                                        
                                      )
                                    })}
                                  </ul>
                                </Collapse>
                            </>
                        :
                          <Link href={data.to ?? "#"}>
                              <div className="menu-icon">
                                {data.iconStyle}
                              </div>
                              {" "}<span className="nav-text">{data.title}</span>
                              {
                                  data.update && data.update.length > 0 ?
                                    <span className="badge badge-xs badge-danger ms-2">{data.update}</span>
                                  :
                                  ''
                                } 
                          </Link>
                        }
                       
                      </li>	
                    )
                }
              })}          
          </ul>
          <div className="help-desk">
            <Link href="#" scroll={false} className="btn btn-primary">Help Desk</Link>
          </div>
        </div>
    </div>
  );
};

export default SideBar;
