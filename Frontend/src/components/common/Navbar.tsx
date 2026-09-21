"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Ticket, Menu, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Desktop navigation link treatment: clean dark navy text. */
const NAV_LINK_CLASS =
  "relative text-sm font-medium text-slate-600 transition-colors duration-200 hover:text-slate-900 after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full";

/** Mobile navigation rows. */
const MOBILE_LINK_CLASS =
  "block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-100";

export function Navbar() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  /** Navbar search hands the term to the existing events catalogue filters. */
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    router.push(query ? `/events?search=${encodeURIComponent(query)}` : "/events");
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
    setSearchTerm("");
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  /** On small screens the inline field is hidden, so the icon reveals the mobile search. */
  const handleOpenSearch = () => {
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 768px)").matches) {
      setIsMobileMenuOpen(true);
      return;
    }
    setIsSearchOpen(true);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/95 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-6">
        {/* Left: Logo */}
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5">
            <Ticket className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight text-slate-900">TicketMaster</span>
        </Link>
        
        {/* Center: Navigation */}
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">
          <Link href="/events" className={NAV_LINK_CLASS}>
            Events
          </Link>
          <Link href="/categories" className={NAV_LINK_CLASS}>
            Categories
          </Link>
          <Link href="/#about" className={NAV_LINK_CLASS}>
            About
          </Link>
          <Link href="/#contact" className={NAV_LINK_CLASS}>
            Contact
          </Link>
        </nav>

        {/* Right: Search / Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Search: expands into an inline field, then hands off to /events */}
          {isSearchOpen ? (
            <form onSubmit={handleSearchSubmit} className="hidden md:block">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  autoFocus
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search events"
                  aria-label="Search events"
                  className="h-10 w-52 rounded-full bg-card pl-9 pr-9 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  aria-label="Close search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleOpenSearch}
              aria-label="Search events"
              className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
              suppressHydrationWarning
            >
              <Search className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </Button>
          )}

          <div className="hidden items-center gap-1.5 md:flex">
            <Button
              asChild
              variant="ghost"
              className="h-10 rounded-full px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              suppressHydrationWarning
            >
              <Link href="/login" suppressHydrationWarning>Log In</Link>
            </Button>
            <Button
              asChild
              className="h-10 rounded-full px-5 text-sm font-medium bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
              suppressHydrationWarning
            >
              <Link href="/register" suppressHydrationWarning>Sign Up</Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-foreground lg:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            suppressHydrationWarning
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Content */}
      {isMobileMenuOpen && (
        <div className="border-t border-border/80 bg-card lg:hidden">
          <div className="container mx-auto px-6 py-5">
            <form onSubmit={handleSearchSubmit} className="pb-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search events, artists or venues"
                  aria-label="Search events"
                  className="h-11 rounded-xl bg-background pl-9"
                />
              </div>
            </form>

            <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
              <Link href="/events" onClick={closeMobileMenu} className={MOBILE_LINK_CLASS}>
                Events
              </Link>
              <Link href="/categories" onClick={closeMobileMenu} className={MOBILE_LINK_CLASS}>
                Categories
              </Link>
              <Link href="/#about" onClick={closeMobileMenu} className={MOBILE_LINK_CLASS}>
                About
              </Link>
              <Link href="/#contact" onClick={closeMobileMenu} className={MOBILE_LINK_CLASS}>
                Contact
              </Link>
            </nav>

            <div className="mt-5 flex flex-col gap-2.5 border-t border-border pt-5">
              <Button asChild variant="outline" className="h-11 w-full justify-center rounded-xl">
                <Link href="/login" onClick={closeMobileMenu}>
                  Log In
                </Link>
              </Button>
              <Button asChild className="h-11 w-full justify-center rounded-xl">
                <Link href="/register" onClick={closeMobileMenu}>
                  Sign Up
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
