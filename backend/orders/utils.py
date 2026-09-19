import os

from django.conf import settings
from django.core.mail import EmailMessage

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def generate_invoice_pdf(order):
    """
    Generate invoice PDF for the given order.
    """

    # Create media/invoices folder automatically
    invoice_dir = os.path.join(
        settings.MEDIA_ROOT,
        "invoices"
    )

    os.makedirs(
        invoice_dir,
        exist_ok=True
    )

    # PDF file name
    filename = f"invoice_{order.id}.pdf"

    filepath = os.path.join(
        invoice_dir,
        filename
    )

    # Create PDF
    pdf = canvas.Canvas(
        filepath,
        pagesize=A4
    )

    width, height = A4

    # =========================
    # INVOICE HEADER
    # =========================

    pdf.setFont(
        "Helvetica-Bold",
        20
    )

    pdf.drawString(
        50,
        height - 60,
        "ShopHubAI Invoice"
    )

    # =========================
    # ORDER INFORMATION
    # =========================

    pdf.setFont(
        "Helvetica",
        11
    )

    y = height - 100

    pdf.drawString(
        50,
        y,
        f"Order ID: #{order.id}"
    )

    y -= 20

    pdf.drawString(
        50,
        y,
        f"Customer: {order.user.username}"
    )

    y -= 20

    pdf.drawString(
        50,
        y,
        f"Email: {order.user.email}"
    )

    y -= 20

    pdf.drawString(
        50,
        y,
        f"Status: {order.status}"
    )

    y -= 20

    pdf.drawString(
        50,
        y,
        f"Date: {order.created_at.strftime('%d-%m-%Y %H:%M')}"
    )

    # =========================
    # SHIPPING ADDRESS
    # =========================

    y -= 40

    pdf.setFont(
        "Helvetica-Bold",
        12
    )

    pdf.drawString(
        50,
        y,
        "Shipping Address"
    )

    y -= 20

    pdf.setFont(
        "Helvetica",
        10
    )

    pdf.drawString(
        50,
        y,
        order.shipping_address
    )

    y -= 18

    pdf.drawString(
        50,
        y,
        f"{order.city}, {order.state}"
    )

    y -= 18

    pdf.drawString(
        50,
        y,
        f"{order.country} - {order.pincode}"
    )

    # =========================
    # PRODUCT TABLE HEADER
    # =========================

    y -= 40

    pdf.setFont(
        "Helvetica-Bold",
        11
    )

    pdf.drawString(
        50,
        y,
        "Product"
    )

    pdf.drawString(
        300,
        y,
        "Qty"
    )

    pdf.drawString(
        350,
        y,
        "Price"
    )

    pdf.drawString(
        450,
        y,
        "Total"
    )

    # Horizontal line

    y -= 10

    pdf.line(
        50,
        y,
        550,
        y
    )

    y -= 20

    # =========================
    # ORDER ITEMS
    # =========================

    pdf.setFont(
        "Helvetica",
        10
    )

    for item in order.items.all():

        item_total = item.price * item.quantity

        pdf.drawString(
            50,
            y,
            str(item.product.name)
        )

        pdf.drawString(
            300,
            y,
            str(item.quantity)
        )

        pdf.drawString(
            350,
            y,
            f"Rs. {item.price}"
        )

        pdf.drawString(
            450,
            y,
            f"Rs. {item_total}"
        )

        y -= 20

        # Create a new page if required
        if y < 80:

            pdf.showPage()

            pdf.setFont(
                "Helvetica",
                10
            )

            y = height - 60

    # =========================
    # GRAND TOTAL
    # =========================

    y -= 20

    pdf.line(
        300,
        y,
        550,
        y
    )

    y -= 25

    pdf.setFont(
        "Helvetica-Bold",
        12
    )

    pdf.drawString(
        350,
        y,
        f"Grand Total: Rs. {order.total_amount}"
    )

    # =========================
    # FOOTER
    # =========================

    pdf.setFont(
        "Helvetica",
        9
    )

    pdf.drawString(
        50,
        40,
        "Thank you for shopping with ShopHubAI!"
    )

    # Save PDF
    pdf.save()

    return filepath


def send_invoice_email(order, pdf_path):
    """
    Send invoice PDF to customer's email.
    """

    subject = f"ShopHubAI - Invoice #{order.id}"

    message = f"""
Hello {order.user.username},

Thank you for shopping with ShopHubAI.

Your order #{order.id} has been placed successfully.

Order Total: Rs. {order.total_amount}

Please find your invoice PDF attached to this email.

Thank you,
ShopHubAI Team
"""

    email = EmailMessage(
        subject=subject,
        body=message,
        from_email=settings.EMAIL_HOST_USER,
        to=[order.user.email],
    )

    # Attach PDF
    email.attach_file(pdf_path)

    # Send email
    email.send(
        fail_silently=False
    )