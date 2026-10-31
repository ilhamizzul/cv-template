"""Generator figur iso-glow untuk web CV dan PDF.

    python3 tools/figures.py            menulis figures/<symbol>.svg

Satu figur = satu profesi. Gaya: garis tipis di panel gelap; hanya bagian yang "hidup"
(layar menyala, LED, cairan sampel, garis desain) yang memakai warna aksen. Warna aksen tidak
ditulis di SVG: kelas .gl/.acf/.acft/.gline/.pulse/.halo memakai var(--accent) dari brand klien.

Kelas (lihat src/assets/iso.css):
  ft ff fs   sisi atas / depan / samping balok        dt   garis detail
  ln ln2     garis isi redup                          ink  tinta gelap di atas layar menyala
  gl         bidang menyala (layar)                   acf  titik/elemen menyala
  acft       sisi atas balok yang menyala             gline garis menyala
  pulse      kilatan cahaya yang berjalan di kabel (hanya bergerak di web, mode interactive)
  halo       cahaya lembut di belakang bagian menyala
Proyeksi dari iso-figure (Tolga Cohce, MIT) lewat skill iso-glow.
"""
import math
from pathlib import Path

C = math.cos(math.pi / 6)
S = math.sin(math.pi / 6)
OUT = Path(__file__).resolve().parent.parent / "figures"


def D(x, y, z):
    return ((x - y) * C, (x + y) * S - z)


class Fig:
    def __init__(self):
        self.parts, self.pts = [], []

    def mat(self, O, U, V):
        o, u, v = D(*O), D(*U), D(*V)
        return f"matrix({u[0]:.4f} {u[1]:.4f} {v[0]:.4f} {v[1]:.4f} {o[0]:.2f} {o[1]:.2f})"

    def TOP(self, x, y, z):
        return self.mat((x, y, z), (1, 0, 0), (0, 1, 0))

    def FRONT(self, x, y, z):  # bidang y = maks, menghadap kiri-bawah
        return self.mat((x, y, z), (1, 0, 0), (0, 0, -1))

    def SIDE(self, x, y, z):  # bidang x = maks, menghadap kanan-bawah
        return self.mat((x, y, z), (0, -1, 0), (0, 0, -1))

    def track(self, x, y, z, w, d, h):
        for a in (x, x + w):
            for b in (y, y + d):
                for c in (z, z + h):
                    self.pts.append(D(a, b, c))

    def box(self, x, y, z, w, d, h, top="ft", front="ff", side="fs"):
        self.track(x, y, z, w, d, h)
        self.parts.append(f'<g transform="{self.SIDE(x + w, y + d, z + h)}"><rect class="{side}" width="{d}" height="{h}"/></g>')
        self.parts.append(f'<g transform="{self.FRONT(x, y + d, z + h)}"><rect class="{front}" width="{w}" height="{h}"/></g>')
        self.parts.append(f'<g transform="{self.TOP(x, y, z + h)}"><rect class="{top}" width="{w}" height="{d}"/></g>')

    def on(self, T, inner):
        self.parts.append(f'<g transform="{T}">{inner}</g>')

    def svg(self, label, pad=10):
        xs = [p[0] for p in self.pts]
        ys = [p[1] for p in self.pts]
        x0, y0 = min(xs) - pad, min(ys) - pad
        w, h = max(xs) - x0 + pad, max(ys) - y0 + pad
        defs = ('<defs>'
                '<filter id="gf-glow" filterUnits="userSpaceOnUse" x="-500" y="-500" width="1500" height="1500">'
                '<feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
                '<filter id="gf-bloom" filterUnits="userSpaceOnUse" x="-500" y="-500" width="1500" height="1500"><feGaussianBlur stdDeviation="9"/></filter>'
                '</defs>')
        return (f'<svg class="iso" xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.1f} {y0:.1f} {w:.1f} {h:.1f}" '
                f'role="img" aria-label="{label}">{defs}' + "".join(self.parts) + "</svg>\n")


def plate(f, w=170, d=130):
    f.box(0, 0, 0, w, d, 6)
    f.on(f.TOP(0, 0, 6), f'<rect class="dt" x="7" y="7" width="{w - 14}" height="{d - 14}" rx="6"/>'
         + "".join(f'<circle class="dt" cx="{cx}" cy="{cy}" r="2"/>' for cx, cy in [(14, 14), (w - 14, 14), (14, d - 14), (w - 14, d - 14)]))


