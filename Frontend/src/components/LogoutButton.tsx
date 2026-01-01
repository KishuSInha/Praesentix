import React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
    className?: string;
    variant?: "default" | "minimal";
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ className = "", variant = "default" }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("currentUser");
        navigate("/");
    };

    if (variant === "minimal") {
        return (
            <button
                onClick={handleLogout}
                className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 ${className}`}
                aria-label="Logout"
            >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
            </button>
        );
    }

    return (
        <button
            onClick={handleLogout}
            className={`flex items-center gap-2 px-4 py-2 border border-black/10 hover:border-black dark:border-white/10 dark:hover:border-white rounded-full transition-all text-[10px] font-bold uppercase tracking-widest ${className}`}
        >
            <LogOut className="w-3 h-3" />
            Logout
        </button>
    );
};

export default LogoutButton;
