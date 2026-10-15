import math
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DeliveryTracking, Order


User = get_user_model()
LOCATION_MIN_INTERVAL = timedelta(seconds=3)


def tracking_payload(tracking):
    return {
        "assigned": bool(tracking and tracking.delivery_person_id),
        "is_sharing": bool(tracking and tracking.is_sharing),
        "latitude": tracking.latitude if tracking else None,
        "longitude": tracking.longitude if tracking else None,
        "accuracy_meters": tracking.accuracy_meters if tracking else None,
        "last_location_at": (
            tracking.last_location_at.isoformat()
            if tracking and tracking.last_location_at
            else None
        ),
    }


def assigned_tracking(request, order_id):
    if not request.user.is_delivery_person:
        raise PermissionDenied("A delivery-person account is required.")
    tracking = get_object_or_404(
        DeliveryTracking.objects.select_related("order"),
        order_id=order_id,
        delivery_person=request.user,
    )
    return tracking


class CustomerDeliveryLocationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order = get_object_or_404(
            Order.objects.select_related("user"),
            pk=order_id,
        )
        tracking = DeliveryTracking.objects.filter(order=order).select_related(
            "delivery_person"
        ).first()

        authorized = (
            request.user.is_staff
            or order.user_id == request.user.id
            or (
                request.user.is_delivery_person
                and tracking is not None
                and tracking.delivery_person_id == request.user.id
            )
        )
        if not authorized:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payload = tracking_payload(tracking)
        if order.status != "Shipped":
            payload.update({
                "is_sharing": False,
                "latitude": None,
                "longitude": None,
                "accuracy_meters": None,
                "last_location_at": None,
            })

        return Response({
            "order_id": order.id,
            "status": order.status,
            "tracking": payload,
        })


class DeliveryTrackingAssignmentView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        delivery_people = User.objects.filter(
            is_delivery_person=True,
            is_active=True,
        ).order_by("username").values("id", "username")
        return Response(list(delivery_people))

    def post(self, request, order_id):
        order = get_object_or_404(Order, pk=order_id)
        if order.status != "Shipped":
            return Response(
                {"detail": "Only shipped orders can be assigned for tracking."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        delivery_person_id = request.data.get("delivery_person_id")
        delivery_person = None
        if delivery_person_id not in (None, ""):
            delivery_person = User.objects.filter(
                pk=delivery_person_id,
                is_delivery_person=True,
                is_active=True,
            ).first()
            if delivery_person is None:
                return Response(
                    {"detail": "Select an active staff delivery account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        tracking, _ = DeliveryTracking.objects.get_or_create(order=order)
        tracking.delivery_person = delivery_person
        tracking.latitude = None
        tracking.longitude = None
        tracking.accuracy_meters = None
        tracking.last_location_at = None
        tracking.is_sharing = False
        tracking.save()
        return Response({
            "order_id": order.id,
            "delivery_person": delivery_person.username if delivery_person else None,
            "tracking": tracking_payload(tracking),
        })


class MyAssignedDeliveriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_delivery_person:
            return Response(
                {"detail": "An assigned delivery account is required."},
                status=status.HTTP_403_FORBIDDEN,
            )
        rows = DeliveryTracking.objects.filter(
            delivery_person=request.user,
            order__status="Shipped",
        ).select_related("order").order_by("order__created_at")
        return Response([
            {
                "order_id": row.order_id,
                "status": row.order.status,
                "is_sharing": row.is_sharing,
                "last_location_at": (
                    row.last_location_at.isoformat()
                    if row.last_location_at
                    else None
                ),
            }
            for row in rows
        ])


class DeliverySharingStateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id, action):
        tracking = assigned_tracking(request, order_id)
        if action not in {"start", "stop"}:
            return Response(
                {"detail": "Action must be start or stop."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if tracking.order.status != "Shipped":
            return Response(
                {"detail": "Location sharing is only available for shipped orders."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tracking.is_sharing = action == "start"
        update_fields = ["is_sharing", "updated_at"]
        if action == "start":
            tracking.latitude = None
            tracking.longitude = None
            tracking.accuracy_meters = None
            tracking.last_location_at = None
            update_fields.extend([
                "latitude",
                "longitude",
                "accuracy_meters",
                "last_location_at",
            ])
        tracking.save(update_fields=update_fields)
        return Response({
            "order_id": tracking.order_id,
            "status": tracking.order.status,
            "tracking": tracking_payload(tracking),
        })


class DeliveryLocationUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        with transaction.atomic():
            tracking = get_object_or_404(
                DeliveryTracking.objects.select_for_update().select_related("order"),
                order_id=order_id,
                delivery_person=request.user,
            )
            if tracking.order.status != "Shipped" or not tracking.is_sharing:
                return Response(
                    {"detail": "Start sharing for an active shipped order first."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            values = {}
            for field in ("latitude", "longitude"):
                raw_value = request.data.get(field)
                if isinstance(raw_value, bool):
                    return Response(
                        {"detail": f"{field} must be a valid coordinate."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                try:
                    value = float(raw_value)
                except (TypeError, ValueError):
                    return Response(
                        {"detail": f"{field} must be a valid coordinate."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                limit = 90 if field == "latitude" else 180
                if not math.isfinite(value) or not -limit <= value <= limit:
                    return Response(
                        {"detail": f"{field} is outside the allowed range."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                values[field] = value

            raw_accuracy = request.data.get("accuracy_meters")
            accuracy = None
            if raw_accuracy is not None:
                if isinstance(raw_accuracy, bool):
                    return Response(
                        {"detail": "accuracy_meters must be non-negative."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                try:
                    accuracy = float(raw_accuracy)
                except (TypeError, ValueError):
                    return Response(
                        {"detail": "accuracy_meters must be non-negative."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if not math.isfinite(accuracy) or not 0 <= accuracy <= 10000:
                    return Response(
                        {"detail": "accuracy_meters must be between 0 and 10000."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            now = timezone.now()
            if (
                tracking.last_location_at
                and now - tracking.last_location_at < LOCATION_MIN_INTERVAL
            ):
                return Response(
                    {"detail": "Location updates are limited to one every 3 seconds."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            tracking.latitude = values["latitude"]
            tracking.longitude = values["longitude"]
            tracking.accuracy_meters = accuracy
            tracking.last_location_at = now
            tracking.save(update_fields=[
                "latitude",
                "longitude",
                "accuracy_meters",
                "last_location_at",
                "updated_at",
            ])

        return Response({
            "order_id": tracking.order_id,
            "last_location_at": now.isoformat(),
        })


class AdminActiveDeliveriesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        orders = Order.objects.filter(status="Shipped").select_related(
            "delivery_tracking",
            "delivery_tracking__delivery_person",
        ).order_by("-updated_at")
        return Response([
            {
                "order_id": order.id,
                "status": order.status,
                "delivery_person_id": (
                    order.delivery_tracking.delivery_person_id
                    if hasattr(order, "delivery_tracking")
                    else None
                ),
                "delivery_person": (
                    order.delivery_tracking.delivery_person.username
                    if hasattr(order, "delivery_tracking")
                    and order.delivery_tracking.delivery_person_id
                    else None
                ),
                "tracking": tracking_payload(
                    order.delivery_tracking
                    if hasattr(order, "delivery_tracking")
                    else None
                ),
            }
            for order in orders
        ])