def slits(x0, x1, step, y0, y1, cls="dt"):
    out, x = [], x0
    while x <= x1 + 1e-6:
        out.append(f'<line class="{cls}" x1="{x:.1f}" y1="{y0}" x2="{x:.1f}" y2="{y1}"/>')
        x += step
    return "".join(out)


# ------------------------------------------------------------------ developer
def server_rack():
    f = Fig()
    plate(f)
    # Rak server: muka depan (FRONT, y = 70) menghadap penonton, empat unit.
    f.box(18, 26, 6, 58, 44, 108)
    units = ""
    for i in range(4):
        y = 6 + i * 25
        lit = i == 1
        units += f'<rect class="dt" x="5" y="{y}" width="48" height="21" rx="2"/>'
        units += slits(9, 31, 3, y + 5, y + 16)
        units += "".join(f'<circle class="{"acf" if (lit or (i == 3 and k == 0)) else "ln"}" cx="{38 + k * 5}" cy="{y + 7}" r="1.6"/>' for k in range(3))
        units += f'<rect class="{"gl" if lit else "ln2"}" x="36" y="{y + 12}" width="13" height="4" rx="1"/>'
    f.on(f.FRONT(18, 70, 114), units)
    f.on(f.SIDE(76, 70, 114), slits(6, 38, 4, 8, 98))
    # Kabel dari rak ke laptop di lantai (bidang atas plat), dengan kilatan cahaya.
    cable = "M 34 72 C 30 112, 84 120, 108 100"
    f.on(f.TOP(0, 0, 6), f'<path class="wire" d="{cable}"/><path class="pulse" pathLength="1000" d="{cable}"/>')
    # Laptop: alas dan layar berdiri di tepi belakang alas.
    f.box(98, 56, 6, 58, 42, 4)
    f.on(f.TOP(98, 56, 10), "".join(f'<rect class="dt" x="{5 + c * 7.2:.1f}" y="{18 + r * 6}" width="5.4" height="4.2" rx=".8"/>' for r in range(3) for c in range(7))
         + '<rect class="dt" x="19" y="36" width="20" height="4" rx="1"/>')
    f.box(98, 53, 10, 58, 3, 42)
    f.parts.append(f'<g transform="{f.FRONT(98, 56, 52)}"><rect class="halo" x="4" y="4" width="50" height="34" rx="2"/></g>')
    code = [(6, 10, 18), (10, 16, 26), (10, 22, 14), (14, 28, 22), (6, 34, 10)]
    f.on(f.FRONT(98, 56, 52), '<rect class="gl" x="4" y="4" width="50" height="34" rx="2"/>'
         + "".join(f'<rect class="ink" x="{4 + x}" y="{y - 1}" width="{w}" height="2.6" rx="1"/>' for x, y, w in code)
         + '<rect class="ink" x="36" y="31" width="3" height="5"/>')
    return f.svg("Rak server dengan unit yang menyala, terhubung kabel ke laptop yang menampilkan kode")


# ------------------------------------------------------------------ data analyst
def data_chart():
    f = Fig()
    plate(f)
    # Monitor dasbor di belakang.
    f.box(16, 20, 6, 96, 4, 52)
    f.parts.append(f'<g transform="{f.FRONT(16, 24, 58)}"><rect class="halo" x="5" y="5" width="86" height="40" rx="2"/></g>')
    f.on(f.FRONT(16, 24, 58),
         '<rect class="dt" x="5" y="5" width="86" height="40" rx="2"/>'
         + slits(14, 86, 12, 10, 40, "ln2")
         + '<polyline class="gline" points="10,36 22,30 34,33 48,22 62,24 76,13 86,9" fill="none"/>'
         + '<polyline class="pulse" pathLength="1000" points="10,36 22,30 34,33 48,22 62,24 76,13 86,9" fill="none"/>'
         + '<circle class="acf" cx="86" cy="9" r="2.6"/>')
    f.box(58, 24, 6, 12, 10, 2)
    # Grafik batang 3D di depan; batang tertinggi menyala.
    for i, h in enumerate([20, 32, 26, 50]):
        x = 18 + i * 22
        f.box(x, 72, 6, 14, 14, h, top="acft" if i == 3 else "ft")
        if i == 3:
            f.on(f.FRONT(x, 86, 6 + h), f'<rect class="gl" x="2" y="2" width="10" height="{h - 4}" rx="1" opacity=".35"/>')
    # Tumpukan database, disk teratas aktif.
    for k in range(3):
        f.box(124, 34, 6 + k * 13, 30, 30, 10)
        f.on(f.FRONT(124, 64, 16 + k * 13), f'<rect class="{"acf" if k == 2 else "ln"}" x="4" y="3.5" width="6" height="3" rx="1"/>' + slits(16, 26, 2.5, 2.5, 7.5))
    return f.svg("Dasbor dengan grafik garis yang menyala, grafik batang, dan tumpukan database")


