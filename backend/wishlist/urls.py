from django.urls import path

from .views import (
    WishlistView,
    AddToWishlistView,
    RemoveWishlistItemView,
)

urlpatterns = [
    path("", WishlistView.as_view(), name="wishlist"),

    path(
        "add/",
        AddToWishlistView.as_view(),
        name="add_to_wishlist",
    ),

    path(
        "remove/<int:item_id>/",
        RemoveWishlistItemView.as_view(),
        name="remove_from_wishlist",
    ),
]