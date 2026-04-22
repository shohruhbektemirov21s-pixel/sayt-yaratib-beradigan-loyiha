from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.accounts.models import TOKENS_PER_NANO_COIN
from apps.payments.models import PaymentStatus, PaymentTransaction

from .models import Subscription, SubscriptionStatus, Tariff
from .serializers import SubscriptionSerializer, TariffSerializer


class TariffViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tariff.objects.filter(is_active=True)
    serializer_class = TariffSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def purchase(self, request, pk=None):
        """
        Tarifni sotib olish (test rejimi).
        Haqiqiy to'lov integratsiyasisiz — PaymentTransaction SUCCESS sifatida
        yaratiladi, Subscription aktivlashtiriladi va user balansi to'ldiriladi.
        Ishlab chiqarishda bu Payme/Click webhook bilan almashtiriladi.
        """
        tariff = self.get_object()
        user = request.user

        with transaction.atomic():
            # Oldingi faol obunani bekor qilamiz
            Subscription.objects.filter(
                user=user, status=SubscriptionStatus.ACTIVE,
            ).update(status=SubscriptionStatus.CANCELED)

            now = timezone.now()
            end = now + timedelta(days=tariff.duration_days or 30)
            sub = Subscription.objects.create(
                user=user,
                tariff=tariff,
                status=SubscriptionStatus.ACTIVE,
                start_date=now,
                end_date=end,
            )

            payment = PaymentTransaction.objects.create(
                user=user,
                tariff=tariff,
                amount=tariff.price,
                provider="test",
                status=PaymentStatus.SUCCESS,
            )

            # Dastlabki haftalik ulush — 1/4 qismi darhol beriladi,
            # qolgan 3/4 keyingi haftalar davomida beriladi (weekly cron).
            weekly = tariff.weekly_allowance
            nano_granted = weekly
            tokens_to_add = nano_granted * TOKENS_PER_NANO_COIN
            if tokens_to_add > 0:
                user.tokens_balance = (user.tokens_balance or 0) + tokens_to_add
                user.save(update_fields=["tokens_balance"])

        return Response({
            "success": True,
            "subscription": SubscriptionSerializer(sub).data,
            "payment_id": payment.id,
            "nano_granted": nano_granted,
            "monthly_total": tariff.nano_coins_included,
            "weekly_allowance": weekly,
            "new_balance": user.tokens_balance,
            "nano_coins": user.nano_coins,
            "message": (
                f"🎉 «{tariff.name}» obuna faol! "
                f"Dastlabki {nano_granted:,} nano koin hisobingizga qo'shildi. "
                f"Qolgan {tariff.nano_coins_included - nano_granted:,} nano koin "
                f"3 hafta davomida avtomatik qo'shiladi."
            ),
        }, status=status.HTTP_201_CREATED)


class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"])
    def current(self, request):
        sub = self.get_queryset().filter(
            status=SubscriptionStatus.ACTIVE,
            end_date__gt=timezone.now(),
        ).first()
        if sub:
            return Response(SubscriptionSerializer(sub).data)
        return Response({"detail": "No active subscription"}, status=status.HTTP_404_NOT_FOUND)
