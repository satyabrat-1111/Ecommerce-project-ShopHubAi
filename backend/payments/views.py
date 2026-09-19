import razorpay

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.http import HttpResponse

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from reportlab.platypus import (
    SimpleDocTemplate,
    Table,
    TableStyle,
    Paragraph,
)
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

from cart.models import Cart
from orders.models import Order
from orders.utils import (
    generate_invoice_pdf,
    send_invoice_email,
)

from .models import Payment
from .serializers import PaymentSerializer


# =========================================
# RAZORPAY CLIENT
# =========================================

client = razorpay.Client(
    auth=(
        settings.RAZORPAY_KEY_ID,
        settings.RAZORPAY_KEY_SECRET,
    )
)


# =========================================
# CREATE PAYMENT
# =========================================

class CreatePaymentView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):

        order = get_object_or_404(
            Order,
            id=order_id,
            user=request.user,
        )

        # Check whether pending payment already exists
        payment = Payment.objects.filter(
            order=order,
            user=request.user,
            payment_status="Pending",
        ).first()

        # Create payment record
        if payment is None:

            payment = Payment.objects.create(
                user=request.user,
                order=order,
                amount=order.total_amount,
                payment_method="Razorpay",
            )

        # Create Razorpay order only once
        if not payment.razorpay_order_id:
            print("ORDER TOTAL:", order.total_amount)
            print("RAZORPAY AMOUNT:",int(order.total_amount * 100))

            razorpay_order = client.order.create(
                {
                    "amount": int(
                        order.total_amount * 100
                    ),
                    "currency": "INR",
                    "payment_capture": 1,
                }
            )

            payment.razorpay_order_id = (
                razorpay_order["id"]
            )

            payment.save()

        return Response(
    {
        **PaymentSerializer(payment).data,
        "razorpay_key_id": settings.RAZORPAY_KEY_ID,
    },
    status=status.HTTP_201_CREATED,
)


# =========================================
# VERIFY PAYMENT
# =========================================

class VerifyPaymentView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):

        razorpay_order_id = request.data.get(
            "razorpay_order_id"
        )

        razorpay_payment_id = request.data.get(
            "razorpay_payment_id"
        )

        razorpay_signature = request.data.get(
            "razorpay_signature"
        )

        # Validate required data
        if not all(
            [
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
            ]
        ):
            return Response(
                {
                    "error": (
                        "Razorpay payment details "
                        "are required."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment = get_object_or_404(
            Payment,
            razorpay_order_id=razorpay_order_id,
            user=request.user,
        )

        params = {
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": (
                razorpay_payment_id
            ),
            "razorpay_signature": (
                razorpay_signature
            ),
        }

        try:

            # =================================
            # VERIFY RAZORPAY SIGNATURE
            # =================================

            client.utility.verify_payment_signature(
                params
            )

            # =================================
            # PAYMENT SUCCESS
            # =================================

            payment.payment_status = "Success"

            payment.razorpay_payment_id = (
                razorpay_payment_id
            )

            payment.razorpay_signature = (
                razorpay_signature
            )

            payment.save()

            # =================================
            # CONFIRM ORDER
            # =================================

            order = payment.order

            order.status = "Confirmed"
            order.save()

            # =================================
            # GENERATE INVOICE
            # =================================

            pdf_path = generate_invoice_pdf(
                order
            )

            # =================================
            # SEND INVOICE EMAIL
            # =================================

            try:

                send_invoice_email(
                    order,
                    pdf_path,
                )

            except Exception as email_error:

                print(
                    "Invoice Email Error:",
                    email_error,
                )

            # =================================
            # CLEAR CART
            # =================================

            try:

                cart = Cart.objects.get(
                    user=request.user
                )

                cart.items.all().delete()

            except Cart.DoesNotExist:

                pass

            # =================================
            # SUCCESS RESPONSE
            # =================================

            return Response(
                {
                    "message": (
                        "Payment Verified "
                        "Successfully"
                    ),
                    "payment": PaymentSerializer(
                        payment
                    ).data,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as error:

            print(
                "Payment Verification Error:",
                error,
            )

            payment.payment_status = "Failed"
            payment.save()

            return Response(
                {
                    "message": (
                        "Payment Verification Failed"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


# =========================================
# PAYMENT HISTORY
# =========================================

class PaymentHistoryView(
    generics.ListAPIView
):

    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):

        return Payment.objects.filter(
            user=self.request.user
        ).order_by(
            "-created_at"
        )


# =========================================
# INVOICE DOWNLOAD
# =========================================

class InvoiceDownloadView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, payment_id):

        payment = get_object_or_404(
            Payment,
            id=payment_id,
            user=request.user,
        )

        if payment.payment_status != "Success":

            return Response(
                {
                    "error": (
                        "Invoice is available only "
                        "for successful payments."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order = payment.order

        response = HttpResponse(
            content_type="application/pdf"
        )

        response[
            "Content-Disposition"
        ] = (
            f'attachment; '
            f'filename="invoice_{payment.id}.pdf"'
        )

        document = SimpleDocTemplate(
            response
        )

        styles = getSampleStyleSheet()

        elements = []

        elements.append(
            Paragraph(
                "ShopHub AI",
                styles["Title"],
            )
        )

        elements.append(
            Paragraph(
                f"Invoice No : {payment.id}",
                styles["Normal"],
            )
        )

        elements.append(
            Paragraph(
                f"Order ID : {order.id}",
                styles["Normal"],
            )
        )

        elements.append(
            Paragraph(
                f"Customer : "
                f"{request.user.username}",
                styles["Normal"],
            )
        )

        elements.append(
            Paragraph(
                f"Payment Status : "
                f"{payment.payment_status}",
                styles["Normal"],
            )
        )

        elements.append(
            Paragraph(
                f"Amount : ₹{payment.amount}",
                styles["Normal"],
            )
        )

        elements.append(
            Paragraph(
                f"Date : "
                f"{payment.created_at.strftime('%d-%m-%Y %H:%M')}",
                styles["Normal"],
            )
        )

        data = [
            [
                "Product",
                "Quantity",
                "Price",
            ]
        ]

        for item in order.items.all():

            data.append(
                [
                    item.product.name,
                    str(item.quantity),
                    f"₹{item.price}",
                ]
            )

        table = Table(data)

        table.setStyle(
            TableStyle(
                [
                    (
                        "BACKGROUND",
                        (0, 0),
                        (-1, 0),
                        colors.grey,
                    ),
                    (
                        "TEXTCOLOR",
                        (0, 0),
                        (-1, 0),
                        colors.whitesmoke,
                    ),
                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        1,
                        colors.black,
                    ),
                    (
                        "BOTTOMPADDING",
                        (0, 0),
                        (-1, 0),
                        10,
                    ),
                    (
                        "ALIGN",
                        (0, 0),
                        (-1, -1),
                        "CENTER",
                    ),
                ]
            )
        )

        elements.append(table)

        document.build(elements)

        return response