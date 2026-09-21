import razorpay
from django.conf import settings

class RazorpayService:
    def __init__(self):
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        if self.key_id and self.key_secret:
            self.client = razorpay.Client(auth=(self.key_id, self.key_secret))
        else:
            self.client = None

    def create_order(self, amount, currency="INR", receipt=None, organizer_account_id=None, platform_fee=3):
        if not self.client:
            raise ValueError("Razorpay credentials are not set")
            
        data = {
            "amount": int(amount * 100),  # Razorpay expects amount in paise
            "currency": currency,
            "receipt": receipt,
        }
        
        # Split payment if organizer has a linked account and amount > platform fee
        if organizer_account_id and amount > platform_fee:
            organizer_amount = int((amount - platform_fee) * 100)
            data["transfers"] = [
                {
                    "account": organizer_account_id,
                    "amount": organizer_amount,
                    "currency": currency,
                    "notes": {
                        "fee": f"Platform fee: {platform_fee} INR"
                    }
                }
            ]
            
        return self.client.order.create(data=data)

    def create_linked_account(self, name, email, business_name, account_number, ifsc_code):
        if not self.client:
            raise ValueError("Razorpay credentials are not set")
            
        data = {
            "email": email,
            "name": name,
            "tnc_accepted": True,
            "account_details": {
                "business_name": business_name or name,
                "business_type": "individual"
            },
            "bank_account": {
                "ifsc_code": ifsc_code,
                "beneficiary_name": name,
                "account_number": account_number
            }
        }
        
        try:
            account = self.client.account.create(data)
            return account.get("id")
        except Exception as e:
            # If Route is not enabled (e.g. Test Mode Access Denied), return a mock ID if debug
            if getattr(settings, "DEBUG", False):
                print(f"Mocking Razorpay Account ID due to API error: {str(e)}")
                return "acc_Mock1234567890"
            raise e

    def verify_payment_signature(self, razorpay_order_id, razorpay_payment_id, razorpay_signature):
        if not self.client:
            raise ValueError("Razorpay credentials are not set")
            
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        try:
            self.client.utility.verify_payment_signature(params_dict)
            return True
        except Exception:
            return False

    def verify_webhook_signature(self, body, signature):
        webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', None)
        if not webhook_secret:
            raise ValueError("Razorpay webhook secret is not set")
            
        try:
            self.client.utility.verify_webhook_signature(body, signature, webhook_secret)
            return True
        except Exception:
            return False
