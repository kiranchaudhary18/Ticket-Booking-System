from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from accounts.models import Role
from events.models import Category, Venue, Event, Show, Seat

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with realistic demo data for events, categories, and venues.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting demo data seed...")

        # 1. Ensure a Demo Organizer exists
        organizer, created = User.objects.get_or_create(
            email='demo_organizer@example.com',
            defaults={
                'name': 'Demo Organizer',
                'role': Role.ORGANIZER,
                'is_active': True,
                'is_staff': False,
                'is_superuser': False,
            }
        )
        if created:
            organizer.set_password('demo_password123')
            organizer.save()
            self.stdout.write(self.style.SUCCESS('Created demo organizer: demo_organizer@example.com'))
        else:
            self.stdout.write('Demo organizer already exists.')

        # 2. Create Categories
        category_names = [
            "Music", "Comedy", "Theater", "Sports", "Technology", "Workshops"
        ]
        categories = {}
        for name in category_names:
            cat, cat_created = Category.objects.get_or_create(
                name=name,
                defaults={'description': f'All {name.lower()} events.', 'is_active': True}
            )
            categories[name] = cat
        self.stdout.write(self.style.SUCCESS(f'Verified {len(category_names)} categories.'))

        # 3. Create a Venue
        venue, v_created = Venue.objects.get_or_create(
            name='The Grand Arena Mumbai',
            organizer=organizer,
            defaults={
                'address': '123 Marine Drive',
                'city': 'Mumbai',
                'state': 'Maharashtra',
                'pincode': '400020',
                'capacity': 5000,
                'description': 'A massive indoor arena suitable for concerts and large events.',
                'venue_type': 'INDOOR',
                'is_active': True
            }
        )
        if v_created:
            self.stdout.write(self.style.SUCCESS('Created venue: The Grand Arena Mumbai'))
        
        venue2, v2_created = Venue.objects.get_or_create(
            name='Comedy Club Ahmedabad',
            organizer=organizer,
            defaults={
                'address': 'SG Highway',
                'city': 'Ahmedabad',
                'state': 'Gujarat',
                'pincode': '380015',
                'capacity': 500,
                'description': 'Intimate venue for stand-up comedy.',
                'venue_type': 'INDOOR',
                'is_active': True
            }
        )

        # 4. Create Events
        now = timezone.now()
        
        events_data = [
            {
                'title': 'Arijit Singh Live',
                'category': categories['Music'],
                'venue': venue,
                'description': 'Join us for a mesmerizing evening of soulful music with Arijit Singh.',
                'start_date': now + timedelta(days=10),
                'end_date': now + timedelta(days=10, hours=4),
                'language': 'Hindi',
                'age_limit': 12,
            },
            {
                'title': 'Mumbai Comedy Night',
                'category': categories['Comedy'],
                'venue': venue,
                'description': 'Top standup comedians from around the country will make you roll on the floor.',
                'start_date': now + timedelta(days=5),
                'end_date': now + timedelta(days=5, hours=2),
                'language': 'English/Hindi',
                'age_limit': 18,
            },
            {
                'title': 'Broadway Theatre Experience',
                'category': categories['Theater'],
                'venue': venue,
                'description': 'An international broadway musical comes to India.',
                'start_date': now + timedelta(days=15),
                'end_date': now + timedelta(days=15, hours=3),
                'language': 'English',
                'age_limit': 8,
            },
            {
                'title': 'Gujarat Titans Fan Fest',
                'category': categories['Sports'],
                'venue': venue2,
                'description': 'Meet and greet your favorite players.',
                'start_date': now + timedelta(days=20),
                'end_date': now + timedelta(days=20, hours=5),
                'language': 'Gujarati/Hindi',
                'age_limit': 5,
            },
            {
                'title': 'Tech Innovators Summit 2026',
                'category': categories['Technology'],
                'venue': venue,
                'description': 'The biggest tech summit featuring founders and builders.',
                'start_date': now + timedelta(days=30),
                'end_date': now + timedelta(days=32),
                'language': 'English',
                'age_limit': 16,
            },
            {
                'title': 'Startup Founders Meetup',
                'category': categories['Workshops'],
                'venue': venue2,
                'description': 'Networking and workshop session for early stage founders.',
                'start_date': now + timedelta(days=12),
                'end_date': now + timedelta(days=12, hours=4),
                'language': 'English',
                'age_limit': 18,
            },
            {
                'title': 'Live Symphony Orchestra',
                'category': categories['Music'],
                'venue': venue,
                'description': 'A magical night featuring 50 musicians.',
                'start_date': now + timedelta(days=40),
                'end_date': now + timedelta(days=40, hours=2),
                'language': 'English',
                'age_limit': 10,
            },
            {
                'title': 'Standup Nights Ahmedabad',
                'category': categories['Comedy'],
                'venue': venue2,
                'description': 'Local talents performing their best sets.',
                'start_date': now + timedelta(days=7),
                'end_date': now + timedelta(days=7, hours=2),
                'language': 'Gujarati',
                'age_limit': 16,
            },
        ]

        for edata in events_data:
            event, e_created = Event.objects.get_or_create(
                title=edata['title'],
                organizer=organizer,
                defaults={
                    'category': edata['category'],
                    'venue': edata['venue'],
                    'description': edata['description'],
                    'start_date': edata['start_date'],
                    'end_date': edata['end_date'],
                    'language': edata['language'],
                    'age_limit': edata['age_limit'],
                    'status': Event.Status.PUBLISHED,
                    'is_active': True
                }
            )
            
            if e_created:
                # 5. Create a Show and some Seats for the event
                show = Show.objects.create(
                    event=event,
                    show_date=edata['start_date'].date(),
                    start_time=edata['start_date'].time(),
                    end_time=edata['end_date'].time(),
                    is_active=True
                )
                
                # Create a few tiers of seats
                Seat.objects.get_or_create(venue=edata['venue'], row='A', seat_number='1', defaults={'seat_type': 'VIP', 'price': 2500, 'is_active': True})
                Seat.objects.get_or_create(venue=edata['venue'], row='A', seat_number='2', defaults={'seat_type': 'VIP', 'price': 2500, 'is_active': True})
                Seat.objects.get_or_create(venue=edata['venue'], row='B', seat_number='1', defaults={'seat_type': 'REGULAR', 'price': 1000, 'is_active': True})
                Seat.objects.get_or_create(venue=edata['venue'], row='B', seat_number='2', defaults={'seat_type': 'REGULAR', 'price': 1000, 'is_active': True})
                
                self.stdout.write(f"Created event: {event.title}")
            
        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully!"))
