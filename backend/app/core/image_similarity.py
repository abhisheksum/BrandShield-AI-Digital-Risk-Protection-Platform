import io
from typing import Optional, Dict, Any
from PIL import Image
import imagehash
import httpx

def calculate_image_hash_from_bytes(data: bytes) -> str:
    """Calculates perceptual hash (dHash + aHash combination) from raw image bytes."""
    img = Image.open(io.BytesIO(data))
    # Combine average and difference hash for robustness against resizing & slight tint
    d_hash = str(imagehash.dhash(img))
    a_hash = str(imagehash.average_hash(img))
    return f"{d_hash}:{a_hash}"

async def fetch_and_hash_image(url: str, timeout: float = 3.0) -> Optional[str]:
    """Fetches image from URL and computes perceptual hash. Returns None if unreachable."""
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return calculate_image_hash_from_bytes(resp.content)
    except Exception:
        pass
    return None

def compare_hashes(hash1: Optional[str], hash2: Optional[str]) -> Dict[str, Any]:
    """
    Compares two perceptual hashes.
    Each hash is formatted as 'dhash:ahash' (hex strings).
    Returns similarity score (0.0 to 100.0) and explanation.
    """
    if not hash1 or not hash2:
        return {
            "available": False,
            "similarity": None,
            "explanation": "Image or logo not provided for comparison"
        }

    try:
        parts1 = hash1.split(":")
        parts2 = hash2.split(":")

        h1_d = imagehash.hex_to_hash(parts1[0])
        h2_d = imagehash.hex_to_hash(parts2[0])
        diff_d = h1_d - h2_d  # Hamming distance (0 to 64)

        if len(parts1) > 1 and len(parts2) > 1:
            h1_a = imagehash.hex_to_hash(parts1[1])
            h2_a = imagehash.hex_to_hash(parts2[1])
            diff_a = h1_a - h2_a
            total_diff = (diff_d * 0.6) + (diff_a * 0.4)
        else:
            total_diff = float(diff_d)

        # Max Hamming distance for 64-bit hash is 64.
        # A distance of <= 5 indicates near identical image.
        # Distance > 25 indicates completely different image.
        if total_diff <= 2:
            similarity = 100.0
            explanation = "Near exact perceptual visual match of official logo"
        elif total_diff <= 10:
            similarity = round(max(0.0, 100.0 - (total_diff * 4.0)), 2)
            explanation = f"High visual similarity to official brand logo (Hamming distance: {round(total_diff, 1)})"
        elif total_diff <= 20:
            similarity = round(max(0.0, 60.0 - ((total_diff - 10) * 3.0)), 2)
            explanation = f"Moderate visual resemblance to official brand logo"
        else:
            similarity = round(max(0.0, 100.0 - (total_diff * 1.5)), 2)
            explanation = f"Distinct image (Hamming distance: {round(total_diff, 1)})"

        return {
            "available": True,
            "similarity": similarity,
            "hamming_distance": round(total_diff, 2),
            "explanation": explanation
        }
    except Exception as e:
        return {
            "available": False,
            "similarity": None,
            "explanation": f"Unable to parse image hash: {str(e)}"
        }
