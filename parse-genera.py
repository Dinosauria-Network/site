import sys, re, json
from pathlib import Path

html = sys.stdin.read()
items = re.findall(r'<li class="clearfix">(.*?)</li>', html, re.DOTALL)
genera = []
for item in items:
    title_m = re.search(r'<a[^>]+title="([^"]+)"', item)
    name = title_m.group(1) if title_m else ""
    slug = name.lower().replace(" ", "-").replace("—", "-").replace("–", "-").replace("’", "").replace("'", "")
    # era classes
    era_classes = re.findall(r'class="era([^"]*)"', item)
    era_str = era_classes[0] if era_classes else ""
    # derive taxonomy from era + period
    period_text = re.search(r'<p>(.*?)</p>', item)
    period = period_text.group(1).strip() if period_text else ""
    # map period to taxonomy slug/name
    period_map = {
        "Late Cretaceous": ("late-cretaceous", "Cretaceous"),
        "Early Cretaceous": ("early-cretaceous", "Cretaceous"),
        "Cretaceous": ("cretaceous", "Cretaceous"),
        "Late Jurassic": ("late-jurassic", "Jurassic"),
        "Middle Jurassic": ("middle-jurassic", "Jurassic"),
        "Jurassic Early": ("early-jurassic", "Jurassic"),
        "Jurassic": ("jurassic", "Jurassic"),
        "Triassic Late": ("late-triassic", "Triassic"),
        "Triassic Middle": ("middle-triassic", "Triassic"),
        "Triassic": ("triassic", "Triassic"),
    }
    taxonomy_slug, taxonomy_name = period_map.get(period, ("cretaceous", "Cretaceous"))
    # date
    time_m = re.search(r'<time datetime="([^"]+)"', item)
    post_date = time_m.group(1) + " 00:00:00" if time_m else "2000-01-01 00:00:00"
    # author
    author_m = re.search(r'<h5>by (.*?)</h5>', item)
    author_str = author_m.group(1).strip() if author_m else "Palai"
    # clean author to just first part before 'et al.' / '&amp;'
    author_clean = author_str.split(" et al.")[0].split(" &amp;")[0].split(" & ")[0].strip()
    # build genus entry similar to existing
    genera.append({
        "post_name": slug,
        "post_title": name,
        "post_date": post_date,
        "post_author": 1,
        "author": author_clean,
        "taxonomy": [{
            "term_id": 1136 if taxonomy_name=="Cretaceous" else (1137 if taxonomy_name=="Jurassic" else 1138),
            "name": taxonomy_name,
            "slug": taxonomy_slug,
            "taxonomy": "geological_time"
        }],
        "post_type": "genus"
    })

print(f"Parsed {len(genera)} genera")
# Preserve site metadata from existing file
existing = json.loads(Path("_data/genus-data.json").read_text()) if Path("_data/genus-data.json").exists() else {}
if "site" in existing:
    out = {**existing, "postTypes": {"genus": genera}}
else:
    out = {
        "site": existing.get("site", {"name":"Dinosauria Network","title":"Dinosauria Network","url":"https://dinosauria.network","description":"Dinosauria Network"}),
        "postTypes": {"genus": genera}
    }
Path("_data/genus-data.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
print("Wrote _data/genus-data.json")
