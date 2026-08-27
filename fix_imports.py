import os

files = [
    "src/app/mains-practice/page.tsx",
    "src/app/mains-practice/[id]/page.tsx",
    "src/app/revision/page.tsx"
]

for file in files:
    if os.path.exists(file):
        with open(file, "r") as f:
            c = f.read()
        
        c = c.replace('import ProtectedRoute from "@/components/protected-route";', 'import { ProtectedRoute } from "@/components/protected-route";')
        c = c.replace('import { useParams, useRouter } from "next/navigation";', 'import { useParams } from "next/navigation";')
        
        with open(file, "w") as f:
            f.write(c)
