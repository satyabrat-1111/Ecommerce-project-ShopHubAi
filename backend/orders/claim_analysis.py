import base64
import json
import logging
import mimetypes
from io import BytesIO

import requests
from django.conf import settings
from PIL import Image


logger = logging.getLogger(__name__)


def _image_bytes(image_field):
    image_field.open("rb")
    try:
        return image_field.read()
    finally:
        image_field.close()


def calculate_visual_similarity(reference_bytes, evidence_bytes):
    def average_hash(image_bytes):
        with Image.open(BytesIO(image_bytes)) as image:
            pixels = list(
                image.convert("L")
                .resize((8, 8), Image.Resampling.LANCZOS)
                .getdata()
            )
        average = sum(pixels) / len(pixels)
        return tuple(pixel >= average for pixel in pixels)

    try:
        reference_hash = average_hash(reference_bytes)
        evidence_hash = average_hash(evidence_bytes)
    except Exception:
        return None

    matching_bits = sum(
        reference_bit == evidence_bit
        for reference_bit, evidence_bit in zip(
            reference_hash,
            evidence_hash,
        )
    )
    return round(matching_bits / len(reference_hash) * 100, 1)


def _data_url(image_field, image_bytes):
    content_type = (
        mimetypes.guess_type(image_field.name)[0]
        or "image/jpeg"
    )
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{content_type};base64,{encoded}"


def _analyze_with_vision_model(
    issue_type,
    reference_image,
    evidence_image,
    reference_bytes,
    evidence_bytes,
):
    api_key = getattr(settings, "OPENAI_API_KEY", "")
    if not api_key:
        return None

    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": getattr(
                settings,
                "OPENAI_VISION_MODEL",
                "gpt-4o-mini",
            ),
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You assist an ecommerce human reviewer. "
                        "Compare the catalog reference image with the "
                        "customer evidence image. Do not infer damage "
                        "from image quality or packaging alone. Return "
                        "JSON with product_match (match, mismatch, or "
                        "uncertain), damage_visible (true, false, or "
                        "null), confidence (0 to 1), and a concise "
                        "evidence-based summary. This is advisory only; "
                        "never make a refund decision."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                f"Customer issue: {issue_type}. "
                                "Image 1 is the catalog reference; "
                                "image 2 is the received product."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": _data_url(
                                    reference_image,
                                    reference_bytes,
                                ),
                            },
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": _data_url(
                                    evidence_image,
                                    evidence_bytes,
                                ),
                            },
                        },
                    ],
                },
            ],
            "max_tokens": 250,
        },
        timeout=(5, 30),
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    result = json.loads(content)
    confidence = float(result.get("confidence", 0))

    return {
        "provider": "openai-vision",
        "model": getattr(
            settings,
            "OPENAI_VISION_MODEL",
            "gpt-4o-mini",
        ),
        "product_match": result.get("product_match", "uncertain"),
        "damage_visible": result.get("damage_visible"),
        "confidence": max(0, min(confidence, 1)),
        "summary": str(result.get("summary", ""))[:500],
    }


def analyze_claim_images(reference_image, evidence_image, issue_type):
    if not reference_image:
        return {
            "provider": "unavailable",
            "product_match": "uncertain",
            "damage_visible": None,
            "confidence": None,
            "summary": "No catalog reference image is available for comparison.",
        }, None

    reference_bytes = _image_bytes(reference_image)
    evidence_bytes = _image_bytes(evidence_image)
    similarity = calculate_visual_similarity(
        reference_bytes,
        evidence_bytes,
    )

    try:
        model_result = _analyze_with_vision_model(
            issue_type,
            reference_image,
            evidence_image,
            reference_bytes,
            evidence_bytes,
        )
    except Exception as exc:
        logger.warning(
            "Vision model analysis unavailable: %s",
            type(exc).__name__,
        )
        model_result = None

    if model_result:
        return model_result, similarity

    similarity_text = (
        f"The two images have {similarity}% visual similarity. "
        if similarity is not None
        else "The images could not be compared automatically. "
    )
    return {
        "provider": "local-image-similarity",
        "model": "average-hash",
        "product_match": "uncertain",
        "damage_visible": None,
        "confidence": None,
        "summary": (
            similarity_text
            + "This local comparison cannot determine damage; "
            "admin review is required."
        ),
    }, similarity