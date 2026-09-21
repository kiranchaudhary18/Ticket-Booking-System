"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { 
  ScanLine, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Ticket,
  Calendar,
  Clock,
  MapPin,
  QrCode,
  Camera,
  X,
  CreditCard
} from "lucide-react";
import type { Html5Qrcode } from "html5-qrcode";

import { organizerBookingService } from "@/services/organizer-booking.service";
import { OrganizerTicketDetails } from "@/types/organizer-booking";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type TicketStatus = "VALID" | "CHECKED_IN" | "WRONG_DATE" | "CANCELLED" | "PAYMENT_PENDING" | "INVALID" | "UNAUTHORIZED" | "ALREADY_CHECKED_IN" | null;

export default function CheckInPage() {
  const [qrToken, setQrToken] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  
  const [ticketDetails, setTicketDetails] = useState<OrganizerTicketDetails | null>(null);
  const [status, setStatus] = useState<TicketStatus>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Cleanup scanner on unmount
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    try {
      setIsScanning(true);
      const { Html5Qrcode } = await import("html5-qrcode");
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // On success
          setQrToken(decodedText);
          html5QrCode.stop().then(() => {
            setIsScanning(false);
            // Automatically verify
            handleVerifyWithToken(decodedText);
          });
        },
        (errorMessage) => {
          // parse errors ignore
        }
      );
    } catch (err) {
      console.error("Error starting scanner", err);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  const handleVerifyWithToken = async (token: string) => {
    if (!token.trim()) return;

    try {
      setIsVerifying(true);
      setTicketDetails(null);
      setStatus(null);
      setMessage(null);

      const response = await organizerBookingService.verifyTicket(token.trim());
      
      setStatus(response.status);
      if (response.ticket) {
        setTicketDetails(response.ticket);
      }
      
      if (response.detail) {
        setMessage(response.detail);
      }
    } catch (error: unknown) {
      console.error("Verification error:", error);
      const err = error as { response?: { data?: { detail?: string, status?: TicketStatus, ticket?: OrganizerTicketDetails } } };
      
      if (err.response?.data?.status) {
        setStatus(err.response.data.status);
        if (err.response.data.ticket) setTicketDetails(err.response.data.ticket);
        setMessage(err.response.data.detail || "Ticket verification failed.");
      } else {
        setStatus("INVALID");
        setMessage(err.response?.data?.detail || "Invalid QR token or ticket not found.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleVerifyWithToken(qrToken);
  };

  const handleCheckIn = async () => {
    if (!qrToken.trim() || !ticketDetails) return;

    try {
      setIsCheckingIn(true);
      const response = await organizerBookingService.checkInTicket(qrToken.trim());
      
      setStatus("CHECKED_IN");
      if (response.ticket) {
        setTicketDetails(response.ticket);
      }
      setMessage(response.detail || "Ticket successfully checked in!");
    } catch (error: unknown) {
      console.error("Check-in error:", error);
      const err = error as { response?: { data?: { detail?: string, status?: TicketStatus } } };
      
      setStatus(err.response?.data?.status || "INVALID");
      setMessage(err.response?.data?.detail || "Failed to check in ticket.");
    } finally {
      setIsCheckingIn(false);
      setQrToken(""); 
    }
  };

  const renderStateBanner = () => {
    if (status === "VALID") {
      return (
        <CardHeader className="border-b bg-green-50 dark:bg-green-900/10 border-green-200">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            Ticket Valid
          </CardTitle>
          <CardDescription className="text-green-700">This ticket is ready for check-in.</CardDescription>
        </CardHeader>
      );
    }
    
    if (status === "CHECKED_IN") {
      return (
        <CardHeader className="border-b bg-blue-50 dark:bg-blue-900/10 border-blue-200">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            CHECKED IN
          </CardTitle>
          <CardDescription className="text-blue-700">Ticket checked in successfully.</CardDescription>
        </CardHeader>
      );
    }

    if (status === "WRONG_DATE") {
      return (
        <CardHeader className="border-b bg-amber-50 dark:bg-amber-900/10 border-amber-200">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Check-In Unavailable
          </CardTitle>
          <CardDescription className="text-amber-700">{message}</CardDescription>
        </CardHeader>
      );
    }

    if (status === "ALREADY_CHECKED_IN") {
      return (
        <CardHeader className="border-b bg-amber-50 dark:bg-amber-900/10 border-amber-200">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Already Checked In
          </CardTitle>
          <CardDescription className="text-amber-700">{message}</CardDescription>
        </CardHeader>
      );
    }

    if (status === "CANCELLED") {
      return (
        <CardHeader className="border-b bg-red-50 dark:bg-red-900/10 border-red-200">
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            Cancelled
          </CardTitle>
          <CardDescription className="text-red-700">{message}</CardDescription>
        </CardHeader>
      );
    }

    if (status === "PAYMENT_PENDING") {
      return (
        <CardHeader className="border-b bg-red-50 dark:bg-red-900/10 border-red-200">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
            Payment Pending
          </CardTitle>
          <CardDescription className="text-red-700">{message}</CardDescription>
        </CardHeader>
      );
    }

    return null; // For INVALID or UNAUTHORIZED, handled in error block
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ticket Check-In</h1>
        <p className="text-muted-foreground mt-2">Verify and check-in attendee tickets.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="md:col-span-1 border-primary/20 shadow-md">
          <CardHeader className="bg-primary/5 border-b">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 mb-1">
                  <ScanLine className="h-5 w-5 text-primary" />
                  Scan Ticket
                </CardTitle>
                <CardDescription>Enter or scan the ticket QR token</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="default" 
                onClick={isScanning ? stopScanner : startScanner}
                className={`w-full sm:w-auto ${isScanning ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20" : ""}`}
              >
                {isScanning ? (
                  <><X className="h-4 w-4 mr-2" /> Stop Camera</>
                ) : (
                  <><Camera className="h-4 w-4 mr-2" /> Use Camera Scanner</>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className={`overflow-hidden transition-all duration-300 ${isScanning ? 'h-64 mb-6' : 'h-0 mb-0'}`}>
              <div id="reader" className="w-full h-full bg-black rounded-lg overflow-hidden"></div>
            </div>

            <form onSubmit={handleVerifyForm} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="qr-input" className="text-sm font-medium">QR Token</label>
                <div className="relative">
                  <QrCode className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="qr-input"
                    type="text"
                    placeholder="e.g. 123e4567-e89b-12d3..."
                    className="pl-10 font-mono"
                    value={qrToken}
                    onChange={(e) => setQrToken(e.target.value)}
                    disabled={isScanning}
                    autoFocus
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!qrToken.trim() || isVerifying || isCheckingIn || isScanning}
              >
                {isVerifying ? "Verifying..." : "Verify Ticket"}
              </Button>
            </form>
            
            {!isScanning && (
              <div className="mt-8 pt-6 border-t flex flex-col items-center justify-center text-center text-muted-foreground">
                <QrCode className="h-16 w-16 opacity-20 mb-4" />
                <p className="text-sm">
                  Focus the input field and use a physical barcode scanner to rapidly scan tickets, or use the camera button above.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-1 space-y-6">
          {(status === "INVALID" || status === "UNAUTHORIZED") && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <XCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Invalid Ticket</h3>
                <p className="text-red-600 dark:text-red-300">{message}</p>
                <Button 
                  onClick={() => {
                    setQrToken("");
                    setStatus(null);
                    setTicketDetails(null);
                  }} 
                  variant="outline" 
                  className="mt-6 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {ticketDetails && status !== "INVALID" && status !== "UNAUTHORIZED" && (
            <Card className="shadow-md overflow-hidden">
              {renderStateBanner()}
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Ticket Number</p>
                    <p className="font-mono font-medium">{ticketDetails.ticket_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Booking Ref</p>
                    <p className="font-mono text-sm">{ticketDetails.booking_reference}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-lg mb-2">{ticketDetails.event.title}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-2" />
                        {ticketDetails.show.date}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        {ticketDetails.show.start_time}
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {ticketDetails.venue.name}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Seats</p>
                  <div className="flex flex-wrap gap-2">
                    {ticketDetails.seats.map((seat, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1 text-sm font-medium">
                        Row {seat.row} - {seat.seat_number}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-6 pb-6 flex flex-col items-stretch space-y-4">
                {status === "VALID" && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    size="lg"
                    onClick={handleCheckIn}
                    disabled={isCheckingIn}
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    {isCheckingIn ? "Checking In..." : "Check In Now"}
                  </Button>
                )}

                {status === "CHECKED_IN" && (
                  <>
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-600 text-white opacity-80 cursor-not-allowed" 
                      size="lg"
                      disabled
                    >
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      ✓ Checked In
                    </Button>
                    {ticketDetails.used_at && (
                      <div className="text-center w-full">
                        <p className="text-sm font-medium text-muted-foreground">
                          Checked In At: {format(new Date(ticketDetails.used_at), "dd MMM yyyy, hh:mm a")}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {(status === "WRONG_DATE" || status === "ALREADY_CHECKED_IN" || status === "CANCELLED" || status === "PAYMENT_PENDING") && (
                  <Button 
                    onClick={() => {
                      setQrToken("");
                      setStatus(null);
                      setTicketDetails(null);
                    }} 
                    variant="outline" 
                    className="w-full"
                  >
                    Verify Another Ticket
                  </Button>
                )}
                
                {status === "CHECKED_IN" && (
                  <Button 
                    onClick={() => {
                      setQrToken("");
                      setStatus(null);
                      setTicketDetails(null);
                    }} 
                    variant="ghost" 
                    className="w-full"
                  >
                    Scan Next Ticket
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}

          {!ticketDetails && status === null && (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl opacity-50 min-h-[300px]">
              <Ticket className="h-16 w-16 mb-4" />
              <h3 className="text-lg font-medium">Ready to Scan</h3>
              <p className="text-sm mt-2 max-w-xs">
                Verified ticket details will appear here once scanned.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
