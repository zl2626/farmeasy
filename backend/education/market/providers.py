from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.utils.module_loading import import_string

from .snapshot import MARKET_SNAPSHOT, SNAPSHOT_DATE, SOURCE_NAME


class SnapshotMarketProvider:
    def get_snapshot(self, filters=None):
        filters = filters or {}
        records = list(MARKET_SNAPSHOT)
        for field in ("province", "city", "commodity", "category"):
            value = str(filters.get(field, "")).strip()
            if value:
                records = [row for row in records if row[field] == value]

        keyword = str(filters.get("keyword", "")).strip().lower()
        if keyword:
            records = [
                row
                for row in records
                if any(
                    keyword in str(row[field]).lower()
                    for field in ("market", "province", "city", "commodity")
                )
            ]

        try:
            limit = min(max(int(filters.get("limit", 200)), 1), 500)
        except (TypeError, ValueError):
            limit = 200

        return {
            "records": records[:limit],
            "meta": {
                "data_mode": "demo_snapshot",
                "is_realtime": False,
                "snapshot_date": SNAPSHOT_DATE,
                "source": SOURCE_NAME,
                "notice": "仅用于功能演示，不代表真实成交价格，不可作为生产经营决策依据。",
                "provider": self.__class__.__name__,
            },
        }


def get_market_snapshot(filters=None):
    try:
        provider_class = import_string(settings.MARKET_DATA_PROVIDER)
    except (ImportError, AttributeError) as exc:
        raise ImproperlyConfigured("MARKET_DATA_PROVIDER 配置无效") from exc
    return provider_class().get_snapshot(filters or {})
