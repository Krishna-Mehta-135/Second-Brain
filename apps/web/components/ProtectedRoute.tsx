"use client";

import {useRouter} from "next/navigation";
import {ReactNode, useEffect, useState} from "react";

interface Props {
    children: ReactNode;
}

export const ProtectedRoute = ({children}: Props) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.replace("/");
        } else {
            setIsAuthenticated(true);
        }
    }, [router]);

    // If not authenticated (or checking), don't render children
    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
};
