import { createRoot } from "react-dom/client";
import App from "./components/app";

import { store } from "./store";
import { Provider } from "react-redux";
import { FocusManagerProvider } from "./contexts/focus";
import { StrictMode } from "react";
import { Toaster } from "./components/ui/toaster";

const root = createRoot(document.getElementById("root") as HTMLDivElement);
root.render(
  <Provider store={store}>
    <FocusManagerProvider>
      <StrictMode>
        <App />
        <Toaster />
      </StrictMode>
    </FocusManagerProvider>
  </Provider>
);
