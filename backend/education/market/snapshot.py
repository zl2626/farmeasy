SNAPSHOT_DATE = "2026-08-31"
SOURCE_NAME = "项目内置演示行情快照（非官方、非实时）"


def record(commodity, category, market, province, city, modal_price):
    return {
        "commodity": commodity,
        "category": category,
        "market": market,
        "province": province,
        "city": city,
        "modal_price": modal_price,
        "min_price": round(modal_price * 0.9, 2),
        "max_price": round(modal_price * 1.1, 2),
        "unit": "元/公斤",
        "arrival_date": SNAPSHOT_DATE,
    }


# These fixed values exist only to demonstrate filters and layouts. They are
# deliberately not presented as observed market prices or decision evidence.
MARKET_SNAPSHOT = [
    record("番茄", "蔬菜", "山东寿光农产品物流园", "山东省", "潍坊市", 4.60),
    record("黄瓜", "蔬菜", "山东寿光农产品物流园", "山东省", "潍坊市", 3.70),
    record("大白菜", "蔬菜", "山东寿光农产品物流园", "山东省", "潍坊市", 1.75),
    record("小麦", "粮食", "河南万邦国际农产品城", "河南省", "郑州市", 2.65),
    record("玉米", "粮食", "河南万邦国际农产品城", "河南省", "郑州市", 2.42),
    record("大豆", "粮食", "河南万邦国际农产品城", "河南省", "郑州市", 5.60),
    record("苹果", "水果", "北京新发地农产品批发市场", "北京市", "北京市", 7.80),
    record("鸭梨", "水果", "北京新发地农产品批发市场", "北京市", "北京市", 4.20),
    record("猪肉", "畜禽", "北京新发地农产品批发市场", "北京市", "北京市", 24.00),
    record("马铃薯", "蔬菜", "四川成都濛阳农副产品市场", "四川省", "成都市", 3.10),
    record("青椒", "蔬菜", "四川成都濛阳农副产品市场", "四川省", "成都市", 5.20),
    record("鸡蛋", "畜禽", "四川成都濛阳农副产品市场", "四川省", "成都市", 8.60),
    record("香蕉", "水果", "广东广州江南果菜批发市场", "广东省", "广州市", 4.50),
    record("芒果", "水果", "广东广州江南果菜批发市场", "广东省", "广州市", 12.00),
    record("生姜", "调味品", "广东广州江南果菜批发市场", "广东省", "广州市", 9.50),
]
