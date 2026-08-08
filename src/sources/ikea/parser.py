import json
import re
from typing import Optional

from src.models.measurement import MeasurementValue, Measurements
from src.models.package import Package


class IkeaParser:

    def parse_measurement(self, value: dict | None) -> MeasurementValue | None:
        if not value: return None

        return MeasurementValue(
            value=value.get('value'),
            unit=value.get('text', '').split()[-1]
        )

    def _extract_measurements(self, measurement: dict) -> Optional[Measurements]:
        return Measurements(
            width=self.parse_measurement(measurement.get('width')),
            height=self.parse_measurement(measurement.get('height')),
            length=self.parse_measurement(measurement.get('length')),
            diameter=self.parse_measurement(measurement.get('diameter')),
            weight=self.parse_measurement(measurement.get('weight')),
            volume=self.parse_measurement(measurement.get('volume'))
        )

    def extract_hydration_json(self, html: str):
        result = []

        scripts = re.findall(
            r"<script\b[^>]*>(.*?)</script>",
            html,
            re.I | re.S,
        )

        for script in scripts:
            script = script.strip()

            if not script: continue

            try:
                result.append(json.loads(script))
                continue
            except json.JSONDecodeError:
                pass

            starts = [script.find("{"), script.find("[")]

            for start in starts:
                if start < 0: continue

                try:
                    result.append(json.loads(script[start:]))
                    break
                except json.JSONDecodeError:
                    continue

        return result

    def package_records(self, product: dict) -> list[Package]:
        records = []

        products = [product, *(product.get("subProducts") or [])]

        for obj in products:
            for measurement in obj.get("packageMeasurements") or []:
                records.append(
                    Package(
                        name=obj.get("name"),
                        type=obj.get("typeName"),
                        item_number=obj.get("itemNo"),
                        article_number=obj.get("articleNumber"),
                        quantity=obj.get("quantity"),
                        measurements=self._extract_measurements(measurement),
                    )
                )

        return records

    def parse_product():
        pass
