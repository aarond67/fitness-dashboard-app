"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/meal-plan", label: "Meal Plan" },
  { href: "/workout-plan", label: "Workout Plan" },
  { href: "/weekly-calendar", label: "Weekly Calendar" }
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      {links.map((link) => (
        <Link
          key={link.href}
          className={`nav-link ${pathname === link.href ? "active" : ""}`}
          href={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
