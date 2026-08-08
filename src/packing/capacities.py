from src.models.basket_capacity import BasketCapacity
from src.models.measurement import MeasurementValue, Measurements


SMALL_CAR = BasketCapacity(
    measurements=Measurements(
        width=MeasurementValue(100, 'cm'),
        length=MeasurementValue(70, 'cm'),
        height=MeasurementValue(50, 'cm'),
        weight=MeasurementValue(100, 'kg')
    )
)

FAMILY_CAR = BasketCapacity(
    measurements=Measurements(
        width=MeasurementValue(120, 'cm'),
        length=MeasurementValue(100, 'cm'),
        height=MeasurementValue(70, 'cm'),
        weight=MeasurementValue(200, 'kg')
    )
)

SMALL_VAN = BasketCapacity(
    measurements=Measurements(
        width=MeasurementValue(150, 'cm'),
        length=MeasurementValue(250, 'cm'),
        height=MeasurementValue(120, 'cm'),
        weight=MeasurementValue(800, 'kg')
    )
)

LARGE_VAN = BasketCapacity(
    measurements=Measurements(
        width=MeasurementValue(175, 'cm'),
        length=MeasurementValue(300, 'cm'),
        height=MeasurementValue(150, 'cm'),
        weight=MeasurementValue(1000, 'kg')
    )
)