# ------------------------------------------------------------------ QA pangan
def food_lab():
    f = Fig()
    plate(f)
    # Rak tabung reaksi di belakang kiri.
    f.box(14, 22, 6, 74, 22, 12)
    for i in range(5):
        x = 20 + i * 13
        lit = i == 2
        f.box(x, 29, 18, 8, 8, 46, top="acft" if lit else "ft")
        f.on(f.TOP(x, 29, 64), '<rect class="dt" x="1.5" y="1.5" width="5" height="5" rx="2.5"/>')
        level = [18, 26, 36, 14, 22][i]
        if lit:
            f.on(f.FRONT(x, 37, 64), f'<rect class="halo" x="-4" y="{46 - level - 4}" width="16" height="{level + 4}" rx="3"/>')
        f.on(f.FRONT(x, 37, 64), f'<rect class="{"gl" if lit else "ln2"}" x="1.2" y="{46 - level}" width="5.6" height="{level - 1}" rx="1"/>'
             + ('<rect class="ink" x="2.6" y="14" width="2.8" height="1.4"/><rect class="ink" x="2.6" y="20" width="2.8" height="1.4"/>' if lit else ''))
    f.on(f.FRONT(14, 44, 18), "".join(f'<rect class="dt" x="{6 + i * 13}" y="3" width="8" height="6" rx="1"/>' for i in range(5)))
    # Cawan petri di lantai (lingkaran di bidang atas jadi elips iso); satu koloni menyala.
    for cx, cy, on in [(30, 70, False), (56, 78, True), (32, 98, False)]:
        f.on(f.TOP(0, 0, 6), f'<circle class="ff" cx="{cx}" cy="{cy}" r="11"/><circle class="dt" cx="{cx}" cy="{cy}" r="8"/>'
             + (f'<circle class="halo" cx="{cx}" cy="{cy}" r="7"/><circle class="acf" cx="{cx - 2}" cy="{cy - 1}" r="2.4"/><circle class="acf" cx="{cx + 3}" cy="{cy + 2}" r="1.6"/>'
                if on else f'<circle class="ln" cx="{cx - 2}" cy="{cy + 1}" r="1.6"/>'))
    # Papan checklist mutu dengan centang menyala.
    f.box(96, 22, 6, 58, 76, 4)
    f.box(116, 18, 10, 18, 9, 5)
    rows = ""
    for i, on in enumerate([1, 1, 1, 0]):
        y = 14 + i * 15
        rows += f'<rect class="{"acf" if on else "dt"}" x="8" y="{y}" width="8" height="8" rx="1.5"/>'
        rows += f'<rect class="ln" x="22" y="{y + 1}" width="{26 - i * 3}" height="2"/><rect class="ln2" x="22" y="{y + 5}" width="{18 + i * 4}" height="2"/>'
    f.on(f.TOP(96, 22, 10), rows + '<text class="tx" x="8" y="74">QC · LOLOS</text>')
    # Termometer sampel di depan papan, ujungnya menyala.
    f.box(100, 104, 6, 46, 6, 4)
    f.on(f.TOP(100, 104, 10), '<rect class="acf" x="2" y="1.5" width="8" height="3" rx="1.5"/>' + slits(14, 42, 4, 1, 5))
    return f.svg("Rak tabung reaksi dengan satu sampel menyala, cawan petri, dan checklist mutu yang lolos")


