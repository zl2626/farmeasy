import ElectricBorder from "./ElectricBorder.jsx";
import Login from "../pages/Login.jsx";

const LoginModal = ({ onRegisterClick, onForgotClick}) => {
    return (
        <div style={overlayStyle}>
          <ElectricBorder
          color = "#4ca750"
          speed={1}
          chaos={0.12}
          borderRadius={16}
          style={{ borderRadius: 16}}
          >
            <div style={cardStyle}>
                <Login
                OnRegisterClick={onRegisterClick}
                onForgotClick={onForgotClick}
                />
            </div>
          </ElectricBorder>
            </div>
    );
};

export default LoginModal;

const overlayStyle = {
    position:"fixed",
    inset:0,
    background:"rgba(0,0,0,0.6)",
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    zIndex:1000,
};

const cardStyle = {
    background:"#0f172a",
    padding:"2rem",
    width:"350px",
    borderRadius:"16px",
    color:"#fff",
};

