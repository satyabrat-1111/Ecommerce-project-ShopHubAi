from django.urls import path

from .tracking_views import (
    AdminActiveDeliveriesView,
    CustomerDeliveryLocationView,
    DeliveryLocationUpdateView,
    DeliverySharingStateView,
    DeliveryTrackingAssignmentView,
    MyAssignedDeliveriesView,
)


urlpatterns = [
    path("mine/", MyAssignedDeliveriesView.as_view(), name="my-assigned-deliveries"),
    path("admin/active/", AdminActiveDeliveriesView.as_view(), name="admin-active-deliveries"),
    path("admin/assignees/", DeliveryTrackingAssignmentView.as_view(), name="delivery-assignees"),
    path(
        "admin/orders/<int:order_id>/assignment/",
        DeliveryTrackingAssignmentView.as_view(),
        name="delivery-assignment",
    ),
    path(
        "orders/<int:order_id>/",
        CustomerDeliveryLocationView.as_view(),
        name="delivery-location-detail",
    ),
    path(
        "orders/<int:order_id>/location/",
        DeliveryLocationUpdateView.as_view(),
        name="delivery-location-update",
    ),
    path(
        "orders/<int:order_id>/<str:action>/",
        DeliverySharingStateView.as_view(),
        name="delivery-sharing-state",
    ),
]