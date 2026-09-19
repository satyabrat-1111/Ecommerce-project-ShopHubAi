from rest_framework.permissions import BasePermission


class IsAdminUser(BasePermission):
    """
    Allows access only to staff/admin users.
    """

    message = "Only admin users can access this resource."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_staff
        )