# ------------------------------------------------------------------ desainer
def design_desk():
    f = Fig()
    plate(f)
    # Monitor kanvas desain: kurva bezier dengan titik jangkar menyala, swatch warna.
    f.box(14, 18, 6, 100, 4, 60)
    f.box(56, 22, 6, 16, 12, 2)
    f.parts.append(f'<g transform="{f.FRONT(14, 22, 66)}"><rect class="halo" x="22" y="8" width="70" height="40" rx="2"/></g>')
    curve = "M 26 46 C 40 6, 66 50, 86 14"
    f.on(f.FRONT(14, 22, 66),
         '<rect class="dt" x="4" y="4" width="92" height="52" rx="2"/>'
         + '<rect class="dt" x="8" y="9" width="10" height="42" rx="1"/>'
         + "".join(f'<rect class="{"acf" if k == 1 else "ln"}" x="10" y="{12 + k * 9}" width="6" height="6" rx="1"/>' for k in range(4))
         + f'<path class="gline" d="{curve}" fill="none"/><path class="pulse" pathLength="1000" d="{curve}" fill="none"/>'
         + '<line class="dt" x1="26" y1="46" x2="40" y2="6"/><line class="dt" x1="86" y1="14" x2="66" y2="50"/>'
         + '<rect class="acf" x="23.5" y="43.5" width="5" height="5"/><rect class="acf" x="83.5" y="11.5" width="5" height="5"/>'
         + '<circle class="ink-ring" cx="40" cy="6" r="2"/><circle class="ink-ring" cx="66" cy="50" r="2"/>')
    # Tablet gambar di depan dengan goresan menyala, stylus di sampingnya.
    f.box(22, 62, 6, 84, 54, 4)
    stroke = "M 14 38 C 26 14, 44 40, 58 20 S 70 30, 72 16"
    f.on(f.TOP(22, 62, 10), '<rect class="dt" x="8" y="7" width="68" height="40" rx="3"/>'
         + f'<path class="halo-line" d="{stroke}" fill="none"/><path class="gline" d="{stroke}" fill="none"/>'
         + '<circle class="acf" cx="72" cy="16" r="2.2"/>')
    f.box(112, 70, 6, 6, 46, 4, top="ft")
    f.on(f.TOP(112, 70, 10), '<rect class="acf" x="1.5" y="1" width="3" height="5" rx="1.5"/>')
    # Kipas palet warna di kanan belakang; kartu teratas aksen.
    for k in range(3):
        f.box(128, 30 + k * 6, 6 + k * 3, 26, 34, 3)
    f.on(f.TOP(128, 42, 18), '<rect class="acf" x="4" y="4" width="18" height="9" rx="1.5"/>'
         + '<rect class="ln" x="4" y="16" width="18" height="4" rx="1"/><rect class="ln2" x="4" y="22" width="18" height="4" rx="1"/><rect class="ln2" x="4" y="28" width="12" height="3" rx="1"/>')
    return f.svg("Monitor desain dengan kurva yang menyala, tablet gambar, stylus, dan kartu palet warna")


def default():
    f = Fig()
    plate(f)
    f.box(14, 34, 6, 100, 4, 64)
    f.parts.append(f'<g transform="{f.FRONT(14, 38, 70)}"><rect class="halo" x="6" y="6" width="88" height="52" rx="2"/></g>')
    f.on(f.FRONT(14, 38, 70), '<rect class="gl" x="6" y="6" width="88" height="52" rx="2"/><rect class="ink" x="13" y="13" width="14" height="14" rx="7"/><rect class="ink" x="32" y="15" width="40" height="4"/><rect class="ink" x="32" y="23" width="28" height="3"/><rect class="ink" x="13" y="34" width="74" height="3"/><rect class="ink" x="13" y="41" width="60" height="3"/><rect class="ink" x="13" y="48" width="66" height="3"/>')
    f.box(14, 38, 6, 100, 66, 4)
    f.on(f.TOP(14, 38, 10), "".join(f'<rect class="dt" x="{10 + c * 8.4:.1f}" y="{10 + r * 9}" width="6.6" height="6.6" rx="1"/>' for r in range(4) for c in range(10)) + '<rect class="dt" x="34" y="50" width="32" height="10" rx="2"/>')
    f.box(126, 62, 6, 34, 46, 3)
    f.on(f.TOP(126, 62, 9), '<rect class="acf" x="5" y="5" width="12" height="7" rx="1"/><rect class="ln" x="5" y="17" width="24" height="2"/><rect class="ln" x="5" y="23" width="20" height="2"/><rect class="ln" x="5" y="29" width="22" height="2"/>')
    return f.svg("Laptop menampilkan web CV yang menyala")


FIGURES = {"server-rack": server_rack, "data-chart": data_chart, "food-lab": food_lab, "design-desk": design_desk, "default": default}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name, fn in FIGURES.items():
        (OUT / f"{name}.svg").write_text(fn(), encoding="utf-8")
        print("figures/" + name + ".svg")
