from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import DeliveryTracking, Order


@receiver(post_save, sender=Order)
def stop_tracking_when_delivery_ends(sender, instance, **kwargs):
    if instance.status != "Shipped":
        DeliveryTracking.objects.filter(
            order=instance,
            is_sharing=True,
        ).update(
            is_sharing=False,
            latitude=None,
            longitude=None,
            accuracy_meters=None,
            last_location_at=None,
            updated_at=timezone.now(),
        )