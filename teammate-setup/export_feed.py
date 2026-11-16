#!/usr/bin/env python3
"""Turn the Scholarship Scout db export (one JSON file per opportunity) into a public feed.
Usage: python3 export_feed.py <dir-of-opportunity-json-files> <out-dir>
Writes <out-dir>/opportunities.json: open items whose deadline is today or later, soonest first."""
import json, glob, os, sys, datetime
src, out = sys.argv[1], sys.argv[2]
today = datetime.datetime.now(datetime.timezone.utc).date().isoformat()
keep = ["id","title","provider","type","host_country","region","levels","fields","funding",
        "deadline","eligible_nationalities","eligibility_summary","description","benefits","requirements","documents","selection_process","important_dates","about_provider","how_to_apply","notes","age_max","min_gpa","url","verified","added_at"]
items = []
for f in glob.glob(os.path.join(src, "*.json")):
    d = json.load(open(f)); d = d.get("data", d)
    if d.get("status") != "open" or not d.get("deadline") or d["deadline"] < today:
        continue
    d.setdefault("id", os.path.basename(f)[:-5])
    items.append({k: d.get(k) for k in keep})
items.sort(key=lambda x: (x["deadline"], x["title"] or ""))
feed = {"name": "Scholarship Scout", "description": "Scholarships, fellowships, internships, funded conferences, calls for papers and grants open to African students in Europe, Asia and North America.",
        "updated_at": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "count": len(items), "opportunities": items}
os.makedirs(out, exist_ok=True)
json.dump(feed, open(os.path.join(out, "opportunities.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print(len(items), "items written")
