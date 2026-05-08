#!/usr/bin/env python3
"""Podcast post-production pipeline using FFmpeg, RNNoise, pyloudnorm, and SoX."""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

import numpy as np
import pyloudnorm as pyln
import soundfile as sf


def run(command: list[str]) -> None:
    completed = subprocess.run(command, check=False, text=True, capture_output=True)
    if completed.returncode != 0:
        raise RuntimeError(
            f"command failed ({completed.returncode}): {' '.join(command)}\n{completed.stderr.strip()}"
        )


def decode_to_wav(input_path: Path, output_path: Path) -> None:
    run([
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(input_path),
        "-ac",
        "1",
        "-ar",
        "48000",
        str(output_path),
    ])


def rnnoise_denoise(rnnoise_demo: str, input_wav: Path, work_dir: Path, output_wav: Path) -> None:
    if not shutil.which(rnnoise_demo) and not Path(rnnoise_demo).exists():
        raise RuntimeError(f"rnnoise_demo not found: {rnnoise_demo}")

    raw_input = work_dir / "input.s16le"
    raw_output = work_dir / "denoised.s16le"

    run([
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(input_wav),
        "-f",
        "s16le",
        "-acodec",
        "pcm_s16le",
        "-ac",
        "1",
        "-ar",
        "48000",
        str(raw_input),
    ])
    run([rnnoise_demo, str(raw_input), str(raw_output)])
    run([
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "s16le",
        "-ar",
        "48000",
        "-ac",
        "1",
        "-i",
        str(raw_output),
        str(output_wav),
    ])


def normalize_loudness(input_wav: Path, output_wav: Path, target_lufs: float) -> dict[str, float]:
    data, rate = sf.read(input_wav, always_2d=True)
    meter = pyln.Meter(rate)
    integrated_loudness = meter.integrated_loudness(data)

    if math.isinf(integrated_loudness) or math.isnan(integrated_loudness):
        raise RuntimeError("could not measure integrated loudness")

    normalized = pyln.normalize.loudness(data, integrated_loudness, target_lufs)
    peak = float(np.max(np.abs(normalized))) if normalized.size else 0.0
    if peak > 0.98:
        normalized = normalized * (0.98 / peak)

    sf.write(output_wav, normalized, rate)
    return {
        "input_lufs": round(float(integrated_loudness), 2),
        "target_lufs": round(float(target_lufs), 2),
        "gain_db": round(float(target_lufs - integrated_loudness), 2),
        "peak_after_limit": round(float(np.max(np.abs(normalized))) if normalized.size else 0.0, 4),
    }


def trim_silence(input_wav: Path, output_wav: Path) -> None:
    run([
        "sox",
        str(input_wav),
        str(output_wav),
        "silence",
        "1",
        "0.4",
        "-50d",
        "reverse",
        "silence",
        "1",
        "0.8",
        "-50d",
        "reverse",
    ])


def export_audio(input_wav: Path, output_path: Path, output_format: str) -> None:
    base = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(input_wav),
    ]
    if output_format == "mp3":
        codec = ["-codec:a", "libmp3lame", "-b:a", "192k"]
    elif output_format == "m4a":
        codec = ["-codec:a", "aac", "-b:a", "192k"]
    elif output_format == "wav":
        codec = ["-codec:a", "pcm_s16le"]
    else:
        raise RuntimeError(f"unsupported output format: {output_format}")
    run(base + codec + [str(output_path)])


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--target_lufs", type=float, default=-16.0)
    parser.add_argument("--format", choices=["mp3", "wav", "m4a"], default="mp3")
    parser.add_argument("--trim_silence", action="store_true")
    parser.add_argument("--rnnoise_demo", default="rnnoise_demo")
    parser.add_argument("--work_dir", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    work_dir = Path(args.work_dir)
    work_dir.mkdir(parents=True, exist_ok=True)

    decoded = work_dir / "decoded.wav"
    denoised = work_dir / "denoised.wav"
    normalized = work_dir / "normalized.wav"
    trimmed = work_dir / "trimmed.wav"

    try:
        decode_to_wav(input_path, decoded)
        rnnoise_denoise(args.rnnoise_demo, decoded, work_dir, denoised)
        metrics = normalize_loudness(denoised, normalized, args.target_lufs)
        source = normalized
        if args.trim_silence:
            trim_silence(normalized, trimmed)
            source = trimmed
        export_audio(source, output_path, args.format)
    except Exception as exc:  # noqa: BLE001 - CLI boundary should report every failure.
        print(str(exc), file=sys.stderr)
        return 1

    metrics.update({
        "format": args.format,
        "trim_silence": bool(args.trim_silence),
        "pipeline": "ffmpeg+rnnoise+pyloudnorm+sox",
    })
    print(json.dumps(metrics, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

