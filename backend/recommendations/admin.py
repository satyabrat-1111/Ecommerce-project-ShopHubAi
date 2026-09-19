from django.contrib import admin

from .models import UserProductInteraction


@admin.register(UserProductInteraction)
class UserProductInteractionAdmin(admin.ModelAdmin):

    # =====================================
    # LIST DISPLAY
    # =====================================

    list_display = (
        "user",
        "product",
        "interaction_type",
        "created_at",
    )

    # =====================================
    # FILTERS
    # =====================================

    list_filter = (
        "interaction_type",
        "created_at",
    )

    # =====================================
    # SEARCH
    # =====================================

    search_fields = (
        "user__username",
        "user__email",
        "product__name",
        "product__brand",
    )

    # =====================================
    # SORTING
    # =====================================

    ordering = (
        "-created_at",
    )

    # =====================================
    # READ ONLY
    # =====================================

    readonly_fields = (
        "created_at",
    )