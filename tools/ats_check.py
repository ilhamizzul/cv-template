"""Uji keterbacaan PDF ATS dengan tiga pengurai teks berbeda.

Banyak ATS dan parser CV memakai pengurai PDF biasa (pdfminer, pdftotext/poppler, pypdf)
sebelum memecah teks menjadi bagian. Kalau ketiganya membaca teks yang sama, urutan bagian
benar, dan tidak ada karakter rusak, PDF dianggap lulus standar Glowfolio.

Pakai:
    python3 tools/ats_check.py out/                      semua *-ats.pdf di folder
    python3 tools/ats_check.py out/x-id-ats.pdf --data data/cv.json --private private/cv.private.json
Butuh: pip install pdfminer.six pypdf  (pdftotext opsional, dari poppler-utils)
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

from pdfminer.high_level import extract_text as pdfminer_text
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
HEADINGS = {
    "id": ["RINGKASAN", "PENGALAMAN KERJA", "PROYEK", "PENDIDIKAN", "KEAHLIAN", "SERTIFIKASI", "BAHASA", "ORGANISASI", "PENGHARGAAN"],
    "en": ["SUMMARY", "WORK EXPERIENCE", "PROJECTS", "EDUCATION", "SKILLS", "CERTIFICATIONS", "LANGUAGES", "LEADERSHIP & ACTIVITIES", "AWARDS"],
}
KEYS = ["summary", "experience", "projects", "education", "skills", "certifications", "languages", "organizations", "awards"]
LIGATURES = re.compile("[ﬀ-ﬆ]")
BROKEN = re.compile("[�-]")
DATE = re.compile(r"\b(0[1-9]|1[0-2])/\d{4}\b")
EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+")


def norm(s):
    return re.sub(r"\s+", " ", s.replace("­", "")).strip()


def pick(v, lang):
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    return v.get(lang) or v.get("id") or v.get("en") or ""


def extractors(pdf):
    out = {"pdfminer": pdfminer_text(str(pdf)), "pypdf": "\n".join(p.extract_text() or "" for p in PdfReader(str(pdf)).pages)}
    if shutil.which("pdftotext"):
        out["pdftotext"] = subprocess.run(["pdftotext", "-enc", "UTF-8", str(pdf), "-"], capture_output=True, text=True).stdout
    return out


def fonts_ok(reader):
    bad = []
    for page in reader.pages:
        fonts = (page.get("/Resources") or {}).get("/Font") or {}
        for name, ref in fonts.items():
            f = ref.get_object()
            if "/ToUnicode" not in f:
                bad.append(str(f.get("/BaseFont", name)))
    return bad


def image_count(reader):
    n = 0
    for page in reader.pages:
        xobj = ((page.get("/Resources") or {}).get("/XObject") or {})
        n += sum(1 for x in xobj.values() if x.get_object().get("/Subtype") == "/Image")
    return n


def expected_strings(data, priv, lang):
    p = data["profile"]
    want = [p["fullName"], pick(p["headline"], lang)]
    if priv:
        want.append(priv["contact"]["email"])
        if priv["contact"].get("phone") and priv["contact"].get("showPhoneOnPdf", True):
            want.append(priv["contact"]["phone"])
    for group in (data.get("experience", []), data.get("organizations", [])):
        for e in group:
            want += [pick(e["role"], lang), e["organization"]]
            want += [pick(a["bullet"], lang) for a in e.get("achievements", [])]
    for ed in data.get("education", []):
        want.append(ed["institution"])
    for g in data.get("skills", {}).get("groups", []):
        want += [i["name"] for i in g["items"]]
    return [w for w in want if w]


def apply_variant(data, pdf_name):
    """PDF varian (nama file memuat id varian) hanya memuat pencapaian yang dipilih varian itu."""
    for v in data.get("variants", []):
        if f"-{v['id']}-" in pdf_name and v.get("achievementOrder"):
            keep = set(v["achievementOrder"])
            data = json.loads(json.dumps(data))
            for group in (data.get("experience", []), data.get("organizations", [])):
                for e in group:
                    e["achievements"] = [a for a in e.get("achievements", []) if a["id"] in keep]
    return data


def check(pdf, data, priv, target_pages):
    data = apply_variant(data, pdf.name)
    lang = "en" if "-en-" in pdf.name else "id"
    reader = PdfReader(str(pdf))
    texts = extractors(pdf)
    order = (data.get("outputs", {}).get("ats", {}).get("sectionOrder")) or KEYS
    present = [k for k in order if k == "summary" or data.get(k) or (k == "skills" and data.get("skills"))]
    heads = [HEADINGS[lang][KEYS.index(k)] for k in present]
    rows = []

    def row(name, ok, note=""):
        rows.append((name, ok, note))

    row("Jumlah halaman", len(reader.pages) <= target_pages, f"{len(reader.pages)} (target {target_pages})")
    row("Tanpa gambar/grafis raster", image_count(reader) == 0, f"{image_count(reader)} gambar")
    bad_fonts = fonts_ok(reader)
    row("Semua font punya peta Unicode", not bad_fonts, ", ".join(bad_fonts))
    for name, txt in texts.items():
        t = norm(txt)
        up = t.upper()
        idx = [up.find(h) for h in heads]
        missing_heads = [h for h, i in zip(heads, idx) if i < 0]
        in_order = not missing_heads and idx == sorted(idx)
        row(f"[{name}] judul bagian lengkap & berurutan", in_order, ", ".join(missing_heads) or " → ".join(heads))
        missing = [w for w in expected_strings(data, priv, lang) if norm(w) not in t]
        row(f"[{name}] semua isi terbaca utuh", not missing, "; ".join(m[:50] for m in missing[:4]))
        row(f"[{name}] tanpa ligatur/karakter rusak", not LIGATURES.search(txt) and not BROKEN.search(txt), "")
        row(f"[{name}] tanggal MM/YYYY terbaca", len(DATE.findall(t)) >= 2, f"{len(DATE.findall(t))} tanggal")
        if priv:
            m = EMAIL.search(t)
            row(f"[{name}] email terbaca", bool(m) and m.group(0) == priv["contact"]["email"], m.group(0) if m else "-")
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--data", default=str(ROOT / "data" / "cv.json"))
    ap.add_argument("--private", default=str(ROOT / "tests" / "fixtures" / "nadia.private.json"))
    a = ap.parse_args()
    data = json.loads(Path(a.data).read_text(encoding="utf-8"))
    priv_path = Path(a.private)
    priv = json.loads(priv_path.read_text(encoding="utf-8")) if priv_path.exists() else None
    target = data.get("outputs", {}).get("ats", {}).get("pages", 1)
    p = Path(a.path)
    pdfs = sorted(p.glob("*-ats.pdf")) if p.is_dir() else [p]
    if not pdfs:
        print("Tidak ada *-ats.pdf")
        return 1
    all_ok = True
    for pdf in pdfs:
        rows = check(pdf, data, priv, target)
        ok = all(r[1] for r in rows)
        all_ok &= ok
        print(f"\n{pdf.name}: {'LULUS' if ok else 'GAGAL'}")
        for name, good, note in rows:
            print(f"  {'✓' if good else '✗'} {name}{f'  ({note})' if note else ''}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
