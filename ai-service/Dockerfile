FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    IMAGE_DIR=/app/demo-imagery

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY *.py ./
# demo frames are baked in; mount real imagery over /app/demo-imagery in prod
COPY demo-imagery/ ./demo-imagery/

RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 8001
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
