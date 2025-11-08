FROM python:3.11-slim
WORKDIR /app
COPY yolo_service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY yolo_service /app
EXPOSE 7000
ENV MODEL_PATH=/app/models/best.pt CONF=0.25 IOU=0.45 IMGSZ=640
CMD ["python","app.py"]
