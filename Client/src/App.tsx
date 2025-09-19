import {BrowserRouter, Route, Routes} from "react-router-dom";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Signin from "./pages/Signin";
import Homepage from "./pages/Homepage";
import SharedBrain from "./pages/SharedBrain";
import {useEffect} from "react";
import {initTheme} from "./utils/theme";
import { ProtectedRoute } from "./components/ProtectedRoute";
import "./App.css";

function App() {
    useEffect(() => {
        initTheme();
    }, []);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Homepage />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/signin" element={<Signin />} />
                <Route path="/shared/:shareLink" element={<SharedBrain />} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
