import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useVersionCheck } from "./hooks/useVersionCheck";
import LandingPage from "./pages/LandingPage";
import ControlPage from "./pages/ControlPage";
import ViewPage from "./pages/ViewPage";
import TeamPage from "./pages/TeamPage";
import CcmPage from "./pages/CcmPage";
import MessagePage from "./pages/MessagePage";

function AppRoutes() {
  useVersionCheck();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/evalbars" element={<ControlPage />} />
      <Route path="/ccm" element={<CcmPage />} />
      <Route path="/messagedisplay" element={<MessagePage />} />
      <Route path="/broadcast/:stateData" element={<ViewPage />} />
      <Route path="/olympiad/:section" element={<TeamPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
