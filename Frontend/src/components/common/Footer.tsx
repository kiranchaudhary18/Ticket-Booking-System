import Link from "next/link";
import { Ticket } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-white mt-auto">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4 mb-12">
          <div className="flex flex-col items-center md:items-start">
            <Link href="/" className="flex items-center space-x-2 mb-3">
              <div className="bg-primary text-primary-foreground p-1 rounded-md">
                <Ticket className="h-4 w-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">TicketMaster</span>
            </Link>
            <p className="text-base text-muted-foreground text-center md:text-left max-w-sm">
              Discover and book the most exclusive events, concerts, and shows with seamless ease.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 text-sm font-medium text-muted-foreground">
            <Link href="/events" className="hover:text-primary transition-colors">Explore Events</Link>
            <Link href="/categories" className="hover:text-primary transition-colors">Categories</Link>
            <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} TicketMaster Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Powered by Stripe & Next.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
