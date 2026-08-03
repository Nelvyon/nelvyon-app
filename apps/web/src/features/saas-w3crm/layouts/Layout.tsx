"use client"
// import { ThemeContext } from "@/features/saas-w3crm/context/ThemeContext";
import { useEffect, useState } from "react";
import Nav  from "@/features/saas-w3crm/layouts/nav";
import Footer from "@/features/saas-w3crm/layouts/Footer";
import { usePathname } from "next/navigation";

const Layout = ({ children }: { children: React.ReactNode }) => {
    // const { menuToggle } = useContext(ThemeContext);
    const [minHeight, setMinHeight] = useState(0);
    useEffect(() => {    
        setMinHeight(window.screen.height - 45);
    }, []);
    const layoutdata = ["/page-error-400", "/page-error-403", 
        "/page-error-404", "/page-error-500", "/page-error-503", "/login",
        "/page-register", "/page-lock-screen"
    ];
    const cuurentpath = usePathname() ?? "";      
    return (
        <>
            {!layoutdata.includes(cuurentpath) ?
            <div id="main-wrapper"  
                // className={`show ${ menuToggle ? "menu-toggle" : ""}`}
                className={`show`}
            >
                <Nav />
                <div className="content-body" style={{ minHeight: minHeight }}>                    
                    <main>{children}</main>
                </div>
                <Footer />
            </div>
            :
                <main>{children}</main>
            }
        </>
    );
};
export default Layout;