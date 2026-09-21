import logging
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from events.models import Notification

logger = logging.getLogger(__name__)

def send_notification(user, notification_type, subject, message, related_booking=None, channel=Notification.Channel.EMAIL, attachment=None, html_message=None):
    """
    Service to send a notification (defaulting to email) and log it in the database.
    """
    notification = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        channel=channel,
        subject=subject,
        message=message,
        related_booking=related_booking,
        status=Notification.Status.PENDING
    )

    if channel == Notification.Channel.EMAIL:
        from accounts.models import Role
        
        # Only send actual SMTP emails to CUSTOMERs for TICKET_ISSUED.
        if user.role == Role.CUSTOMER and notification_type != Notification.NotificationType.TICKET_ISSUED:
            notification.status = Notification.Status.SENT
            notification.sent_at = timezone.now()
            notification.save(update_fields=['status', 'sent_at'])
            return notification
            
        try:
            email = EmailMultiAlternatives(
                subject=subject,
                body=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email],
            )
            if html_message:
                email.attach_alternative(html_message, "text/html")
                
            if attachment:
                filename, content, mimetype = attachment
                email.attach(filename, content, mimetype)
                
            email.send(fail_silently=False)
            
            notification.status = Notification.Status.SENT
            notification.sent_at = timezone.now()
            notification.save(update_fields=['status', 'sent_at'])
            return notification
        except Exception as e:
            logger.error(f"Failed to send email notification {notification.id} to {user.email}: {str(e)}")
            notification.status = Notification.Status.FAILED
            notification.save(update_fields=['status'])
            return notification
            
    return notification

def send_payment_success_notification(booking, payment):
    if Notification.objects.filter(related_booking=booking, notification_type=Notification.NotificationType.PAYMENT_SUCCESS).exists():
        return
    
    subject = f"Payment Successful: {booking.show.event.title}"
    message = f"Your payment has been successfully processed!\n\nReference: {booking.booking_reference}\nAmount: {payment.amount} {payment.currency}\nStatus: {payment.status}\nEvent: {booking.show.event.title}\nShow: {booking.show.show_date} at {booking.show.start_time}\nVenue: {booking.show.event.venue.name}\n\nYour tickets will be issued shortly."
    
    send_notification(
        user=booking.customer,
        notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
        subject=subject,
        message=message,
        related_booking=booking
    )

def send_ticket_issued_notification(ticket):
    booking = ticket.booking
    if Notification.objects.filter(related_booking=booking, notification_type=Notification.NotificationType.TICKET_ISSUED).exists():
        return
    
    event = booking.show.event
    category_name = event.category.name if hasattr(event, 'category') and event.category else ""
    
    subject = f"Your Ticket is Confirmed — {event.title}"
    
    # Required email message content
    message = (
        "Your booking has been successfully confirmed.\n\n"
        "Your e-ticket is attached to this email.\n\n"
        "Booking Details:\n"
        f"Customer Name: {booking.customer.first_name} {booking.customer.last_name}".strip() + f"\n"
        f"Event Name: {event.title}\n"
        f"Category: {category_name}\n"
        f"Show Date: {booking.show.show_date}\n"
        f"Show Time: {booking.show.start_time}\n"
        f"Venue: {event.venue.name}\n"
    )
    
    seats = booking.items.all()
    if seats:
        seat_str = ", ".join([f"{s.seat.row}{s.seat.seat_number}" for s in seats])
        message += f"Selected seat(s): {seat_str}\n"
        
    message += (
        f"Ticket Number: {ticket.ticket_number}\n"
        f"Booking Reference: {booking.booking_reference}\n"
        f"Total Amount: {booking.total_amount} INR\n"
        f"Booking Status: {booking.status}"
    )
    
    # Generate PDF
    try:
        from events.services.pdf_service import generate_ticket_pdf
        pdf_buffer = generate_ticket_pdf(ticket)
        event_code = event.event_code or f"EVT{event.id}"
        filename = f"TicketMaster_{ticket.ticket_number}.pdf"
        attachment = (filename, pdf_buffer.read(), 'application/pdf')
    except Exception as e:
        logger.error(f"Failed to generate PDF for ticket {ticket.id}: {str(e)}")
        attachment = None
    
    # Generate HTML content
    seat_str = ""
    if seats:
        seat_str = ", ".join([f"{s.seat.row}{s.seat.seat_number}" for s in seats])
        
    context = {
        'booking': booking,
        'ticket': ticket,
        'event': event,
        'category_name': category_name,
        'show_date': booking.show.show_date,
        'show_time': booking.show.start_time,
        'venue_name': event.venue.name,
        'seat_str': seat_str,
    }
    
    html_message = render_to_string('emails/ticket_issued.html', context)
    
    send_notification(
        user=booking.customer,
        notification_type=Notification.NotificationType.TICKET_ISSUED,
        subject=subject,
        message=message,
        related_booking=booking,
        attachment=attachment,
        html_message=html_message
    )

def send_booking_cancelled_notification(booking):
    if Notification.objects.filter(related_booking=booking, notification_type=Notification.NotificationType.BOOKING_CANCELLED).exists():
        return
    
    subject = f"Booking Cancelled: {booking.show.event.title}"
    seats_str = ", ".join([f"{s.seat.row}{s.seat.seat_number}" for s in booking.items.all()])
    
    message = f"Your booking has been cancelled.\n\nReference: {booking.booking_reference}\nStatus: {booking.status}\nEvent: {booking.show.event.title}\nShow: {booking.show.show_date} at {booking.show.start_time}\nSeats: {seats_str}\n\nIf you believe this was an error, please contact support. Note: No refunds are issued automatically for timed-out pending bookings."
    
    send_notification(
        user=booking.customer,
        notification_type=Notification.NotificationType.BOOKING_CANCELLED,
        subject=subject,
        message=message,
        related_booking=booking
    )

def send_organizer_booking_notification(booking, activity_type):
    organizer = booking.show.event.organizer
    
    if Notification.objects.filter(user=organizer, related_booking=booking, notification_type=activity_type).exists():
        return
        
    num_seats = booking.items.count()
    subject = f"Organizer Alert: {activity_type} - {booking.show.event.title}"
    
    message = f"Booking Activity: {activity_type}\n\nEvent: {booking.show.event.title}\nShow: {booking.show.show_date} at {booking.show.start_time}\nBooking Reference: {booking.booking_reference}\nNumber of Seats: {num_seats}\nBooking Status: {booking.status}\n\nNo sensitive customer information is included in this alert."
    
    send_notification(
        user=organizer,
        notification_type=activity_type,
        subject=subject,
        message=message,
        related_booking=booking
    )
