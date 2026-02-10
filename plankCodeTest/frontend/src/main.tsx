import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Dashboard from "./App.tsx";
//import React from "react";
import { ChakraProvider } from "@chakra-ui/react";

createRoot(document.getElementById("root")!).render(
  <ChakraProvider>
    <StrictMode>
      <Dashboard />
    </StrictMode>
  </ChakraProvider>,
);
