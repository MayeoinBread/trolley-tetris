from dataclasses import dataclass
from typing import Optional
import typing

@dataclass
class MeasurementValue:
    value: float
    unit: str

    def __str__(self) -> str:
        return f'{self.value:g} {self.unit}'

@dataclass
class Measurements:
    width: Optional[MeasurementValue] = None
    height: Optional[MeasurementValue] = None
    length: Optional[MeasurementValue] = None
    diameter: Optional[MeasurementValue] = None
    weight: Optional[MeasurementValue] = None
    volume: Optional[MeasurementValue] = None

    @property
    def dimensions(self) -> typing.Tuple:
        # Turn all items into box-shapes (take diameter as width/height)
        if self.width:
            return (
                self.width.value,
                self.length.value,
                self.height.value
            )
        else:
            return (
                self.diameter.value,
                self.length.value,
                self.diameter.value
            )
