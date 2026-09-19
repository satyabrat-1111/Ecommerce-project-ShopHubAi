from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Wishlist, WishlistItem
from .serializers import WishlistSerializer
from products.models import Product


class WishlistView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wishlist, created = Wishlist.objects.get_or_create(user=request.user)
        serializer = WishlistSerializer(wishlist)
        return Response(serializer.data)


class AddToWishlistView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        product_id = request.data.get("product")

        if not product_id:
            return Response(
                {"error": "Product ID is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product = get_object_or_404(Product, id=product_id)

        wishlist, created = Wishlist.objects.get_or_create(user=request.user)

        if WishlistItem.objects.filter(
            wishlist=wishlist,
            product=product
        ).exists():
            return Response(
                {"message": "Product already exists in wishlist"},
                status=status.HTTP_200_OK,
            )

        WishlistItem.objects.create(
            wishlist=wishlist,
            product=product
        )

        return Response(
            {"message": "Product added to wishlist successfully"},
            status=status.HTTP_201_CREATED,
        )


class RemoveWishlistItemView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, item_id):
        item = get_object_or_404(
            WishlistItem,
            id=item_id,
            wishlist__user=request.user,
        )

        item.delete()

        return Response(
            {"message": "Product removed from wishlist"}
        )