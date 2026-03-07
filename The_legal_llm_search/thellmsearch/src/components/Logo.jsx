import React from "react";
import { Typography } from "@mui/material";

const Logo = () => (
  <Typography
    variant="h6"
    component="div"
    sx={{
      fontSize: {xs:"18px",md:"22px"},
      fontWeight: "bold",
      letterSpacing: "-0.5px",
      cursor: "pointer",
    }}
  >
    {/* <span style={{ color: "#4285F4" }}>A</span>
    <span style={{ color: "#EA4335" }}>I</span>
    <span style={{ color: "#e8eaed" }}> - </span>
    <span style={{ color: "#FBBC05" }}>M</span>
    <span style={{ color: "#4285F4" }}>O</span>
    <span style={{ color: "#34A853" }}>D</span>
    <span style={{ color: "#EA4335" }}>E</span> */}
    
    <span style={{ color: "text.secondary" }}>A</span>
    <span style={{ color: "text.secondary" }}>I</span>
    <span style={{ color: "text.secondary" }}> </span>
    <span style={{ color: "text.secondary" }}>M</span>
    <span style={{ color: "text.secondary" }}>O</span>
    <span style={{ color: "text.secondary" }}>D</span>
    <span style={{ color: "text.secondary" }}>E</span>
  </Typography>
);

export default Logo;
