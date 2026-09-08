"""Market price service for China's Ministry of Agriculture and Rural Affairs.

Data source: https://pfsc.agri.cn/
The upstream chart endpoint returns an AES-256-CBC encrypted JSON string.
No synthetic or fallback prices are produced by this module.
"""
import json
import logging
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlencode

import requests
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.padding import PKCS7

logger = logging.getLogger(__name__)

PFSC_BASE_URL = "https://pfsc.agri.cn"
DATA_SOURCE = {
    "name": "农业农村部全国农产品批发市场价格信息系统",
    "url": "https://pfsc.agri.cn/",
    "license": "公开行情信息，仅用于信息展示，不作为交易或定价依据",
}
DEFAULT_TIMEOUT = 12
PFSC_KEY = b"7s9K$pG2xQ8zR5mB7vA3sD9fH2jW40cV"

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"
VARIETIES_FILE = FIXTURE_DIR / "pfsc_selected_varieties.json"
MARKETS_FILE = FIXTURE_DIR / "pfsc_market_ids.json"

# The upstream API needs browser-like headers.
HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Origin": PFSC_BASE_URL,
    "Referer": f"{PFSC_BASE_URL}/priceMarket",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
}


def _load_fixture(path, default=None):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        logger.warning("Could not load PFSC fixture %s: %s", path, exc)
        return default


def _get_session():
    session = requests.Session()
    session.headers.update(HEADERS)
    return session


def _post(path, json_body=None, params=None):
    response = _get_session().post(
        f"{PFSC_BASE_URL}{path}",
        json={} if json_body is None else json_body,
        params=params,
        timeout=DEFAULT_TIMEOUT,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("code") not in (0, 200):
        raise ValueError(payload.get("msg") or payload.get("message") or "官方接口返回异常")
    return payload


def _get(path, params=None):
    response = _get_session().get(
        f"{PFSC_BASE_URL}{path}", params=params, timeout=DEFAULT_TIMEOUT
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("code") not in (0, 200):
        raise ValueError(payload.get("msg") or payload.get("message") or "官方接口返回异常")
    return payload


def _decrypt_chart_payload(payload):
    """Decrypt the PFSC chart endpoint payload."""
    if payload in (None, "", "null"):
        return None
    if isinstance(payload, dict):
        return payload
    if not isinstance(payload, str):
        return None

    iv = payload[:16].encode("utf-8")
    ciphertext = __import__("base64").b64decode(payload[16:])
    decryptor = Cipher(algorithms.AES(PFSC_KEY), modes.CBC(iv)).decryptor()
    padded = decryptor.update(ciphertext) + decryptor.finalize()
    unpadder = PKCS7(128).unpadder()
    plain = unpadder.update(padded) + unpadder.finalize()
    return json.loads(plain.decode("utf-8"))


def get_growth_ranking():
    payload = _post("/price_portal/index/growthRanking")
    data = payload.get("data") or {}
    dates = data.get("date") or []
    result = []
    for index, code in enumerate(data.get("codes") or []):
        try:
            result.append(
                {
                    "code": code,
                    "name": (data.get("names") or [None] * (index + 1))[index],
                    "variety_id": None,
                    "average_price": (data.get("avgPrice") or [None] * (index + 1))[index],
                    "previous_price": (data.get("lastAvgPrice") or [None] * (index + 1))[index],
                    "change": (data.get("difAvgPrice") or [None] * (index + 1))[index],
                    "unit": (data.get("meteringUnit") or [None] * (index + 1))[index],
                }
            )
        except IndexError:
            continue
    return {
        "date": dates[0] if dates else None,
        "items": result,
    }


@lru_cache(maxsize=1)
def get_varieties():
    """Return supported varieties, joined to official national-average names."""
    varieties = _load_fixture(VARIETIES_FILE, [])
    by_code = {item["varietyCode"]: item for item in varieties}
    ranking = get_growth_ranking()
    for item in ranking["items"]:
        match = by_code.get(item["code"])
        if match:
            match["variety_id"] = str(match["id"])
            match["average_price"] = item["average_price"]
            match["previous_price"] = item["previous_price"]
            match["change"] = item["change"]
            match["unit"] = item["unit"]
            match["report_date"] = ranking["date"]
    return varieties


@lru_cache(maxsize=1)
def get_market_directory():
    return _load_fixture(MARKETS_FILE, [])


def _variety_by_name(name):
    return next((item for item in get_varieties() if item["name"] == name), None)


def _markets(query=None, province=None, market_name=None, limit=None):
    markets = get_market_directory()
    if province:
        markets = [item for item in markets if item.get("province") == province]
    if query:
        query = query.casefold()
        markets = [item for item in markets if query in item.get("name", "").casefold()]
    if market_name:
        markets = [item for item in markets if item.get("name") == market_name]
    if limit:
        markets = markets[:limit]
    return markets


def get_market_prices(commodity=None, province=None, market=None, query=None, limit=None):
    """Return official same-day prices for one commodity and selected markets."""
    if not commodity:
        raise ValueError("请选择要查询的农产品")
    variety = _variety_by_name(commodity)
    if not variety:
        raise ValueError("暂未接入该农产品的官方行情")
    markets = _markets(query=query, province=province, market_name=market, limit=limit)
    if not markets:
        return {"items": [], "unquoted": []}

    # Upstream API requires paired market IDs and province codes.
    market_ids = ",".join(item["id"] for item in markets)
    province_codes = ",".join(item["provinceCode"] for item in markets)
    params = urlencode(
        {
            "marketIDs": market_ids,
            "provinceCodes": province_codes,
            "varietyID": variety["id"],
        }
    )
    payload = _post(f"/price_portal/index/getMarketReportPriceChart?{params}")
    chart = _decrypt_chart_payload(payload.get("data"))

    values = {}
    if chart:
        for market_name, price in zip(chart.get("x") or [], chart.get("y") or []):
            values[market_name] = price
        report_date = chart.get("date")
    else:
        report_date = None

    items = []
    unquoted = []
    for item in markets:
        price = values.get(item["name"])
        record = {
            "market_id": item["id"],
            "market": item["name"],
            "province": item["province"],
            "province_code": item["provinceCode"],
            "city_code": item.get("cityCode"),
            "commodity": commodity,
            "variety_code": variety["varietyCode"],
            "variety_id": str(variety["id"]),
            "unit": variety.get("unit") or "元/公斤",
            "report_date": report_date,
            "price": price,
        }
        if price is None:
            record["status"] = "unquoted"
            unquoted.append(record)
        else:
            record["status"] = "quoted"
            items.append(record)

    items.sort(key=lambda row: row["price"] if row["price"] is not None else float("inf"))
    return {
        "commodity": commodity,
        "report_date": report_date,
        "items": items,
        "unquoted": unquoted,
    }
