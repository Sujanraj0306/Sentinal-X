import React from "react";
import { Box,IconButton } from "@mui/material";

import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import Logo from "./Logo";

const Header = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      p: { xs: "6px 12px", md: "8px 20px" },
      borderBottom: "1px solid #3c4043",
      width: "100%",
      boxSizing: "border-box",
    }}
  >
    {/* Left Side */}
    <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 2, md: 4 } }}>
      <Logo />
    </Box>

    <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 2 } }}>
      <IconButton size="small" sx={{ color: "text.secondary" }}>
        <SettingsOutlinedIcon />
      </IconButton>
    </Box>
  </Box>
);

export default Header;
