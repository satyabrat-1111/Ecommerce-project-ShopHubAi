from django.urls import path

from .views import (
    CreatePaymentView,
    VerifyPaymentView,
    PaymentHistoryView,
    InvoiceDownloadView,
)


urlpatterns = [

    path(
        "create/<int:order_id>/",
        CreatePaymentView.as_view(),
        name="create-payment",
    ),

    path(
        "verify/",
        VerifyPaymentView.as_view(),
        name="verify-payment",
    ),

    path(
        "",
        PaymentHistoryView.as_view(),
        name="payment-history",
    ),

    path(
        "invoice/<int:payment_id>/",
        InvoiceDownloadView.as_view(),
        name="invoice-download",
    ),
]