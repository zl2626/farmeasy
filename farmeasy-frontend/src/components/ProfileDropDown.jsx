import { useAuth } from "../context/AuthContext";
// import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ProfileDropDown() {
    const {user,logout } = useAuth();
    const navigate = useNavigate();

    const handlelogout = () => {
        logout();
        navigate("/");
    };

    return (
        <div style={profiledropdown}>
            <div style={profileheader}>
                <div style={profileAvatarlg}>
                    {user.name.charAt(0).toUpperCase()}
                </div>

                <div>
                    <p style={profileName}>{user.name}</p>
                    <p className={profileEmail}>{user.email}</p>
                </div>
            </div>
            <button style={LogoutBtn} onClick={handlelogout}>Logout</button>
        </div>
    )
}

const profiledropdown = {
    position:"absolute",
    top:"55px",
    right:0,
    width:"260px",
    background:"#fff",
    borderRadius:"12px",
    boxShadow:"0 10px 30px rgba(0,0,0,0,0.12)",
    padding:"16px",
    fontFamily:"inherit",
    zIndex:"100",

}


const profileheader = {
display:"flex",
gap:"12px",
alignItems:"center",

}

const profileAvatarlg= {
  width:"50px",
  height:"50px",
  borderRadius:"50%",
  background:"#2575fc",
  color:"white",
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  fontSize:"20px",

}


const profileName = {
    fontWeight:"600",
    margin:"0",
}

const profileEmail = {
    fontSize:"13px",
    color:"#666",
}

const LogoutBtn={
    marginTop:"14px",
    width:"100%",
    padding:"10px",
    border:"none",
    background:"#f44336",
    color:"white",
    borderRadius:"8px",
    cursor:"pointer",
}

