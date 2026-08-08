# IKEA Car Fit

A web app that helps determine whether an IKEA shopping trolley can fit
in a particular car.

## Current investigation

Determine how IKEA product/package information can be obtained from an
article number.

### Required product data

- Article number
- Product name
- Number of packages
- Package dimensions
- Package weight

### Current approaches

1. IKEA internal/product APIs
2. Structured JSON embedded in IKEA product HTML

## Development

Create and activate the virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Install Dependencies
```bash
pip install -e ".[dev]"
```

