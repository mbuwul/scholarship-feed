#!/usr/bin/env python3
"""Turn the Scholarship Scout "admissions" db export (one JSON file per programme) into a public feed.
Usage: python3 export_admissions.py <dir-of-admission-json-files> <out-dir>
Writes <out-dir>/admissions.json: programmes still open (deadline today or later, or rolling), soonest first.
Same conventions as export_feed.py, so a website widget can read it the same way."""
import json, glob, os, sys, datetime
src, out = sys.argv[1], sys.argv[2]
today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
keep = ["id","title","university","program_country","region","city","levels","fields","languages","intake","opens",
        "deadline","deadline_note","duration","tuition","application_fee","description","degree_names","requirements",
        "financial_aid","open_to","closed_to","origin_notes","how_to_apply","url","apply_url","verified","added_at","documents","selection_process","important_dates","about_provider","notes"]
items = []
for f in glob.glob(os.path.join(src, "*.json")):
    d = json.load(open(f)); d = d.get("data", d)
    dl = d.get("deadline")
    if d.get("status") != "open" or not dl or (dl != "rolling" and dl < today):
        continue
    d.setdefault("id", os.path.basename(f)[:-5])
    items.append({k: d.get(k) for k in keep})
items.sort(key=lambda x: ("9999" if x["deadline"] == "rolling" else x["deadline"], x["university"] or "", x["title"] or ""))
feed = {"name": "Scholarship Scout open admissions", "description": "Self-funded bachelor's and master's programmes open for applications at universities in Europe, Asia and North America.",
        "updated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "admissions": items}
os.makedirs(out, exist_ok=True)
json.dump(feed, open(os.path.join(out, "admissions.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print(len(items), "admissions written")
