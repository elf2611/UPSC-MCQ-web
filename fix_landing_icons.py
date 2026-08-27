with open("src/app/page.tsx", "r") as f:
    c = f.read()

# Replace the lucide-react import
import re
c = re.sub(r'import \{[^}]+\} from "lucide-react";', 
    'import { CheckCircle2, TrendingUp, BookOpen, Clock, Target, PlayCircle, Star, ArrowRight, BrainCircuit, BarChart3, ChevronDown, Check, X, ShieldCheck, History, Newspaper, Trophy, MessageSquareText, PenTool, Users, FileSignature } from "lucide-react";', 
    c)

# Fix unescaped entities
c = c.replace('"500 Qs in 30 Days"', '&quot;500 Qs in 30 Days&quot;')

with open("src/app/page.tsx", "w") as f:
    f.write(c)
