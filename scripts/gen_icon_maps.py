#!env python3
# Run this from the project directory
import os

ICONS_DIR = "packages/game-ui/src/icons"
OUT = "packages/game-ui/src/icons/index.ts"

prefix = ["// Generated by gen_icon_maps.py. Do not edit!"]
suffix = []

def gen_icon_map(dir, mapName):
    dirpath = os.path.join(ICONS_DIR, dir)
    prefix.append("")
    suffix.append("")
    suffix.append(
        f"export const {mapName}: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {{"
    )
    for iconFile in sorted(os.listdir(dirpath)):
        if iconFile.endswith(".svg"):
            base = os.path.splitext(iconFile)[0]
            parts = base.split("-")
            mapKey = "".join(part.capitalize() for part in parts)
            prefix.append(
                f"import {{ ReactComponent as {mapKey} }} from './{dir}/{iconFile}';"
            )
            suffix.append(f"  {mapKey},")
    suffix.append("};")

gen_icon_map("effects", "effectIcons")
gen_icon_map("skills", "skillIcons")
gen_icon_map("items", "itemIcons")

with open(OUT, 'w') as fh:
    for line in prefix:
        print(line, file=fh)
    for line in suffix:
        print(line, file=fh)