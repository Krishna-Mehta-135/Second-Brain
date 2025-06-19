import {Navigate} from "react-router-dom";
import {ReactNode} from "react";

interface Props {
    children: ReactNode;
}

export const ProtectedRoute = ({children}: Props) => {
    const token = localStorage.getItem("token");

    // If not authenticated, redirect to homepage
    if (!token) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
