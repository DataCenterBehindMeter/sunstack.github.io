"""Generate hero + illustration images for the SunStack pitch-deck website.

Uses OpenAI gpt-image-2-2026-04-21. Style matches the SunStack website:
warm sun-amber (#e8932a) accent on parchment / near-black surfaces, Apple-
keynote minimalism, editorial photography or clean flat illustration, and
absolutely NO text in the image (all labels are rendered in HTML on top).

- Loads OPENAI_API_KEY from the PARENT `.env` (…/sunstack/.env) so the key is
  never copied into the website repo.
- Idempotent: skips any file that already exists. Use `--force NAME[,NAME2]`
  (or `--force all`) to regenerate specific images.
- Concurrent (thread pool). Costs real money — regenerate selectively.

Run:  python3 tools/generate_images.py            # fill any missing images
      python3 tools/generate_images.py --force cover-hero
"""

import base64
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from openai import OpenAI

SCRIPT_DIR = Path(__file__).resolve().parent
WEBSITE_DIR = SCRIPT_DIR.parent
SUNSTACK_DIR = WEBSITE_DIR.parent            # …/implementations/sunstack
OUT_DIR = WEBSITE_DIR / "assets" / "img"
OUT_DIR.mkdir(parents=True, exist_ok=True)

MODEL = "gpt-image-2-2026-04-21"
SIZE = "1536x1024"
QUALITY = "high"
MAX_WORKERS = 4

# One shared cohesion line appended to every prompt so all images read as a
# single family. Each prompt still carries its own photographic / illustration
# direction.
COHESION = (
    "Cohesive image family for a premium product presentation: warm sun-amber "
    "(#e8932a) with soft gold (#f3b865) as the single accent colour, warm "
    "off-white parchment (#faf8f4) and near-black (#161410) surfaces, at most a "
    "small muted teal (#5db8a6) secondary detail. Calm, optimistic, confident, "
    "generous negative space, soft natural light. Absolutely no text, letters, "
    "numbers, captions, logos, watermarks or user-interface elements anywhere "
    "in the image."
)


def load_env(path: Path) -> None:
    if not path.exists():
        sys.exit(f"ERROR: no .env at {path} (need OPENAI_API_KEY)")
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env(SUNSTACK_DIR / ".env")
client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])


