import { Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "../features/auth/components/ProtectedRoute";
import LoginPage from "../features/auth/pages/LoginPage";
import ItemsPage from "../features/dashboard/pages/ItemsPage";
import StatusPage from "../features/dashboard/pages/StatusPage";

function App() {

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/status" replace />} />
          <Route path="status" element={<StatusPage />} />
          <Route path="items" element={<ItemsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/status" replace />} />
      </Routes>
    </>
  );
}

export default App;
