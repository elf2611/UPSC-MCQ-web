with open("src/app/performance/page.tsx", "r") as f:
    lines = f.readlines()

new_lines = []
in_modal = False
modal_count = 0

for line in lines:
    if "showContractModal && (" in line:
        modal_count += 1
        if modal_count > 1:
            in_modal = True
            
    if in_modal:
        if "  return (" in line or "{/* Header */}" in line: # Found end of modal accidentally? No, modal ends with `)}`
            pass
        if ")}" in line and modal_count > 1:
            in_modal = False
            continue
        continue
        
    new_lines.append(line)

with open("src/app/performance/page.tsx", "w") as f:
    f.writelines(new_lines)
