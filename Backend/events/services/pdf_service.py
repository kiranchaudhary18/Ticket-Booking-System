import io
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader

def generate_ticket_pdf(ticket):
    """
    Generates a PDF e-ticket for the given Ticket object.
    Returns a BytesIO object containing the PDF data.
    """
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    
    booking = ticket.booking
    show = booking.show
    event = show.event
    venue = event.venue
    
    # 1. Branding Header
    p.setFont("Helvetica-Bold", 24)
    p.drawString(1 * inch, height - 1 * inch, "TicketMaster")
    
    p.setFont("Helvetica", 14)
    p.drawString(1 * inch, height - 1.3 * inch, "Official E-Ticket")
    
    p.line(1 * inch, height - 1.5 * inch, width - 1 * inch, height - 1.5 * inch)
    
    # 2. Event & Venue Details
    p.setFont("Helvetica-Bold", 16)
    p.drawString(1 * inch, height - 2 * inch, f"Event: {event.title}")
    
    p.setFont("Helvetica", 12)
    category_name = event.category.name if hasattr(event, 'category') and event.category else "N/A"
    p.drawString(1 * inch, height - 2.4 * inch, f"Category: {category_name}")
    p.drawString(1 * inch, height - 2.7 * inch, f"Date: {show.show_date}")
    p.drawString(1 * inch, height - 3.0 * inch, f"Time: {show.start_time}")
    p.drawString(1 * inch, height - 3.3 * inch, f"Venue: {venue.name}, {venue.city}")
    
    # 3. Booking Details
    p.setFont("Helvetica-Bold", 14)
    p.drawString(1 * inch, height - 3.8 * inch, "Booking Summary")
    
    p.setFont("Helvetica", 12)
    p.drawString(1 * inch, height - 4.2 * inch, f"Customer Name: {booking.customer.first_name} {booking.customer.last_name}".strip() or booking.customer.email)
    p.drawString(1 * inch, height - 4.5 * inch, f"Booking Reference: {booking.booking_reference}")
    p.drawString(1 * inch, height - 4.8 * inch, f"Ticket Number: {ticket.ticket_number}")
    p.drawString(1 * inch, height - 5.1 * inch, f"Status: {ticket.status}")
    p.drawString(1 * inch, height - 5.4 * inch, f"Total Amount: {booking.total_amount} INR")
    
    # 4. Seat Information
    p.setFont("Helvetica-Bold", 14)
    p.drawString(1 * inch, height - 6.0 * inch, "Seat Information")
    
    seats = booking.items.all()
    if seats:
        seat_str = ", ".join([f"{s.seat.row}{s.seat.seat_number}" for s in seats])
        p.setFont("Helvetica", 12)
        p.drawString(1 * inch, height - 6.4 * inch, f"Seats: {seat_str}")
    else:
        p.setFont("Helvetica", 12)
        p.drawString(1 * inch, height - 6.4 * inch, "General Admission (No seats assigned)")
        
    # 5. QR Code
    if ticket.qr_code_image:
        try:
            # We open the image and pass it to ReportLab
            qr_image = Image.open(ticket.qr_code_image.path)
            qr_reader = ImageReader(qr_image)
            p.drawImage(qr_reader, width - 3.5 * inch, height - 5.0 * inch, width=2.5*inch, height=2.5*inch)
            p.setFont("Helvetica", 10)
            p.drawString(width - 3.3 * inch, height - 5.2 * inch, "Scan QR Code for Entry")
        except Exception as e:
            # If the image path is invalid or missing, fallback safely
            p.setFont("Helvetica", 10)
            p.drawString(width - 3.5 * inch, height - 3 * inch, "[ QR Code Error ]")
            
    p.line(1 * inch, 2 * inch, width - 1 * inch, 2 * inch)
    p.setFont("Helvetica-Oblique", 10)
    p.drawString(1 * inch, 1.7 * inch, "Please bring this e-ticket to the venue. Valid only for the date and time specified.")
    
    p.showPage()
    p.save()
    
    buffer.seek(0)
    return buffer
