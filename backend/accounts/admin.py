from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = (
        "username",
        "email",
        "phone",
        "is_verified",
        "is_staff",
        "is_delivery_person",
        "is_active",
    )

    fieldsets = UserAdmin.fieldsets + (
        ("Delivery access", {"fields": ("is_delivery_person",)}),
    )

    search_fields = (
        "username",
        "email",
        "phone",
    )

    list_filter = (
        "is_verified",
        "is_staff",
        "is_delivery_person",
        "is_active",
    )