/// Menu
import React, { useContext, useEffect, useMemo, useReducer, useState } from "react";
import Collapse from 'react-bootstrap/Collapse';

/// Link
import Link from "next/link";
import { usePathname } from "next/navigation";

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
/**
 * Clave estable para el menu. La plantilla usaba el indice del array, lo que
 * con una lista dinamica (se reconstruye al llegar los permisos y cambia de
 * longitud) hacia que React reconciliara mal y dejara enlaces duplicados de
 * forma transitoria. Se usa el destino, que es unico, y el titulo como
 * respaldo para las cabeceras de grupo, que no tienen `to`.
 */
function claveMenu(item: W3crmMenuItem, index: number): string {
  return item.to ?? item.title ?? `item-${index}`;
}

const SideBar = ({ menuList = MenuList }: { menuList?: W3crmMenuItem[] }) => {
	const {
		iconHover,
		sidebarposition,
		headerposition,
		sidebarLayout,
	} = useContext(ThemeContext);

  const [state, setState] = useReducer(reducer, initialState);
  /** Tras la primera interaccion manda el estado, no la ruta. */
  const [tocadoPorUsuario, setTocadoPorUsuario] = useState(false);

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
    setTocadoPorUsuario(true);
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
  //
  // ADAPTACION FORZADA (incompatibilidad demostrada con SSR de Next 15):
  // la plantilla es una SPA sin servidor y leia `window.location.pathname`
  // durante el render. Bajo SSR eso vale "" en el servidor, asi que el HTML
  // salia con todos los grupos cerrados (`class="collapse"`, sin `show`). En
  // hidratacion de PRODUCCION React no rediffea los atributos: da por bueno el
  // marcado del servidor. El valor correcto del cliente nunca llegaba al DOM y
  // el submenu quedaba oculto de forma permanente, con el enlace del modulo
  // presente pero invisible. Solo se "arreglaba" si algo provocaba un segundo
  // render (por ejemplo permisos que tardaban), de ahi que pareciera aleatorio.
  //
  // `usePathname()` devuelve el mismo valor en servidor y cliente, asi que el
  // servidor ya emite el grupo abierto y no hay discrepancia. Resultado visual
  // identico al de la plantilla: mismo marcado, mismas clases, misma animacion.
  const path = usePathname() ?? "";
 	
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

  /**
   * Grupo que contiene la ruta actual, DERIVADO en el render.
   *
   * El efecto de arriba (el de la plantilla) abre el grupo despues del primer
   * pintado, asi que `<Collapse>` recibe `in` pasando de false a true y anima
   * midiendo `scrollHeight`. Cuando llegan los permisos, `menuList` cambia de
   * identidad y los hijos del `<ul>` se sustituyen a mitad de esa transicion:
   * la animacion termina con `height: 0` y el submenu queda atascado cerrado
   * aunque el grupo figure como `aria-expanded="true"`. De ahi que el sidebar
   * mostrase los grupos pero ningun enlace de modulo.
   *
   * Derivandolo aqui, `Collapse` monta ya abierto y no hay animacion que
   * pueda quedarse a medias. El efecto se conserva —sigue siendo el de la
   * plantilla y gobierna el submenu de segundo nivel—, y el estado manual
   * mantiene la prioridad en cuanto el usuario pulsa un grupo.
   */
  const grupoDeLaRuta = useMemo(() => {
    for (const data of menuList) {
      for (const item of data.content ?? []) {
        if (path === item.to) return data.title ?? "";
        for (const ele of item.content ?? []) {
          if (path === ele.to) return data.title ?? "";
        }
      }
    }
    return "";
  }, [menuList, path]);

  const grupoAbierto = tocadoPorUsuario ? state.active : (state.active || grupoDeLaRuta);

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
                      <li className={menuClass}  key={claveMenu(data, index)} >{data.title}</li>
                    )
                  }else{
                    return(				
                      <li className={` ${ grupoAbierto === data.title ? 'mm-active' : ''}`}
                        key={claveMenu(data, index)} 
                      >                        
                        {data.content && data.content.length > 0 ?
                            <>
                              <Link href={"#"} scroll={false}
                                className="has-arrow"
                                role="button"
                                aria-expanded={grupoAbierto === data.title}
                                onClick={(e) => {e.preventDefault(); handleMenuActive(data.title)}}
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
                              <Collapse in={grupoAbierto === data.title ? true :false}>
                                  <ul className={`${menuClass === "mm-collapse" ? "mm-show" : ""}`}>
                                    {data.content && data.content.map((data,index) => {									
                                      return(	
                                          <li key={claveMenu(data, index)}
                                            className={`${ state.activeSubmenu === data.title ? "mm-active" : ""}`}                                    
                                          >
                                            {data.content && data.content.length > 0 ?
                                                <>
                                                  <Link href={"#"} scroll={false} className={data.hasMenu ? 'has-arrow' : ''}
                                                    role="button"
                                                    aria-expanded={state.activeSubmenu === data.title}
                                                    onClick={(e) => { e.preventDefault(); handleSubmenuActive(data.title); }}
                                                  >
                                                    {data.title}
                                                  </Link>
                                                  <Collapse in={state.activeSubmenu === data.title ? true :false}>
                                                      <ul className={`${menuClass === "mm-collapse" ? "mm-show" : ""}`}>
                                                        {data.content && data.content.map((data,ind) => {
                                                          return(	                                                           
                                                            <li key={claveMenu(data, ind)}>
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
            <Link href="/saas/helpdesk" className="btn btn-primary">Help Desk</Link>
          </div>
        </div>
    </div>
  );
};

export default SideBar;
