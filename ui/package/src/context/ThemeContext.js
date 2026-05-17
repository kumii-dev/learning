import React, { createContext, useEffect, useState } from "react";

export const ThemeContext = createContext();

const ThemeContextProvider = (props) => {
  const body = document.querySelector("body");
	const [background, setBackground] = useState({ value: "light",	label: "Light",});
  const [sidebarLayout, setSidebarLayout] = useState({ value: "vertical", label: "Vertical",});
	const [sideBarStyle, setSideBarStyle] = useState({ value: "full", label: "Full",});
	const [sidebarposition, setSidebarposition] = useState({ value: "fixed",	label: "Fixed",});  
	
  const [sidebariconHover, setSidebariconHover] = useState(false);
	const [menuToggle, setMenuToggle] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);

  
  const changeSideBarPostion = (name) => {
    setSidebarposition(name);
    body.setAttribute("data-sidebar-position", name.value);
  };
  
 
  const ChangeIconSidebar = (value) => {
    if(sideBarStyle.value==="icon-hover"){
      if(value){
        setSidebariconHover(true);
      }else{
        setSidebariconHover(false);
      }
    }
  }


  const openMenuToggle = () => {
    sideBarStyle.value === "overly"
      ? setMenuToggle(true)
      : setMenuToggle(false);
  };

  const changeBackground = (name) => {
    body.setAttribute("data-theme-version", name.value);
    setBackground(name);
  };
  useEffect(() => {
	const body = document.querySelector("body");      
		let resizeWindow = () => {      
			setWindowWidth(window.innerWidth);
			setWindowHeight(window.innerHeight);
			window.innerWidth >= 768 && window.innerWidth < 1024
			? body.setAttribute("data-sidebar-style", "mini")      
			: window.innerWidth <= 768
			? body.setAttribute("data-sidebar-style", "overlay")
			: body.setAttribute("data-sidebar-style", "full");
		};
    resizeWindow();
    window.addEventListener("resize", resizeWindow);
    return () => window.removeEventListener("resize", resizeWindow);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        body,
        sidebarposition,		   
	  	  windowWidth,
  		  windowHeight,        
        sideBarStyle,
        changeSideBarPostion,
        sidebarLayout,        
        ChangeIconSidebar,
        sidebariconHover,
        menuToggle,
        openMenuToggle,
        changeBackground,
        background,        
	}}
    >
      {props.children}
    </ThemeContext.Provider>
  );
};

export default ThemeContextProvider;