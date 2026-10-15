from importlib import import_module

from django.apps import AppConfig


class OrdersConfig(AppConfig):
    name = 'orders'

    def ready(self):
        import_module(f"{self.name}.tracking_signals")
