import {useState,useRef } from "react";
import { useAuth } from "../context/AuthContext";
import ProfileDropdown from "./ProfileDropdown";

export default function ProfileAvatar() {
    const { user } = useAuth();
    const [open,setOpen] = useState(false);

    return (

        <div className="relative">
           <div
           style={profileAvatar}
           onClick={() => setOpen(!open)}>
           {user.name.charAt(0).toUpperCase()}

           </div>

           {open && <ProfileDropdown />}
        </div>
    )
}

const profileAvatar ={
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background:"linear-gradient(135deg, #4ca750, #22cc88)",
    color:"white",
    fontWeight:600,
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    cursor:"pointer",
    fontFamily: "inherit",
  }