# (filename, prompt)
FIGURES = [
    (
        "cover-hero.png",
        "A wide cinematic aerial photograph at golden hour of an Australian "
        "suburban neighbourhood: rows of low single-family houses with dark "
        "solar panels on their rooftops catching warm low-angle sunlight, long "
        "soft shadows, gentle golden haze, tree-lined streets. Warm honey and "
        "amber tones across the whole scene, wide open sky in the upper third "
        "(kept simple so a dark overlay can sit on top). Realistic editorial "
        "photography, high detail, aspirational and calm.",
    ),
    (
        "value-flow.png",
        "A clean flat editorial illustration on a warm off-white parchment "
        "background, read left to right as a gentle four-step journey: (1) a "
        "small sunny pitched-roof house with solar panels and a recognizable "
        "compact wall-mounted home battery installed beside the house, (2) a small matte rounded "
        "compute box, (3) a soft cluster of little houses joined as a small "
        "network, (4) an open laptop. The four are linked by smooth flowing "
        "amber lines that suggest sunlight turning into intelligence. Simple "
        "geometric shapes, thin confident linework, subtle warm shadow. "
        "Balanced horizontal composition with even spacing.",
    ),
    (
        "node-garage.png",
        "A photorealistic product-photography shot of a small sealed matte-"
        "finish compute appliance, about the size of a large desktop computer, "
        "mounted cleanly on a bright white garage wall. Warm natural daylight "
        "from the side, one soft shadow, a hint of a tidy solar inverter and "
        "neat conduit nearby, shallow depth of field. A single subtle amber "
        "status light glows on the device. Calm, premium, uncluttered. No "
        "visible branding.",
    ),
    (
        "three-party.png",
        "A single cohesive flat editorial illustration on warm parchment "
        "showing three connected scenes in one horizontal row: on the left a "
        "cosy house with a solar roof; in the centre an abstract routing hub "
        "made of soft concentric rings and small dots; on the right a small "
        "calm desk with an open laptop. Gentle amber flow lines link the three "
        "scenes. Simple geometry, thin linework, generous negative space, one "
        "small muted-teal detail.",
    ),
    (
        "network-topology.png",
        "One single unified wide scene, edge to edge, on a deep near-black warm "
        "background: an elegant abstract constellation of many small warm amber "
        "glowing dots representing homes, all softly connected by thin flowing "
        "amber light-lines into one continuous gentle web that spans the whole "
        "frame, with two or three slightly brighter hub points. Soft bloom, "
        "depth and glow, premium and calm. IMPORTANT: it must be ONE continuous "
        "image — not a collage, not split panels, no separate boxes or framed "
        "sub-images, and absolutely no physical objects, bowls, plates, leaves, "
        "plants or product photography. Only points of light and thin connecting "
        "lines on a black background.",
    ),
    (
        "homeowner-spot.png",
        "A warm, authentic natural-light photograph of a person standing in the "
        "bright driveway or open garage of an Australian home, glancing down at "
        "a phone in their hand with a relaxed, hopeful expression. Solar panels "
        "are visible on the roof behind them. Golden-hour light, shallow depth "
        "of field, editorial and genuine. No readable screen content.",
    ),
    (
        "buyer-spot.png",
        "A warm natural-light photograph of a focused creator or software "
        "developer working at an open laptop in a calm, tidy, modern Australian "
        "workspace with soft daylight, a few plants and a wooden desk. Shallow "
        "depth of field, optimistic and premium editorial mood. No readable "
        "screen content.",
    ),
    (
        "society-spot.png",
        "ONE single continuous wide photograph, edge to edge, of an Australian "
        "suburban neighbourhood seen from a gentle elevation in the warm light "
        "just after sunset: rows of rooftops with solar panels, a few warm-lit "
        "windows, distant city towers on the horizon, a calm sense of a whole "
        "community quietly at work. Optimistic, clean, editorial, warm amber "
        "with a soft teal-blue dusk sky. IMPORTANT: a single unified photograph "
        "only — NOT a collage, no split panels, no separate framed images, and "
        "no still-life objects (no glasses, books, vases, bowls or arches).",
    ),
]


def generate_one(filename: str, prompt: str) -> tuple[str, bool, str]:
    full_prompt = f"{prompt}\n\n{COHESION}"
    try:
        t0 = time.time()
        result = client.images.generate(
            model=MODEL,
            prompt=full_prompt,
            size=SIZE,
            quality=QUALITY,
            n=1,
        )
        data = result.data or []
        if not data or not data[0].b64_json:
            raise RuntimeError("API returned no image data")
        img_bytes = base64.b64decode(data[0].b64_json)
        (OUT_DIR / filename).write_bytes(img_bytes)
        dt = time.time() - t0
        return filename, True, f"{len(img_bytes)/1024:7.1f}KB  {dt:5.1f}s"
    except Exception as e:  # noqa: BLE001 - report and continue
        return filename, False, f"{type(e).__name__}: {e}"


def main() -> int:
    force = set()
    if "--force" in sys.argv:
        val = sys.argv[sys.argv.index("--force") + 1]
        force = {"all"} if val == "all" else set(val.split(","))

    todo = []
    for filename, prompt in FIGURES:
        stem = filename.removesuffix(".png")
        exists = (OUT_DIR / filename).exists()
        if exists and "all" not in force and stem not in force and filename not in force:
            print(f"  --  {filename:22s} exists, skipping")
            continue
        todo.append((filename, prompt))

    if not todo:
        print("\nNothing to generate (all images present). Use --force NAME to redo.")
        return 0

    print(f"\nModel: {MODEL}  size: {SIZE}  quality: {QUALITY}")
    print(f"Output: {OUT_DIR}")
    print(f"Generating {len(todo)} image(s) with {MAX_WORKERS} workers...\n")

    ok = 0
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = {ex.submit(generate_one, f, p): f for f, p in todo}
        for fut in as_completed(futures):
            filename, success, msg = fut.result()
            tag = "OK " if success else "XX "
            print(f"  {tag} {filename:22s} {msg}")
            ok += 1 if success else 0

    print(f"\nDone: {ok}/{len(todo)} succeeded")
    return 0 if ok == len(todo) else 1


if __name__ == "__main__":
    sys.exit(main())
