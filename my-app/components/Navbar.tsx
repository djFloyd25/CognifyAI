import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import ModeToggle from "./ModeToggle";

const Navbar: React.FC = () => {
  return (
    <nav className="w-full bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
      {/* Logo / Centered */}
      <div className="flex-1 text-center text-2xl font-bold">CognifyAI</div>

      {/* Dropdown Menu */}
      <div className="flex-1 flex justify-end">
        <ModeToggle />
      </div>
    </nav>
  );
};

export default Navbar;
