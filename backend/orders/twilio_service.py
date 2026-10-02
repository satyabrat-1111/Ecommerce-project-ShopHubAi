import logging

from django.conf import settings

from requests.exceptions import RequestException
from twilio.base.exceptions import TwilioException
from twilio.http.http_client import TwilioHttpClient
from twilio.rest import Client


logger = logging.getLogger(__name__)


class DeliveryOTPError(Exception):
    """
    Custom exception for delivery OTP related errors.
    """
    def __init__(self, message, status_code=400):
        super().__init__(message)
        self.status_code = status_code


def get_twilio_client():
    """
    Create and return a Twilio client using credentials
    stored in Django settings.
    """

    account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")

    if not account_sid:
        raise DeliveryOTPError(
            "Twilio Account SID is not configured."
        )

    if not auth_token:
        raise DeliveryOTPError(
            "Twilio Auth Token is not configured."
        )

    return Client(
        account_sid,
        auth_token,
        http_client=TwilioHttpClient(timeout=10),
    )


def get_verify_service_sid():
    """
    Return the Twilio Verify Service SID.
    """

    service_sid = getattr(
        settings,
        "TWILIO_VERIFY_SERVICE_SID",
        "",
    )

    if not service_sid:
        raise DeliveryOTPError(
            "Twilio Verify Service SID is not configured."
        )

    return service_sid


def normalize_phone_number(phone):
    """
    Normalize an Indian phone number into E.164 format.

    Supported examples:

    9861336792
    -> +919861336792

    919861336792
    -> +919861336792

    +919861336792
    -> +919861336792
    """

    if not phone:
        raise DeliveryOTPError(
            "Customer phone number is not available."
        )

    value = str(phone).strip()

    # Remove common formatting characters.
    value = (
        value
        .replace(" ", "")
        .replace("-", "")
        .replace("(", "")
        .replace(")", "")
    )

    # Already in international format.
    if value.startswith("+"):
        if not value[1:].isdigit():
            raise DeliveryOTPError(
                "Customer phone number is invalid."
            )

        return value

    # Indian number with country code.
    if len(value) == 12 and value.startswith("91"):
        if not value.isdigit():
            raise DeliveryOTPError(
                "Customer phone number is invalid."
            )

        return f"+{value}"

    # Indian 10-digit mobile number.
    if len(value) == 10 and value.isdigit():
        return f"+91{value}"

    raise DeliveryOTPError(
        "Customer phone number must be a valid "
        "10-digit Indian number or E.164 number."
    )


def send_delivery_otp(phone):
    """
    Send a delivery OTP to the customer's phone
    using Twilio Verify.
    """

    normalized_phone = normalize_phone_number(phone)

    try:
        client = get_twilio_client()
        service_sid = get_verify_service_sid()

        verification = (
            client.verify
            .v2
            .services(service_sid)
            .verifications
            .create(
                to=normalized_phone,
                channel="sms",
            )
        )

    except TwilioException as exc:
        logger.warning(
            "Twilio Verify send failed (status=%s, code=%s)",
            getattr(exc, "status", None),
            getattr(exc, "code", None),
        )
        raise DeliveryOTPError(
            "Unable to send delivery OTP. "
            "Please verify the customer phone number "
            "and Twilio configuration."
        ) from exc
    except RequestException as exc:
        logger.warning(
            "Unable to reach Twilio Verify: %s",
            type(exc).__name__,
        )
        raise DeliveryOTPError(
            "Unable to reach the delivery OTP service. "
            "Please try again.",
            status_code=503,
        ) from exc

    return {
        "status": verification.status,
        "phone": normalized_phone,
    }


def verify_delivery_otp(phone, otp):
    """
    Verify the OTP entered by the customer/delivery person
    using Twilio Verify.
    """

    normalized_phone = normalize_phone_number(phone)

    if otp is None:
        raise DeliveryOTPError(
            "OTP is required."
        )

    otp = str(otp).strip()

    if not otp:
        raise DeliveryOTPError(
            "OTP is required."
        )

    if not otp.isdigit():
        raise DeliveryOTPError(
            "OTP must contain only digits."
        )

    if len(otp) != 6:
        raise DeliveryOTPError(
            "OTP must be a valid 6-digit number."
        )

    try:
        client = get_twilio_client()
        service_sid = get_verify_service_sid()

        verification_check = (
            client.verify
            .v2
            .services(service_sid)
            .verification_checks
            .create(
                to=normalized_phone,
                code=otp,
            )
        )

    except TwilioException as exc:
        logger.warning(
            "Twilio Verify check failed (status=%s, code=%s)",
            getattr(exc, "status", None),
            getattr(exc, "code", None),
        )
        raise DeliveryOTPError(
            "Unable to verify the delivery OTP. "
            "The OTP may be invalid or expired."
        ) from exc
    except RequestException as exc:
        logger.warning(
            "Unable to reach Twilio Verify: %s",
            type(exc).__name__,
        )
        raise DeliveryOTPError(
            "Unable to reach the delivery OTP service. "
            "Please try again.",
            status_code=503,
        ) from exc

    return {
        "status": verification_check.status,
        "phone": normalized_phone,
    }