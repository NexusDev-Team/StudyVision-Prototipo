import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { ContentStoreProvider } from "./context/ContentStoreContext.jsx";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ContentStoreProvider>
      <App />
    </ContentStoreProvider>
  </React.StrictMode>
);
