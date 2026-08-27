with open("src/components/doubt-chat.tsx", "r") as f:
    c = f.read()

c = c.replace(
    'import { MessageSquare, X, Send, User, Bot, Loader2 } from "lucide-react";',
    'import { MessageSquare, X, Send, User, Bot, Loader2 } from "lucide-react";\nimport { useAuth } from "@/hooks/useAuth";'
)

c = c.replace(
    'export function DoubtChatWidget({ questionId }: { questionId?: string }) {',
    'export function DoubtChatWidget({ questionId }: { questionId?: string }) {\n  const { user } = useAuth();'
)

c = c.replace(
    'const idToken = "TODO_FIREBASE_TOKEN"; // In prepwise, they probably have a hook like `useAuth().getIdToken()`',
    'if (!user) return;\n      const idToken = await user.getIdToken();'
)

# Unused User icon fix
c = c.replace('MessageSquare, X, Send, User, Bot, Loader2', 'MessageSquare, X, Send, Bot, Loader2')

with open("src/components/doubt-chat.tsx", "w") as f:
    f.write(c)
