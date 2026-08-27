with open("src/app/page.tsx", "r") as f:
    c = f.read()

import re
c = re.sub(r'import \{[^}]+\} from "lucide-react";', 
    'import { CheckCircle2, TrendingUp, BookOpen, Clock, Target, PlayCircle, Star, ArrowRight, BrainCircuit, BarChart3, ChevronDown, Check, X, ShieldCheck, History, Newspaper, Trophy, MessageSquareText, PenTool, Users, FileSignature, Quote, Search } from "lucide-react";', 
    c)

with open("src/app/page.tsx", "w") as f:
    f.write(c)
