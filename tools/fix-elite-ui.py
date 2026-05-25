from pathlib import Path

path = Path(r"c:\Users\Asus\Downloads\app_v181\apps\web\src\features\dashboard\components\EliteUi.tsx")
lines = path.read_text(encoding="utf-8").splitlines()

# Line numbers are 1-based; fix wrong </motion.div> closings on plain <div> blocks
fix_lines = {82, 83, 89, 91, 104, 105, 107, 205, 227, 249, 269, 357}
for i, line in enumerate(lines):
    if (i + 1) in fix_lines and "</motion.div>" in line:
        lines[i] = line.replace("</motion.div>", "</div>")

path.write_text("\n".join(lines) + "\n", encoding="utf-8")
print("fixed", len(fix_lines), "lines")
