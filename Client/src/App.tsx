import {BrowserRouter, Route, Routes} from "react-router-dom";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Signin from "./pages/Signin";
import {useEffect} from "react";
import {initTheme} from "./utils/theme";
import "./App.css";

function App() {
    useEffect(() => {
        initTheme();
    }, []);
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/signup" element={<Signup />} />
                <Route path="/signin" element={<Signin />} />
                <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
