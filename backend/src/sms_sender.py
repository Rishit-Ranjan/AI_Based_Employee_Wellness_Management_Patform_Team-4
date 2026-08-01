"""
SMS Sending Service - Uses Twilio to send text messages.
"""
import os
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from dotenv import load_dotenv

load_dotenv()

def send_sms(to_phone_number: str, body: str) -> bool:
    """
    Sends an SMS message using Twilio.

    Required env vars:
      - TWILIO_ACCOUNT_SID
      - TWILIO_AUTH_TOKEN
      - TWILIO_PHONE_NUMBER
    """
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    from_phone_number = os.getenv('TWILIO_PHONE_NUMBER')

    if not (account_sid and auth_token and from_phone_number):
        print('SMS not sent: Twilio is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment.')
        return False

    try:
        client = Client(account_sid, auth_token)
        message = client.messages.create(body=body, from_=from_phone_number, to=to_phone_number)
        print(f"SMS sent successfully to {to_phone_number}, SID: {message.sid}")
        return True
    except TwilioRestException as e:
        print(f"Failed to send SMS to {to_phone_number}. Error: {e}")
        return False