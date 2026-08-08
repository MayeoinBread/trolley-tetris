import re
import typing

import requests


class IkeaClient:
    COUNTRY = "ie"
    LANGUAGE = "en"

    BASE_URL = f"https://www.ikea.com/{COUNTRY}/{LANGUAGE}"
    SIK_URL = f"https://sik.search.blue.cdtapps.com/{COUNTRY}/{LANGUAGE}/search"

    HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/139.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-IE,en;q=0.9",
    }

    SIK_HEADERS = {
        **HEADERS,
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Origin": "https://www.ikea.com",
        "Referer": "https://www.ikea.com/",
    }


    def _walk(self, obj):
            yield obj
            if isinstance(obj, dict):
                for v in obj.values():
                    yield from self._walk(v)
            elif isinstance(obj, list):
                for v in obj:
                    yield from self._walk(v)

    def _normalise_item_number(self, value) -> str:
        return re.sub(r"\D", "", str(value))
    
    def find_product_url(self, session, item_no: str) -> str:
        payload = {
            "searchParameters": {"input": self._normalise_item_number(item_no), "type": "QUERY"},
            "zip": "D06",
            "isUserLoggedIn": False,
            "optimizely": {
                "listing_fe_null_test_12122023": None,
                "listing_2787_quick_facts": "a",
            },
            "components": [{
                "component": "PRIMARY_AREA",
                "columns": 4,
                "types": {
                    "main": "PRODUCT",
                    "breakouts": ["PLANNER", "LOGIN_REMINDER"],
                },
                "filterConfig": {"max-num-filters": 3},
                "sort": "RELEVANCE",
                "window": {"offset": 0, "size": 20},
            }],
        }

        r = session.post(
            self.SIK_URL,
            headers=self.SIK_HEADERS,
            json=payload,
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()

        wanted = self._normalise_item_number(item_no)

        for v in self._walk(data):
            if not isinstance(v, dict):
                continue

            url = v.get("pipUrl") or v.get("url")
            if not url:
                continue

            for key in ("itemNoGlobal", "itemNo", "id"):
                value = v.get(key)
                if value is not None and self._normalise_item_number(value) == wanted:
                    return url

            if wanted in self._normalise_item_number(url):
                return url

        raise RuntimeError(f"IKEA product not found: {item_no}")

    def get_product_page(self, session, url: str) -> str:
        r = session.get(url, headers=self.HEADERS, timeout=30)
        r.raise_for_status()
        return r.text

    def get_product_data(self, article_number: str) -> typing.Any:
        session = requests.Session()
        session.headers.update({
            "User-Agent": self.HEADERS["User-Agent"],
            "Accept-Language": self.HEADERS["Accept-Language"]
        })

        url = self.find_product_url(session, article_number)

        html = self.get_product_page(session, url)

        return html
