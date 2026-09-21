import os

content = """\"use client\";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Ticket as TicketIcon, 
  AlertCircle,
  Download,
  Loader2
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import { ticketService } from "@/services/ticket.service";
import { TicketDetail } from "@/types/ticket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/common/PageSkeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticketId) return;
    
    const fetchTicketDetail = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await ticketService.getTicketDetails(ticketId);
        setTicket(data);
      } catch (err: unknown) {
        console.error("Failed to fetch ticket details", err);
        const axiosErr = err as { response?: { status?: number }, message?: string };
        if (axiosErr.response?.status === 404) {
          setError("Ticket not found. It may not exist or you don't have permission to view it.");
        } else if (axiosErr.response?.status === 403) {
          setError("You do not have permission to view this ticket.");
        } else {
          setError(axiosErr?.message || "An error occurred while loading the ticket.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTicketDetail();
  }, [ticketId]);

  const handleDownload = async () => {
    if (!printRef.current || !ticket) return;
    try {
      setIsDownloading(true);
      
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });
      
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Ticket_${ticket.ticket_number}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success" className="text-sm px-3 py-1 uppercase tracking-wider">Active</Badge>;
      case "USED":
        return <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-300 text-sm px-3 py-1 uppercase tracking-wider">Used</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive" className="text-sm px-3 py-1 uppercase tracking-wider">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-sm px-3 py-1 uppercase tracking-wider">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
        <ErrorState 
          title="Access Denied or Not Found"
          message={error || "Ticket not found"}
          actionLabel="Back to My Tickets"
          onAction={() => router.push("/customer/tickets")}
        />
      </div>
    );
  }

  const qrData = ticket.qr_token || ticket.qr_code_image;

  return (
    <>
      <div className="min-h-screen bg-[#FAF8F5] pb-24 pt-8">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <button
            onClick={() => router.push("/customer/bookings")}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#0A1526] transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Bookings
          </button>

          <div className="relative bg-white rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row overflow-hidden">
            
            {/* Main Ticket Content */}
            <div className="flex-1 p-8 md:p-12 flex flex-col space-y-8 relative">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-2">Event Ticket</p>
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#0A1526] leading-tight">
                    {ticket.event.title}
                  </h1>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(ticket.status)}
                </div>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-8 mt-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
                    <Calendar className="h-6 w-6 text-[#3B41C5]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">
                      Show Date
                    </p>
                    <p className="font-semibold text-[15px] text-[#0A1526]">
                      {format(new Date(ticket.show.date), "EEEE, MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
                    <Clock className="h-6 w-6 text-[#3B41C5]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">
                      Show Time
                    </p>
                    <p className="font-semibold text-[15px] text-[#0A1526]">
                      {ticket.show.start_time.substring(0, 5)}
                    </p>
                  </div>
                </div>

                <div className="sm:col-span-2 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
                    <MapPin className="h-6 w-6 text-[#3B41C5]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">
                      Location / Venue
                    </p>
                    <p className="font-semibold text-[15px] text-[#0A1526]">
                      {ticket.venue.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Seats Info */}
              <div className="pt-6 border-t border-slate-100">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-3">
                  Selected Seats
                </p>
                {ticket.seats && ticket.seats.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {ticket.seats.map((seat, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-2"
                      >
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Row {seat.row}</span>
                        <span className="font-bold text-[15px] text-[#0A1526]">
                          {seat.seat_number}
                        </span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[15px] font-medium text-slate-500">General Admission - No specific seats assigned</p>
                )}
              </div>

              {/* Payment Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 pt-6 border-t border-slate-100">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">Booking Ref</p>
                  <p className="font-mono text-[13px] font-semibold text-[#0A1526]">{ticket.booking_reference}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">Total Amount</p>
                  <p className="font-semibold text-[15px] text-[#3B41C5]">₹{ticket.total_amount}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-1">Issued At</p>
                  <p className="text-[13px] font-medium text-slate-500">{format(new Date(ticket.issued_at), "MMM d, yyyy - h:mm a")}</p>
                </div>
              </div>
            </div>

            {/* Perforation Divider */}
            <div className="relative flex flex-col md:flex-row items-center justify-center">
              <div className="hidden md:block absolute top-[-20px] w-10 h-10 bg-[#FAF8F5] rounded-full z-10" />
              <div className="hidden md:block h-full border-l-2 border-dashed border-slate-200" />
              <div className="hidden md:block absolute bottom-[-20px] w-10 h-10 bg-[#FAF8F5] rounded-full z-10" />
              
              <div className="md:hidden absolute left-[-20px] w-10 h-10 bg-[#FAF8F5] rounded-full z-10" />
              <div className="md:hidden w-full border-t-2 border-dashed border-slate-200" />
              <div className="md:hidden absolute right-[-20px] w-10 h-10 bg-[#FAF8F5] rounded-full z-10" />
            </div>

            {/* Ticket Stub (QR Code & Actions) */}
            <div className="bg-slate-50/50 p-8 md:w-[320px] flex flex-col items-center justify-center text-center">
              
              <div className="w-full mb-8">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">E-Ticket Scan</h3>
                
                {ticket.status === "CANCELLED" ? (
                  <div className="w-full aspect-square bg-white rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-red-200 p-6 shadow-sm">
                    <AlertCircle className="h-12 w-12 text-red-500 mb-3 opacity-80" />
                    <p className="font-bold text-red-600 uppercase tracking-widest text-sm">Cancelled</p>
                  </div>
                ) : qrData ? (
                  <div className="relative w-full max-w-[220px] aspect-square mx-auto p-4 bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.06)] border border-slate-100 flex items-center justify-center">
                    <QRCodeSVG value={qrData} size={180} level="M" includeMargin={false} />
                  </div>
                ) : (
                  <div className="w-full max-w-[220px] aspect-square mx-auto bg-white rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-200">
                    <span className="text-slate-400 text-[13px] font-bold uppercase tracking-wider">QR Unavailable</span>
                  </div>
                )}
              </div>
              
              <div className="w-full bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-6">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Ticket Number</p>
                <p className="font-mono text-lg font-extrabold text-[#0A1526] tracking-wider">{ticket.ticket_number}</p>
              </div>

              {ticket.status === 'ACTIVE' && (
                <Button 
                  className="w-full h-12 rounded-xl font-bold bg-[#3B41C5] hover:bg-[#3B41C5]/90 text-white shadow-lg shadow-[#3B41C5]/20" 
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                  ) : (
                    <><Download className="mr-2 h-4 w-4" /> Save Ticket</>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hidden print template for PDF generation */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "800px" }}>
        <div ref={printRef} style={{ padding: "40px", backgroundColor: "#ffffff", fontFamily: "sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #f1f5f9", paddingBottom: "20px", marginBottom: "30px" }}>
            <div>
              <h2 style={{ margin: 0, color: "#3B41C5", fontSize: "24px", fontWeight: "900" }}>TicketMaster</h2>
              <p style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "14px" }}>Official E-Ticket</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: "20px", color: "#0f172a" }}>{ticket.ticket_number}</p>
              <p style={{ margin: "5px 0 0 0", color: "#10b981", fontWeight: "bold", fontSize: "14px" }}>{ticket.status}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "40px" }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ fontSize: "32px", margin: "0 0 20px 0", color: "#0f172a", lineHeight: 1.2 }}>{ticket.event.title}</h1>
              
              <div style={{ marginBottom: "20px" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Date & Time</p>
                <p style={{ margin: 0, fontSize: "16px", color: "#0f172a", fontWeight: 600 }}>
                  {format(new Date(ticket.show.date), "EEEE, MMMM d, yyyy")}
                  <br/>
                  {ticket.show.start_time.substring(0, 5)}
                </p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Venue</p>
                <p style={{ margin: 0, fontSize: "16px", color: "#0f172a", fontWeight: 600 }}>{ticket.venue.name}</p>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Seats ({ticket.seats?.length || 0})</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
                  {ticket.seats && ticket.seats.length > 0 ? ticket.seats.map((seat, idx) => (
                    <div key={idx} style={{ padding: "8px 12px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "14px", fontWeight: "bold" }}>
                      Row {seat.row} - {seat.seat_number}
                    </div>
                  )) : (
                    <p style={{ margin: 0 }}>General Admission</p>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: "40px", marginTop: "30px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
                <div>
                  <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Booking Ref</p>
                  <p style={{ margin: 0, fontSize: "14px", color: "#0f172a", fontWeight: 600 }}>{ticket.booking_reference}</p>
                </div>
                <div>
                  <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Total Amount</p>
                  <p style={{ margin: 0, fontSize: "14px", color: "#0f172a", fontWeight: 600 }}>₹{ticket.total_amount}</p>
                </div>
                <div>
                  <p style={{ margin: "0 0 5px 0", fontSize: "12px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>Issued At</p>
                  <p style={{ margin: 0, fontSize: "14px", color: "#0f172a", fontWeight: 600 }}>{format(new Date(ticket.issued_at), "MMM d, yyyy")}</p>
                </div>
              </div>
            </div>

            <div style={{ width: "220px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ padding: "15px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "16px", marginBottom: "15px" }}>
                {qrData ? (
                   <QRCodeSVG value={qrData} size={180} level="M" />
                ) : (
                  <div style={{ width: "180px", height: "180px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
                    No QR
                  </div>
                )}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: "bold" }}>SCAN AT ENTRY</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
"""

with open("src/app/customer/tickets/[id]/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
