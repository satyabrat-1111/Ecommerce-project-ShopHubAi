from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


# =========================================
# CUSTOM JWT TOKEN SERIALIZER
# =========================================

class CustomTokenObtainPairSerializer(
    TokenObtainPairSerializer
):

    @classmethod
    def get_token(cls, user):

        token = super().get_token(user)

        # User information inside JWT
        token["username"] = user.username
        token["is_staff"] = user.is_staff
        token["is_admin"] = user.is_staff

        return token

    def validate(self, attrs):

        data = super().validate(attrs)

        # Login response data
        data["username"] = self.user.username
        data["is_staff"] = self.user.is_staff
        data["is_admin"] = self.user.is_staff

        return data


# =========================================
# REGISTER SERIALIZER
# =========================================

class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    class Meta:

        model = User

        fields = (
            "username",
            "email",
            "phone",
            "password",
        )

    # =====================================
    # USERNAME VALIDATION
    # =====================================

    def validate_username(self, value):

        value = value.strip()

        if User.objects.filter(
            username__iexact=value
        ).exists():

            raise serializers.ValidationError(
                "Username already exists."
            )

        return value

    # =====================================
    # EMAIL VALIDATION
    # =====================================

    def validate_email(self, value):

        value = value.strip().lower()

        if User.objects.filter(
            email__iexact=value
        ).exists():

            raise serializers.ValidationError(
                "Email already registered."
            )

        return value

    # =====================================
    # PHONE VALIDATION
    # =====================================

    def validate_phone(self, value):

        if value:

            value = value.strip()

            if User.objects.filter(
                phone=value
            ).exists():

                raise serializers.ValidationError(
                    "Phone number already registered."
                )

        return value

    # =====================================
    # CREATE USER
    # =====================================

    def create(self, validated_data):

        password = validated_data.pop(
            "password"
        )

        user = User(
            **validated_data
        )

        # Secure password hashing
        user.set_password(password)

        # Newly registered users can login
        user.is_active = True

        user.save()

        return user


# =========================================
# CHANGE PASSWORD SERIALIZER
# =========================================

class ChangePasswordSerializer(serializers.Serializer):

    old_password = serializers.CharField(
        write_only=True
    )

    new_password = serializers.CharField(
        write_only=True,
        validators=[
            validate_password
        ]
    )


# =========================================
# FORGOT PASSWORD SERIALIZER
# =========================================

class ForgotPasswordSerializer(serializers.Serializer):

    email = serializers.EmailField()


# =========================================
# RESET PASSWORD SERIALIZER
# =========================================

class ResetPasswordSerializer(serializers.Serializer):

    new_password = serializers.CharField(
        write_only=True,
        validators=[
            validate_password
        ]
    )

    confirm_password = serializers.CharField(
        write_only=True
    )

    def validate(self, attrs):

        if (
            attrs["new_password"]
            != attrs["confirm_password"]
        ):

            raise serializers.ValidationError(
                {
                    "error":
                    "Passwords do not match."
                }
            )

        return attrs